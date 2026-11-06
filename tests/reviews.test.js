/*
 * Opinie od klientek ze strony: tylko po odbytej wizycie, zgoda na publikację, bez zmian treści.
 */
const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-rev-'));
Object.assign(process.env, { DATA_DIR: dir, SMS_DRIVER: 'outbox', EMAIL_DRIVER: 'outbox', JM_SMS_ANYTIME: '1' });
const { db } = require('../server/db');
const B = require('../server/booking');
const Rv = require('../server/reviews');
const A = require('../server/aftercare');
after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

let n = 0;
function visit(status = 'done', daysAgo = 2) {
  const d = new Date(); d.setDate(d.getDate() - daysAgo); n++;
  const r = db.prepare(`INSERT INTO bookings (code, token, status, treatment_id, treatment_name, duration, date, time, start_min, end_min, guest_first, guest_last, guest_phone, guest_email, price, total, created_at, after_sms, care_sent)
    VALUES (?,?,?,'pmu-brwi','Brwi pudrowe (ombre)',60,?,'10:00',600,660,'Ola','Nowak','+48 600 111 ' || ?, 'ola@example.com',850,850,?,1,'test')`).run('RV' + n, 'tok-rev-' + n, status, B.isoDate(d), String(100 + n), new Date().toISOString());
  return B.getBooking(Number(r.lastInsertRowid));
}

test('opinia tylko po odbytej wizycie; bez zgody zostaje dla gabinetu i nie da się jej opublikować', () => {
  assert.throws(() => Rv.submit(visit('confirmed', -2), { text: 'Super wizyta, polecam.' }, 'pl'), /po odbytej wizycie/);
  const b = visit();
  assert.throws(() => Rv.submit(b, { text: 'krótko' }, 'pl'), /kilka słów/);
  const v = Rv.submit(b, { text: 'Bardzo delikatnie, polecam z całego serca.', rating: 5, publish: false }, 'pl');
  assert.strictEqual(v.review.publishOk, false);
  assert.strictEqual(v.author, 'Ola N.', 'podpis: imię i pierwsza litera nazwiska');
  const r = Rv.list(true).find((x) => x.bookingId === b.id);
  assert.strictEqual(r.isNew, true); assert.strictEqual(r.origin, 'strona'); assert.strictEqual(r.published, false);
  assert.throws(() => Rv.update(r.id, { published: true }), /nie zgodziła się/);
  // gabinet nie może zmienić treści opinii ze strony
  Rv.update(r.id, { text: 'Zmieniona treść przez gabinet', isNew: false });
  assert.strictEqual(Rv.list(true).find((x) => x.id === r.id).text, 'Bardzo delikatnie, polecam z całego serca.');
  assert.strictEqual(Rv.list(false).some((x) => x.id === r.id), false, 'niepublikowana nie jest publiczna');
});

test('ze zgodą: publikacja w panelu, potem klientka nie zmieni już treści; jedna opinia na wizytę', () => {
  const b = visit();
  Rv.submit(b, { text: 'Pierwsza wersja opinii o wizycie.', publish: true }, 'pl');
  Rv.submit(b, { text: 'Poprawiona wersja opinii o wizycie.', publish: true, author: 'Ola' }, 'pl');
  const mine = Rv.list(true).filter((x) => x.bookingId === b.id);
  assert.strictEqual(mine.length, 1, 'poprawka nadpisuje, nie dubluje');
  assert.strictEqual(mine[0].text, 'Poprawiona wersja opinii o wizycie.');
  Rv.update(mine[0].id, { published: true });
  const pub = Rv.list(false).find((x) => x.id === mine[0].id);
  assert.strictEqual(pub.author, 'Ola'); assert.strictEqual(pub.source, 'strona');
  assert.throws(() => Rv.submit(b, { text: 'Jeszcze inna wersja opinii.', publish: true }, 'pl'), /już na stronie/);
});

test('wejście kodem rezerwacji i telefonem; link z SMS-a prowadzi na stronę opinii', () => {
  const b = visit();
  assert.strictEqual(Rv.findByCode(b.code.toLowerCase(), '600 111 ' + String(100 + n)).id, b.id);
  assert.strictEqual(Rv.findByCode(b.code, '600 999 999'), null, 'zły telefon');
  assert.strictEqual(Rv.findByCode(visit('confirmed', -1).code, '600111' + String(100 + n)), null, 'wizyta jeszcze się nie odbyła');
  const t = Rv.tokenFor(b);
  assert.strictEqual(Rv.tokenFor(B.getBooking(b.id)), t, 'ten sam klucz');
  assert.strictEqual(Rv.bookingByToken(t).id, b.id);
  A.setReview({ on: true });
  const now = new Date(); now.setHours(12, 0, 0, 0);
  A.scan(now);
  const sms = db.prepare("SELECT * FROM messages WHERE kind = 'review'").all();
  assert.ok(sms.length >= 1);
  assert.ok(sms.every((m) => /\/o\/[A-Za-z0-9_-]{16}/.test(m.body)), 'SMS z linkiem do strony opinii');
});
