/* API strony i panelu gabinetu. */
const { db, tx, nowIso } = require('./db');
const B = require('./booking');
const M = require('./messaging');
const Sec = require('./security');
const seed = require('./seed');
const G = require('./gallery');
const Events = require('./events');
// krótki opis wizyty do powiadomienia w panelu (bez e-maila i telefonu)
function live(type, b, by) {
  const c = B.contactOf(b);
  Events.emit(type, { by, id: b.id, date: b.date, time: b.time, treatment: b.treatment_name, client: c ? (c.firstName + ' ' + (c.lastName ? c.lastName[0] + '.' : '')).trim() : '', source: b.source });
}
const C = B.C;

/* ---------- Pomocnicze ---------- */
class HttpError extends Error { constructor(status, msg, field) { super(msg); this.status = status; this.field = field; } }
const langOf = (req) => (req.headers['x-lang'] === 'en' ? 'en' : 'pl');
const T = (req, pl, en) => (langOf(req) === 'en' ? en : pl);

const RE = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  phone: /^\+?[\d\s-]{9,18}$/
};
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
function need(cond, req, field, pl, en) { if (!cond) throw new HttpError(400, T(req, pl, en), field); }
function validPerson(req, d) {
  need(str(d.firstName, 60), req, 'firstName', 'Wpisz imię.', 'Enter your first name.');
  need(str(d.lastName, 60), req, 'lastName', 'Wpisz nazwisko.', 'Enter your last name.');
  need(RE.phone.test(str(d.phone, 20)) && str(d.phone, 20).replace(/\D/g, '').length >= 9, req, 'phone', 'Wpisz numer telefonu, np. +48 600 000 000.', 'Enter a phone number, e.g. +48 600 000 000.');
}
const birthMonth = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null; };
const nameIn = (id, lang) => (lang === 'en' ? C.namesEn[id] : null) || (B.treatment(id) || {}).name || id;

/* ---------- Klientki ---------- */
function clientById(id) { return id ? db.prepare('SELECT * FROM clients WHERE id = ?').get(id) : null; }
function currentClient(req) { return clientById(Sec.readSession(req, 'client')); }
function requireClient(req) {
  const c = currentClient(req);
  if (!c) throw new HttpError(401, T(req, 'Zaloguj się, żeby kontynuować.', 'Sign in to continue.'));
  return c;
}
function clientView(c) {
  const cons = {};
  db.prepare('SELECT kind, value, at FROM consents WHERE client_id = ?').all(c.id).forEach((r) => { cons[r.kind] = { value: !!r.value, at: r.at }; });
  return {
    id: c.id, firstName: c.first_name, lastName: c.last_name, email: c.email, phone: c.phone,
    birthMonth: c.birth_month || '', language: c.language, createdAt: c.created_at, visits: B.visitCount(c.id),
    consents: { terms: cons.terms, marketingSms: cons.marketing_sms, marketingEmail: cons.marketing_email },
    consentLog: db.prepare('SELECT at, change FROM consent_log WHERE client_id = ? ORDER BY id').all(c.id)
  };
}
function setConsent(clientId, kind, value, ip, at = nowIso()) {
  db.prepare('INSERT INTO consents (client_id, kind, value, at) VALUES (?,?,?,?) ON CONFLICT(client_id, kind) DO UPDATE SET value = excluded.value, at = excluded.at')
    .run(clientId, kind, value ? 1 : 0, at);
  const label = { marketing_sms: 'Marketing SMS', marketing_email: 'Marketing e-mail' }[kind];
  if (label) db.prepare('INSERT INTO consent_log (client_id, at, change, ip) VALUES (?,?,?,?)').run(clientId, at, label + ': ' + (value ? 'zgoda' : 'wycofanie zgody'), ip);
}

/* ---------- Powiadomienia o wizycie ---------- */
function notify(b, kind) {
  if (b.demo) return; // dane przykładowe nigdy nie dostają wiadomości
  const contact = B.contactOf(b); if (!contact) return;
  const lang = b.lang; const name = nameIn(b.treatment_id, lang);
  if (kind === 'confirmation') {
    M.queueSms('confirmation', contact.phone, M.sms.confirmation(b, name, lang), b.id);
    M.queueEmail('confirmation', contact.email, M.email.confirmation(b, name, lang), b.id);
  } else if (kind === 'moved') {
    M.queueSms('moved', contact.phone, M.sms.moved(b, name, lang), b.id);
    M.queueEmail('moved', contact.email, M.email.moved(b, name, lang), b.id);
  } else if (kind === 'cancelled') {
    M.queueSms('cancellation', contact.phone, (b.cancelled_by === 'salon' ? M.sms.cancelledBySalon : M.sms.cancelledByClient)(b, name, lang), b.id);
    M.queueEmail('cancellation', contact.email, M.email.cancelled(b, name, lang, b.cancelled_by), b.id);
  }
  M.processQueue();
}

// Przypomnienia: wizyta za mniej niż X godzin, a rezerwacja była wcześniej niż X godzin przed wizytą
function queueReminders() {
  B.completePast();
  const now = new Date();
  const horizon = new Date(now.getTime() + C.booking.reminderHours * 36e5);
  const list = db.prepare("SELECT * FROM bookings WHERE status = 'confirmed' AND demo = 0 AND date BETWEEN ? AND ?").all(B.isoDate(now), B.isoDate(horizon));
  let n = 0;
  for (const b of list) {
    const start = B.startOf(b);
    const due = new Date(start.getTime() - C.booking.reminderHours * 36e5);
    if (start <= now || due > now || new Date(b.created_at) > due) continue;
    const c = B.contactOf(b); if (!c) continue;
    if (M.queueSms('reminder', c.phone, M.sms.reminder(b, nameIn(b.treatment_id, b.lang), b.lang), b.id)) n++;
  }
  if (n) M.processQueue();
  return n;
}

/* ---------- Panel ---------- */
function currentAdmin(req) {
  const id = Sec.readSession(req, 'admin');
  return id ? db.prepare('SELECT id, email, name, role, must_change FROM admins WHERE id = ?').get(id) : null;
}
function requireAdmin(req) {
  const a = currentAdmin(req);
  if (!a) throw new HttpError(401, 'Zaloguj się do panelu.');
  return a;
}
function adminBooking(b) {
  const c = B.contactOf(b);
  return Object.assign(B.publicBooking(b), {
    clientId: b.client_id, cancelledAt: b.cancelled_at, demo: !!b.demo,
    client: c ? { name: c.firstName + ' ' + c.lastName, phone: c.phone, email: c.email, type: c.account ? 'konto' : 'gość' } : { name: 'Konto usunięte', phone: '—', email: '', type: '—' }
  });
}
function allClients() {
  const map = new Map();
  db.prepare(`SELECT c.*, (SELECT value FROM consents WHERE client_id = c.id AND kind = 'marketing_sms') AS sms,
      (SELECT value FROM consents WHERE client_id = c.id AND kind = 'marketing_email') AS mail FROM clients c`).all().forEach((c) => {
    map.set(c.email.toLowerCase(), { id: c.id, firstName: c.first_name, lastName: c.last_name, name: c.first_name + ' ' + c.last_name, phone: c.phone, email: c.email, type: 'konto',
      createdAt: c.created_at, sms: !!c.sms, mail: !!c.mail, visits: 0, last: '', firstVisitUsed: false, language: c.language, demo: !!c.demo });
  });
  const byId = new Map([...map.values()].map((c) => [c.id, c]));
  db.prepare('SELECT * FROM bookings ORDER BY created_at').all().forEach((b) => {
    let c = b.client_id ? byId.get(b.client_id) : null;
    if (!c && (b.guest_email || b.guest_phone)) {
      const key = (b.guest_email || 'tel:' + b.guest_phone.replace(/\D/g, '')).toLowerCase();
      c = map.get(key);
      if (!c) { c = { firstName: b.guest_first, lastName: b.guest_last || '', name: (b.guest_first + ' ' + (b.guest_last || '')).trim(), phone: b.guest_phone, email: b.guest_email || '', type: 'gość', createdAt: b.created_at, visits: 0, last: '', language: b.lang, demo: !!b.demo }; map.set(key, c); }
      if (c.type === 'gość') { c.sms = !!b.guest_marketing_sms; c.mail = !!b.guest_marketing_email; c.phone = b.guest_phone; }
    }
    if (c && b.status !== 'cancelled') { c.visits++; if (b.date > c.last) c.last = b.date; if (b.client_id) c.firstVisitUsed = true; }
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}
function csv(rows) {
  return '﻿' + rows.map((r) => r.map((x) => {
    let s = String(x ?? '');
    if (/^[=+\-@]/.test(s)) s = "'" + s; // ochrona przed formułami w Excelu
    return '"' + s.replace(/"/g, '""') + '"';
  }).join(';')).join('\r\n');
}
function adminPrices() {
  return B.allTreatments().map((t) => ({ id: t.id, name: t.name, category: t.category || 'konsultacja', duration: t.duration, from: !!t.from,
    price: B.currentPrice(t.id), basePrice: t.price, lowest30: B.lowest30(t.id) }));
}
function promoInput(req, d) {
  const title = str(d.title, 80), text = str(d.text, 240), percent = Number(d.percent);
  need(title && text, req, 'title', 'Uzupełnij nazwę i opis promocji.', '');
  need(Number.isFinite(percent) && percent > 0 && percent <= 50, req, 'percent', 'Zniżka musi być od 1 do 50%.', '');
  need(B.DATE_RE.test(d.from) && B.DATE_RE.test(d.to) && d.to >= d.from, req, 'from', 'Sprawdź daty promocji.', '');
  const cats = d.categories === 'all' ? 'all' : JSON.stringify([].concat(d.categories).filter((c) => C.categories.some((x) => x.id === c)));
  return { title, text, percent, cats, from: d.from, to: d.to, membersOnly: d.membersOnly === false ? 0 : 1 };
}

/* ---------- Trasy ---------- */
const routes = [];
const route = (method, pattern, handler) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler });

route('GET', '/api/bootstrap', (req) => {
  const c = currentClient(req);
  const lowest = {}; B.allTreatments().forEach((t) => { lowest[t.id] = B.lowest30(t.id); });
  return {
    user: c ? clientView(c) : null,
    prices: B.priceMap(), lowest30: lowest,
    promos: B.promotions({ activeOnly: true }),
    window: B.bookingWindow()
  };
});

route('GET', '/api/availability', (req, { query }) => {
  const a = B.availability(query.get('treatment'), query.get('from') || '', query.get('to') || '');
  if (!a) throw new HttpError(400, 'Nieprawidłowe zapytanie.');
  return { days: a };
});

route('POST', '/api/bookings', (req, { body, ip }) => {
  if (!Sec.rateLimit('book:' + ip, 20, 36e5)) throw new HttpError(429, T(req, 'Zbyt wiele rezerwacji w krótkim czasie. Zadzwoń do gabinetu.', 'Too many bookings in a short time. Please call the studio.'));
  const client = currentClient(req);
  let guest = null;
  if (!client) {
    const g = body.guest || {};
    validPerson(req, g);
    need(RE.email.test(str(g.email, 120)), req, 'email', 'Wpisz adres e-mail, np. anna@example.com.', 'Enter an email address, e.g. anna@example.com.');
    need(g.terms === true, req, 'terms', 'Zaakceptuj regulamin, żeby zarezerwować wizytę.', 'Accept the terms to book a visit.');
    guest = { firstName: str(g.firstName, 60), lastName: str(g.lastName, 60), phone: str(g.phone, 20), email: str(g.email, 120).toLowerCase(), marketingSms: !!g.marketingSms, marketingEmail: !!g.marketingEmail };
  }
  try {
    const b = B.createBooking({ treatmentId: body.treatmentId, date: body.date, time: body.time, notes: str(body.notes, 400), lang: langOf(req), client, guest });
    notify(b, 'confirmation'); live('booked', b, 'client');
    return { booking: Object.assign(B.publicBooking(b), { token: b.token }) };
  } catch (e) {
    if (e instanceof B.BookingError) throw new HttpError(409, e.code === 'taken' ? T(req, e.message, 'This time has just been taken. Please choose another one.') : e.message, 'slot');
    throw e;
  }
});

route('GET', '/api/me/bookings', (req) => {
  const c = requireClient(req);
  return { bookings: db.prepare('SELECT * FROM bookings WHERE client_id = ? ORDER BY date, time').all(c.id).map(B.publicBooking) };
});
route('POST', '/api/me/bookings/:id/cancel', (req, { params }) => {
  const c = requireClient(req);
  const b = B.getBooking(Number(params.id));
  if (!b || b.client_id !== c.id) throw new HttpError(404, T(req, 'Nie znaleziono wizyty.', 'Visit not found.'));
  try { const nb = B.cancelBooking(b, 'client'); notify(nb, 'cancelled'); live('cancelled', nb, 'client'); return { booking: B.publicBooking(nb) }; } catch (e) { if (e instanceof B.BookingError) throw new HttpError(409, T(req, e.message, 'This visit can no longer be cancelled.')); throw e; }
});

route('GET', '/api/visit/:token', (req, { params }) => {
  const b = B.getBookingByToken(params.token);
  if (!b) throw new HttpError(404, T(req, 'Nie znaleziono wizyty. Sprawdź link z SMS-a albo zadzwoń do gabinetu.', 'Visit not found. Check the link in your text message or call the studio.'));
  const c = B.contactOf(b);
  return { booking: B.publicBooking(b), firstName: c ? c.firstName : '' };
});
route('POST', '/api/visit/:token/cancel', (req, { params, ip }) => {
  if (!Sec.rateLimit('visit:' + ip, 20, 36e5)) throw new HttpError(429, 'Spróbuj później.');
  const b = B.getBookingByToken(params.token);
  if (!b) throw new HttpError(404, T(req, 'Nie znaleziono wizyty.', 'Visit not found.'));
  try { const nb = B.cancelBooking(b, 'client'); notify(nb, 'cancelled'); live('cancelled', nb, 'client'); return { booking: B.publicBooking(nb) }; } catch (e) { if (e instanceof B.BookingError) throw new HttpError(409, T(req, e.message, 'This visit can no longer be cancelled.')); throw e; }
});

route('POST', '/api/register', (req, { body, ip, res }) => {
  if (!Sec.rateLimit('reg:' + ip, 10, 36e5)) throw new HttpError(429, T(req, 'Zbyt wiele prób. Spróbuj za godzinę.', 'Too many attempts. Try again in an hour.'));
  validPerson(req, body);
  const email = str(body.email, 120).toLowerCase();
  need(RE.email.test(email), req, 'email', 'Wpisz adres e-mail, np. anna@example.com.', 'Enter an email address, e.g. anna@example.com.');
  need(typeof body.password === 'string' && body.password.length >= 8 && body.password.length <= 200, req, 'password', 'Hasło musi mieć co najmniej 8 znaków.', 'Your password must be at least 8 characters long.');
  need(body.terms === true, req, 'terms', 'Zaakceptuj regulamin, żeby założyć konto.', 'Accept the terms to create an account.');
  if (db.prepare('SELECT 1 FROM clients WHERE email = ?').get(email)) throw new HttpError(409, T(req, 'Konto z tym adresem e-mail już istnieje. Zaloguj się albo zresetuj hasło.', 'An account with this email address already exists. Sign in or reset your password.'), 'email');
  const at = nowIso();
  const id = tx(() => {
    const id = Number(db.prepare('INSERT INTO clients (first_name, last_name, email, phone, birth_month, language, password_hash, created_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(str(body.firstName, 60), str(body.lastName, 60), email, str(body.phone, 20), birthMonth(body.birthMonth), langOf(req), Sec.hashPassword(body.password), at).lastInsertRowid);
    db.prepare('INSERT INTO consents (client_id, kind, value, at) VALUES (?,?,1,?)').run(id, 'terms', at);
    db.prepare('INSERT INTO consent_log (client_id, at, change, ip) VALUES (?,?,?,?)').run(id, at, 'Akceptacja regulaminu i polityki prywatności', ip);
    setConsent(id, 'marketing_sms', !!body.marketingSms, ip, at);
    setConsent(id, 'marketing_email', !!body.marketingEmail, ip, at);
    return id;
  });
  const c = clientById(id);
  Sec.createSession(res, 'client', id, req);
  M.queueEmail('welcome', c.email, M.email.welcome(c, c.language)); M.processQueue();
  return { user: clientView(c) };
});

route('POST', '/api/login', (req, { body, ip, res }) => {
  const email = str(body.email, 120).toLowerCase();
  if (!Sec.rateLimit('login:' + ip, 20, 15 * 6e4) || !Sec.rateLimit('login:' + email, 8, 15 * 6e4)) throw new HttpError(429, T(req, 'Zbyt wiele prób logowania. Spróbuj za 15 minut albo zresetuj hasło.', 'Too many sign-in attempts. Try again in 15 minutes or reset your password.'));
  const c = db.prepare('SELECT * FROM clients WHERE email = ? AND demo = 0').get(email);
  const ok = Sec.verifyPassword(String(body.password || ''), c ? c.password_hash : Sec.DUMMY_HASH);
  if (!c || !ok) throw new HttpError(401, T(req, 'Nieprawidłowy e-mail lub hasło.', 'Incorrect email or password.'));
  Sec.createSession(res, 'client', c.id, req);
  return { user: clientView(c) };
});
route('POST', '/api/logout', (req, { res }) => { Sec.destroySession(req, res, 'client'); return { ok: true }; });

route('PATCH', '/api/me', (req, { body }) => {
  const c = requireClient(req);
  validPerson(req, Object.assign({ lastName: c.last_name }, body));
  db.prepare('UPDATE clients SET first_name = ?, last_name = ?, phone = ?, birth_month = ? WHERE id = ?')
    .run(str(body.firstName, 60), str(body.lastName || c.last_name, 60), str(body.phone, 20), birthMonth(body.birthMonth), c.id);
  return { user: clientView(clientById(c.id)) };
});
route('POST', '/api/me/consents', (req, { body, ip }) => {
  const c = requireClient(req);
  const kind = { marketingSms: 'marketing_sms', marketingEmail: 'marketing_email' }[body.kind];
  if (!kind) throw new HttpError(400, 'Nieznana zgoda.');
  setConsent(c.id, kind, !!body.value, ip);
  return { user: clientView(clientById(c.id)) };
});
route('DELETE', '/api/me', (req, { res }) => {
  const c = requireClient(req);
  tx(() => {
    // zaplanowane wizyty zostają w kalendarzu z danymi kontaktowymi potrzebnymi do ich obsługi
    db.prepare("UPDATE bookings SET guest_first = ?, guest_last = ?, guest_phone = ?, guest_email = ? WHERE client_id = ? AND status = 'confirmed'")
      .run(c.first_name, c.last_name, c.phone, c.email, c.id);
    db.prepare('DELETE FROM sessions WHERE kind = ? AND subject_id = ?').run('client', c.id);
    db.prepare('DELETE FROM clients WHERE id = ?').run(c.id);
  });
  Sec.destroySession(req, res, 'client');
  return { ok: true };
});

route('POST', '/api/password/forgot', (req, { body, ip }) => {
  if (!Sec.rateLimit('forgot:' + ip, 5, 36e5)) throw new HttpError(429, T(req, 'Zbyt wiele prób. Spróbuj za godzinę.', 'Too many attempts. Try again in an hour.'));
  const c = db.prepare('SELECT * FROM clients WHERE email = ? AND demo = 0').get(str(body.email, 120).toLowerCase());
  if (c) {
    const token = Sec.randomToken();
    db.prepare('INSERT INTO password_resets (token_hash, client_id, expires_at) VALUES (?,?,?)').run(Sec.sha256(token), c.id, new Date(Date.now() + 36e5).toISOString());
    M.queueEmail('reset', c.email, M.email.reset(c, token, langOf(req))); M.processQueue();
  }
  return { ok: true }; // ta sama odpowiedź niezależnie od tego, czy konto istnieje
});
route('POST', '/api/password/reset', (req, { body, res }) => {
  const r = db.prepare('SELECT * FROM password_resets WHERE token_hash = ?').get(Sec.sha256(String(body.token || '')));
  if (!r || r.used_at || r.expires_at < nowIso()) throw new HttpError(400, T(req, 'Link wygasł albo został już użyty. Poproś o nowy.', 'The link has expired or has already been used. Ask for a new one.'));
  need(typeof body.password === 'string' && body.password.length >= 8 && body.password.length <= 200, req, 'password', 'Hasło musi mieć co najmniej 8 znaków.', 'Your password must be at least 8 characters long.');
  tx(() => {
    db.prepare('UPDATE clients SET password_hash = ? WHERE id = ?').run(Sec.hashPassword(body.password), r.client_id);
    db.prepare('UPDATE password_resets SET used_at = ? WHERE token_hash = ?').run(nowIso(), r.token_hash);
    Sec.destroyAllSessions('client', r.client_id);
  });
  Sec.createSession(res, 'client', r.client_id, req);
  return { user: clientView(clientById(r.client_id)) };
});

route('POST', '/api/contact', (req, { body, ip }) => {
  if (!Sec.rateLimit('contact:' + ip, 5, 36e5)) throw new HttpError(429, T(req, 'Wysłano już kilka wiadomości. Zadzwoń, jeśli sprawa jest pilna.', 'You have already sent several messages. Please call if it is urgent.'));
  const m = { name: str(body.name, 80), contact: str(body.contact, 120), message: str(body.message, 2000) };
  need(m.name, req, 'name', 'Wpisz imię.', 'Enter your name.');
  need(m.contact, req, 'contact', 'Podaj e-mail lub telefon, żebyśmy mogli odpowiedzieć.', 'Give us an email or phone number so we can reply.');
  need(m.message, req, 'message', 'Wpisz treść wiadomości.', 'Write your message.');
  db.prepare('INSERT INTO contact_messages (name, contact, message, created_at) VALUES (?,?,?,?)').run(m.name, m.contact, m.message, nowIso());
  M.queueEmail('contact', require('./env').emailSalon || C.salon.email, M.email.contact(m)); M.processQueue();
  return { ok: true };
});

/* ---------- Panel gabinetu ---------- */
route('POST', '/api/admin/login', (req, { body, ip, res }) => {
  if (!Sec.rateLimit('alogin:' + ip, 10, 15 * 6e4)) throw new HttpError(429, 'Zbyt wiele prób logowania. Spróbuj za 15 minut.');
  const a = db.prepare('SELECT * FROM admins WHERE email = ?').get(str(body.email, 120).toLowerCase());
  const ok = Sec.verifyPassword(String(body.password || ''), a ? a.password_hash : Sec.DUMMY_HASH);
  if (!a || !ok) throw new HttpError(401, 'Nieprawidłowy e-mail lub hasło.');
  Sec.createSession(res, 'admin', a.id, req);
  return { admin: { email: a.email, name: a.name, role: a.role, mustChange: !!a.must_change } };
});
route('POST', '/api/admin/logout', (req, { res }) => { Sec.destroySession(req, res, 'admin'); return { ok: true }; });
route('GET', '/api/admin/me', (req) => {
  const a = currentAdmin(req);
  return { admin: a ? { email: a.email, name: a.name, role: a.role, mustChange: !!a.must_change } : null, accounts: C.panelAccounts.map((x) => x.email), mode: M.mode() };
});
route('POST', '/api/admin/password', (req, { body, res }) => {
  const a = requireAdmin(req);
  const row = db.prepare('SELECT password_hash FROM admins WHERE id = ?').get(a.id);
  if (!Sec.verifyPassword(String(body.current || ''), row.password_hash)) throw new HttpError(400, 'Obecne hasło jest nieprawidłowe.', 'current');
  if (typeof body.next !== 'string' || body.next.length < 12) throw new HttpError(400, 'Nowe hasło musi mieć co najmniej 12 znaków.', 'next');
  db.prepare('UPDATE admins SET password_hash = ?, must_change = 0 WHERE id = ?').run(Sec.hashPassword(body.next), a.id);
  Sec.destroyAllSessions('admin', a.id);
  Sec.createSession(res, 'admin', a.id, req);
  return { ok: true };
});

route('GET', '/api/admin/bookings', (req, { query }) => {
  requireAdmin(req); B.completePast();
  const from = query.get('from') || '0000-00-00', to = query.get('to') || '9999-12-31';
  const status = query.get('status');
  const rows = db.prepare(`SELECT * FROM bookings WHERE date BETWEEN ? AND ? ${status ? 'AND status = ?' : ''} ORDER BY date, time`)
    .all(...[from, to].concat(status ? [status] : []));
  return { bookings: rows.map(adminBooking) };
});
route('GET', '/api/admin/overview', (req) => {
  requireAdmin(req); B.completePast();
  const today = B.isoDate(new Date()); const week = new Date(); week.setDate(week.getDate() + 7);
  const cl = allClients();
  const q = (sql, ...a) => db.prepare(sql).get(...a).n;
  return {
    today: q("SELECT count(*) AS n FROM bookings WHERE status = 'confirmed' AND date = ?", today),
    week: q("SELECT count(*) AS n FROM bookings WHERE status = 'confirmed' AND date BETWEEN ? AND ?", today, B.isoDate(week)),
    clients: cl.length, smsConsents: cl.filter((c) => c.sms).length,
    feesDue: db.prepare("SELECT coalesce(sum(fee),0) AS n FROM bookings WHERE fee_status = 'due'").get().n,
    upcoming: db.prepare("SELECT * FROM bookings WHERE status = 'confirmed' AND date >= ? ORDER BY date, time LIMIT 8").all(today).map(adminBooking),
    newAccounts: cl.filter((c) => c.type === 'konto').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    hasDemo: !!db.prepare('SELECT 1 FROM clients WHERE demo = 1 UNION SELECT 1 FROM bookings WHERE demo = 1').get(),
    contact: db.prepare('SELECT * FROM contact_messages ORDER BY id DESC LIMIT 5').all()
  };
});
const adminAction = (fn) => (req, { params, body }) => {
  requireAdmin(req);
  const b = B.getBooking(Number(params.id)); if (!b) throw new HttpError(404, 'Nie znaleziono wizyty.');
  try { const nb = fn(b, body); live('changed', nb, 'salon'); return { booking: adminBooking(nb) }; } catch (e) { if (e instanceof B.BookingError) throw new HttpError(409, e.message); throw e; }
};
// Kalendarz tygodnia: wizyty, blokady i godziny pracy w podanym zakresie dni
route('GET', '/api/admin/calendar', (req, { query }) => {
  requireAdmin(req); B.completePast();
  const from = query.get('from'), to = query.get('to');
  if (!B.DATE_RE.test(from || '') || !B.DATE_RE.test(to || '') || to < from) throw new HttpError(400, 'Nieprawidłowy zakres dat.');
  const days = [];
  for (let d = new Date(from + 'T12:00:00'); B.isoDate(d) <= to && days.length < 42; d.setDate(d.getDate() + 1)) {
    const ds = B.isoDate(d); const h = B.dayHours(ds);
    const off = db.prepare('SELECT note FROM days_off WHERE date = ?').get(ds);
    days.push({ date: ds, hours: h ? [h[0] * 60, h[1] * 60] : null, closed: !h ? (C.closedDates.includes(ds) ? 'święto' : off ? (off.note || 'dzień wolny') : 'nieczynne') : null });
  }
  const bookings = db.prepare("SELECT * FROM bookings WHERE date BETWEEN ? AND ? AND status <> 'cancelled' ORDER BY date, start_min").all(from, to).map(adminBooking);
  return { days, bookings, blocks: B.blocksBetween(from, to), range: [Math.min(...Object.values(C.hours).filter(Boolean).map((h) => h[0])) * 60, Math.max(...Object.values(C.hours).filter(Boolean).map((h) => h[1])) * 60] };
});

// Wizyta dodana w panelu (telefon, Instagram, osobiście)
route('POST', '/api/admin/bookings', (req, { body }) => {
  requireAdmin(req);
  let client = null, guest = null;
  if (body.clientId) {
    client = clientById(Number(body.clientId));
    if (!client) throw new HttpError(400, 'Nie znaleziono konta klientki.');
  } else {
    const g = body.guest || {};
    if (!str(g.firstName, 60)) throw new HttpError(400, 'Wpisz imię klientki.', 'firstName');
    if (!(RE.phone.test(str(g.phone, 20)) && str(g.phone, 20).replace(/\D/g, '').length >= 9)) throw new HttpError(400, 'Wpisz numer telefonu klientki.', 'phone');
    if (str(g.email, 120) && !RE.email.test(str(g.email, 120))) throw new HttpError(400, 'Sprawdź adres e-mail albo zostaw pole puste.', 'email');
    guest = { firstName: str(g.firstName, 60), lastName: str(g.lastName, 60), phone: str(g.phone, 20), email: str(g.email, 120).toLowerCase() };
  }
  const source = ['telefon', 'instagram', 'osobiście', 'inne'].includes(body.source) ? body.source : 'telefon';
  try {
    const b = B.createManualBooking({ treatmentId: body.treatmentId, date: body.date, time: body.time, duration: body.duration, price: body.price, notes: str(body.notes, 400), source, client, guest, force: body.force === true });
    if (body.notify !== false) notify(b, 'confirmation');
    live('booked', b, 'salon');
    return { booking: adminBooking(b) };
  } catch (e) {
    if (e instanceof B.BookingError) throw new HttpError(409, e.message, e.code);
    throw e;
  }
});
route('POST', '/api/admin/bookings/:id/move', (req, { params, body }) => {
  requireAdmin(req);
  const b = B.getBooking(Number(params.id)); if (!b) throw new HttpError(404, 'Nie znaleziono wizyty.');
  try {
    const nb = B.moveBooking(b, { date: body.date, time: body.time, by: 'salon', force: body.force === true });
    if (body.notify !== false) notify(nb, 'moved');
    live('moved', nb, 'salon');
    return { booking: adminBooking(nb) };
  } catch (e) { if (e instanceof B.BookingError) throw new HttpError(409, e.message, e.code); throw e; }
});
route('POST', '/api/admin/blocks', (req, { body }) => {
  requireAdmin(req);
  try { const clash = B.addBlock({ date: body.date, start: body.start, end: body.end, note: str(body.note, 120) }); Events.emit('blocks', { by: 'salon' }); return { ok: true, clash }; }
  catch (e) { if (e instanceof B.BookingError) throw new HttpError(400, e.message); throw e; }
});
route('DELETE', '/api/admin/blocks/:id', (req, { params }) => {
  requireAdmin(req);
  db.prepare('DELETE FROM blocks WHERE id = ?').run(Number(params.id));
  Events.emit('blocks', { by: 'salon' });
  return { ok: true };
});

// Zmiana terminu przez klientkę (konto albo link z SMS-a)
function clientMove(req, b, body) {
  try { const nb = B.moveBooking(b, { date: body.date, time: body.time, by: 'client' }); notify(nb, 'moved'); live('moved', nb, 'client'); return { booking: B.publicBooking(nb) }; }
  catch (e) {
    if (e instanceof B.BookingError) throw new HttpError(409, e.code === 'late' ? T(req, e.message, `You can change the time online up to ${C.booking.cancelHours} hours before the visit. Please call the studio.`) : T(req, e.message, 'This time is no longer available. Please choose another one.'), 'slot');
    throw e;
  }
}
route('POST', '/api/me/bookings/:id/move', (req, { params, body }) => {
  const c = requireClient(req);
  const b = B.getBooking(Number(params.id));
  if (!b || b.client_id !== c.id) throw new HttpError(404, T(req, 'Nie znaleziono wizyty.', 'Visit not found.'));
  return clientMove(req, b, body);
});
route('POST', '/api/visit/:token/move', (req, { params, body, ip }) => {
  if (!Sec.rateLimit('visit:' + ip, 20, 36e5)) throw new HttpError(429, 'Spróbuj później.');
  const b = B.getBookingByToken(params.token);
  if (!b) throw new HttpError(404, T(req, 'Nie znaleziono wizyty.', 'Visit not found.'));
  return clientMove(req, b, body);
});

route('POST', '/api/admin/bookings/:id/cancel', adminAction((b) => { const nb = B.cancelBooking(b, 'salon'); notify(nb, 'cancelled'); return nb; }));
route('POST', '/api/admin/bookings/:id/no-show', adminAction((b) => B.markNoShow(b)));
route('POST', '/api/admin/bookings/:id/fee', adminAction((b, body) => B.setFeeStatus(b, body.status)));

route('GET', '/api/admin/clients', (req) => { requireAdmin(req); return { clients: allClients() }; });
route('GET', '/api/admin/clients.csv', (req) => {
  requireAdmin(req);
  const rows = [['Imię i nazwisko', 'Telefon', 'E-mail', 'Typ', 'Wizyty', 'Ostatnia wizyta', 'Zgoda SMS', 'Zgoda e-mail']]
    .concat(allClients().map((c) => [c.name, c.phone, c.email, c.type, c.visits, c.last, c.sms ? 'tak' : 'nie', c.mail ? 'tak' : 'nie']));
  return { __raw: csv(rows), type: 'text/csv; charset=utf-8', filename: 'klientki-' + B.isoDate(new Date()) + '.csv' };
});

route('GET', '/api/admin/prices', (req) => { requireAdmin(req); return { prices: adminPrices() }; });
route('PUT', '/api/admin/prices', (req, { body }) => {
  requireAdmin(req);
  const changes = Object.entries(body.prices || {});
  tx(() => changes.forEach(([id, v]) => {
    const p = Number(v);
    if (!B.treatment(id) || !Number.isFinite(p) || p < 0 || p > 100000) return;
    if (B.currentPrice(id) !== p) B.setPrice(id, p);
  }));
  return { prices: adminPrices() };
});

route('GET', '/api/admin/promos', (req) => { requireAdmin(req); return { promos: B.promotions() }; });
route('POST', '/api/admin/promos', (req, { body }) => {
  requireAdmin(req); const p = promoInput(req, body);
  const id = 'p-' + Date.now().toString(36);
  db.prepare('INSERT INTO promotions (id, title, text, percent, categories, date_from, date_to, members_only) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, p.title, p.text, p.percent, p.cats, p.from, p.to, p.membersOnly);
  return { promos: B.promotions() };
});
route('PATCH', '/api/admin/promos/:id', (req, { params, body }) => {
  requireAdmin(req);
  db.prepare('UPDATE promotions SET active = ? WHERE id = ?').run(body.active ? 1 : 0, params.id);
  return { promos: B.promotions() };
});
route('DELETE', '/api/admin/promos/:id', (req, { params }) => {
  requireAdmin(req);
  if (db.prepare('SELECT 1 FROM bookings WHERE discount_id = ?').get(params.id)) throw new HttpError(409, 'Tej promocji użyto już w rezerwacjach. Wyłącz ją zamiast usuwać.');
  db.prepare('DELETE FROM promotions WHERE id = ?').run(params.id);
  return { promos: B.promotions() };
});

route('GET', '/api/admin/messages', (req, { query }) => {
  requireAdmin(req);
  const ch = query.get('channel');
  const rows = db.prepare(`SELECT id, channel, kind, to_addr, subject, CASE WHEN channel = 'sms' THEN body END AS body, booking_id, status, driver, error, created_at, sent_at
    FROM messages ${ch ? 'WHERE channel = ?' : ''} ORDER BY id DESC LIMIT 100`).all(...(ch ? [ch] : []));
  return { messages: rows, mode: M.mode() };
});
route('GET', '/api/admin/messages/:id', (req, { params }) => {
  requireAdmin(req);
  const m = db.prepare('SELECT * FROM messages WHERE id = ?').get(Number(params.id));
  if (!m) throw new HttpError(404, 'Nie znaleziono.');
  if (m.channel === 'email') return { __raw: m.body, type: 'text/html; charset=utf-8', sandbox: true };
  return { message: m };
});
route('GET', '/api/admin/reminders', (req) => {
  requireAdmin(req); queueReminders();
  const today = B.isoDate(new Date());
  const rows = db.prepare(`SELECT b.*, m.status AS r_status, m.sent_at AS r_sent FROM bookings b
    LEFT JOIN messages m ON m.booking_id = b.id AND m.kind = 'reminder' AND m.channel = 'sms'
    WHERE b.status = 'confirmed' AND b.date >= ? ORDER BY b.date, b.time LIMIT 60`).all(today);
  return { reminders: rows.map((b) => {
    const due = new Date(B.startOf(b).getTime() - C.booking.reminderHours * 36e5);
    return Object.assign(adminBooking(b), { reminderAt: due.toISOString(), reminderStatus: b.r_status || (new Date(b.created_at) > due ? 'skipped' : 'scheduled') });
  }) };
});
route('POST', '/api/admin/campaign', (req, { body }) => {
  requireAdmin(req);
  const channel = body.channel === 'email' ? 'email' : 'sms';
  const text = str(body.text, channel === 'sms' ? 459 : 4000);
  const subject = str(body.subject, 120);
  if (!text || (channel === 'email' && !subject)) throw new HttpError(400, 'Uzupełnij treść' + (channel === 'email' ? ' i temat' : '') + ' wiadomości.');
  const list = allClients().filter((c) => !c.demo && (channel === 'sms' ? c.sms : c.mail));
  list.forEach((c) => {
    if (channel === 'sms') M.queueSms('campaign', c.phone, text);
    else M.queueEmail('campaign', c.email, M.email.campaign(subject, text, c.language || 'pl'));
  });
  M.processQueue();
  return { recipients: list.length };
});

route('GET', '/api/admin/days-off', (req) => { requireAdmin(req); return { days: db.prepare('SELECT * FROM days_off ORDER BY date').all() }; });
route('POST', '/api/admin/days-off', (req, { body }) => {
  requireAdmin(req);
  if (!B.DATE_RE.test(body.date || '')) throw new HttpError(400, 'Wybierz dzień.');
  db.prepare('INSERT OR IGNORE INTO days_off (date, note) VALUES (?, ?)').run(body.date, str(body.note, 120) || null);
  const clash = db.prepare("SELECT count(*) AS n FROM bookings WHERE date = ? AND status = 'confirmed'").get(body.date).n;
  return { days: db.prepare('SELECT * FROM days_off ORDER BY date').all(), clash };
});
route('DELETE', '/api/admin/days-off/:date', (req, { params }) => {
  requireAdmin(req);
  db.prepare('DELETE FROM days_off WHERE date = ?').run(params.date);
  return { days: db.prepare('SELECT * FROM days_off ORDER BY date').all() };
});
/* ---------- Galeria ---------- */
route('GET', '/api/gallery', () => ({ photos: G.list(false) }));
const galleryAction = (fn) => (req, ctx) => {
  const a = requireAdmin(req);
  try { fn(ctx, a); return { photos: G.list(true) }; } catch (e) { if (e instanceof G.GalleryError) throw new HttpError(400, e.message); throw e; }
};
route('GET', '/api/admin/gallery', (req) => { requireAdmin(req); return { photos: G.list(true) }; });
route('POST', '/api/admin/gallery', galleryAction(({ body }, a) => G.add(body, a.email)));
route('PATCH', '/api/admin/gallery/:id', galleryAction(({ params, body }) => G.update(Number(params.id), body)));
route('POST', '/api/admin/gallery/:id/move', galleryAction(({ params, body }) => G.move(Number(params.id), Number(body.dir))));
route('DELETE', '/api/admin/gallery/:id', galleryAction(({ params }) => G.remove(Number(params.id))));

/* ---------- Kopie zapasowe i stan ---------- */
const Backup = require('./backup');
route('GET', '/api/health', () => { db.prepare('SELECT 1').get(); return { ok: true, time: nowIso() }; });
route('GET', '/api/admin/backup', (req) => { requireAdmin(req); return Backup.status(); });
route('POST', '/api/admin/backup', (req) => { requireAdmin(req); Backup.backupNow(); return Backup.status(); });
route('GET', '/api/admin/backup/download', (req) => {
  requireAdmin(req);
  return { __file: Backup.downloadCopy(), type: 'application/octet-stream', filename: 'jm-baza-' + B.isoDate(new Date()) + '.db' };
});

route('POST', '/api/admin/demo/clear', (req) => { requireAdmin(req); seed.clearDemo(); return { ok: true }; });

/* ---------- Obsługa żądań ---------- */
async function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new HttpError(413, 'Za duże żądanie.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { reject(new HttpError(400, 'Nieprawidłowe dane.')); }
    });
    req.on('error', reject);
  });
}

async function handle(req, res, url) {
  const send = (status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(obj));
  };
  try {
    const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname));
    if (!r) {
      const exists = routes.some((x) => x.re.test(url.pathname));
      return send(exists ? 405 : 404, { error: 'Nie ma takiego adresu API.' });
    }
    let body = {};
    if (req.method !== 'GET') {
      // ochrona przed wysyłaniem formularzy z innych stron (CSRF)
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) throw new HttpError(403, 'Niedozwolone żądanie.');
      if (!/application\/json/.test(req.headers['content-type'] || '')) throw new HttpError(415, 'Wymagany JSON.');
      // zdjęcia do galerii są większe niż zwykłe formularze
      body = await readBody(req, req.method === 'POST' && url.pathname === '/api/admin/gallery' ? 16 * 1024 * 1024 : 64 * 1024);
      if (typeof body !== 'object' || body === null || Array.isArray(body)) body = {};
    }
    const out = await r.handler(req, { params: url.pathname.match(r.re).groups || {}, query: url.searchParams, body, res, ip: Sec.clientIp(req) });
    if (out && out.__file) {
      res.writeHead(200, { 'Content-Type': out.type, 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename="${out.filename}"` });
      const s = require('fs').createReadStream(out.__file);
      s.on('close', () => { require('fs').unlink(out.__file, () => {}); });
      return s.pipe(res);
    }
    if (out && out.__raw !== undefined) {
      const headers = { 'Content-Type': out.type, 'Cache-Control': 'no-store' };
      if (out.filename) headers['Content-Disposition'] = `attachment; filename="${out.filename}"`;
      if (out.sandbox) headers['Content-Security-Policy'] = "sandbox; default-src 'none'; img-src data: https:; style-src 'unsafe-inline'";
      res.writeHead(200, headers); return res.end(out.__raw);
    }
    send(200, out);
  } catch (e) {
    if (e instanceof HttpError) return send(e.status, { error: e.message, field: e.field });
    console.error(e);
    send(500, { error: T(req, 'Coś poszło nie tak po naszej stronie. Spróbuj ponownie albo zadzwoń do gabinetu.', 'Something went wrong on our side. Please try again or call the studio.') });
  }
}

module.exports = { handle, queueReminders };
