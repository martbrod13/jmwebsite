/*
 * Program poleceń.
 * Klientka z kontem ma swój kod i link (/p/<kod>). Nowa osoba, która zarezerwuje z tym kodem,
 * ma zniżkę na pierwszą wizytę. Gdy ta wizyta się odbędzie, polecająca dostaje nagrodę:
 * zniżkę na swoją kolejną wizytę (nalicza się sama przy rezerwacji online albo w panelu).
 * Zniżki się nie sumują: przy rezerwacji wybierana jest najkorzystniejsza.
 */
const crypto = require('crypto');
const { db, tx, meta, nowIso } = require('./db');
const B = require('./booking');

class RefError extends Error {}
const round2 = (x) => Math.round(x * 100) / 100;
const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-9);
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bez liter i cyfr, które łatwo pomylić

/* ---------- Ustawienia (panel) ---------- */
function settings() {
  const num = (k, def) => { const v = Number(meta.get(k)); return v > 0 && v <= 50 ? v : def; };
  return { on: meta.get('referral_on') !== '0', newPercent: num('referral_new_pct', 15), refPercent: num('referral_ref_pct', 15) };
}
function setSettings({ on, newPercent, refPercent }) {
  for (const [v, name] of [[newPercent, 'dla nowej klientki'], [refPercent, 'dla polecającej']]) {
    const n = Number(v);
    if (!(Number.isInteger(n) && n >= 1 && n <= 50)) throw new RefError(`Zniżka ${name} musi być od 1 do 50%.`);
  }
  meta.set('referral_on', on ? '1' : '0'); meta.set('referral_new_pct', Number(newPercent)); meta.set('referral_ref_pct', Number(refPercent));
  return settings();
}

/* ---------- Kod klientki ---------- */
function codeFor(client) {
  if (client.ref_code) return client.ref_code;
  const base = String(client.first_name || 'JM').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/gi, 'L').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 8) || 'JM';
  for (let i = 0; i < 20; i++) {
    const tail = Array.from(crypto.randomBytes(4), (b) => ALPHABET[b % ALPHABET.length]).join('');
    const code = `${base}-${tail}`;
    if (!db.prepare('SELECT 1 FROM clients WHERE ref_code = ?').get(code)) {
      db.prepare('UPDATE clients SET ref_code = ? WHERE id = ? AND ref_code IS NULL').run(code, client.id);
      return db.prepare('SELECT ref_code FROM clients WHERE id = ?').get(client.id).ref_code;
    }
  }
  throw new Error('Nie udało się utworzyć kodu polecenia.');
}
const norm = (code) => String(code || '').trim().toUpperCase().replace(/\s+/g, '');
const referrerByCode = (code) => { const c = norm(code); return /^[A-Z]{1,8}-[A-Z0-9]{4}$/.test(c) ? db.prepare('SELECT * FROM clients WHERE ref_code = ?').get(c) || null : null; };

// Czy osoba jest u nas pierwszy raz: żadnej wizyty (oprócz odwołanych) z tym telefonem, e-mailem albo kontem
function isNewPerson({ phone, email, clientId }) {
  const pk = phoneKey(phone), em = String(email || '').trim().toLowerCase();
  if (clientId && B.visitCount(clientId) > 0) return false;
  return !db.prepare("SELECT * FROM bookings WHERE status <> 'cancelled'").all().some((b) => {
    const c = B.contactOf(b); if (!c) return false;
    return (pk && phoneKey(c.phone) === pk) || (em && String(c.email || '').toLowerCase() === em);
  });
}

// Sprawdza kod przy rezerwacji; zwraca polecającą i zniżkę albo rzuca błąd z wyjaśnieniem
function check({ code, client, guest }, lang) {
  const L = (pl, en) => (lang === 'en' ? en : pl);
  const s = settings();
  if (!s.on) throw new RefError(L('Program poleceń jest teraz wyłączony.', 'The referral programme is currently switched off.'));
  const ref = referrerByCode(code);
  if (!ref) throw new RefError(L('Nie ma takiego kodu polecenia. Sprawdź, czy jest wpisany dokładnie.', 'This referral code does not exist. Check it is typed exactly.'));
  const phone = client ? client.phone : guest && guest.phone, email = client ? client.email : guest && guest.email;
  if ((client && client.id === ref.id) || phoneKey(phone) === phoneKey(ref.phone) || String(email || '').toLowerCase() === ref.email.toLowerCase())
    throw new RefError(L('To Twój własny kod. Podaj go koleżance, a nagroda trafi do Ciebie.', 'This is your own code. Give it to a friend and the reward goes to you.'));
  if (!isNewPerson({ phone, email, clientId: client && client.id }))
    throw new RefError(L('Zniżka z polecenia jest dla osób, które jeszcze nie były u nas na wizycie. Usuń kod, żeby zarezerwować bez niej.', 'The referral discount is for people who have not visited us yet. Remove the code to book without it.'));
  return { referrer: ref, option: { id: 'polecenie', label: 'Polecenie', percent: s.newPercent } };
}

/* ---------- Nagrody dla polecającej ---------- */
// statusy nagród wynikają z wizyt: odbyta wizyta koleżanki → nagroda do wykorzystania itd.
function sync() {
  const now = nowIso();
  tx(() => {
    db.prepare(`UPDATE referral_rewards SET status = 'available', updated_at = ? WHERE status = 'pending'
      AND referred_booking_id IN (SELECT id FROM bookings WHERE status = 'done')`).run(now);
    db.prepare(`UPDATE referral_rewards SET status = 'cancelled', updated_at = ? WHERE status = 'pending'
      AND referred_booking_id IN (SELECT id FROM bookings WHERE status IN ('cancelled', 'no_show'))`).run(now);
    db.prepare(`UPDATE referral_rewards SET status = 'used', updated_at = ? WHERE status = 'reserved'
      AND booking_id IN (SELECT id FROM bookings WHERE status = 'done')`).run(now);
    db.prepare(`UPDATE referral_rewards SET status = 'available', booking_id = NULL, updated_at = ? WHERE status = 'reserved'
      AND (booking_id IS NULL OR booking_id IN (SELECT id FROM bookings WHERE status IN ('cancelled', 'no_show')))`).run(now);
  });
}
const availableReward = (clientId) => { sync(); return db.prepare("SELECT * FROM referral_rewards WHERE client_id = ? AND status = 'available' ORDER BY id LIMIT 1").get(clientId) || null; };
const rewardOption = (clientId) => { const r = clientId ? availableReward(clientId) : null; return r ? { id: 'nagroda-polecenie', label: 'Nagroda za polecenie', percent: r.percent } : null; };

// po zapisaniu wizyty: polecenie → nagroda czeka na wizytę koleżanki; nagroda → zarezerwowana na tę wizytę
function afterBooking(b, referrerId) {
  const now = nowIso();
  if (b.discount_id === 'polecenie' && referrerId) {
    db.prepare('UPDATE bookings SET referrer_id = ? WHERE id = ?').run(referrerId, b.id);
    db.prepare('INSERT OR IGNORE INTO referral_rewards (client_id, referred_booking_id, percent, status, created_at, updated_at) VALUES (?,?,?,?,?,?)')
      .run(referrerId, b.id, settings().refPercent, 'pending', now, now);
  }
  if (b.discount_id === 'nagroda-polecenie' && b.client_id) {
    const r = availableReward(b.client_id);
    if (r) db.prepare("UPDATE referral_rewards SET status = 'reserved', booking_id = ?, updated_at = ? WHERE id = ?").run(b.id, now, r.id);
  }
}

// w panelu: nagroda przy wizycie dodanej telefonicznie
function rewardForBooking(b) {
  if (!b.client_id || b.status !== 'confirmed' || b.discount_percent || b.package_id || b.voucher_id || !b.price) return null;
  const r = availableReward(b.client_id);
  return r ? { id: r.id, percent: r.percent } : null;
}
function applyInPanel(b) {
  const r = rewardForBooking(b);
  if (!r) throw new RefError('Do tej wizyty nie można doliczyć nagrody za polecenie.');
  const total = round2(b.price - round2(b.price * r.percent / 100));
  tx(() => {
    db.prepare("UPDATE bookings SET total = ?, discount_id = 'nagroda-polecenie', discount_label = 'Nagroda za polecenie', discount_percent = ? WHERE id = ?").run(total, r.percent, b.id);
    db.prepare("UPDATE referral_rewards SET status = 'reserved', booking_id = ?, updated_at = ? WHERE id = ?").run(b.id, nowIso(), r.id);
  });
}

/* ---------- Widoki ---------- */
function forClient(client) {
  sync();
  const rows = db.prepare('SELECT status, percent FROM referral_rewards WHERE client_id = ?').all(client.id);
  const count = (st) => rows.filter((r) => r.status === st).length;
  return {
    code: codeFor(client), link: '/p/' + codeFor(client), settings: settings(),
    pending: count('pending'), available: count('available'), reserved: count('reserved'), used: count('used'),
    percent: settings().refPercent
  };
}
function adminList() {
  sync();
  return db.prepare('SELECT r.*, c.first_name, c.last_name FROM referral_rewards r JOIN clients c ON c.id = r.client_id ORDER BY r.id DESC').all().map((r) => {
    const fb = B.getBooking(r.referred_booking_id); const f = fb ? B.contactOf(fb) : null;
    const used = r.booking_id ? B.getBooking(r.booking_id) : null;
    return {
      id: r.id, referrer: `${r.first_name} ${r.last_name}`.trim(), referrerKey: db.prepare('SELECT email FROM clients WHERE id = ?').get(r.client_id).email.toLowerCase(),
      friend: f ? `${f.firstName} ${f.lastName || ''}`.trim() : '–', friendVisit: fb ? { date: fb.date, time: fb.time, status: fb.status, treatment: fb.treatment_name } : null,
      percent: r.percent, status: r.status, usedOn: used ? used.date : null, createdAt: r.created_at
    };
  });
}

module.exports = { RefError, settings, setSettings, codeFor, referrerByCode, isNewPerson, check, sync, rewardOption, afterBooking, rewardForBooking, applyInPanel, forClient, adminList };
