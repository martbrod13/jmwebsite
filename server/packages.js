/*
 * Pakiety zabiegów (np. 3 mezoterapie w cenie pakietu).
 * Gabinet ustala ofertę i sprzedaje pakiet w gabinecie; wizyty z pakietu kosztują 0 zł.
 * Zabieg z pakietu zużywa się, gdy wizyta się odbędzie, przy nieobecności
 * i przy odwołaniu przez klientkę później niż 12 godzin przed wizytą (tak jak opłata w regulaminie).
 */
const { db, tx, nowIso } = require('./db');
const B = require('./booking');
const C = require('./site-config');

class PackageError extends Error {}
const round2 = (x) => Math.round(x * 100) / 100;
const today = () => B.isoDate(new Date());

/* ---------- Oferta ---------- */
function typeView(t) {
  const tr = B.treatment(t.treatment_id);
  return {
    id: t.id, name: t.name, nameEn: tr ? `${C.namesEn[tr.id] || tr.name} × ${t.sessions}` : t.name,
    treatmentId: t.treatment_id, treatment: tr ? tr.name : t.treatment_id,
    sessions: t.sessions, price: t.price, perSession: round2(t.price / t.sessions), validDays: t.valid_days, validMonths: Math.round(t.valid_days / 30), active: !!t.active
  };
}
const listTypes = (activeOnly) => db.prepare(`SELECT * FROM package_types ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY name`).all().map(typeView);

function addType({ name, treatmentId, sessions, price, validMonths }) {
  const tr = B.treatment(treatmentId);
  if (!tr) throw new PackageError('Wybierz zabieg.');
  const n = Number(sessions), p = Number(price), m = Number(validMonths);
  if (!(Number.isInteger(n) && n >= 2 && n <= 20)) throw new PackageError('Pakiet może mieć od 2 do 20 zabiegów.');
  if (!(p > 0 && p <= 50000)) throw new PackageError('Podaj cenę pakietu.');
  if (!(Number.isInteger(m) && m >= 1 && m <= 24)) throw new PackageError('Ważność: od 1 do 24 miesięcy.');
  const label = String(name || '').trim().slice(0, 80) || `${tr.name} × ${n}`;
  db.prepare('INSERT INTO package_types (name, treatment_id, sessions, price, valid_days, created_at) VALUES (?,?,?,?,?,?)').run(label, tr.id, n, round2(p), m * 30, nowIso());
}
const setTypeActive = (id, on) => db.prepare('UPDATE package_types SET active = ? WHERE id = ?').run(on ? 1 : 0, id);
const removeType = (id) => db.prepare('DELETE FROM package_types WHERE id = ?').run(id);

/* ---------- Pakiety klientek ---------- */
const lateClientCancel = (b) => b.status === 'cancelled' && b.cancelled_by === 'client' && b.cancelled_at && B.startOf(b) - Date.parse(b.cancelled_at) < C.booking.cancelHours * 36e5;
const counts = (b) => b.status === 'done' || b.status === 'no_show' || lateClientCancel(b);

function view(p, admin) {
  const rows = db.prepare('SELECT * FROM bookings WHERE package_id = ? ORDER BY date, start_min').all(p.id);
  const used = rows.filter(counts).length, planned = rows.filter((b) => b.status === 'confirmed').length;
  const tr = B.treatment(p.treatment_id);
  const out = {
    id: p.id, name: p.name, nameEn: tr ? `${C.namesEn[tr.id] || tr.name} × ${p.sessions}` : p.name, treatmentId: p.treatment_id,
    sessions: p.sessions, used, planned, left: Math.max(0, p.sessions - used - planned), validUntil: p.valid_until,
    valid: p.status === 'active' && p.valid_until >= today(), status: p.status,
    visits: rows.map((b) => ({ id: b.id, date: b.date, time: b.time, status: b.status, counted: counts(b) }))
  };
  if (admin) Object.assign(out, { price: p.price, clientKey: p.client_key, clientName: p.client_name, note: p.note || '', createdAt: p.created_at, createdBy: p.created_by });
  return out;
}
const byId = (id) => db.prepare('SELECT * FROM packages WHERE id = ?').get(id);
const forClient = (key, admin) => db.prepare('SELECT * FROM packages WHERE client_key = ? ORDER BY created_at DESC').all(key).map((p) => view(p, admin));
const listSold = () => db.prepare("SELECT * FROM packages ORDER BY status = 'active' DESC, valid_until DESC").all().map((p) => view(p, true));

function sell({ typeId, key, clientName, note }, by) {
  const t = db.prepare('SELECT * FROM package_types WHERE id = ?').get(Number(typeId));
  if (!t) throw new PackageError('Wybierz pakiet z oferty.');
  if (!key || !clientName) throw new PackageError('Nie znaleziono klientki.');
  const until = new Date(); until.setDate(until.getDate() + t.valid_days);
  const r = db.prepare(`INSERT INTO packages (type_id, name, treatment_id, sessions, price, client_key, client_name, valid_until, note, created_at, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(t.id, t.name, t.treatment_id, t.sessions, t.price, key, clientName, B.isoDate(until), String(note || '').trim().slice(0, 200) || null, nowIso(), by);
  return view(byId(Number(r.lastInsertRowid)), true);
}
function setVoid(id, on) {
  if (!byId(id)) throw new PackageError('Nie znaleziono pakietu.');
  db.prepare('UPDATE packages SET status = ? WHERE id = ?').run(on ? 'void' : 'active', id);
}

// pakiety, z których można opłacić wizytę: ten zabieg, ważny w dniu wizyty, zostały zabiegi
const usableFor = (key, treatmentId, date) => (key ? db.prepare("SELECT * FROM packages WHERE client_key = ? AND treatment_id = ? AND status = 'active' AND valid_until >= ?").all(key, treatmentId, date)
  .map((p) => view(p, false)).filter((p) => p.left > 0) : []);

function attach(booking, packageId, key, lang) {
  const L = (pl, en) => (lang === 'en' ? en : pl);
  const p = byId(Number(packageId));
  if (!p || p.client_key !== key) throw new PackageError(L('Nie znaleziono pakietu.', 'Package not found.'));
  if (!['confirmed', 'done'].includes(booking.status)) throw new PackageError(L('Tej wizyty nie można już rozliczyć z pakietu.', 'This visit can no longer be paid with a package.'));
  if (booking.package_id) throw new PackageError(L('Ta wizyta jest już z pakietu.', 'This visit is already paid with a package.'));
  if (booking.voucher_id) throw new PackageError(L('Ta wizyta jest opłacona bonem podarunkowym.', 'This visit is paid with a gift voucher.'));
  if (p.treatment_id !== booking.treatment_id) throw new PackageError(L('Pakiet jest na inny zabieg.', 'The package is for a different treatment.'));
  if (p.status !== 'active' || p.valid_until < booking.date) throw new PackageError(L('Pakiet jest nieważny w dniu wizyty.', 'The package is not valid on the day of the visit.'));
  if (view(p, false).left < 1) throw new PackageError(L('W pakiecie nie zostały już zabiegi.', 'There are no treatments left in the package.'));
  db.prepare('UPDATE bookings SET package_id = ?, total = 0, discount_id = NULL, discount_label = NULL, discount_percent = 0 WHERE id = ?').run(p.id, booking.id);
}
function detach(booking) {
  if (!booking.package_id) return;
  if (!['confirmed', 'done'].includes(booking.status)) throw new PackageError('Tej wizyty nie można już zmienić.');
  db.prepare('UPDATE bookings SET package_id = NULL, total = price WHERE id = ?').run(booking.id);
}

// do statystyk: sprzedane pakiety w okresie
const soldSince = (iso) => db.prepare("SELECT count(*) AS n, coalesce(sum(price), 0) AS v FROM packages WHERE status = 'active' AND created_at >= ?").get(iso);

module.exports = { PackageError, listTypes, addType, setTypeActive, removeType, view, byId, forClient, listSold, sell, setVoid, usableFor, attach, detach, soldSince, counts };
