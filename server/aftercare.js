/*
 * SMS-y po wizycie, tylko dla klientek, które zaznaczyły na to zgodę przy rezerwacji:
 *  - prośba o opinię (dzień po wizycie, link ustawiany w panelu),
 *  - przypomnienie o kolejnym zabiegu (np. korekta makijażu po 6 tygodniach), według reguł z panelu.
 */
const { db, meta, nowIso } = require('./db');
const B = require('./booking');
const M = require('./messaging');
const C = require('./site-config');
const env = require('./env');

const SEND_FROM = 10, SEND_TO = 20;     // SMS-y po wizycie wychodzą między 10:00 a 20:00
const REVIEW_AFTER_H = 18;              // prośba o opinię najwcześniej 18 godzin po wizycie
const REVIEW_MAX_DAYS = 5;              // ...i najpóźniej 5 dni po niej
const REVIEW_GAP_DAYS = 180;            // ta sama osoba dostaje prośbę najwyżej raz na pół roku
const FOLLOWUP_LATE_DAYS = 14;          // spóźnione przypomnienie (np. po przerwie w działaniu serwera) wysyłamy do 2 tygodni

const L = (lang, pl, en) => (lang === 'en' ? en : pl);
const sender = () => env.smsSender || C.salon.smsSender;
const nameIn = (id, lang) => (lang === 'en' ? C.namesEn[id] : null) || (B.treatment(id) || {}).name || id;
const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-9);
const isoDay = (d) => B.isoDate(d);

// Domyślne reguły: makijaż permanentny → korekta po 6 tygodniach (zabieg „Korekta po 4–8 tygodniach”)
const DEFAULT_RULES = [['pmu-brwi', 42, 'pmu-korekta'], ['pmu-usta', 42, 'pmu-korekta'], ['pmu-kreska', 42, 'pmu-korekta'], ['pmu-rzesy', 42, 'pmu-korekta']];
function seedRules() {
  if (meta.get('followup_seeded')) return;
  DEFAULT_RULES.filter(([a, , c]) => B.treatment(a) && B.treatment(c))
    .forEach(([t, d, n]) => db.prepare('INSERT OR IGNORE INTO followup_rules (treatment_id, after_days, next_id) VALUES (?,?,?)').run(t, d, n));
  meta.set('followup_seeded', nowIso());
}
seedRules();

/* ---------- Ustawienia (panel) ---------- */
function settings() {
  return {
    reviewOn: meta.get('review_on') === '1',
    reviewUrl: meta.get('review_url') || '',
    rules: db.prepare('SELECT * FROM followup_rules').all().map((r) => ({ treatmentId: r.treatment_id, treatment: nameIn(r.treatment_id, 'pl'), weeks: Math.round(r.after_days / 7), days: r.after_days, nextId: r.next_id, next: nameIn(r.next_id, 'pl') }))
      .sort((a, b) => a.treatment.localeCompare(b.treatment, 'pl'))
  };
}
class AftercareError extends Error {}
function setReview({ on, url }) {
  const u = String(url || '').trim();
  if (u && !/^https:\/\/[^\s<>"]{6,300}$/.test(u)) throw new AftercareError('Wklej pełny link zaczynający się od https://, np. link do opinii z wizytówki Google.');
  if (on && !u) throw new AftercareError('Żeby włączyć prośbę o opinię, wklej link do opinii.');
  meta.set('review_url', u); meta.set('review_on', on ? '1' : '0');
}
function setRule({ treatmentId, weeks, nextId }) {
  if (!B.treatment(treatmentId) || !B.treatment(nextId)) throw new AftercareError('Wybierz oba zabiegi.');
  const w = Number(weeks);
  if (!(Number.isInteger(w) && w >= 1 && w <= 104)) throw new AftercareError('Podaj liczbę tygodni od 1 do 104.');
  db.prepare(`INSERT INTO followup_rules (treatment_id, after_days, next_id) VALUES (?,?,?)
    ON CONFLICT(treatment_id) DO UPDATE SET after_days = excluded.after_days, next_id = excluded.next_id`).run(treatmentId, w * 7, nextId);
}
const removeRule = (treatmentId) => db.prepare('DELETE FROM followup_rules WHERE treatment_id = ?').run(treatmentId);

/* ---------- Treść SMS-ów ---------- */
function weeksText(days, lang) {
  const w = Math.round(days / 7);
  if (lang === 'en') return w === 1 ? 'a week' : `${w} weeks`;
  return w === 1 ? 'tydzień' : `${w} ${w % 10 >= 2 && w % 10 <= 4 && (w % 100 < 10 || w % 100 >= 20) ? 'tygodnie' : 'tygodni'}`;
}
const followupText = (b, rule, lang) => L(lang,
  `${sender()}: Minęło ${weeksText(rule.after_days, 'pl')} od zabiegu ${nameIn(b.treatment_id, 'pl')}. To dobry moment na: ${nameIn(rule.next_id, 'pl')}. Zarezerwuj: ${M.link('/z/' + rule.next_id)}`,
  `${sender()}: It has been ${weeksText(rule.after_days, 'en')} since your ${nameIn(b.treatment_id, 'en')}. Now is a good time for: ${nameIn(rule.next_id, 'en')}. Book: ${M.link('/z/' + rule.next_id)}`);
const reviewText = (url, lang) => L(lang,
  `${sender()}: Dziękuję za wizytę! Jeśli masz chwilę, napisz, jak oceniasz zabieg: ${url}`,
  `${sender()}: Thank you for your visit! If you have a moment, let us know how it went: ${url}`);

/* ---------- Wysyłka (co minutę z harmonogramu) ---------- */
function scan(now = new Date()) {
  const h = now.getHours();
  if ((h < SEND_FROM || h >= SEND_TO) && !process.env.JM_SMS_ANYTIME) return 0;
  let n = 0;
  const mark = (col, id, val) => db.prepare(`UPDATE bookings SET ${col} = ? WHERE id = ?`).run(val, id);

  // prośba o opinię
  const s = settings();
  if (s.reviewOn && s.reviewUrl) {
    const from = new Date(now); from.setDate(from.getDate() - REVIEW_MAX_DAYS);
    db.prepare("SELECT * FROM bookings WHERE status = 'done' AND after_sms = 1 AND review_sent IS NULL AND demo = 0 AND date >= ?").all(isoDay(from)).forEach((b) => {
      if (now - B.startOf(b) - b.duration * 6e4 < REVIEW_AFTER_H * 36e5) return;
      const c = B.contactOf(b); if (!c || !c.phone) return mark('review_sent', b.id, 'brak telefonu');
      const since = new Date(now); since.setDate(since.getDate() - REVIEW_GAP_DAYS);
      const recent = db.prepare("SELECT guest_phone, client_id FROM bookings WHERE review_sent IS NOT NULL AND review_sent NOT IN ('pominięta', 'brak telefonu') AND review_sent >= ? AND id != ?").all(since.toISOString(), b.id)
        .some((x) => phoneKey((B.contactOf(x) || {}).phone) === phoneKey(c.phone));
      if (recent) return mark('review_sent', b.id, 'pominięta');
      M.queueSms('review', c.phone, reviewText(s.reviewUrl, b.lang), b.id);
      mark('review_sent', b.id, nowIso()); n++;
    });
  }

  // przypomnienie o kolejnym zabiegu
  const rules = new Map(db.prepare('SELECT * FROM followup_rules').all().map((r) => [r.treatment_id, r]));
  if (rules.size) {
    const today = isoDay(now);
    db.prepare("SELECT * FROM bookings WHERE status = 'done' AND after_sms = 1 AND followup_sent IS NULL AND demo = 0").all().forEach((b) => {
      const rule = rules.get(b.treatment_id); if (!rule) return;
      const due = new Date(b.date + 'T12:00:00'); due.setDate(due.getDate() + rule.after_days);
      if (isoDay(due) > today) return;
      const late = new Date(due); late.setDate(late.getDate() + FOLLOWUP_LATE_DAYS);
      if (isoDay(late) < today) return mark('followup_sent', b.id, 'po terminie');
      const c = B.contactOf(b); if (!c || !c.phone) return mark('followup_sent', b.id, 'brak telefonu');
      // klientka już się zapisała na ten albo proponowany zabieg: nie przypominamy
      const booked = db.prepare("SELECT * FROM bookings WHERE id != ? AND date > ? AND status IN ('confirmed', 'done') AND treatment_id IN (?, ?)").all(b.id, b.date, b.treatment_id, rule.next_id)
        .some((x) => phoneKey((B.contactOf(x) || {}).phone) === phoneKey(c.phone));
      if (booked) return mark('followup_sent', b.id, 'pominięta');
      M.queueSms('followup', c.phone, followupText(b, rule, b.lang), b.id);
      mark('followup_sent', b.id, nowIso()); n++;
    });
  }
  if (n) M.processQueue();
  return n;
}

module.exports = { AftercareError, settings, setReview, setRule, removeRule, scan, followupText, reviewText };
