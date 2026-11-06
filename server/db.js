/*
 * Baza danych: SQLite wbudowany w Node.js (node:sqlite), plik data/jm.db.
 * Nic nie trzeba instalować. Schemat odpowiada database/schema.sql (PostgreSQL),
 * żeby w razie potrzeby łatwo przenieść dane do Supabase.
 */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const env = require('./env');

fs.mkdirSync(env.dataDir, { recursive: true });
const db = new DatabaseSync(path.join(env.dataDir, 'jm.db'));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  must_change   INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id            INTEGER PRIMARY KEY,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone         TEXT NOT NULL,
  birth_month   INTEGER CHECK (birth_month BETWEEN 1 AND 12),
  language      TEXT NOT NULL DEFAULT 'pl' CHECK (language IN ('pl','en')),
  password_hash TEXT NOT NULL,
  demo          INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- aktualny stan zgód + pełna historia zmian (dowód zgody wymagany przez RODO)
CREATE TABLE IF NOT EXISTS consents (
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind      TEXT NOT NULL CHECK (kind IN ('terms','marketing_sms','marketing_email')),
  value     INTEGER NOT NULL,
  at        TEXT NOT NULL,
  PRIMARY KEY (client_id, kind)
);
CREATE TABLE IF NOT EXISTS consent_log (
  id        INTEGER PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  at        TEXT NOT NULL,
  change    TEXT NOT NULL,
  ip        TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  kind       TEXT NOT NULL CHECK (kind IN ('client','admin')),
  subject_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at    TEXT
);

-- historia cen: aktualna cena to ostatni wpis; potrzebna do najniższej ceny z 30 dni (Omnibus)
CREATE TABLE IF NOT EXISTS price_history (
  id           INTEGER PRIMARY KEY,
  treatment_id TEXT NOT NULL,
  price        REAL NOT NULL CHECK (price >= 0),
  valid_from   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS price_history_t ON price_history (treatment_id, valid_from);

CREATE TABLE IF NOT EXISTS promotions (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  text        TEXT NOT NULL DEFAULT '',
  percent     REAL NOT NULL CHECK (percent > 0 AND percent <= 50),
  categories  TEXT NOT NULL DEFAULT 'all',   -- 'all' albo JSON z listą kategorii
  date_from   TEXT NOT NULL,
  date_to     TEXT NOT NULL,
  birthday    INTEGER NOT NULL DEFAULT 0,
  members_only INTEGER NOT NULL DEFAULT 1,
  active      INTEGER NOT NULL DEFAULT 1,
  CHECK (date_to >= date_from)
);

CREATE TABLE IF NOT EXISTS days_off (
  date TEXT PRIMARY KEY,
  note TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id               INTEGER PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,      -- krótki kod pokazywany klientce
  token            TEXT NOT NULL UNIQUE,      -- długi, losowy klucz do linku z SMS-a
  status           TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','done','cancelled','no_show')),
  treatment_id     TEXT NOT NULL,
  treatment_name   TEXT NOT NULL,             -- po polsku, tak jak w panelu
  duration         INTEGER NOT NULL,
  date             TEXT NOT NULL,             -- YYYY-MM-DD, czas lokalny gabinetu
  time             TEXT NOT NULL,             -- HH:MM
  start_min        INTEGER NOT NULL,
  end_min          INTEGER NOT NULL,
  client_id        INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  guest_first      TEXT, guest_last TEXT, guest_phone TEXT, guest_email TEXT,
  guest_marketing_sms   INTEGER NOT NULL DEFAULT 0,
  guest_marketing_email INTEGER NOT NULL DEFAULT 0,
  lang             TEXT NOT NULL DEFAULT 'pl',
  notes            TEXT,
  price            REAL NOT NULL,
  discount_id      TEXT, discount_label TEXT,
  discount_percent REAL NOT NULL DEFAULT 0,
  lowest30         REAL,
  total            REAL NOT NULL,
  created_at       TEXT NOT NULL,
  cancelled_at     TEXT,
  cancelled_by     TEXT CHECK (cancelled_by IN ('client','salon')),
  fee              REAL NOT NULL DEFAULT 0,
  fee_status       TEXT NOT NULL DEFAULT 'none' CHECK (fee_status IN ('none','due','paid','waived')),
  demo             INTEGER NOT NULL DEFAULT 0,
  CHECK (end_min > start_min),
  CHECK (client_id IS NOT NULL OR guest_phone IS NOT NULL OR status <> 'confirmed')
);
CREATE INDEX IF NOT EXISTS bookings_date ON bookings (date, status);
CREATE INDEX IF NOT EXISTS bookings_client ON bookings (client_id);

-- SMS-y i e-maile: kolejka + historia wysyłek (w trybie testowym „skrzynka testowa”)
CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY,
  channel     TEXT NOT NULL CHECK (channel IN ('sms','email')),
  kind        TEXT NOT NULL,                  -- confirmation, reminder, cancellation, reset, campaign, contact...
  to_addr     TEXT NOT NULL,
  subject     TEXT,
  body        TEXT NOT NULL,
  booking_id  INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','test')),
  driver      TEXT,
  error       TEXT,
  created_at  TEXT NOT NULL,
  sent_at     TEXT
);
-- jedno przypomnienie na wizytę, nawet gdy harmonogram uruchomi się kilka razy
CREATE UNIQUE INDEX IF NOT EXISTS one_reminder_per_booking ON messages (booking_id, channel) WHERE kind = 'reminder';
CREATE INDEX IF NOT EXISTS messages_status ON messages (status);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  contact    TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`);

// Blokady czasu (przerwa, wyjście, szkolenie) — wyłączone z rezerwacji online
db.exec(`
CREATE TABLE IF NOT EXISTS blocks (
  id         INTEGER PRIMARY KEY,
  date       TEXT NOT NULL,
  start_min  INTEGER NOT NULL,
  end_min    INTEGER NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL,
  CHECK (end_min > start_min)
);
CREATE INDEX IF NOT EXISTS blocks_date ON blocks (date);
`);

// Migracje: nowe kolumny dodajemy do istniejącej bazy bez utraty danych
function addColumn(table, column, definition) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
// skąd wizyta: online (strona), telefon, instagram, osobiście, inne
addColumn('bookings', 'source', "TEXT NOT NULL DEFAULT 'online'");

const nowIso = () => new Date().toISOString();

function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

const meta = {
  get: (k) => { const r = db.prepare('SELECT value FROM meta WHERE key = ?').get(k); return r ? r.value : null; },
  set: (k, v) => db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(k, String(v))
};

module.exports = { db, tx, meta, nowIso };
