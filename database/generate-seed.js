/*
 * Generuje database/seed.sql z danych strony (assets/js/config.js i treatments.js),
 * żeby katalog zabiegów w bazie był taki sam jak w prototypie.
 *
 * Użycie (w folderze projektu):  node database/generate-seed.js
 */
const fs = require('fs');
const path = require('path');

global.window = global;
require('../assets/js/config.js');
require('../assets/js/treatments.js');
const JM = global.JM;

const q = (v) => (v === null || v === undefined ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'");
const arr = (xs) => (xs && xs.length ? 'ARRAY[' + xs.map(q).join(', ') + ']::text[]' : "'{}'::text[]");
const out = [];
const line = (s = '') => out.push(s);

line('-- =====================================================================');
line('--  Dane startowe. Wygenerowane przez: node database/generate-seed.js');
line('--  Uruchom po schema.sql. Części oznaczone PRZYKŁAD to dane testowe.');
line('-- =====================================================================');
line('SET search_path = salon, public, extensions;');
line('BEGIN;');
line();

// ---------- Kategorie i zabiegi ----------
line('-- Kategorie');
const cats = [{ id: 'konsultacja', name: 'Konsultacja', lead: 'Ocena skóry i dobór zabiegów.', about: null, prep: [], contra: [], after: [] }].concat(JM.categories);
cats.forEach((c, i) => {
  line(`INSERT INTO categories (id, name, lead, about, preparation, contraindications, aftercare, sort_order) VALUES (${q(c.id)}, ${q(c.name)}, ${q(c.lead)}, ${q(c.about)}, ${arr(c.prep)}, ${arr(c.contra)}, ${arr(c.after)}, ${i});`);
});
line();
line('-- Zabiegi (ceny: średnie z krakowskich gabinetów, do zastąpienia cennikiem gabinetu)');
const k = JM.consultation;
const all = [Object.assign({}, k, {
  what: 'Spotkanie przed pierwszym zabiegiem: ocena skóry, rozmowa o oczekiwaniach i kwalifikacja do zabiegu.',
  how: null, helps: [], when: null, benefits: [], steps: null, results: null, series: null
})].concat(JM.treatments);
all.forEach((t, i) => {
  line(`INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (`);
  line(`  ${q(t.id)}, ${q(t.category)}, ${q(t.name)}, ${q(t.short)},`);
  line(`  ${q(t.what)},`);
  line(`  ${q(t.how)},`);
  line(`  ${arr(t.helps)}, ${q(t.when)},`);
  line(`  ${arr(t.benefits)}, ${q(t.steps)}, ${q(t.results)}, ${q(t.series)},`);
  line(`  ${t.duration}, ${t.price}, ${t.from ? 'true' : 'false'}, ${i});`);
});
line();

// ---------- Godziny pracy i dni wolne ----------
line('-- Godziny pracy (1 = poniedziałek … 7 = niedziela)');
for (let iso = 1; iso <= 7; iso++) {
  const h = JM.hours[iso % 7];
  line(`INSERT INTO working_hours (iso_weekday, opens_at, closes_at) VALUES (${iso}, ${h ? q(h[0] + ':00') : 'NULL'}, ${h ? q(h[1] + ':00') : 'NULL'});`);
}
line();
const holidayNames = {
  '11-11': 'Narodowe Święto Niepodległości', '12-24': 'Wigilia', '12-25': 'Boże Narodzenie', '12-26': 'Drugi dzień świąt',
  '01-01': 'Nowy Rok', '01-06': 'Trzech Króli', '05-01': 'Święto Pracy', '05-03': 'Święto Konstytucji 3 Maja'
};
line('-- Dni ustawowo wolne');
JM.closedDates.forEach((d) => line(`INSERT INTO days_off (day, reason) VALUES (${q(d)}, ${q(holidayNames[d.slice(5)] || 'Wielkanoc')});`));
line();

// ---------- Promocje ----------
line('-- Promocje');
line(`INSERT INTO promotions (id, kind, name, description, percent, members_only, applies_to_all, valid_from, valid_to) VALUES ('powitalna', 'first_visit', 'Zniżka powitalna', '10% zniżki na pierwszy zabieg po założeniu konta.', ${JM.discounts.firstVisitPercent}, true, true, '2026-01-01', '2099-12-31');`);
JM.defaultPromos.forEach((p) => {
  const kind = p.birthday ? 'birthday' : 'seasonal';
  const all = p.categories === 'all';
  line(`INSERT INTO promotions (id, kind, name, description, percent, members_only, applies_to_all, valid_from, valid_to) VALUES (${q(p.id)}, '${kind}', ${q(p.title)}, ${q(p.text)}, ${p.percent}, ${p.membersOnly}, ${all}, ${q(p.from)}, ${q(p.to)});`);
  if (!all) p.categories.forEach((c) => line(`INSERT INTO promotion_categories (promotion_id, category_id) VALUES (${q(p.id)}, ${q(c)});`));
});
line();

// ---------- Konto gabinetu ----------
line('-- Konto właścicielki do panelu (hasło ustawiamy przy podłączaniu logowania)');
line(`INSERT INTO admins (email, full_name, role) VALUES (${q(JM.salon.email)}, ${q(JM.salon.owner)}, 'owner');`);
line();

// ---------- PRZYKŁAD: klientki, zgody, wizyty ----------
line('-- PRZYKŁAD: klientki testowe (adresy @example.com). Usuń przed startem strony.');
const clients = [
  ['a0000000-0000-4000-8000-000000000001', 'Anna', 'Kowalczyk', 'anna.kowalczyk@example.com', '+48 601 224 318', true, true, true, 3],
  ['a0000000-0000-4000-8000-000000000002', 'Marta', 'Wiśniewska', 'marta.w@example.com', '+48 512 908 447', true, true, false, null],
  ['a0000000-0000-4000-8000-000000000003', 'Karolina', 'Zielińska', 'k.zielinska@example.com', '+48 698 115 902', true, false, false, 12],
  ['a0000000-0000-4000-8000-000000000004', 'Joanna', 'Mazur', 'joanna.mazur@example.com', '+48 604 771 239', false, false, false, null]
];
clients.forEach(([id, fn, ln, em, ph, acc, sms, mail, bm]) => {
  line(`INSERT INTO clients (id, first_name, last_name, email, phone, birth_month, has_account, password_hash) VALUES ('${id}', ${q(fn)}, ${q(ln)}, ${q(em)}, ${q(ph)}, ${bm || 'NULL'}, ${acc}, ${acc ? "'test-tylko-przyklad'" : 'NULL'});`);
  const src = acc ? 'registration' : 'booking';
  line(`INSERT INTO consents (client_id, type, granted, source, document_version) VALUES ('${id}', 'terms', true, '${src}', 'regulamin-2026-11'), ('${id}', 'privacy', true, '${src}', 'polityka-2026-11'), ('${id}', 'marketing_sms', ${sms}, '${src}', NULL), ('${id}', 'marketing_email', ${mail}, '${src}', NULL);`);
});
line();
line('-- PRZYKŁAD: wizyty (godziny w czasie lokalnym gabinetu)');
const price = (id) => all.find((t) => t.id === id).price;
const dur = (id) => all.find((t) => t.id === id).duration;
const bookings = [
  // klientka, zabieg, dzień, godzina, status, via, promocja
  [1, 'pmu-brwi', '2026-10-12', '10:00', 'completed', 'account', null],
  [3, 'konsultacja', '2026-10-20', '12:00', 'completed', 'account', null],
  [1, 'mezo-twarz', '2026-11-16', '10:00', 'confirmed', 'account', null],
  [2, 'pmu-brwi', '2026-11-16', '13:00', 'confirmed', 'account', 'powitalna'],
  [3, 'kwas-migdalowy', '2026-11-17', '09:30', 'confirmed', 'account', null],
  [4, 'mezo-glowa', '2026-11-18', '15:00', 'confirmed', 'guest', null],
  [1, 'stym-ha', '2026-12-02', '16:00', 'confirmed', 'account', 'swieta-2026']
];
const promoPercent = { powitalna: JM.discounts.firstVisitPercent };
JM.defaultPromos.forEach((p) => (promoPercent[p.id] = p.percent));
bookings.forEach(([ci, tid, day, time, status, via, promo]) => {
  const cid = clients[ci - 1][0];
  const start = `(${q(day + ' ' + time)}::timestamp AT TIME ZONE 'Europe/Warsaw')`;
  line(`INSERT INTO bookings (client_id, treatment_id, starts_at, ends_at, status, booked_via, price, promotion_id, discount_percent, lowest_price_30d) VALUES ('${cid}', ${q(tid)}, ${start}, ${start} + interval '${dur(tid)} minutes', '${status}', '${via}', ${price(tid)}, ${promo ? q(promo) : 'NULL'}, ${promo ? promoPercent[promo] : 0}, ${promo ? price(tid) : 'NULL'});`);
});
line();
line('-- PRZYKŁAD: zmiana zgody (trafi automatycznie do consent_log)');
line(`UPDATE consents SET granted = true, source = 'profile', updated_at = now() WHERE client_id = '${clients[2][0]}' AND type = 'marketing_email';`);
line();
line('COMMIT;');

fs.writeFileSync(path.join(__dirname, 'seed.sql'), out.join('\n') + '\n');
console.log('Zapisano database/seed.sql (' + all.length + ' zabiegów, ' + cats.length + ' kategorii).');
