/*
 * SMS-y po wizycie: kiedy wychodzą, a kiedy nie. Test działa na osobnej, tymczasowej bazie.
 */
const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-after-'));
Object.assign(process.env, { DATA_DIR: dir, SMS_DRIVER: 'outbox', EMAIL_DRIVER: 'outbox' });
const { db, meta } = require('../server/db');
const B = require('../server/booking');
const A = require('../server/aftercare');
after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

let n = 0;
function visit({ treatment = 'pmu-brwi', daysAgo, afterSms = 1, phone = '+48 600 100 200', status = 'done', hoursAgo }) {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  if (hoursAgo !== undefined) d.setTime(Date.now() - hoursAgo * 36e5);
  const start = Math.max(0, d.getHours() * 60 - 60);
  n++;
  const r = db.prepare(`INSERT INTO bookings (code, token, status, treatment_id, treatment_name, duration, date, time, start_min, end_min, guest_first, guest_phone, price, total, created_at, after_sms)
    VALUES (?,?,?,?,?,60,?,?,?,?,?,?,100,100,?,?)`).run('A' + n, 'tok-after-' + n, status, treatment, treatment, B.isoDate(d), B.toTime(start), start, start + 60, 'Ala', phone, new Date().toISOString(), afterSms);
  return Number(r.lastInsertRowid);
}
const sent = (kind) => db.prepare('SELECT * FROM messages WHERE kind = ?').all(kind);
const noon = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };

test('przypomnienie o korekcie: po 6 tygodniach, tylko ze zgodą, raz, nie gdy klientka już się zapisała', () => {
  const due = visit({ daysAgo: 42 });
  visit({ daysAgo: 42, afterSms: 0, phone: '+48 600 100 201' });
  visit({ daysAgo: 20, phone: '+48 600 100 202' });
  visit({ daysAgo: 43, phone: '+48 600 100 203' });
  visit({ treatment: 'pmu-korekta', daysAgo: -3, phone: '+48 600 100 203', status: 'confirmed' }); // ta już ma korektę
  A.scan(noon());
  const msgs = sent('followup');
  assert.strictEqual(msgs.length, 1);
  assert.strictEqual(msgs[0].booking_id, due);
  assert.match(msgs[0].body, /6 tygodni/); assert.match(msgs[0].body, /\/z\/pmu-korekta/);
  A.scan(noon());
  assert.strictEqual(sent('followup').length, 1, 'bez powtórek');
});

test('prośba o opinię: dopiero gdy włączona, dzień po wizycie, raz na pół roku do tej samej osoby, nie w nocy', () => {
  const v = visit({ treatment: 'konsultacja', daysAgo: 2, phone: '+48 600 300 400' });
  A.scan(noon());
  assert.strictEqual(sent('review').length, 0, 'wyłączona');
  A.setReview({ on: true, url: 'https://g.page/r/test/review' });
  const night = noon(); night.setHours(23);
  A.scan(night);
  assert.strictEqual(sent('review').length, 0, 'nie w nocy');
  A.scan(noon());
  assert.strictEqual(sent('review').length, 1);
  assert.strictEqual(sent('review')[0].booking_id, v);
  visit({ treatment: 'konsultacja', daysAgo: 2, phone: '600300400' });
  A.scan(noon());
  assert.strictEqual(sent('review').length, 1, 'ta sama osoba nie dostaje drugiej prośby');
  assert.strictEqual(meta.get('review_on'), '1');
});
