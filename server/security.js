/* Hasła, sesje, ciasteczka i limity prób. */
const crypto = require('crypto');
const { db, nowIso } = require('./db');
const env = require('./env');

/* ---------- Hasła: scrypt z losową solą ---------- */
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
  return 'scrypt$' + salt.toString('base64') + '$' + key.toString('base64');
}
function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, s, k] = stored.split('$');
  const key = crypto.scryptSync(String(password), Buffer.from(s, 'base64'), 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(k, 'base64');
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}
// stały czas odpowiedzi także dla nieistniejącego konta
const DUMMY_HASH = hashPassword(crypto.randomBytes(8).toString('hex'));

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const sha256 = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
// kod bez mylących znaków (0/O, 1/I)
function shortCode(len = 6) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

/* ---------- Ciasteczka ---------- */
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('='); if (i < 0) return;
    out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function cookie(name, value, { maxAge, secure } = {}) {
  let c = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax`;
  if (maxAge != null) c += `; Max-Age=${maxAge}`;
  if (secure) c += '; Secure';
  return c;
}

/* ---------- Sesje ---------- */
const SESSION = {
  client: { cookie: 'jm_sid', hours: 24 * 30 },
  admin: { cookie: 'jm_admin', hours: 12 }
};
function createSession(res, kind, subjectId, req) {
  const token = randomToken();
  const exp = new Date(Date.now() + SESSION[kind].hours * 36e5).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, kind, subject_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(sha256(token), kind, subjectId, nowIso(), exp);
  appendCookie(res, cookie(SESSION[kind].cookie, token, { maxAge: SESSION[kind].hours * 3600, secure: isHttps(req) }));
}
function readSession(req, kind) {
  const token = parseCookies(req)[SESSION[kind].cookie];
  if (!token) return null;
  const row = db.prepare('SELECT subject_id, expires_at FROM sessions WHERE token_hash = ? AND kind = ?').get(sha256(token), kind);
  if (!row || row.expires_at < nowIso()) return null;
  return row.subject_id;
}
function destroySession(req, res, kind) {
  const token = parseCookies(req)[SESSION[kind].cookie];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  appendCookie(res, cookie(SESSION[kind].cookie, '', { maxAge: 0 }));
}
function destroyAllSessions(kind, subjectId) {
  db.prepare('DELETE FROM sessions WHERE kind = ? AND subject_id = ?').run(kind, subjectId);
}
function appendCookie(res, c) {
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, c) : c);
}
const isHttps = (req) => req.headers['x-forwarded-proto'] === 'https' || !!req.socket.encrypted;

/* ---------- Limity prób (np. logowanie): okno czasowe na IP ---------- */
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) || { n: 0, reset: now + windowMs };
  if (now > b.reset) { b.n = 0; b.reset = now + windowMs; }
  b.n += 1; buckets.set(key, b);
  return b.n <= max;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k); }, 6e4).unref();

function clientIp(req) {
  return (env.production && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress) || '';
}

module.exports = {
  hashPassword, verifyPassword, DUMMY_HASH, randomToken, sha256, shortCode,
  parseCookies, createSession, readSession, destroySession, destroyAllSessions,
  rateLimit, clientIp, isHttps
};
