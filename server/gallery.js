/* Galeria efektów: zapis zdjęć i opisów. Zdjęcia zmniejsza i oczyszcza z danych EXIF przeglądarka w panelu. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db, nowIso } = require('./db');
const env = require('./env');
const C = require('./site-config');

const DIR = path.join(env.dataDir, 'uploads', 'gallery');
fs.mkdirSync(DIR, { recursive: true });
const FILE_RE = /^[A-Za-z0-9_-]{16,40}\.(webp|jpg)$/;
const MAX_BYTES = 6 * 1024 * 1024;
const CATEGORIES = C.categories.map((c) => c.id);

class GalleryError extends Error {}

// rozpoznaje format po pierwszych bajtach — nie ufamy nazwie ani typowi z przeglądarki
function sniff(buf) {
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  return null;
}
function decode(b64, label) {
  if (typeof b64 !== 'string' || !b64) throw new GalleryError(`Brakuje pliku (${label}).`);
  const buf = Buffer.from(b64, 'base64');
  if (buf.length > MAX_BYTES) throw new GalleryError('Zdjęcie jest za duże (maksymalnie 6 MB po zmniejszeniu).');
  const ext = sniff(buf);
  if (!ext) throw new GalleryError('Nieobsługiwany format zdjęcia. Użyj JPG, PNG albo WebP.');
  return { buf, ext };
}

function view(g, admin) {
  const out = {
    id: g.id, src: '/uploads/gallery/' + g.file, thumb: '/uploads/gallery/' + g.thumb, width: g.width, height: g.height,
    category: g.category, altPl: g.alt_pl, altEn: g.alt_en || ''
  };
  if (admin) Object.assign(out, { published: !!g.published, consentNote: g.consent_note || '', consentAt: g.consent_at, consentBy: g.consent_by, createdAt: g.created_at });
  return out;
}
const list = (admin) => db.prepare(`SELECT * FROM gallery ${admin ? '' : 'WHERE published = 1'} ORDER BY sort, id`).all().map((g) => view(g, admin));

function add({ image, thumb, width, height, category, altPl, altEn, consent, consentNote }, adminEmail) {
  if (consent !== true) throw new GalleryError('Potwierdź, że masz pisemną zgodę klientki na publikację zdjęcia.');
  if (!CATEGORIES.includes(category)) throw new GalleryError('Wybierz kategorię zabiegu.');
  const alt = String(altPl || '').trim().slice(0, 160);
  if (!alt) throw new GalleryError('Dodaj krótki opis zdjęcia, np. „Brwi pudrowe, efekt po wygojeniu”.');
  const w = Number(width), h = Number(height);
  if (!(w > 0 && h > 0 && w <= 4000 && h <= 4000)) throw new GalleryError('Nieprawidłowe wymiary zdjęcia.');
  const big = decode(image, 'zdjęcie'), small = decode(thumb, 'miniatura');
  const id = crypto.randomBytes(12).toString('base64url');
  const file = id + '.' + big.ext, tfile = id + '-m.' + small.ext;
  fs.writeFileSync(path.join(DIR, file), big.buf);
  fs.writeFileSync(path.join(DIR, tfile), small.buf);
  const sort = (db.prepare('SELECT max(sort) AS m FROM gallery').get().m ?? 0) + 1;
  const r = db.prepare(`INSERT INTO gallery (file, thumb, width, height, category, alt_pl, alt_en, consent_note, consent_at, consent_by, sort, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(file, tfile, w, h, category, alt, String(altEn || '').trim().slice(0, 160) || null,
    String(consentNote || '').trim().slice(0, 200) || null, nowIso(), adminEmail, sort, nowIso());
  return view(db.prepare('SELECT * FROM gallery WHERE id = ?').get(Number(r.lastInsertRowid)), true);
}

function update(id, d) {
  const g = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id);
  if (!g) throw new GalleryError('Nie znaleziono zdjęcia.');
  if (d.category !== undefined && !CATEGORIES.includes(d.category)) throw new GalleryError('Wybierz kategorię zabiegu.');
  if (d.altPl !== undefined && !String(d.altPl).trim()) throw new GalleryError('Opis zdjęcia nie może być pusty.');
  db.prepare('UPDATE gallery SET category = ?, alt_pl = ?, alt_en = ?, published = ? WHERE id = ?').run(
    d.category ?? g.category, d.altPl !== undefined ? String(d.altPl).trim().slice(0, 160) : g.alt_pl,
    d.altEn !== undefined ? (String(d.altEn).trim().slice(0, 160) || null) : g.alt_en,
    d.published !== undefined ? (d.published ? 1 : 0) : g.published, id);
}

function move(id, dir) {
  const items = db.prepare('SELECT id FROM gallery ORDER BY sort, id').all().map((x) => x.id);
  const i = items.indexOf(id), j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  const upd = db.prepare('UPDATE gallery SET sort = ? WHERE id = ?');
  items.forEach((x, k) => upd.run(k + 1, x));
}

function remove(id) {
  const g = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id);
  if (!g) return;
  db.prepare('DELETE FROM gallery WHERE id = ?').run(id);
  for (const f of [g.file, g.thumb]) { try { fs.unlinkSync(path.join(DIR, f)); } catch (e) { /* plik już usunięty */ } }
}

// plik do wyświetlenia: tylko zdjęcia z bazy; ukryte widzi wyłącznie panel
function fileFor(name, isAdmin) {
  if (!FILE_RE.test(name)) return null;
  const g = db.prepare('SELECT published FROM gallery WHERE file = ? OR thumb = ?').get(name, name);
  if (!g || (!g.published && !isAdmin)) return null;
  const p = path.join(DIR, name);
  return fs.existsSync(p) ? p : null;
}

module.exports = { GalleryError, list, add, update, move, remove, fileFor, decode };
