/*
 * Testy najważniejszych zasad: `npm test`
 * Uruchamiają osobny serwer z pustą, tymczasową bazą — Twoje dane się nie zmieniają.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-test-'));
let server;

before(async () => {
  server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(__dirname, '..', 'server', 'index.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: dataDir, SMS_DRIVER: 'outbox', EMAIL_DRIVER: 'outbox' }), stdio: 'ignore'
  });
  for (let i = 0; i < 50; i++) {
    try { await fetch(BASE + '/api/bootstrap'); return; } catch (e) { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('Serwer testowy nie wystartował');
});
after(() => { server.kill(); fs.rmSync(dataDir, { recursive: true, force: true }); });

// prosta „przeglądarka” z ciasteczkami
function client() {
  let cookies = {};
  return async function call(method, url, body, headers = {}) {
    const res = await fetch(BASE + url, {
      method, redirect: 'manual',
      headers: Object.assign({ Cookie: Object.entries(cookies).map(([k, v]) => k + '=' + v).join('; ') }, body !== undefined ? { 'Content-Type': 'application/json' } : {}, headers),
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    (res.headers.getSetCookie ? res.headers.getSetCookie() : []).forEach((c) => { const [kv] = c.split(';'); const i = kv.indexOf('='); cookies[kv.slice(0, i)] = kv.slice(i + 1); });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch (e) { /* nie JSON */ }
    return { status: res.status, body: json, text, headers: res.headers };
  };
}

async function freeSlot(treatment, skip = 0) {
  const from = new Date(); from.setDate(from.getDate() + 3);
  const to = new Date(); to.setDate(to.getDate() + 20);
  const iso = (d) => d.toISOString().slice(0, 10);
  const r = await client()('GET', `/api/availability?treatment=${treatment}&from=${iso(from)}&to=${iso(to)}`);
  const slots = Object.entries(r.body.days).flatMap(([date, s]) => (s || []).map((time) => ({ date, time })));
  return slots[skip];
}
const guest = (email) => ({ firstName: 'Test', lastName: 'Klientka', phone: '+48 600 000 001', email, terms: true });

test('serwer nie udostępnia bazy, kodu ani .env', async () => {
  const c = client();
  for (const p of ['/data/jm.db', '/server/api.js', '/.env', '/package.json', '/assets/../server/db.js', '/database/schema.sql']) {
    assert.strictEqual((await c('GET', p)).status, 404, p);
  }
  assert.strictEqual((await c('GET', '/index.html')).status, 200);
});

test('rezerwacja gościa wymaga akceptacji regulaminu', async () => {
  const s = await freeSlot('kwas-migdalowy');
  const r = await client()('POST', '/api/bookings', { treatmentId: 'kwas-migdalowy', date: s.date, time: s.time, guest: Object.assign(guest('a@example.com'), { terms: false }) });
  assert.strictEqual(r.status, 400); assert.strictEqual(r.body.field, 'terms');
});

test('ten sam termin nie da się zarezerwować dwa razy, a nakładające się wizyty są blokowane', async () => {
  const s = await freeSlot('pmu-brwi', 0);
  const a = await client()('POST', '/api/bookings', { treatmentId: 'pmu-brwi', date: s.date, time: s.time, guest: guest('b@example.com') });
  assert.strictEqual(a.status, 200);
  const b = await client()('POST', '/api/bookings', { treatmentId: 'pmu-brwi', date: s.date, time: s.time, guest: guest('c@example.com') });
  assert.strictEqual(b.status, 409);
  // 30 minut później też nie (brwi trwają 2,5 h)
  const [h, m] = s.time.split(':').map(Number); const later = String(h + (m === 30 ? 1 : 0)).padStart(2, '0') + ':' + (m === 30 ? '00' : '30');
  const c = await client()('POST', '/api/bookings', { treatmentId: 'konsultacja', date: s.date, time: later, guest: guest('d@example.com') });
  assert.strictEqual(c.status, 409);
});

test('cenę i zniżkę liczy serwer, nie przeglądarka', async () => {
  const c = client();
  const reg = await c('POST', '/api/register', { firstName: 'Ola', lastName: 'Test', email: 'ola@example.com', phone: '+48 600 000 002', password: 'haslo1234', terms: true });
  assert.strictEqual(reg.status, 200);
  const s = await freeSlot('mezo-oczy', 2);
  const r = await c('POST', '/api/bookings', { treatmentId: 'mezo-oczy', date: s.date, time: s.time, price: 1, total: 1, discount: { percent: 90 } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.booking.price, 400);
  assert.strictEqual(r.body.booking.discount.percent, 10);
  assert.strictEqual(r.body.booking.total, 360);
  // druga wizyta już bez zniżki powitalnej
  const s2 = await freeSlot('mezo-oczy', 6);
  const r2 = await c('POST', '/api/bookings', { treatmentId: 'mezo-oczy', date: s2.date, time: s2.time });
  assert.strictEqual(r2.body.booking.total, 400);
});

test('odwołanie wcześniej niż 12 h jest bezpłatne, wizyta wraca do kalendarza', async () => {
  const s = await freeSlot('kwas-mlekowy', 3);
  const c = client();
  const b = await c('POST', '/api/bookings', { treatmentId: 'kwas-mlekowy', date: s.date, time: s.time, guest: guest('e@example.com') });
  const r = await c('POST', `/api/visit/${b.body.booking.token}/cancel`, {});
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.booking.status, 'cancelled');
  assert.strictEqual(r.body.booking.fee, 0);
  const again = await client()('POST', '/api/bookings', { treatmentId: 'kwas-mlekowy', date: s.date, time: s.time, guest: guest('f@example.com') });
  assert.strictEqual(again.status, 200);
});

test('nieznany link do wizyty nic nie zdradza', async () => {
  const r = await client()('GET', '/api/visit/' + 'x'.repeat(32));
  assert.strictEqual(r.status, 404);
});

test('logowanie: złe hasło i limit prób', async () => {
  const c = client();
  const r = await c('POST', '/api/login', { email: 'ola@example.com', password: 'zle' });
  assert.strictEqual(r.status, 401);
  let last;
  for (let i = 0; i < 10; i++) last = await c('POST', '/api/login', { email: 'limit@example.com', password: 'zle' });
  assert.strictEqual(last.status, 429);
});

test('panel wymaga logowania, a hasło startowe działa lokalnie', async () => {
  const c = client();
  assert.strictEqual((await c('GET', '/api/admin/clients')).status, 401);
  assert.strictEqual((await c('GET', '/api/admin/clients.csv')).status, 401);
  const l = await c('POST', '/api/admin/login', { email: 'martbrod99@gmail.com', password: 'demo' });
  assert.strictEqual(l.status, 200);
  const list = await c('GET', '/api/admin/clients');
  assert.ok(list.body.clients.some((x) => x.email === 'ola@example.com'));
  // konto klientki nie daje dostępu do panelu
  const k = client();
  await k('POST', '/api/login', { email: 'ola@example.com', password: 'haslo1234' });
  assert.strictEqual((await k('GET', '/api/admin/overview')).status, 401);
});

test('nieobecność nalicza 50% ceny', async () => {
  const c = client();
  await c('POST', '/api/admin/login', { email: 'martbrod99@gmail.com', password: 'demo' });
  const past = (await c('GET', '/api/admin/bookings?status=done')).body.bookings[0];
  const r = await c('POST', `/api/admin/bookings/${past.id}/no-show`, {});
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.booking.fee, past.total / 2);
  assert.strictEqual(r.body.booking.feeStatus, 'due');
});

test('żądania z innej strony są odrzucane (CSRF)', async () => {
  const r = await client()('POST', '/api/register', { email: 'x@example.com' }, { Origin: 'https://zla-strona.example' });
  assert.strictEqual(r.status, 403);
});

test('reset hasła: ta sama odpowiedź dla istniejącego i nieistniejącego konta', async () => {
  const a = await client()('POST', '/api/password/forgot', { email: 'ola@example.com' });
  const b = await client()('POST', '/api/password/forgot', { email: 'nie-ma@example.com' });
  assert.deepStrictEqual(a.body, b.body);
});
