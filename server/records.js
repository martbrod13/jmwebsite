/*
 * Karta zabiegowa klientki: notatki z wizyt, prywatne zdjęcia przed/po (tylko panel)
 * i nieobowiązkowa ankieta przed zabiegiem, którą wypełnia klientka.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db, tx, nowIso } = require('./db');
const env = require('./env');
const C = require('./site-config');
const B = require('./booking');
const G = require('./gallery');

const DIR = path.join(env.dataDir, 'uploads', 'karta');
fs.mkdirSync(DIR, { recursive: true });
const FILE_RE = /^[A-Za-z0-9_-]{16,40}(-m)?\.(webp|jpg)$/;
const KINDS = ['before', 'after', 'other'];
const QUESTIONS = C.questionnaire;

class RecordError extends Error {}

/* ---------- Klientka: te same klucze co lista klientek w panelu ---------- */
// konto: e-mail; gość: e-mail albo „tel:” i cyfry numeru
function keyOfBooking(b, emailById) {
  if (b.client_id && emailById.has(b.client_id)) return emailById.get(b.client_id);
  if (b.guest_email || b.guest_phone) return (b.guest_email || 'tel:' + String(b.guest_phone).replace(/\D/g, '')).toLowerCase();
  return null;
}
function bookingsOfClient(key) {
  const emailById = new Map(db.prepare('SELECT id, email FROM clients').all().map((c) => [c.id, c.email.toLowerCase()]));
  return db.prepare('SELECT * FROM bookings ORDER BY date DESC, start_min DESC').all().filter((b) => keyOfBooking(b, emailById) === key);
}

/* ---------- Notatki ---------- */
function setNote(bookingId, text, by) {
  if (!B.getBooking(bookingId)) throw new RecordError('Nie znaleziono wizyty.');
  const t = String(text || '').trim().slice(0, 4000);
  if (!t) { db.prepare('DELETE FROM visit_notes WHERE booking_id = ?').run(bookingId); return null; }
  db.prepare(`INSERT INTO visit_notes (booking_id, text, updated_at, updated_by) VALUES (?,?,?,?)
    ON CONFLICT(booking_id) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at, updated_by = excluded.updated_by`).run(bookingId, t, nowIso(), by);
  return noteOf(bookingId);
}
function noteOf(bookingId) {
  const n = db.prepare('SELECT * FROM visit_notes WHERE booking_id = ?').get(bookingId);
  return n ? { text: n.text, updatedAt: n.updated_at, updatedBy: n.updated_by } : null;
}

/* ---------- Zdjęcia (prywatne) ---------- */
const photoView = (p) => ({ id: p.id, kind: p.kind, src: '/uploads/karta/' + p.file, thumb: '/uploads/karta/' + p.thumb, width: p.width, height: p.height, createdAt: p.created_at });
const photosOf = (bookingId) => db.prepare('SELECT * FROM visit_photos WHERE booking_id = ? ORDER BY id').all(bookingId).map(photoView);

function addPhoto(bookingId, { image, thumb, width, height, kind }, by) {
  if (!B.getBooking(bookingId)) throw new RecordError('Nie znaleziono wizyty.');
  if (!KINDS.includes(kind)) throw new RecordError('Wybierz, czy to zdjęcie przed, czy po zabiegu.');
  const w = Number(width), h = Number(height);
  if (!(w > 0 && h > 0 && w <= 4000 && h <= 4000)) throw new RecordError('Nieprawidłowe wymiary zdjęcia.');
  let big, small;
  try { big = G.decode(image, 'zdjęcie'); small = G.decode(thumb, 'miniatura'); } catch (e) { throw new RecordError(e.message); }
  if ((db.prepare('SELECT count(*) AS n FROM visit_photos WHERE booking_id = ?').get(bookingId).n) >= 24) throw new RecordError('Do jednej wizyty można dodać najwyżej 24 zdjęcia.');
  const id = crypto.randomBytes(12).toString('base64url');
  const file = id + '.' + big.ext, tfile = id + '-m.' + small.ext;
  fs.writeFileSync(path.join(DIR, file), big.buf);
  fs.writeFileSync(path.join(DIR, tfile), small.buf);
  const r = db.prepare('INSERT INTO visit_photos (booking_id, file, thumb, width, height, kind, created_at, created_by) VALUES (?,?,?,?,?,?,?,?)')
    .run(bookingId, file, tfile, w, h, kind, nowIso(), by);
  return photoView(db.prepare('SELECT * FROM visit_photos WHERE id = ?').get(Number(r.lastInsertRowid)));
}
function unlinkPhoto(p) { for (const f of [p.file, p.thumb]) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) { /* już usunięty */ } } }
function removePhoto(id) {
  const p = db.prepare('SELECT * FROM visit_photos WHERE id = ?').get(id);
  if (!p) return false;
  db.prepare('DELETE FROM visit_photos WHERE id = ?').run(id); unlinkPhoto(p);
  return true;
}
// plik zdjęcia: tylko z bazy i tylko dla zalogowanego panelu (sprawdza index.js)
function fileFor(name) {
  if (!FILE_RE.test(name)) return null;
  if (!db.prepare('SELECT 1 FROM visit_photos WHERE file = ? OR thumb = ?').get(name, name)) return null;
  const p = path.join(DIR, name);
  return fs.existsSync(p) ? p : null;
}
// pliki, których nie ma już w bazie (np. po usunięciu danych przykładowych), znikają z dysku
function cleanupFiles() {
  const known = new Set();
  db.prepare('SELECT file, thumb FROM visit_photos').all().forEach((p) => { known.add(p.file); known.add(p.thumb); });
  let n = 0;
  fs.readdirSync(DIR).forEach((f) => { if (FILE_RE.test(f) && !known.has(f)) { fs.unlinkSync(path.join(DIR, f)); n++; } });
  return n;
}

/* ---------- Ankieta przed zabiegiem ---------- */
// zwraca oczyszczone odpowiedzi: tylko znane pytania, „yes”/„no”, krótkie szczegóły
function cleanAnswers(raw) {
  const out = {}; let flags = 0;
  const src = raw && typeof raw === 'object' ? raw : {};
  QUESTIONS.forEach((q) => {
    const a = src[q.id] || {};
    if (a.a !== 'yes' && a.a !== 'no') return;
    out[q.id] = { a: a.a };
    if (a.a === 'yes') { flags++; if (q.detail && a.d) out[q.id].d = String(a.d).trim().slice(0, 400); }
  });
  const other = String(src.other || '').trim().slice(0, 1000);
  if (other) out.other = other;
  return { answers: out, flags };
}
const questionnaireOf = (bookingId) => {
  const q = db.prepare('SELECT * FROM questionnaires WHERE booking_id = ?').get(bookingId);
  return q ? { answers: JSON.parse(q.answers), flags: q.flags, lang: q.lang, consentAt: q.consent_at, createdAt: q.created_at, updatedAt: q.updated_at } : null;
};
// klientka może zmieniać ankietę do początku wizyty
const questionnaireEditable = (b) => b.status === 'confirmed' && B.startOf(b) > Date.now();

function saveQuestionnaire(b, { answers, consent }, lang) {
  if (!questionnaireEditable(b)) throw new RecordError(lang === 'en' ? 'The questionnaire can no longer be changed for this visit.' : 'Ankiety do tej wizyty nie można już zmienić.');
  if (consent !== true) throw new RecordError(lang === 'en' ? 'To send the questionnaire, agree to the processing of your health information.' : 'Żeby wysłać ankietę, zaznacz zgodę na przetwarzanie informacji o zdrowiu.');
  const clean = cleanAnswers(answers);
  if (!Object.keys(clean.answers).length) throw new RecordError(lang === 'en' ? 'Answer at least one question, or simply skip the questionnaire.' : 'Odpowiedz na co najmniej jedno pytanie albo po prostu pomiń ankietę.');
  const now = nowIso();
  db.prepare(`INSERT INTO questionnaires (booking_id, answers, flags, lang, consent_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(booking_id) DO UPDATE SET answers = excluded.answers, flags = excluded.flags, lang = excluded.lang, consent_at = excluded.consent_at, updated_at = excluded.updated_at`)
    .run(b.id, JSON.stringify(clean.answers), clean.flags, lang === 'en' ? 'en' : 'pl', now, now, now);
  return questionnaireOf(b.id);
}
const deleteQuestionnaire = (bookingId) => db.prepare('DELETE FROM questionnaires WHERE booking_id = ?').run(bookingId).changes > 0;

// ostatnia ankieta tej samej klientki z konta (do podpowiedzi przy kolejnej wizycie)
function lastQuestionnaireOfClient(clientId, exceptBookingId) {
  const r = db.prepare(`SELECT q.booking_id FROM questionnaires q JOIN bookings b ON b.id = q.booking_id
    WHERE b.client_id = ? AND q.booking_id != ? ORDER BY q.updated_at DESC LIMIT 1`).get(clientId, exceptBookingId);
  return r ? questionnaireOf(r.booking_id) : null;
}

// Ankieta w czytelnej postaci dla panelu (pytania po polsku)
function readable(q) {
  if (!q) return null;
  const rows = QUESTIONS.filter((x) => q.answers[x.id]).map((x) => ({ id: x.id, question: x.pl, answer: q.answers[x.id].a, detail: q.answers[x.id].d || '' }));
  return { rows, other: q.answers.other || '', flags: q.flags, skipped: QUESTIONS.length - rows.length, lang: q.lang, updatedAt: q.updatedAt, consentAt: q.consentAt };
}

/* ---------- Karta klientki w panelu ---------- */
function card(key) {
  const list = bookingsOfClient(key);
  return list.map((b) => ({
    id: b.id, date: b.date, time: b.time, end: B.toTime(b.end_min), status: b.status, treatmentId: b.treatment_id, treatmentName: b.treatment_name,
    total: b.total, source: b.source, notes: b.notes, afterSms: !!b.after_sms, demo: !!b.demo,
    note: noteOf(b.id), photos: photosOf(b.id), questionnaire: readable(questionnaireOf(b.id))
  }));
}
// usunięcie zdjęć i ankiet klientki (np. na jej prośbę); notatki zostają, jeśli keepNotes
function purgeClient(key, keepNotes) {
  const ids = bookingsOfClient(key).map((b) => b.id);
  return purgeBookings(ids, keepNotes);
}
function purgeBookings(ids, keepNotes) {
  if (!ids.length) return { photos: 0, questionnaires: 0, notes: 0 };
  const marks = ids.map(() => '?').join(',');
  const photos = db.prepare(`SELECT * FROM visit_photos WHERE booking_id IN (${marks})`).all(...ids);
  const res = tx(() => ({
    photos: db.prepare(`DELETE FROM visit_photos WHERE booking_id IN (${marks})`).run(...ids).changes,
    questionnaires: db.prepare(`DELETE FROM questionnaires WHERE booking_id IN (${marks})`).run(...ids).changes,
    notes: keepNotes ? 0 : db.prepare(`DELETE FROM visit_notes WHERE booking_id IN (${marks})`).run(...ids).changes
  }));
  photos.forEach(unlinkPhoto);
  return res;
}

// Skrót do widoku wizyty w panelu
function summary(bookingId) {
  const q = db.prepare('SELECT flags FROM questionnaires WHERE booking_id = ?').get(bookingId);
  return {
    questionnaire: q ? { flags: q.flags } : null,
    hasNote: !!db.prepare('SELECT 1 FROM visit_notes WHERE booking_id = ?').get(bookingId),
    photos: db.prepare('SELECT count(*) AS n FROM visit_photos WHERE booking_id = ?').get(bookingId).n
  };
}

module.exports = {
  RecordError, QUESTIONS, keyOfBooking, bookingsOfClient,
  setNote, noteOf, addPhoto, removePhoto, photosOf, fileFor, cleanupFiles,
  cleanAnswers, questionnaireOf, questionnaireEditable, saveQuestionnaire, deleteQuestionnaire, lastQuestionnaireOfClient, readable,
  card, purgeClient, purgeBookings, summary
};
