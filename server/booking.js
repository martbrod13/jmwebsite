/*
 * Zasady gabinetu: godziny, wolne terminy, ceny, zniżki, rezerwacje i odwołania.
 * Wszystko liczone na serwerze — przeglądarka tylko to pokazuje.
 */
const { db, tx, meta, nowIso } = require('./db');
const C = require('./site-config');
const { randomToken, shortCode } = require('./security');

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const toTime = (min) => pad(Math.floor(min / 60)) + ':' + pad(min % 60);
const startOf = (b) => new Date(b.date + 'T' + b.time + ':00');
const round2 = (v) => Math.round(v * 100) / 100;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/* ---------- Zabiegi i ceny ---------- */
function treatment(id) {
  if (id === C.consultation.id) return C.consultation;
  return C.treatments.find((t) => t.id === id) || null;
}
const allTreatments = () => [C.consultation].concat(C.treatments);

function currentPrice(id) {
  const r = db.prepare('SELECT price FROM price_history WHERE treatment_id = ? AND valid_from <= ? ORDER BY valid_from DESC, id DESC LIMIT 1').get(id, nowIso());
  if (r) return r.price;
  const t = treatment(id); return t ? t.price : null;
}
function priceMap() {
  const out = {};
  allTreatments().forEach((t) => { out[t.id] = currentPrice(t.id); });
  return out;
}
// Najniższa cena z 30 dni przed obniżką (dyrektywa Omnibus)
function lowest30(id) {
  const now = nowIso();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const before = db.prepare('SELECT price FROM price_history WHERE treatment_id = ? AND valid_from <= ? ORDER BY valid_from DESC, id DESC LIMIT 1').get(id, since);
  const within = db.prepare('SELECT min(price) AS p FROM price_history WHERE treatment_id = ? AND valid_from > ? AND valid_from <= ?').get(id, since, now);
  const candidates = [currentPrice(id)];
  if (before) candidates.push(before.price);
  else { const t = treatment(id); if (t) candidates.push(t.price); }
  if (within && within.p != null) candidates.push(within.p);
  return Math.min(...candidates.filter((v) => v != null));
}
function setPrice(id, price) {
  db.prepare('INSERT INTO price_history (treatment_id, price, valid_from) VALUES (?, ?, ?)').run(id, price, nowIso());
}

/* ---------- Godziny pracy i wolne terminy ---------- */
function dayHours(dateStr) {
  if (C.closedDates.includes(dateStr)) return null;
  if (db.prepare('SELECT 1 FROM days_off WHERE date = ?').get(dateStr)) return null;
  return C.hours[new Date(dateStr + 'T12:00:00').getDay()] || null;
}
function bookingWindow() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const last = new Date(today); last.setDate(last.getDate() + C.booking.daysAhead);
  return { first: isoDate(today), last: isoDate(last) };
}
function takenRanges(dateStr, ignoreId) {
  return db.prepare("SELECT start_min, end_min FROM bookings WHERE date = ? AND status IN ('confirmed','done') AND id IS NOT ?")
    .all(dateStr, ignoreId ?? null).map((r) => [r.start_min, r.end_min])
    .concat(db.prepare('SELECT start_min, end_min FROM blocks WHERE date = ?').all(dateStr).map((r) => [r.start_min, r.end_min]));
}
// Co koliduje z danym czasem: inne wizyty i blokady (dla panelu, z opisem)
function conflicts(dateStr, start, end, ignoreId) {
  const out = [];
  db.prepare("SELECT id, time, end_min, treatment_name FROM bookings WHERE date = ? AND status IN ('confirmed','done') AND id IS NOT ? AND start_min < ? AND end_min > ?")
    .all(dateStr, ignoreId ?? null, end, start).forEach((b) => out.push(`wizyta ${b.time}–${toTime(b.end_min)} (${b.treatment_name})`));
  db.prepare('SELECT start_min, end_min, note FROM blocks WHERE date = ? AND start_min < ? AND end_min > ?')
    .all(dateStr, end, start).forEach((x) => out.push(`blokada ${toTime(x.start_min)}–${toTime(x.end_min)}${x.note ? ' (' + x.note + ')' : ''}`));
  return out;
}
// Czy czas mieści się w godzinach pracy (święta i dni wolne = poza godzinami)
function withinHours(dateStr, start, end) {
  const h = dayHours(dateStr);
  return !!h && start >= h[0] * 60 && end <= h[1] * 60;
}
function slotsFor(dateStr, duration, ignoreId) {
  const w = bookingWindow();
  if (dateStr < w.first || dateStr > w.last) return [];
  const hrs = dayHours(dateStr); if (!hrs) return [];
  const open = hrs[0] * 60, close = hrs[1] * 60;
  const taken = takenRanges(dateStr, ignoreId);
  const minStart = Date.now() + C.booking.minLeadHours * 36e5;
  const out = [];
  for (let m = open; m + duration <= close; m += C.booking.slotStep) {
    if (new Date(dateStr + 'T' + toTime(m) + ':00').getTime() < minStart) continue;
    if (!taken.some(([a, b]) => m < b && m + duration > a)) out.push(toTime(m));
  }
  return out;
}
function availability(treatmentId, from, to) {
  const t = treatment(treatmentId); if (!t || !DATE_RE.test(from) || !DATE_RE.test(to)) return null;
  const out = {};
  const d = new Date(from + 'T12:00:00'); const end = new Date(to + 'T12:00:00');
  for (let i = 0; d <= end && i < 62; i++, d.setDate(d.getDate() + 1)) {
    const ds = isoDate(d);
    out[ds] = dayHours(ds) ? slotsFor(ds, t.duration) : null; // null = nieczynne
  }
  return out;
}

// Wolne okienka na dziś i jutro (sekcja „last minute” na stronie głównej):
// ciągłe wolne odcinki, w które zmieści się co najmniej najkrótszy zabieg
function freeWindows(days = 2) {
  const all = allTreatments().filter((t) => t.duration > 0);
  if (!all.length) return [];
  const minDur = Math.min(...all.map((t) => t.duration));
  const out = []; const d = new Date();
  for (let i = 0; i < days; i++, d.setDate(d.getDate() + 1)) {
    const ds = isoDate(d); const hrs = dayHours(ds); if (!hrs) continue;
    const close = hrs[1] * 60; const taken = takenRanges(ds);
    const slotCache = new Map();
    const slots = (dur) => { if (!slotCache.has(dur)) slotCache.set(dur, slotsFor(ds, dur).map(toMin)); return slotCache.get(dur); };
    const windows = [];
    slots(minDur).forEach((m) => {
      const w = windows[windows.length - 1];
      if (w && m - w.last === C.booking.slotStep) w.last = m; else windows.push({ start: m, last: m });
    });
    const list = windows.map((w) => {
      const busy = taken.filter(([a]) => a >= w.last + minDur).map(([a]) => a);
      const end = Math.min(close, ...busy);
      const fits = all.filter((t) => slots(t.duration).some((m) => m >= w.start && m + t.duration <= end)).length;
      return { start: toTime(w.start), end: toTime(end), minutes: end - w.start, fits };
    }).filter((w) => w.fits > 0).slice(0, 6);
    if (list.length) out.push({ date: ds, windows: list });
  }
  return out;
}

/* ---------- Zniżki ---------- */
function promotions({ activeOnly } = {}) {
  return db.prepare(`SELECT * FROM promotions ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY date_from`).all().map((p) => ({
    id: p.id, title: p.title, text: p.text, percent: p.percent,
    categories: p.categories === 'all' ? 'all' : JSON.parse(p.categories),
    from: p.date_from, to: p.date_to, birthday: !!p.birthday, active: !!p.active, membersOnly: !!p.members_only
  }));
}
function visitCount(clientId) {
  return db.prepare("SELECT count(*) AS n FROM bookings WHERE client_id = ? AND status <> 'cancelled'").get(clientId).n;
}
// Last minute: zniżka na wizyty, które zaczynają się w ciągu najbliższych godzin (ustawiana w panelu)
function lastMinute() {
  const percent = Number(meta.get('lastminute_percent') || 0), hours = Number(meta.get('lastminute_hours') || 24);
  return { percent: percent > 0 && percent <= 50 ? percent : 0, hours: [12, 24, 48].includes(hours) ? hours : 24 };
}
const isLastMinute = (dateStr, time, hours) => { const ms = new Date(dateStr + 'T' + time + ':00').getTime() - Date.now(); return ms > 0 && ms <= hours * 36e5; };
function bestDiscount(t, dateStr, client, price, opts = {}) {
  if (!price) return null;
  const options = (opts.extra || []).slice();
  const lm = lastMinute();
  if (lm.percent && opts.time && isLastMinute(dateStr, opts.time, lm.hours)) options.push({ id: 'last-minute', label: 'Last minute', percent: lm.percent });
  if (client && visitCount(client.id) === 0) options.push({ id: 'pierwsza-wizyta', label: 'Pierwsza wizyta z kontem', percent: C.discounts.firstVisitPercent });
  promotions({ activeOnly: true }).forEach((p) => {
    if (p.membersOnly && !client) return;
    if (dateStr < p.from || dateStr > p.to) return;
    if (p.categories !== 'all' && !p.categories.includes(t.category)) return;
    if (p.birthday && (!client || !client.birth_month || client.birth_month !== Number(dateStr.slice(5, 7)))) return;
    options.push({ id: p.id, label: p.title, percent: p.percent });
  });
  // zniżki się nie sumują — wybieramy najkorzystniejszą
  return options.sort((a, b) => b.percent - a.percent)[0] || null;
}

/* ---------- Rezerwacje ---------- */
class BookingError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

function createBooking({ treatmentId, date, time, notes, lang, client, guest, extraDiscounts }) {
  const t = treatment(treatmentId);
  if (!t) throw new BookingError('treatment', 'Nie ma takiego zabiegu.');
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) throw new BookingError('slot', 'Nieprawidłowy termin.');
  const price = currentPrice(t.id);
  return tx(() => {
    // sprawdzamy dostępność w tej samej transakcji, w której zapisujemy — dwie osoby nie zajmą jednego terminu
    if (!slotsFor(date, t.duration).includes(time)) throw new BookingError('taken', 'Ten termin został właśnie zajęty. Wybierz inną godzinę.');
    const d = bestDiscount(t, date, client, price, { time, extra: extraDiscounts });
    const total = d ? round2(price - round2(price * d.percent / 100)) : price;
    const start = toMin(time);
    let code; do { code = shortCode(6); } while (db.prepare('SELECT 1 FROM bookings WHERE code = ?').get(code));
    const r = db.prepare(`INSERT INTO bookings (code, token, treatment_id, treatment_name, duration, date, time, start_min, end_min,
        client_id, guest_first, guest_last, guest_phone, guest_email, guest_marketing_sms, guest_marketing_email,
        lang, notes, price, discount_id, discount_label, discount_percent, lowest30, total, created_at)
      VALUES (?,?,?,?,?,?,?,?,?, ?,?,?,?,?,?,?, ?,?,?,?,?,?,?,?,?)`).run(
      code, randomToken(24), t.id, t.name, t.duration, date, time, start, start + t.duration,
      client ? client.id : null, guest ? guest.firstName : null, guest ? guest.lastName : null, guest ? guest.phone : null, guest ? guest.email : null,
      guest && guest.marketingSms ? 1 : 0, guest && guest.marketingEmail ? 1 : 0,
      lang === 'en' ? 'en' : 'pl', notes || null, price, d ? d.id : null, d ? d.label : null, d ? d.percent : 0,
      d ? lowest30(t.id) : null, total, nowIso());
    return getBooking(Number(r.lastInsertRowid));
  });
}

/* ---------- Wizyty dodawane i przenoszone w panelu ---------- */
// Sprawdza termin dla panelu. Kolizje zawsze blokują (jedna osoba w gabinecie),
// a czas poza godzinami pracy albo w przeszłości wymaga potwierdzenia (force).
function checkManualSlot({ date, time, duration, ignoreId, force }) {
  if (!DATE_RE.test(date || '') || !TIME_RE.test(time || '')) throw new BookingError('slot', 'Podaj poprawną datę i godzinę.');
  const start = toMin(time); const end = start + duration;
  if (start % 5 || end > 24 * 60) throw new BookingError('slot', 'Godzina musi być pełna co 5 minut i kończyć się przed północą.');
  const c = conflicts(date, start, end, ignoreId);
  if (c.length) throw new BookingError('conflict', 'Ten czas koliduje z: ' + c.join(', ') + '.');
  if (!force) {
    const warn = [];
    if (!withinHours(date, start, end)) warn.push(dayHours(date) ? 'jest poza godzinami pracy' : 'gabinet jest tego dnia nieczynny');
    if (new Date(date + 'T' + time + ':00') < new Date()) warn.push('jest w przeszłości');
    if (warn.length) throw new BookingError('confirm', 'Ten termin ' + warn.join(' i ') + '. Zapisać mimo to?');
  }
  return { start, end };
}

function createManualBooking({ treatmentId, date, time, duration, price, notes, source, client, guest, force }) {
  const t = treatment(treatmentId);
  if (!t) throw new BookingError('treatment', 'Wybierz zabieg.');
  const dur = Number(duration) || t.duration;
  if (dur < 10 || dur > 600) throw new BookingError('duration', 'Czas wizyty musi mieć od 10 minut do 10 godzin.');
  const p = price === '' || price == null ? currentPrice(t.id) : Number(price);
  if (!Number.isFinite(p) || p < 0) throw new BookingError('price', 'Podaj poprawną cenę.');
  return tx(() => {
    const { start, end } = checkManualSlot({ date, time, duration: dur, force });
    let code; do { code = shortCode(6); } while (db.prepare('SELECT 1 FROM bookings WHERE code = ?').get(code));
    const r = db.prepare(`INSERT INTO bookings (code, token, treatment_id, treatment_name, duration, date, time, start_min, end_min,
        client_id, guest_first, guest_last, guest_phone, guest_email, lang, notes, price, total, created_at, source, demo)
      VALUES (?,?,?,?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?,?,?)`).run(
      code, randomToken(24), t.id, t.name, dur, date, time, start, end,
      client ? client.id : null, guest ? guest.firstName : null, guest ? guest.lastName : null, guest ? guest.phone : null, guest ? guest.email || null : null,
      client ? client.language : 'pl', notes || null, p, p, nowIso(), source, client && client.demo ? 1 : 0);
    return getBooking(Number(r.lastInsertRowid));
  });
}

// Przeniesienie wizyty. Klientka: tylko na wolny termin z kalendarza i najpóźniej X godzin przed wizytą.
function moveBooking(b, { date, time, by, force }) {
  if (b.status !== 'confirmed') throw new BookingError('move', 'Można przenieść tylko zaplanowaną wizytę.');
  return tx(() => {
    if (by === 'client') {
      if (!canCancel(b) || isLateCancel(b)) throw new BookingError('late', `Termin można zmienić online najpóźniej ${C.booking.cancelHours} godzin przed wizytą. Zadzwoń do gabinetu.`);
      if (!DATE_RE.test(date || '') || !TIME_RE.test(time || '') || !slotsFor(date, b.duration, b.id).includes(time)) throw new BookingError('taken', 'Ten termin jest już zajęty. Wybierz inny.');
    } else {
      checkManualSlot({ date, time, duration: b.duration, ignoreId: b.id, force });
    }
    const start = toMin(time);
    db.prepare('UPDATE bookings SET date = ?, time = ?, start_min = ?, end_min = ? WHERE id = ?').run(date, time, start, start + b.duration, b.id);
    // przypomnienie dla starego terminu zostaje w historii, a nowe wyśle się o czasie
    db.prepare("UPDATE messages SET kind = 'reminder_prev' WHERE booking_id = ? AND kind = 'reminder'").run(b.id);
    return getBooking(b.id);
  });
}

/* ---------- Blokady czasu ---------- */
function blocksBetween(from, to) {
  return db.prepare('SELECT * FROM blocks WHERE date BETWEEN ? AND ? ORDER BY date, start_min').all(from, to)
    .map((x) => ({ id: x.id, date: x.date, start: toTime(x.start_min), end: toTime(x.end_min), note: x.note }));
}
function addBlock({ date, start, end, note }) {
  if (!DATE_RE.test(date || '') || !TIME_RE.test(start || '') || !TIME_RE.test(end || '')) throw new BookingError('block', 'Podaj dzień i godziny blokady.');
  const s = toMin(start), e = toMin(end);
  if (e <= s) throw new BookingError('block', 'Koniec blokady musi być po jej początku.');
  db.prepare('INSERT INTO blocks (date, start_min, end_min, note, created_at) VALUES (?,?,?,?,?)').run(date, s, e, note || null, nowIso());
  return db.prepare("SELECT count(*) AS n FROM bookings WHERE date = ? AND status = 'confirmed' AND start_min < ? AND end_min > ?").get(date, e, s).n;
}

const getBooking = (id) => db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
const getBookingByToken = (token) => (token ? db.prepare('SELECT * FROM bookings WHERE token = ?').get(String(token)) : null);

const hoursUntil = (b) => (startOf(b) - Date.now()) / 36e5;
const isLateCancel = (b) => hoursUntil(b) < C.booking.cancelHours;
const lateFee = (b) => round2(b.total * C.booking.lateCancelFeePercent / 100);
const canCancel = (b) => b.status === 'confirmed' && startOf(b) > Date.now();

function cancelBooking(b, by) {
  if (!canCancel(b)) throw new BookingError('cancel', 'Tej wizyty nie można już odwołać.');
  const fee = by === 'client' && isLateCancel(b) ? lateFee(b) : 0;
  db.prepare("UPDATE bookings SET status = 'cancelled', cancelled_at = ?, cancelled_by = ?, fee = ?, fee_status = ? WHERE id = ?")
    .run(nowIso(), by, fee, fee ? 'due' : 'none', b.id);
  return getBooking(b.id);
}
function markNoShow(b) {
  if (startOf(b) > Date.now()) throw new BookingError('noshow', 'Wizyta jeszcze się nie odbyła.');
  if (!['confirmed', 'done'].includes(b.status)) throw new BookingError('noshow', 'Tej wizyty nie można oznaczyć jako nieobecność.');
  const fee = lateFee(b);
  tx(() => {
    db.prepare("UPDATE bookings SET status = 'no_show', fee = ?, fee_status = 'due' WHERE id = ?").run(fee, b.id);
    require('./vouchers').unsettleBooking(b);
  });
  return getBooking(b.id);
}
function setFeeStatus(b, status) {
  if (!b.fee || !['due', 'paid', 'waived'].includes(status)) throw new BookingError('fee', 'Nieprawidłowy status opłaty.');
  db.prepare('UPDATE bookings SET fee_status = ? WHERE id = ?').run(status, b.id);
  return getBooking(b.id);
}
// wizyty, które się skończyły, oznaczamy jako odbyte
function completePast() {
  const now = new Date();
  const today = isoDate(now); const nowMin = now.getHours() * 60 + now.getMinutes();
  const V = require('./vouchers');
  const ended = db.prepare("SELECT * FROM bookings WHERE status = 'confirmed' AND (date < ? OR (date = ? AND end_min <= ?))").all(today, today, nowMin);
  if (!ended.length) return;
  tx(() => ended.forEach((b) => {
    db.prepare("UPDATE bookings SET status = 'done' WHERE id = ?").run(b.id);
    V.settleBooking(b); // bon podarunkowy rozliczamy po odbytej wizycie
  }));
}

function contactOf(b) {
  if (b.client_id) {
    const c = db.prepare('SELECT first_name, last_name, phone, email, language FROM clients WHERE id = ?').get(b.client_id);
    if (c) return { firstName: c.first_name, lastName: c.last_name, phone: c.phone, email: c.email, account: true };
  }
  if (b.guest_phone) return { firstName: b.guest_first, lastName: b.guest_last, phone: b.guest_phone, email: b.guest_email, account: false };
  return null; // konto usunięte
}

// Widok wizyty dla klientki (bez danych innych osób)
function publicBooking(b) {
  return {
    id: b.id, code: b.code, status: b.status, treatmentId: b.treatment_id, treatmentName: b.treatment_name,
    duration: b.duration, date: b.date, time: b.time, price: b.price, total: b.total,
    discount: b.discount_percent ? { id: b.discount_id, label: b.discount_label, percent: b.discount_percent } : null,
    lowest30: b.lowest30, notes: b.notes, lang: b.lang, createdAt: b.created_at,
    cancelledBy: b.cancelled_by, fee: b.fee, feeStatus: b.fee_status, source: b.source,
    voucher: b.voucher_id ? { amount: b.voucher_amount, code: (db.prepare('SELECT code FROM vouchers WHERE id = ?').get(b.voucher_id) || {}).code } : null,
    toPay: Math.max(0, round2(b.total - (b.voucher_amount || 0))),
    canCancel: canCancel(b), lateCancel: canCancel(b) && isLateCancel(b), lateFee: lateFee(b),
    canMove: canCancel(b) && !isLateCancel(b), end: toTime(b.end_min),
    afterSms: !!b.after_sms,
    package: b.package_id ? (() => { const p = db.prepare('SELECT name FROM packages WHERE id = ?').get(b.package_id); return { id: b.package_id, name: p ? p.name : '' }; })() : null,
    questionnaire: (() => { const q = db.prepare('SELECT updated_at FROM questionnaires WHERE booking_id = ?').get(b.id); return { filled: !!q, updatedAt: q ? q.updated_at : null, editable: b.status === 'confirmed' && startOf(b) > Date.now() }; })()
  };
}

module.exports = {
  C, pad, isoDate, toMin, toTime, startOf, DATE_RE,
  treatment, allTreatments, currentPrice, priceMap, lowest30, setPrice,
  dayHours, bookingWindow, slotsFor, availability,
  promotions, visitCount, bestDiscount, lastMinute, freeWindows,
  BookingError, createBooking, createManualBooking, moveBooking, checkManualSlot, conflicts, withinHours, blocksBetween, addBlock, getBooking, getBookingByToken, cancelBooking, markNoShow, setFeeStatus, completePast,
  canCancel, isLateCancel, lateFee, contactOf, publicBooking
};
