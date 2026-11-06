/*
 * Kopie zapasowe: baza (spójna kopia także przy działającym serwerze), zdjęcia z galerii i z kart zabiegowych.
 * Automatycznie raz dziennie (po 3:00) do data/backups; ręcznie: npm run backup
 */
const fs = require('fs');
const path = require('path');
const env = require('./env');
const { db, meta, nowIso } = require('./db');

const DIR = path.join(env.dataDir, 'backups');
const KEEP = 14;
const pad = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

function snapshot(file) {
  try { fs.unlinkSync(file); } catch (e) { /* nie było */ }
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  return file;
}

// zdjęcia: kopia lustrzana folderów galerii i kart zabiegowych (nowe pliki dochodzą, usunięte znikają)
function mirrorUploads() {
  let copied = 0;
  for (const name of ['gallery', 'karta']) {
    const src = path.join(env.dataDir, 'uploads', name), dst = path.join(DIR, name);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(dst, { recursive: true });
    const files = new Set(fs.readdirSync(src));
    files.forEach((f) => { const t = path.join(dst, f); if (!fs.existsSync(t)) { fs.copyFileSync(path.join(src, f), t); copied++; } });
    fs.readdirSync(dst).forEach((f) => { if (!files.has(f)) fs.unlinkSync(path.join(dst, f)); });
  }
  return copied;
}

function backupNow() {
  fs.mkdirSync(DIR, { recursive: true });
  const d = new Date();
  const file = path.join(DIR, `jm-${today()}_${pad(d.getHours())}${pad(d.getMinutes())}.db`);
  snapshot(file);
  mirrorUploads();
  // zostawiamy 14 najnowszych kopii bazy
  fs.readdirSync(DIR).filter((f) => /^jm-.*\.db$/.test(f)).sort().reverse().slice(KEEP).forEach((f) => fs.unlinkSync(path.join(DIR, f)));
  meta.set('last_backup', nowIso());
  return { file, size: fs.statSync(file).size };
}

function dailyBackup() {
  const last = meta.get('last_backup');
  const done = last && new Date(last).toDateString() === new Date().toDateString();
  if (!done && new Date().getHours() >= 3) {
    try { const r = backupNow(); console.log(`  Kopia zapasowa: ${path.relative(process.cwd(), r.file)}`); } catch (e) { console.error('  Kopia zapasowa nie powiodła się:', e.message); }
  }
}

function status() {
  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^jm-.*\.db$/.test(f)).sort().reverse() : [];
  return { last: meta.get('last_backup'), count: files.length, newest: files[0] || null, dir: path.relative(path.join(__dirname, '..'), DIR) };
}

// Plik tymczasowy do pobrania z panelu
function downloadCopy() {
  fs.mkdirSync(DIR, { recursive: true });
  return snapshot(path.join(DIR, 'pobranie-tmp.db'));
}

if (require.main === module) {
  const r = backupNow();
  console.log(`Kopia zapasowa gotowa: ${r.file} (${Math.round(r.size / 1024)} KB). Zdjęcia: ${path.join(DIR, 'gallery')}`);
}

module.exports = { backupNow, dailyBackup, status, downloadCopy };
