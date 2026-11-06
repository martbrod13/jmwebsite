/*
 * Bony podarunkowe.
 * Gabinet wystawia bon w panelu (kod, kwota, ważność). Klientka wpisuje kod przy rezerwacji —
 * kwota jest wtedy zarezerwowana na wizytę, a z salda schodzi po odbytej wizycie.
 * Bon można też rozliczyć ręcznie w panelu (np. zakup na miejscu).
 */
const crypto = require('crypto');
const { db, tx, nowIso } = require('./db');

class VoucherError extends Error {}
const round2 = (v) => Math.round(v * 100) / 100;
const pad = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const normalize = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function newCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    const b = crypto.randomBytes(8);
    const s = Array.from(b, (x) => abc[x % abc.length]).join('');
    code = `JM-${s.slice(0, 4)}-${s.slice(4)}`;
  } while (db.prepare('SELECT 1 FROM vouchers WHERE code = ?').get(code));
  return code;
}
const byCode = (code) => {
  const n = normalize(code);
  return n.length >= 10 ? db.prepare("SELECT * FROM vouchers WHERE replace(code, '-', '') = ?").get(n) : null;
};
const byId = (id) => db.prepare('SELECT * FROM vouchers WHERE id = ?').get(id);

// kwota zarezerwowana na zaplanowane wizyty (jeszcze nie rozliczone)
const reserved = (v, exceptBookingId) => db.prepare("SELECT coalesce(sum(voucher_amount), 0) AS s FROM bookings WHERE voucher_id = ? AND status = 'confirmed' AND id IS NOT ?").get(v.id, exceptBookingId ?? null).s;
const available = (v, exceptBookingId) => Math.max(0, round2(v.balance - reserved(v, exceptBookingId)));
const isValid = (v) => v && v.status === 'active' && v.valid_until >= today();

function view(v, admin) {
  const out = { code: v.code, amount: v.amount, balance: v.balance, available: available(v), validUntil: v.valid_until, valid: isValid(v) };
  if (admin) {
    Object.assign(out, { id: v.id, recipient: v.recipient || '', giver: v.giver || '', message: v.message || '', paidNote: v.paid_note || '', status: v.status, createdAt: v.created_at, createdBy: v.created_by,
      uses: db.prepare('SELECT u.*, b.date, b.time, b.treatment_name FROM voucher_uses u LEFT JOIN bookings b ON b.id = u.booking_id WHERE u.voucher_id = ? ORDER BY u.id').all(v.id),
      planned: db.prepare("SELECT id, date, time, treatment_name, voucher_amount FROM bookings WHERE voucher_id = ? AND status = 'confirmed' ORDER BY date, time").all(v.id) });
  }
  return out;
}

function issue({ amount, recipient, giver, message, paidNote, validUntil }, by) {
  const a = Number(amount);
  if (!Number.isFinite(a) || a < 10 || a > 20000) throw new VoucherError('Kwota bonu musi wynosić od 10 do 20 000 zł.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil || '') || validUntil < today()) throw new VoucherError('Podaj datę ważności z przyszłości.');
  const s = (v, n) => String(v || '').trim().slice(0, n) || null;
  const r = db.prepare('INSERT INTO vouchers (code, amount, balance, recipient, giver, message, paid_note, valid_until, created_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(newCode(), a, a, s(recipient, 80), s(giver, 80), s(message, 240), s(paidNote, 120), validUntil, nowIso(), by);
  return byId(Number(r.lastInsertRowid));
}

// Przy rezerwacji: zwraca kwotę, jaką bon pokryje (bez przekraczania ceny wizyty)
function planFor(code, total, lang) {
  const v = byCode(code);
  const L = (pl, en) => (lang === 'en' ? en : pl);
  if (!v) throw new VoucherError(L('Nie znaleziono bonu o tym kodzie. Sprawdź kod na bonie.', 'No gift voucher with this code. Please check the code.'));
  if (v.status !== 'active') throw new VoucherError(L('Ten bon jest nieważny.', 'This voucher is no longer valid.'));
  if (v.valid_until < today()) throw new VoucherError(L('Termin ważności bonu minął.', 'This voucher has expired.'));
  const av = available(v);
  if (av <= 0) throw new VoucherError(L('Środki na bonie zostały już wykorzystane albo zarezerwowane na inne wizyty.', 'The voucher balance has already been used or reserved for other visits.'));
  return { voucher: v, amount: round2(Math.min(av, total)) };
}
function attach(bookingId, voucherId, amount) {
  db.prepare('UPDATE bookings SET voucher_id = ?, voucher_amount = ? WHERE id = ?').run(voucherId, amount, bookingId);
}

// Po odbytej wizycie: odejmujemy kwotę z salda (najwyżej tyle, ile zostało)
function settleBooking(b) {
  if (!b.voucher_id || !b.voucher_amount) return;
  if (db.prepare('SELECT 1 FROM voucher_uses WHERE booking_id = ?').get(b.id)) return;
  const v = byId(b.voucher_id); if (!v) return;
  const amt = round2(Math.min(v.balance, b.voucher_amount));
  if (amt <= 0) return;
  db.prepare('UPDATE vouchers SET balance = round(balance - ?, 2) WHERE id = ?').run(amt, v.id);
  db.prepare('INSERT INTO voucher_uses (voucher_id, booking_id, amount, at, by) VALUES (?,?,?,?,?)').run(v.id, b.id, amt, nowIso(), 'system');
}
// Nieobecność po rozliczeniu: kwota wraca na bon (zabieg się nie odbył)
function unsettleBooking(b) {
  const u = db.prepare('SELECT * FROM voucher_uses WHERE booking_id = ?').get(b.id);
  if (!u) return;
  db.prepare('UPDATE vouchers SET balance = round(balance + ?, 2) WHERE id = ?').run(u.amount, u.voucher_id);
  db.prepare('DELETE FROM voucher_uses WHERE id = ?').run(u.id);
}

// Rozliczenie ręczne w panelu
function redeem(id, amount, note, by) {
  return tx(() => {
    const v = byId(id);
    if (!v) throw new VoucherError('Nie znaleziono bonu.');
    if (!isValid(v)) throw new VoucherError('Bon jest nieważny albo po terminie.');
    const a = round2(Number(amount));
    const av = available(v);
    if (!(a > 0)) throw new VoucherError('Podaj kwotę do rozliczenia.');
    if (a > av) throw new VoucherError(`Na bonie zostało ${av.toLocaleString('pl-PL')} zł do wykorzystania${reserved(v) ? ' (część jest zarezerwowana na umówione wizyty)' : ''}.`);
    db.prepare('UPDATE vouchers SET balance = round(balance - ?, 2) WHERE id = ?').run(a, v.id);
    db.prepare('INSERT INTO voucher_uses (voucher_id, amount, note, at, by) VALUES (?,?,?,?,?)').run(v.id, a, String(note || '').trim().slice(0, 160) || null, nowIso(), by);
    return byId(v.id);
  });
}
function setVoid(id, voided) {
  db.prepare('UPDATE vouchers SET status = ? WHERE id = ?').run(voided ? 'void' : 'active', id);
}
const list = () => db.prepare('SELECT * FROM vouchers ORDER BY id DESC').all().map((v) => view(v, true));

module.exports = { VoucherError, issue, byCode, byId, view, planFor, attach, settleBooking, unsettleBooking, redeem, setVoid, list, available, isValid };
