/*
 * Opinie klientek na stronie. Tylko prawdziwe opinie osób, które były na zabiegu,
 * publikowane za ich zgodą i bez zmian w treści (wymaga tego prawo konsumenckie).
 */
const crypto = require('crypto');
const { db, meta, nowIso } = require('./db');
const B = require('./booking');
const C = require('./site-config');

const SOURCES = { strona: 'strona gabinetu', google: 'Google', booksy: 'Booksy', instagram: 'Instagram', facebook: 'Facebook', 'osobiście': 'osobiście', inne: 'inne' };
const LINK_KEYS = ['google', 'booksy', 'facebook'];
class ReviewError extends Error {}

function view(r, admin) {
  const t = r.treatment_id ? B.treatment(r.treatment_id) : null;
  const out = { id: r.id, author: r.author, treatmentId: r.treatment_id, treatment: t ? t.name : '', treatmentEn: t ? (C.namesEn[t.id] || t.name) : '',
    text: r.text, textEn: r.text_en || '', rating: r.rating, source: r.source, sourceName: SOURCES[r.source] || r.source, givenOn: r.given_on };
  if (admin) {
    Object.assign(out, { published: !!r.published, consentNote: r.consent_note || '', createdAt: r.created_at, createdBy: r.created_by,
      origin: r.origin, publishOk: !!r.publish_ok, isNew: !!r.is_new, bookingId: r.booking_id });
    if (r.booking_id) {
      const b = B.getBooking(r.booking_id); const c = b ? B.contactOf(b) : null;
      if (b) out.visit = { date: b.date, time: b.time, treatment: b.treatment_name, client: c ? `${c.firstName} ${c.lastName || ''}`.trim() : 'konto usunięte', phone: c ? c.phone : '' };
    }
  }
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
  if (partial && d.isNew !== undefined) out.is_new = d.isNew ? 1 : 0;
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
  const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
  if (!r) throw new ReviewError('Nie znaleziono opinii.');
  // opinii ze strony nie zmieniamy (prawo konsumenckie): tylko publikacja, ukrycie i oznaczenie jako przeczytanej
  if (r.origin === 'strona') d = { published: d.published, isNew: d.published !== undefined ? false : d.isNew };
  const v = clean(d, true);
  if (v.published && !r.publish_ok) throw new ReviewError('Klientka nie zgodziła się na publikację tej opinii. Zostaje tylko dla gabinetu.');
  if (v.published !== undefined) v.is_new = 0;
  const keys = Object.keys(v).filter((k) => v[k] !== undefined);
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

/* ---------- Linki do opinii w Google, Booksy, Facebooku ---------- */
function links() {
  let l = {};
  try { l = JSON.parse(meta.get('review_links') || '{}'); } catch (e) { l = {}; }
  if (!l.google && meta.get('review_url')) l.google = meta.get('review_url'); // dawne ustawienie z SMS-ów
  return Object.fromEntries(LINK_KEYS.map((k) => [k, l[k] || '']));
}
function setLinks(d) {
  const out = {};
  for (const k of LINK_KEYS) {
    const u = String((d || {})[k] || '').trim();
    if (u && !/^https:\/\/[^\s<>"]{6,300}$/.test(u)) throw new ReviewError(`Link ${k === 'google' ? 'do Google' : k === 'booksy' ? 'do Booksy' : 'do Facebooka'} musi zaczynać się od https://.`);
    out[k] = u;
  }
  meta.set('review_links', JSON.stringify(out));
  return links();
}

/* ---------- Opinia od klientki ze strony ---------- */
// klucz do linku z SMS-a i ze strony wizyty: /o/<klucz>; tworzony przy pierwszej potrzebie
function tokenFor(b) {
  if (b.review_token) return b.review_token;
  const t = crypto.randomBytes(12).toString('base64url');
  db.prepare('UPDATE bookings SET review_token = ? WHERE id = ? AND review_token IS NULL').run(t, b.id);
  return B.getBooking(b.id).review_token;
}
const bookingByToken = (t) => (/^[A-Za-z0-9_-]{16,40}$/.test(t || '') ? db.prepare('SELECT * FROM bookings WHERE review_token = ?').get(t) || null : null);
// kod rezerwacji z SMS-a i e-maila + numer telefonu: dla klientek bez linku
function findByCode(code, phone) {
  const key = String(phone || '').replace(/\D/g, '').slice(-9);
  const b = db.prepare("SELECT * FROM bookings WHERE upper(code) = ? AND status = 'done'").get(String(code || '').trim().toUpperCase());
  if (!b || key.length < 9) return null;
  const c = B.contactOf(b);
  return c && String(c.phone).replace(/\D/g, '').slice(-9) === key ? b : null;
}
const reviewOfBooking = (id) => db.prepare('SELECT * FROM reviews WHERE booking_id = ?').get(id) || null;
function clientView(b, lang) {
  const c = B.contactOf(b); const r = reviewOfBooking(b.id);
  return {
    visit: { treatmentId: b.treatment_id, treatmentName: b.treatment_name, date: b.date, firstName: c ? c.firstName : '', status: b.status },
    author: c ? `${c.firstName} ${c.lastName ? c.lastName.trim()[0].toUpperCase() + '.' : ''}`.trim() : '',
    review: r ? { text: r.text, rating: r.rating, author: r.author, publishOk: !!r.publish_ok, published: !!r.published } : null,
    canWrite: b.status === 'done' && (!r || !r.published), links: links(), lang
  };
}
function submit(b, d, lang) {
  const L = (pl, en) => (lang === 'en' ? en : pl);
  if (b.status !== 'done') throw new ReviewError(L('Opinię można wystawić po odbytej wizycie.', 'You can leave a review after your visit has taken place.'));
  const old = reviewOfBooking(b.id);
  if (old && old.published) throw new ReviewError(L('Twoja opinia jest już na stronie. Jeśli chcesz ją zmienić, napisz do gabinetu.', 'Your review is already on the website. To change it, contact the studio.'));
  const text = String(d.text || '').trim().slice(0, 1200);
  if (text.length < 10) throw new ReviewError(L('Napisz kilka słów o wizycie.', 'Write a few words about your visit.'));
  const rating = d.rating === null || d.rating === undefined || d.rating === '' ? null : Number(d.rating);
  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) throw new ReviewError(L('Ocena musi być od 1 do 5.', 'The rating must be from 1 to 5.'));
  const c = B.contactOf(b);
  const author = String(d.author || '').trim().slice(0, 40) || (c ? c.firstName : L('Klientka', 'Client'));
  const publish = d.publish === true ? 1 : 0;
  const now = nowIso(), today = B.isoDate(new Date());
  const consent = publish ? `zgoda na publikację zaznaczona na stronie ${today}` : null;
  if (old) {
    db.prepare('UPDATE reviews SET text = ?, rating = ?, author = ?, publish_ok = ?, consent_note = ?, given_on = ?, is_new = 1 WHERE id = ?').run(text, rating, author, publish, consent, today, old.id);
  } else {
    db.prepare(`INSERT INTO reviews (author, treatment_id, text, rating, source, given_on, published, sort, consent_note, created_at, created_by, booking_id, origin, publish_ok, is_new)
      VALUES (?,?,?,?, 'strona', ?, 0, ?, ?, ?, 'klientka', ?, 'strona', ?, 1)`).run(author, b.treatment_id, text, rating, today,
      (db.prepare('SELECT min(sort) AS m FROM reviews').get().m ?? 1) - 1, consent, now, b.id, publish);
  }
  return clientView(B.getBooking(b.id), lang);
}

module.exports = { ReviewError, SOURCES, list, add, update, move, remove, links, setLinks, tokenFor, bookingByToken, findByCode, clientView, submit, reviewOfBooking };
