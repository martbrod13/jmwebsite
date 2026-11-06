/*
 * Opinie klientek na stronie. Tylko prawdziwe opinie osób, które były na zabiegu,
 * publikowane za ich zgodą i bez zmian w treści (wymaga tego prawo konsumenckie).
 */
const { db, nowIso } = require('./db');
const B = require('./booking');
const C = require('./site-config');

const SOURCES = { google: 'Google', booksy: 'Booksy', instagram: 'Instagram', facebook: 'Facebook', 'osobiście': 'osobiście', inne: 'inne' };
class ReviewError extends Error {}

function view(r, admin) {
  const t = r.treatment_id ? B.treatment(r.treatment_id) : null;
  const out = { id: r.id, author: r.author, treatmentId: r.treatment_id, treatment: t ? t.name : '', treatmentEn: t ? (C.namesEn[t.id] || t.name) : '',
    text: r.text, textEn: r.text_en || '', rating: r.rating, source: r.source, sourceName: SOURCES[r.source] || r.source, givenOn: r.given_on };
  if (admin) Object.assign(out, { published: !!r.published, consentNote: r.consent_note || '', createdAt: r.created_at, createdBy: r.created_by });
  return out;
}
const list = (admin) => db.prepare(`SELECT * FROM reviews ${admin ? '' : 'WHERE published = 1'} ORDER BY sort, id`).all().map((r) => view(r, admin));

function clean(d, partial) {
  const out = {};
  if (!partial || d.author !== undefined) {
    out.author = String(d.author || '').trim().slice(0, 40);
    if (out.author.length < 2) throw new ReviewError('Wpisz imię autorki i pierwszą literę nazwiska, np. „Anna K.”.');
  }
  if (!partial || d.text !== undefined) {
    out.text = String(d.text || '').trim().slice(0, 1200);
    if (out.text.length < 10) throw new ReviewError('Wklej treść opinii (co najmniej kilka słów).');
  }
  if (!partial || d.textEn !== undefined) out.text_en = String(d.textEn || '').trim().slice(0, 1200) || null;
  if (!partial || d.treatmentId !== undefined) {
    out.treatment_id = d.treatmentId ? String(d.treatmentId) : null;
    if (out.treatment_id && !B.treatment(out.treatment_id)) throw new ReviewError('Nie ma takiego zabiegu.');
  }
  if (!partial || d.rating !== undefined) {
    out.rating = d.rating === null || d.rating === '' || d.rating === undefined ? null : Number(d.rating);
    if (out.rating !== null && !(Number.isInteger(out.rating) && out.rating >= 1 && out.rating <= 5)) throw new ReviewError('Ocena musi być od 1 do 5.');
  }
  if (!partial || d.source !== undefined) {
    out.source = String(d.source || 'osobiście');
    if (!SOURCES[out.source]) throw new ReviewError('Wybierz, skąd pochodzi opinia.');
  }
  if (!partial || d.givenOn !== undefined) {
    out.given_on = String(d.givenOn || '');
    if (!B.DATE_RE.test(out.given_on) || out.given_on > B.isoDate(new Date())) throw new ReviewError('Podaj datę opinii (nie z przyszłości).');
  }
  if (!partial || d.consentNote !== undefined) out.consent_note = String(d.consentNote || '').trim().slice(0, 200) || null;
  if (partial && d.published !== undefined) out.published = d.published ? 1 : 0;
  return out;
}

function add(d, by) {
  if (d.confirm !== true) throw new ReviewError('Potwierdź, że to prawdziwa opinia klientki, która była na zabiegu, i że masz jej zgodę na publikację.');
  const v = clean(d, false);
  const sort = (db.prepare('SELECT min(sort) AS m FROM reviews').get().m ?? 1) - 1; // nowa opinia na początku
  const r = db.prepare(`INSERT INTO reviews (author, treatment_id, text, text_en, rating, source, given_on, consent_note, sort, created_at, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(v.author, v.treatment_id, v.text, v.text_en, v.rating, v.source, v.given_on, v.consent_note, sort, nowIso(), by);
  return view(db.prepare('SELECT * FROM reviews WHERE id = ?').get(Number(r.lastInsertRowid)), true);
}
function update(id, d) {
  if (!db.prepare('SELECT 1 FROM reviews WHERE id = ?').get(id)) throw new ReviewError('Nie znaleziono opinii.');
  const v = clean(d, true); const keys = Object.keys(v);
  if (keys.length) db.prepare(`UPDATE reviews SET ${keys.map((k) => k + ' = ?').join(', ')} WHERE id = ?`).run(...keys.map((k) => v[k]), id);
}
function move(id, dir) {
  const items = db.prepare('SELECT id FROM reviews ORDER BY sort, id').all().map((x) => x.id);
  const i = items.indexOf(id), j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  const upd = db.prepare('UPDATE reviews SET sort = ? WHERE id = ?');
  items.forEach((x, k) => upd.run(k + 1, x));
}
const remove = (id) => db.prepare('DELETE FROM reviews WHERE id = ?').run(id);

module.exports = { ReviewError, SOURCES, list, add, update, move, remove };
