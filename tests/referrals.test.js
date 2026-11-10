/*
 * Program poleceń i last minute: zniżka dla nowej osoby, nagroda dla polecającej po wizycie koleżanki.
 */
const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-ref-'));
Object.assign(process.env, { DATA_DIR: dir, SMS_DRIVER: 'outbox', EMAIL_DRIVER: 'outbox' });
const { db, meta } = require('../server/db');
const B = require('../server/booking');
const Ref = require('../server/referrals');
after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

const addClient = (first, email, phone) => db.prepare('SELECT * FROM clients WHERE id = ?').get(Number(
  db.prepare("INSERT INTO clients (first_name, last_name, email, phone, password_hash) VALUES (?, 'Test', ?, ?, 'x')").run(first, email, phone).lastInsertRowid));
// kolejne wolne terminy zabiegu (zaczynamy od 3 dni naprzód, żeby nie łapała się zniżka last minute)
function nextSlot(treatmentId, skip = 0) {
  const t = B.treatment(treatmentId); const d = new Date(); d.setDate(d.getDate() + 3);
  for (let i = 0; i < 40; i++, d.setDate(d.getDate() + 1)) {
    const slots = B.slotsFor(B.isoDate(d), t.duration);
    if (slots.length > skip) return { date: B.isoDate(d), time: slots[skip] };
    skip -= slots.length;
  }
  throw new Error('brak wolnych terminów');
}

test('kod polecenia: zniżka dla nowej osoby, nie dla własnego kodu i nie dla stałej klientki', () => {
  const ola = addClient('Ola', 'ola@ref.pl', '+48 600 100 100');
  const code = Ref.codeFor(ola);
  assert.match(code, /^OLA-[A-Z2-9]{4}$/);
  assert.strictEqual(Ref.codeFor(db.prepare('SELECT * FROM clients WHERE id = ?').get(ola.id)), code, 'kod się nie zmienia');
  const guest = { firstName: 'Ewa', lastName: 'Nowa', phone: '+48 600 200 200', email: 'ewa@ref.pl' };
  const r = Ref.check({ code: code.toLowerCase(), guest }, 'pl');
  assert.strictEqual(r.referrer.id, ola.id); assert.deepStrictEqual(r.option, { id: 'polecenie', label: 'Polecenie', percent: 15 });
  assert.throws(() => Ref.check({ code, client: ola }, 'pl'), /własny kod/);
  assert.throws(() => Ref.check({ code, guest: { phone: '600100100', email: 'x@y.pl' } }, 'pl'), /własny kod/);
  assert.throws(() => Ref.check({ code: 'NIE-MA00', guest }, 'pl'), /Nie ma takiego kodu/);
  // stała klientka (była już na wizycie) nie dostaje zniżki z polecenia
  const s = nextSlot('mezo-oczy');
  B.createBooking({ treatmentId: 'mezo-oczy', date: s.date, time: s.time, guest: { firstName: 'Iza', lastName: 'Stała', phone: '+48 600 300 300', email: 'iza@ref.pl' } });
  assert.throws(() => Ref.check({ code, guest: { phone: '600 300 300', email: 'inny@ref.pl' } }, 'pl'), /jeszcze nie były/);
});

test('nagroda: czeka na wizytę koleżanki, potem nalicza się polecającej, odwołanie ją zwalnia, odbyta wizyta zużywa', () => {
  const ola = db.prepare("SELECT * FROM clients WHERE email = 'ola@ref.pl'").get();
  const guest = { firstName: 'Ewa', lastName: 'Nowa', phone: '+48 600 200 200', email: 'ewa@ref.pl' };
  const r = Ref.check({ code: ola.ref_code, guest }, 'pl');
  const s = nextSlot('mezo-twarz');
  let b = B.createBooking({ treatmentId: 'mezo-twarz', date: s.date, time: s.time, guest, extraDiscounts: [r.option] });
  assert.strictEqual(b.discount_id, 'polecenie'); assert.strictEqual(b.total, Math.round(b.price * 0.85 * 100) / 100);
  Ref.afterBooking(b, ola.id);
  assert.strictEqual(Ref.forClient(ola).pending, 1);
  assert.strictEqual(Ref.rewardOption(ola.id), null, 'przed wizytą koleżanki nagrody jeszcze nie ma');
  db.prepare("UPDATE bookings SET status = 'done' WHERE id = ?").run(b.id);
  assert.deepStrictEqual(Ref.rewardOption(ola.id), { id: 'nagroda-polecenie', label: 'Nagroda za polecenie', percent: 15 });
  // polecająca rezerwuje: nagroda się nalicza i rezerwuje
  const s2 = nextSlot('mezo-twarz', 1);
  let mine = B.createBooking({ treatmentId: 'mezo-twarz', date: s2.date, time: s2.time, client: ola, extraDiscounts: [Ref.rewardOption(ola.id)] });
  assert.strictEqual(mine.discount_id, 'nagroda-polecenie');
  Ref.afterBooking(mine);
  assert.strictEqual(Ref.forClient(ola).reserved, 1);
  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(mine.id);
  assert.strictEqual(Ref.forClient(ola).available, 1, 'odwołanie oddaje nagrodę');
  // w panelu: doliczenie do wizyty z telefonu
  const s3 = nextSlot('mezo-twarz', 2);
  mine = B.createManualBooking({ treatmentId: 'mezo-twarz', date: s3.date, time: s3.time, client: ola, source: 'telefon' });
  assert.deepStrictEqual(Ref.rewardForBooking(mine).percent, 15);
  Ref.applyInPanel(mine);
  mine = B.getBooking(mine.id);
  assert.strictEqual(mine.discount_percent, 15); assert.ok(mine.total < mine.price);
  assert.throws(() => Ref.applyInPanel(B.getBooking(mine.id)), /nie można/);
  db.prepare("UPDATE bookings SET status = 'done' WHERE id = ?").run(mine.id);
  const f = Ref.forClient(ola);
  assert.deepStrictEqual([f.available, f.reserved, f.used], [0, 0, 1]);
  assert.strictEqual(Ref.adminList()[0].status, 'used');
});

test('program wyłączony: kod nie działa; ustawienia z walidacją', () => {
  assert.throws(() => Ref.setSettings({ on: true, newPercent: 0, refPercent: 10 }), /od 1 do 50/);
  Ref.setSettings({ on: false, newPercent: 20, refPercent: 10 });
  const ola = db.prepare("SELECT * FROM clients WHERE email = 'ola@ref.pl'").get();
  assert.throws(() => Ref.check({ code: ola.ref_code, guest: { phone: '600999888', email: 'nowa@ref.pl' } }, 'pl'), /wyłączony/);
  Ref.setSettings({ on: true, newPercent: 20, refPercent: 10 });
  assert.strictEqual(Ref.check({ code: ola.ref_code, guest: { phone: '600999888', email: 'nowa@ref.pl' } }, 'pl').option.percent, 20);
});

test('last minute: zniżka tylko na wizyty zaczynające się w ustawionym czasie; wolne okienka', () => {
  const t = B.treatment('mezo-twarz');
  assert.strictEqual(B.bestDiscount(t, B.isoDate(new Date()), null, 450, { time: '23:59' }), null, 'domyślnie bez zniżki');
  meta.set('lastminute_percent', 20); meta.set('lastminute_hours', 48);
  const soon = new Date(Date.now() + 5 * 36e5), late = new Date(Date.now() + 72 * 36e5);
  const hm = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  assert.deepStrictEqual(B.bestDiscount(t, B.isoDate(soon), null, 450, { time: hm(soon) }), { id: 'last-minute', label: 'Last minute', percent: 20 });
  assert.strictEqual(B.bestDiscount(t, B.isoDate(late), null, 450, { time: hm(late) }), null);
  const days = B.freeWindows(3);
  assert.ok(Array.isArray(days));
  days.forEach((d) => d.windows.forEach((w) => { assert.ok(w.minutes > 0 && w.fits > 0); assert.ok(w.start < w.end); }));
});
