/*
 * Pierwsze uruchomienie: konta panelu, promocje i dane przykładowe.
 * Uruchamia się tylko raz — kolejne starty nie zmieniają danych.
 */
const crypto = require('crypto');
const { db, tx, meta, nowIso } = require('./db');
const env = require('./env');
const C = require('./site-config');
const B = require('./booking');
const { hashPassword, randomToken, shortCode } = require('./security');

function seedAdmins() {
  // lokalnie hasło „demo”; na serwerze produkcyjnym hasło startowe trzeba podać w .env
  const initial = env.adminInitialPassword || (env.production ? null : 'demo');
  if (!initial) throw new Error('Ustaw ADMIN_INITIAL_PASSWORD w pliku .env przed pierwszym uruchomieniem na serwerze.');
  const ins = db.prepare('INSERT OR IGNORE INTO admins (email, name, role, password_hash, must_change) VALUES (?, ?, ?, ?, ?)');
  C.panelAccounts.forEach((a) => ins.run(a.email, a.name, a.role, hashPassword(initial), env.adminInitialPassword ? 1 : 0));
  return initial;
}

function seedPromos() {
  const ins = db.prepare('INSERT OR IGNORE INTO promotions (id, title, text, percent, categories, date_from, date_to, birthday, members_only, active) VALUES (?,?,?,?,?,?,?,?,?,?)');
  (C.defaultPromos || []).forEach((p) => ins.run(p.id, p.title, p.text, p.percent, p.categories === 'all' ? 'all' : JSON.stringify(p.categories),
    p.from, p.to, p.birthday ? 1 : 0, p.membersOnly === false ? 0 : 1, p.active ? 1 : 0));
}

// Kilka przykładowych klientek i wizyt, żeby panel nie był pusty. Usuwa je przycisk w panelu.
function seedDemo() {
  const people = [
    ['Anna', 'Kowalczyk', '+48 601 224 318', 'anna.kowalczyk@example.com', 1, 1],
    ['Marta', 'Wiśniewska', '+48 512 908 447', 'marta.w@example.com', 1, 0],
    ['Karolina', 'Zielińska', '+48 698 115 902', 'k.zielinska@example.com', 0, 0],
    ['Ola', 'Nowicka', '+48 789 330 614', 'ola.nowicka@example.com', 1, 1],
    ['Magdalena', 'Lis', '+48 535 471 280', 'm.lis@example.com', 0, 1]
  ];
  const at = new Date(Date.now() - 40 * 864e5).toISOString();
  tx(() => {
    const ids = people.map(([fn, ln, ph, em, sms, mail]) => {
      const id = Number(db.prepare('INSERT INTO clients (first_name, last_name, email, phone, password_hash, demo, created_at) VALUES (?,?,?,?,?,1,?)')
        .run(fn, ln, em, ph, hashPassword(crypto.randomBytes(12).toString('hex')), at).lastInsertRowid);
      const c = db.prepare('INSERT INTO consents (client_id, kind, value, at) VALUES (?,?,?,?)');
      c.run(id, 'terms', 1, at); c.run(id, 'marketing_sms', sms, at); c.run(id, 'marketing_email', mail, at);
      db.prepare('INSERT INTO consent_log (client_id, at, change) VALUES (?,?,?)').run(id, at, 'Rejestracja konta (dane przykładowe)');
      return id;
    });
    const plan = [
      [1, '10:00', 'mezo-twarz', 0], [1, '13:00', 'pmu-brwi', 1], [2, '09:30', 'kwas-migdalowy', 2],
      [3, '16:00', 'stym-ha', 3], [4, '11:00', 'pmu-korekta', 1], [6, '12:00', 'prx-twarz', 4],
      [8, '10:30', 'mikro-twarz', 0], [-7, '12:00', 'konsultacja', 2], [-14, '10:00', 'pmu-brwi', 1], [5, '15:00', 'mezo-glowa', null]
    ];
    const ins = db.prepare(`INSERT INTO bookings (code, token, status, treatment_id, treatment_name, duration, date, time, start_min, end_min,
      client_id, guest_first, guest_last, guest_phone, guest_email, price, total, created_at, demo) VALUES (?,?,?,?,?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,1)`);
    plan.forEach(([off, time, tid, ci]) => {
      const t = B.treatment(tid);
      const d = new Date(); d.setDate(d.getDate() + off);
      while (!B.dayHours(B.isoDate(d)) || B.C.hours[d.getDay()][1] * 60 < B.toMin(time) + t.duration) d.setDate(d.getDate() + 1);
      const s = B.toMin(time);
      const guest = ci === null ? ['Joanna', 'Mazur', '+48 604 771 239', 'joanna.mazur@example.com'] : [null, null, null, null];
      ins.run(shortCode(6), randomToken(24), off < 0 ? 'done' : 'confirmed', t.id, t.name, t.duration, B.isoDate(d), time, s, s + t.duration,
        ci === null ? null : ids[ci], ...guest, B.currentPrice(t.id), B.currentPrice(t.id), at);
    });
  });
}

function clearDemo() {
  tx(() => {
    db.prepare('DELETE FROM messages WHERE booking_id IN (SELECT id FROM bookings WHERE demo = 1)').run();
    db.prepare('DELETE FROM bookings WHERE demo = 1').run();
    db.prepare('DELETE FROM clients WHERE demo = 1').run();
  });
}

function run() {
  if (meta.get('seeded')) return null;
  const pass = seedAdmins();
  seedPromos();
  if (!env.production) seedDemo(); // na serwerze produkcyjnym baza startuje bez danych przykładowych
  meta.set('seeded', nowIso());
  return pass;
}

module.exports = { run, clearDemo, seedDemo };
