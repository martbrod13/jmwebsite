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
    env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: dataDir, SMS_DRIVER: 'outbox', EMAIL_DRIVER: 'outbox', JM_SMS_ANYTIME: '1' }), stdio: 'ignore'
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

// jedno logowanie do panelu na wszystkie testy (logowanie ma limit prób)
let adminSession = null;
async function adminClient() {
  if (adminSession) return adminSession;
  const c = client();
  const r = await c('POST', '/api/admin/login', { email: 'martbrod99@gmail.com', password: 'demo' });
  assert.strictEqual(r.status, 200, 'logowanie do panelu w testach');
  adminSession = c;
  return c;
}

test('wizyta dodana w panelu zajmuje termin w rezerwacji online', async () => {
  const a = await adminClient();
  const s = await freeSlot('konsultacja', 10);
  const r = await a('POST', '/api/admin/bookings', { treatmentId: 'mezo-twarz', date: s.date, time: s.time, source: 'telefon', guest: { firstName: 'Basia', phone: '+48 601 000 111' }, notify: false });
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  assert.strictEqual(r.body.booking.source, 'telefon');
  const avail = await client()('GET', `/api/availability?treatment=konsultacja&from=${s.date}&to=${s.date}`);
  assert.ok(!avail.body.days[s.date].includes(s.time));
  // kolizja z inną wizytą jest zawsze blokowana
  const c = await a('POST', '/api/admin/bookings', { treatmentId: 'konsultacja', date: s.date, time: s.time, guest: { firstName: 'Ola', phone: '+48 601 000 112' }, notify: false, force: true });
  assert.strictEqual(c.status, 409); assert.strictEqual(c.body.field, 'conflict');
});

test('wizyta poza godzinami pracy wymaga potwierdzenia', async () => {
  const a = await adminClient();
  const s = await freeSlot('konsultacja', 0);
  const r = await a('POST', '/api/admin/bookings', { treatmentId: 'konsultacja', date: s.date, time: '21:00', guest: { firstName: 'Ewa', phone: '+48 601 000 113' }, notify: false });
  assert.strictEqual(r.status, 409); assert.strictEqual(r.body.field, 'confirm');
  const ok = await a('POST', '/api/admin/bookings', { treatmentId: 'konsultacja', date: s.date, time: '21:00', guest: { firstName: 'Ewa', phone: '+48 601 000 113' }, notify: false, force: true });
  assert.strictEqual(ok.status, 200);
});

test('blokada czasu usuwa terminy z rezerwacji online', async () => {
  const a = await adminClient();
  const s = await freeSlot('konsultacja', 20);
  const end = S2(s.time, 60);
  const r = await a('POST', '/api/admin/blocks', { date: s.date, start: s.time, end, note: 'przerwa' });
  assert.strictEqual(r.status, 200);
  const avail = await client()('GET', `/api/availability?treatment=konsultacja&from=${s.date}&to=${s.date}`);
  assert.ok(!avail.body.days[s.date].includes(s.time));
});
function S2(time, add) { const [h, m] = time.split(':').map(Number); const t = h * 60 + m + add; return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }

test('klientka zmienia termin przez link z SMS-a tylko na wolny termin', async () => {
  const s = await freeSlot('kwas-glikolowy', 0);
  const g = client();
  const b = await g('POST', '/api/bookings', { treatmentId: 'kwas-glikolowy', date: s.date, time: s.time, guest: guest('move@example.com') });
  const target = await freeSlot('kwas-glikolowy', 5);
  const moved = await g('POST', `/api/visit/${b.body.booking.token}/move`, target);
  assert.strictEqual(moved.status, 200, JSON.stringify(moved.body));
  assert.strictEqual(moved.body.booking.date + moved.body.booking.time, target.date + target.time);
  // stary termin znów wolny, nowy zajęty
  const other = await client()('POST', '/api/bookings', { treatmentId: 'kwas-glikolowy', date: target.date, time: target.time, guest: guest('x2@example.com') });
  assert.strictEqual(other.status, 409);
  const again = await client()('POST', '/api/bookings', { treatmentId: 'kwas-glikolowy', date: s.date, time: s.time, guest: guest('x3@example.com') });
  assert.strictEqual(again.status, 200);
  // nie da się przenieść na zajęty termin
  const bad = await g('POST', `/api/visit/${b.body.booking.token}/move`, s);
  assert.strictEqual(bad.status, 409);
});

test('galeria: zgoda wymagana, ukryte zdjęcie niedostępne publicznie, usuwanie kasuje plik', async () => {
  const a = await adminClient();
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200)]).toString('base64');
  const base = { image: jpg, thumb: jpg, width: 800, height: 1000, category: 'mezoterapia', altPl: 'Efekt po serii' };
  assert.strictEqual((await a('POST', '/api/admin/gallery', base)).status, 400); // bez zgody
  assert.strictEqual((await a('POST', '/api/admin/gallery', Object.assign({}, base, { consent: true, image: Buffer.from('<svg/>').toString('base64') }))).status, 400); // nie obraz
  assert.strictEqual((await client()('POST', '/api/admin/gallery', Object.assign({}, base, { consent: true }))).status, 401); // bez logowania
  const r = await a('POST', '/api/admin/gallery', Object.assign({}, base, { consent: true }));
  assert.strictEqual(r.status, 200);
  const g = r.body.photos[r.body.photos.length - 1];
  const pub = await client()('GET', '/api/gallery');
  assert.ok(pub.body.photos.some((x) => x.id === g.id));
  assert.ok(!('consentNote' in pub.body.photos[0]), 'publiczne API nie pokazuje notatek o zgodzie');
  assert.strictEqual((await client()('GET', g.src)).status, 200);
  await a('PATCH', '/api/admin/gallery/' + g.id, { published: false });
  assert.strictEqual((await client()('GET', g.src)).status, 404);
  assert.strictEqual((await a('GET', g.src)).status, 200); // panel nadal widzi
  await a('DELETE', '/api/admin/gallery/' + g.id, {});
  assert.strictEqual((await a('GET', g.src)).status, 404);
  assert.ok(!(await client()('GET', '/api/gallery')).body.photos.some((x) => x.id === g.id));
});

test('przed startem strona jest ukryta przed Google, działa sprawdzanie stanu i kopie zapasowe', async () => {
  const c = client();
  assert.strictEqual((await c('GET', '/api/health')).body.ok, true);
  assert.match((await c('GET', '/robots.txt')).text, /Disallow: \//);
  assert.strictEqual((await c('GET', '/sitemap.xml')).status, 404);
  assert.match((await c('GET', '/index.html')).text, /noindex, nofollow/);
  assert.strictEqual((await c('POST', '/api/admin/backup', {})).status, 401);
  assert.strictEqual((await c('GET', '/api/admin/backup/download')).status, 401);
  const a = await adminClient();
  const b = await a('POST', '/api/admin/backup', {});
  assert.strictEqual(b.status, 200); assert.ok(b.body.count >= 1 && b.body.last);
  const d = await a('GET', '/api/admin/backup/download');
  assert.strictEqual(d.status, 200); assert.match(d.headers.get('content-disposition'), /jm-baza-/);
  assert.ok(d.text.startsWith('SQLite format 3'));
});

test('panel dostaje powiadomienie na żywo o nowej rezerwacji, a bez logowania nie', async () => {
  assert.strictEqual((await fetch(BASE + '/api/admin/events')).status, 401);
  const a = await adminClient();
  const cookie = (await (async () => { const r = await fetch(BASE + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'martbrod99@gmail.com', password: 'demo' }) }); return r.headers.getSetCookie()[0].split(';')[0]; })());
  void a;
  const ctrl = new AbortController();
  const res = await fetch(BASE + '/api/admin/events', { headers: { Cookie: cookie }, signal: ctrl.signal });
  assert.strictEqual(res.status, 200);
  const reader = res.body.getReader();
  const s = await freeSlot('konsultacja', 30);
  await client()('POST', '/api/bookings', { treatmentId: 'konsultacja', date: s.date, time: s.time, guest: guest('live@example.com') });
  let text = '';
  const until = Date.now() + 3000;
  while (!text.includes('"type":"booked"') && Date.now() < until) { const { value } = await reader.read(); text += new TextDecoder().decode(value); }
  ctrl.abort();
  assert.match(text, /"type":"booked"/); assert.match(text, /"by":"client"/);
  assert.doesNotMatch(text, /live@example\.com|600 000 001/, 'powiadomienie bez e-maila i telefonu');
});

test('kalendarz w telefonie: link działa tylko z kluczem, bez telefonów klientek, i można go unieważnić', async () => {
  const a = await adminClient();
  const s = await freeSlot('konsultacja', 40);
  await client()('POST', '/api/bookings', { treatmentId: 'konsultacja', date: s.date, time: s.time, guest: guest('ical@example.com') });
  const { token } = (await a('GET', '/api/admin/ical')).body;
  assert.ok(token && token.length >= 20);
  const feed = await client()('GET', `/kalendarz/${token}.ics`);
  assert.strictEqual(feed.status, 200);
  assert.match(feed.headers.get('content-type'), /text\/calendar/);
  assert.match(feed.text, /BEGIN:VCALENDAR/); assert.match(feed.text, /Test K\./);
  assert.doesNotMatch(feed.text, /600 000 001|ical@example\.com/, 'bez telefonu i e-maila');
  assert.strictEqual((await client()('GET', '/kalendarz/zly-klucz-1234567890abcdef.ics')).status, 404);
  const renewed = (await a('POST', '/api/admin/ical/renew', {})).body.token;
  assert.notStrictEqual(renewed, token);
  assert.strictEqual((await client()('GET', `/kalendarz/${token}.ics`)).status, 404, 'stary link przestaje działać');
  assert.strictEqual((await client()('GET', '/api/admin/ical')).status, 401);
});

test('bony: wystawienie, sprawdzenie kodu, rezerwacja kwoty, zwolnienie po odwołaniu, rozliczenie i unieważnienie', async () => {
  const a = await adminClient();
  const until = new Date(); until.setMonth(until.getMonth() + 6);
  assert.strictEqual((await a('POST', '/api/admin/vouchers', { amount: 5, validUntil: until.toISOString().slice(0, 10) })).status, 400);
  const v = (await a('POST', '/api/admin/vouchers', { amount: 300, validUntil: until.toISOString().slice(0, 10), recipient: 'Ani', giver: 'Kasia' })).body.voucher;
  assert.match(v.code, /^JM-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  const pub = await client()('GET', '/api/vouchers/' + v.code.toLowerCase());
  assert.strictEqual(pub.status, 200); assert.strictEqual(pub.body.voucher.available, 300);
  assert.strictEqual(pub.body.voucher.recipient, undefined, 'publicznie bez imion');
  assert.strictEqual((await client()('GET', '/api/vouchers/JM-XXXX-0000')).status, 404);
  // rezerwacja z bonem: kwota wizyty schodzi z „do wykorzystania”, ale saldo czeka na odbycie wizyty
  const s = await freeSlot('konsultacja', 45);
  const g = client();
  const b = await g('POST', '/api/bookings', { treatmentId: 'konsultacja', date: s.date, time: s.time, guest: guest('bon@example.com'), voucherCode: v.code });
  assert.strictEqual(b.status, 200);
  const used = b.body.booking.voucher ? b.body.booking.voucher.amount : 0;
  const after = (await client()('GET', '/api/vouchers/' + v.code)).body.voucher;
  assert.strictEqual(after.balance, 300); assert.strictEqual(after.available, 300 - used);
  // odwołanie zwalnia rezerwację bonu
  await g('POST', `/api/visit/${b.body.booking.token}/cancel`, {});
  assert.strictEqual((await client()('GET', '/api/vouchers/' + v.code)).body.voucher.available, 300);
  // rozliczenie w gabinecie: nie więcej niż saldo
  assert.strictEqual((await a('POST', `/api/admin/vouchers/${v.id}/redeem`, { amount: 400 })).status, 400);
  const r = await a('POST', `/api/admin/vouchers/${v.id}/redeem`, { amount: 120, note: 'zabieg w gabinecie' });
  assert.strictEqual(r.status, 200); assert.strictEqual(r.body.voucher.balance, 180);
  await a('POST', `/api/admin/vouchers/${v.id}/void`, {});
  assert.strictEqual((await client()('GET', '/api/vouchers/' + v.code)).status, 404, 'unieważniony bon nie działa');
});

test('statystyki: tylko dla panelu, 12 miesięcy i zestawienia za wybrany okres', async () => {
  assert.strictEqual((await client()('GET', '/api/admin/stats')).status, 401);
  const a = await adminClient();
  const st = (await a('GET', '/api/admin/stats?days=30')).body;
  assert.strictEqual(st.days, 30);
  assert.strictEqual(st.months.length, 12);
  assert.ok(st.months.some((m) => m.month === st.thisMonth));
  assert.ok(st.months.reduce((n, m) => n + m.planned, 0) >= 1, 'zaplanowane wizyty z innych testów są w sumie');
  assert.ok(Array.isArray(st.treatments) && Array.isArray(st.sources));
  assert.strictEqual((await a('GET', '/api/admin/stats?days=7')).body.days, 90, 'nieznany okres = 90 dni');
});

test('lista oczekujących: zapis tylko na zajęty okres, SMS po zwolnieniu terminu, koniec po rezerwacji, wypisanie', async () => {
  const a = await adminClient();
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const days = [day(40), day(41), day(42)];
  for (const d of days) await a('POST', '/api/admin/blocks', { date: d, start: '06:00', end: '23:00', note: 'test listy' });
  const g = client();
  // w okresie z wolnymi terminami nie da się zapisać
  const busy = await g('POST', '/api/waitlist', { treatmentId: 'konsultacja', from: day(3), to: day(10), firstName: 'Ewa', phone: '+48 600 111 222' });
  assert.strictEqual(busy.status, 409); assert.strictEqual(busy.body.field, 'free');
  assert.strictEqual((await g('POST', '/api/waitlist', { treatmentId: 'konsultacja', from: days[0], to: days[2], firstName: 'Ewa', phone: '12' })).status, 400);
  const w = await g('POST', '/api/waitlist', { treatmentId: 'konsultacja', from: days[0], to: days[2], firstName: 'Ewa', phone: '+48 600 111 222' });
  assert.strictEqual(w.status, 200); assert.deepStrictEqual(w.body.entry.free, []);
  const list = (await a('GET', '/api/admin/waitlist')).body.entries;
  const entry = list.find((e) => e.phone === '+48 600 111 222');
  assert.ok(entry && entry.status === 'waiting');
  // zdjęcie blokady zwalnia dzień: SMS z linkiem
  const cal = (await a('GET', `/api/admin/calendar?from=${days[1]}&to=${days[1]}`)).body;
  await a('DELETE', `/api/admin/blocks/${cal.blocks[0].id}`, {});
  let sms;
  for (let i = 0; i < 20 && !sms; i++) {
    await new Promise((r) => setTimeout(r, 50));
    sms = (await a('GET', '/api/admin/messages?channel=sms')).body.messages.find((m) => m.kind === 'waitlist' && m.to_addr === '+48 600 111 222');
  }
  assert.ok(sms, 'SMS do osoby z listy');
  const token = sms.body.match(/\/l\/([A-Za-z0-9_-]+)/)[1];
  const redirect = await client()('GET', '/l/' + token);
  assert.strictEqual(redirect.status, 302); assert.strictEqual(redirect.headers.get('location'), '/lista-oczekujacych.html#' + token);
  const view = (await client()('GET', '/api/waitlist/' + token)).body.entry;
  assert.deepStrictEqual(view.free.map((f) => f.date), [days[1]]);
  // drugi przebieg nie wysyła drugiego SMS-a o tym samym dniu
  const count = () => a('GET', '/api/admin/messages?channel=sms').then((r) => r.body.messages.filter((m) => m.kind === 'waitlist').length);
  const before = await count();
  await a('DELETE', `/api/admin/days-off/${days[1]}`, {});
  await new Promise((r) => setTimeout(r, 100));
  assert.strictEqual(await count(), before);
  // rezerwacja tego zabiegu kończy czekanie
  await client()('POST', '/api/bookings', { treatmentId: 'konsultacja', date: days[1], time: view.free[0].first, guest: Object.assign(guest('lista@example.com'), { phone: '600111222' }) });
  assert.strictEqual((await client()('GET', '/api/waitlist/' + token)).body.entry.status, 'booked');
  // wypisanie przez link usuwa dane
  const w2 = await g('POST', '/api/waitlist', { treatmentId: 'konsultacja', from: days[2], to: days[2], firstName: 'Iza', phone: '+48 600 333 444' });
  assert.strictEqual(w2.status, 200);
  const e2 = (await a('GET', '/api/admin/waitlist')).body.entries.find((e) => e.phone === '+48 600 333 444');
  assert.strictEqual((await client()('GET', '/api/waitlist/krotki')).status, 404);
  const tok2 = (await a('GET', '/api/admin/waitlist')).body.entries.length && e2.id;
  assert.ok(tok2);
  assert.strictEqual((await a('DELETE', `/api/admin/waitlist/${e2.id}`, {})).status, 200);
  assert.ok(!(await a('GET', '/api/admin/waitlist')).body.entries.some((e) => e.id === e2.id));
  assert.strictEqual((await client()('GET', '/api/admin/waitlist')).status, 401);
});
