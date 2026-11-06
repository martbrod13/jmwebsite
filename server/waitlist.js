/*
 * Lista oczekujących.
 * Klientka wybiera zabieg i okres, w którym nie ma wolnych terminów. Gdy w tym okresie
 * zwolni się miejsce (odwołanie, przeniesienie, zdjęta blokada albo dzień wolny),
 * dostaje SMS z linkiem. Termin dostaje ta osoba, która pierwsza go zarezerwuje.
 */
const { db, tx, nowIso } = require('./db');
const B = require('./booking');
const M = require('./messaging');
const C = require('./site-config');
const Sec = require('./security');
const env = require('./env');

const QUIET_FROM = 21, QUIET_TO = 8;   // SMS-y tylko między 8:00 a 21:00
const GAP_HOURS = 6;                   // najwyżej jeden SMS na 6 godzin dla jednego zapisu
const KEEP_DAYS = 30;                  // dane znikają 30 dni po końcu wybranego okresu
const MAX_PER_PHONE = 3;               // ile zabiegów naraz może czekać jedna osoba

class WaitlistError extends Error { constructor(msg, field, free) { super(msg); this.field = field; this.free = free; } }
const L = (lang, pl, en) => (lang === 'en' ? en : pl);
const dm = (d) => d.slice(8, 10) + '.' + d.slice(5, 7);
const today = () => B.isoDate(new Date());
const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-9);
const nameIn = (id, lang) => (lang === 'en' ? C.namesEn[id] : null) || (B.treatment(id) || {}).name || id;
const sender = () => env.smsSender || C.salon.smsSender;

// Dni w okresie zapisu, w których zabieg da się teraz zarezerwować online
function freeDates(e) {
  const t = B.treatment(e.treatment_id); if (!t) return [];
  const out = []; const t0 = today();
  const d = new Date((e.date_from > t0 ? e.date_from : t0) + 'T12:00:00');
  for (let i = 0; i < 62; i++, d.setDate(d.getDate() + 1)) {
    const ds = B.isoDate(d); if (ds > e.date_to) break;
    const slots = B.slotsFor(ds, t.duration);
    if (slots.length) out.push({ date: ds, slots });
  }
  return out;
}

function add({ treatmentId, from, to, firstName, phone, lang = 'pl', clientId = null, source = 'online', checkFree = true }) {
  const t = B.treatment(treatmentId);
  if (!t) throw new WaitlistError(L(lang, 'Wybierz zabieg.', 'Choose a treatment.'), 'treatmentId');
  const w = B.bookingWindow();
  if (!B.DATE_RE.test(from || '') || !B.DATE_RE.test(to || '')) throw new WaitlistError(L(lang, 'Wybierz daty od i do.', 'Choose the from and to dates.'), 'from');
  if (from < w.first) from = w.first;
  if (to < from) throw new WaitlistError(L(lang, 'Data „do” musi być późniejsza niż „od”.', 'The “to” date must be after the “from” date.'), 'to');
  if (to > w.last) throw new WaitlistError(L(lang, `Rezerwujemy najwyżej ${C.booking.daysAhead} dni naprzód. Wybierz datę „do” najpóźniej ${dm(w.last)}.`, `We take bookings up to ${C.booking.daysAhead} days ahead. Choose a “to” date no later than ${dm(w.last)}.`), 'to');
  const key = phoneKey(phone);
  if (checkFree) {
    const free = freeDates({ treatment_id: t.id, date_from: from, date_to: to });
    if (free.length) {
      const list = free.slice(0, 4).map((f) => dm(f.date)).join(', ') + (free.length > 4 ? L(lang, ' i inne', ' and more') : '');
      throw new WaitlistError(L(lang, `W tym okresie są jeszcze wolne terminy: ${list}. Wybierz jeden z nich w kalendarzu.`, `There are still free slots in this period: ${list}. Choose one in the calendar.`), 'free', free.map((f) => f.date));
    }
  }
  const same = db.prepare("SELECT * FROM waitlist WHERE phone_key = ? AND treatment_id = ? AND status = 'waiting'").get(key, t.id);
  if (same) {
    // ta sama osoba i ten sam zabieg: poszerzamy okres zamiast dublować wpis
    db.prepare('UPDATE waitlist SET date_from = ?, date_to = ?, first_name = ?, phone = ?, lang = ? WHERE id = ?')
      .run(from < same.date_from ? from : same.date_from, to > same.date_to ? to : same.date_to, firstName, phone, lang, same.id);
    return byId(same.id);
  }
  const active = db.prepare("SELECT count(*) AS n FROM waitlist WHERE phone_key = ? AND status = 'waiting'").get(key).n;
  if (active >= MAX_PER_PHONE) throw new WaitlistError(L(lang, `Ten numer czeka już na ${MAX_PER_PHONE} zabiegi. Zadzwoń do gabinetu, a pomożemy znaleźć termin.`, `This number is already waiting for ${MAX_PER_PHONE} treatments. Call the studio and we will help you find a time.`), 'phone');
  const r = db.prepare(`INSERT INTO waitlist (token, treatment_id, date_from, date_to, first_name, phone, phone_key, lang, client_id, source, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(Sec.randomToken(12), t.id, from, to, firstName, phone, key, lang, clientId, source, nowIso());
  return byId(Number(r.lastInsertRowid));
}

const byId = (id) => db.prepare('SELECT * FROM waitlist WHERE id = ?').get(id) || null;
const byToken = (token) => (/^[A-Za-z0-9_-]{16,64}$/.test(token || '') ? db.prepare('SELECT * FROM waitlist WHERE token = ?').get(token) || null : null);
const remove = (id) => db.prepare('DELETE FROM waitlist WHERE id = ?').run(id).changes > 0;

// Po rezerwacji: zapis na ten sam zabieg przestaje czekać
function markBooked(phone, treatmentId) {
  const key = phoneKey(phone); if (!key) return;
  db.prepare("UPDATE waitlist SET status = 'booked' WHERE phone_key = ? AND treatment_id = ? AND status = 'waiting'").run(key, treatmentId);
}

// Okres minął: oznaczamy, a po 30 dniach usuwamy dane
function expire() {
  const t0 = today();
  db.prepare("UPDATE waitlist SET status = 'expired' WHERE status = 'waiting' AND date_to < ?").run(t0);
  const old = new Date(); old.setDate(old.getDate() - KEEP_DAYS);
  db.prepare('DELETE FROM waitlist WHERE date_to < ?').run(B.isoDate(old));
}

const smsText = (e, first, more) => L(e.lang,
  `${sender()}: Zwolnił się termin: ${nameIn(e.treatment_id, 'pl')}, ${dm(first.date)} o ${first.slots[0]}${more ? ` (i ${more} ${more === 1 ? 'inny dzień' : 'inne dni'})` : ''}. Zarezerwuj: ${M.link('/l/' + e.token)}`,
  `${sender()}: A time has opened up: ${nameIn(e.treatment_id, 'en')}, ${dm(first.date)} at ${first.slots[0]}${more ? ` (and ${more} more ${more === 1 ? 'day' : 'days'})` : ''}. Book: ${M.link('/l/' + e.token)}`);

// Sprawdza zapisy i wysyła SMS-y o zwolnionych terminach. Uruchamiane co minutę
// i od razu po odwołaniu lub przeniesieniu wizyty.
function scan(now = new Date()) {
  expire();
  const h = now.getHours();
  if ((h >= QUIET_FROM || h < QUIET_TO) && !process.env.JM_SMS_ANYTIME) return 0; // JM_SMS_ANYTIME tylko w testach
  const list = db.prepare("SELECT * FROM waitlist WHERE status = 'waiting' ORDER BY created_at").all();
  let n = 0;
  for (const e of list) {
    if (e.notified_at && now - new Date(e.notified_at) < GAP_HOURS * 36e5) continue;
    const told = new Set(db.prepare('SELECT date FROM waitlist_notices WHERE waitlist_id = ?').all(e.id).map((r) => r.date));
    const fresh = freeDates(e).filter((f) => !told.has(f.date));
    if (!fresh.length) continue;
    const at = nowIso();
    tx(() => {
      M.queueSms('waitlist', e.phone, smsText(e, fresh[0], fresh.length - 1));
      fresh.forEach((f) => db.prepare('INSERT OR IGNORE INTO waitlist_notices (waitlist_id, date, at) VALUES (?,?,?)').run(e.id, f.date, at));
      db.prepare('UPDATE waitlist SET notices = notices + 1, notified_at = ? WHERE id = ?').run(at, e.id);
    });
    n++;
  }
  if (n) M.processQueue();
  return n;
}
let pending = null;
const scanSoon = () => { if (!pending) pending = setImmediate(() => { pending = null; try { scan(); } catch (e) { console.error('Lista oczekujących:', e.message); } }); };

// Widok dla klientki (link z SMS-a) i dla panelu
function publicView(e, lang) {
  return { treatmentId: e.treatment_id, treatment: nameIn(e.treatment_id, lang), from: e.date_from, to: e.date_to, firstName: e.first_name,
    status: e.status, free: e.status === 'waiting' ? freeDates(e).map((f) => ({ date: f.date, first: f.slots[0], count: f.slots.length })) : [] };
}
function adminList() {
  expire();
  return db.prepare("SELECT * FROM waitlist ORDER BY status = 'waiting' DESC, date_from, created_at").all().map((e) => ({
    id: e.id, treatmentId: e.treatment_id, treatment: nameIn(e.treatment_id, 'pl'), from: e.date_from, to: e.date_to,
    firstName: e.first_name, phone: e.phone, lang: e.lang, source: e.source, status: e.status, account: !!e.client_id,
    notices: e.notices, notifiedAt: e.notified_at, createdAt: e.created_at,
    freeNow: e.status === 'waiting' ? freeDates(e).length : 0
  }));
}

module.exports = { WaitlistError, add, byId, byToken, remove, markBooked, expire, scan, scanSoon, freeDates, publicView, adminList, phoneKey };
