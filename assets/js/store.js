/*
 * Połączenie strony z serwerem (API).
 * Dane klientek, rezerwacje, ceny i promocje są w bazie na serwerze.
 * W przeglądarce zostają tylko drobne ustawienia: język i zgoda na cookies.
 */
window.JM = window.JM || {};

(function () {
  const PREFIX = 'jm_';
  const memory = {};
  function read(key, fallback) {
    try { const raw = localStorage.getItem(PREFIX + key); return raw === null ? fallback : JSON.parse(raw); } catch (e) { return key in memory ? memory[key] : fallback; }
  }
  function write(key, value) {
    memory[key] = value;
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* tryb prywatny */ }
  }
  function remove(key) { delete memory[key]; try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ } }

  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toTime = (min) => pad(Math.floor(min / 60)) + ':' + pad(min % 60);

  /* ---------- Zapytania do serwera ---------- */
  class ApiError extends Error { constructor(msg, status, field) { super(msg); this.status = status; this.field = field; } }
  async function api(method, path, body) {
    let res;
    try {
      res = await fetch(path, {
        method, credentials: 'same-origin',
        headers: Object.assign({ 'X-Lang': JM.lang || 'pl' }, body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw new ApiError(JM.L('Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.', 'No connection to the server. Check your internet connection and try again.'), 0);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error || JM.L('Coś poszło nie tak. Spróbuj ponownie.', 'Something went wrong. Please try again.'), res.status, data.field);
    return data;
  }

  const cache = { user: null, prices: {}, lowest30: {}, promos: [], window: null, offline: false };
  async function load() {
    try { Object.assign(cache, await api('GET', '/api/bootstrap')); } catch (e) { cache.offline = true; }
    return cache;
  }

  /* ---------- Zabiegi i ceny ---------- */
  const withPrice = (t) => (cache.prices[t.id] != null ? Object.assign({}, t, { price: cache.prices[t.id] }) : t);
  const allTreatments = () => JM.treatments.map(withPrice);
  function treatment(id) {
    if (id === JM.consultation.id) return withPrice(JM.consultation);
    const t = JM.treatments.find((x) => x.id === id); return t ? withPrice(t) : null;
  }
  function categoryName(id) {
    if (id === 'konsultacja') return JM.L('Konsultacja', 'Consultation');
    const c = JM.categories.find((x) => x.id === id); return c ? c.name : '';
  }
  function formatPrice(v, from) {
    if (v === 0) return JM.L('bezpłatnie', 'free');
    const s = v.toLocaleString(JM.L('pl-PL', 'en-GB'), { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + JM.L(' zł', ' PLN');
    return from ? JM.L('od ', 'from ') + s : s;
  }
  function formatDuration(min) {
    const h = Math.floor(min / 60), m = min % 60;
    if (!h) return m + ' min';
    return h + ' h' + (m ? ' ' + m + ' min' : '');
  }

  /* ---------- Promocje i zniżki (podgląd — ostateczną cenę liczy serwer) ---------- */
  const promos = () => (JM.promoEn ? cache.promos.map((p) => Object.assign({}, p, JM.promoEn[p.id] || {})) : cache.promos);
  function discountLabel(d) {
    if (!d) return '';
    if (d.id === 'pierwsza-wizyta') return JM.L('Pierwsza wizyta z kontem', 'First visit with an account');
    const p = JM.promoEn && JM.promoEn[d.id]; return p ? p.title : d.label;
  }
  function bestDiscount(t, dateStr, user) {
    if (!t.price) return null;
    const options = [];
    if (user && !user.visits) options.push({ id: 'pierwsza-wizyta', percent: JM.discounts.firstVisitPercent });
    promos().forEach((p) => {
      if (p.membersOnly && !user) return;
      if (dateStr < p.from || dateStr > p.to) return;
      if (p.categories !== 'all' && !p.categories.includes(t.category)) return;
      if (p.birthday && (!user || Number(user.birthMonth) !== Number(dateStr.slice(5, 7)))) return;
      options.push({ id: p.id, label: p.title, percent: p.percent });
    });
    const d = options.sort((a, b) => b.percent - a.percent)[0] || null;
    if (d) d.label = discountLabel(d);
    return d;
  }
  function priceSummary(t, dateStr, user) {
    const d = bestDiscount(t, dateStr || isoDate(new Date()), user);
    const base = t.price;
    const cut = d ? Math.round(base * d.percent) / 100 : 0;
    return { base, discount: d, cut, total: Math.round((base - cut) * 100) / 100, lowest30: cache.lowest30[t.id] ?? base };
  }

  /* ---------- Konto ---------- */
  const currentUser = () => cache.user;
  const setUser = (d) => { cache.user = d.user; return d.user; };
  const register = (data) => api('POST', '/api/register', data).then(setUser);
  const login = (email, password) => api('POST', '/api/login', { email, password }).then(setUser);
  const logout = () => api('POST', '/api/logout', {}).then(() => { cache.user = null; });
  const updateUser = (patch) => api('PATCH', '/api/me', patch).then(setUser);
  const setConsent = (kind, value) => api('POST', '/api/me/consents', { kind, value }).then(setUser);
  const deleteUser = () => api('DELETE', '/api/me', {}).then(() => { cache.user = null; });
  const forgotPassword = (email) => api('POST', '/api/password/forgot', { email });
  const resetPassword = (token, password) => api('POST', '/api/password/reset', { token, password }).then(setUser);

  /* ---------- Wizyty ---------- */
  const myBookings = () => api('GET', '/api/me/bookings').then((d) => d.bookings);
  const cancelMyBooking = (id) => api('POST', '/api/me/bookings/' + id + '/cancel', {}).then((d) => d.booking);
  const visitByToken = (token) => api('GET', '/api/visit/' + encodeURIComponent(token));
  const moveMyBooking = (id, date, time) => api('POST', '/api/me/bookings/' + id + '/move', { date, time }).then((d) => { availCache.clear(); return d.booking; });
  const moveByToken = (token, date, time) => api('POST', '/api/visit/' + encodeURIComponent(token) + '/move', { date, time }).then((d) => { availCache.clear(); return d.booking; });
  const cancelByToken = (token) => api('POST', '/api/visit/' + encodeURIComponent(token) + '/cancel', {}).then((d) => d.booking);
  async function createBooking(payload) {
    const d = await api('POST', '/api/bookings', payload);
    availCache.clear();
    if (cache.user) cache.user.visits = (cache.user.visits || 0) + 1;
    return d.booking;
  }
  const availCache = new Map();
  function availability(treatmentId, from, to) {
    const key = treatmentId + '|' + from + '|' + to;
    if (!availCache.has(key)) {
      availCache.set(key, api('GET', `/api/availability?treatment=${encodeURIComponent(treatmentId)}&from=${from}&to=${to}`).then((d) => d.days)
        .catch((e) => { availCache.delete(key); throw e; }));
    }
    return availCache.get(key);
  }
  const sendContact = (data) => api('POST', '/api/contact', data);

  /* ---------- Cookies (zapamiętane tylko w tej przeglądarce) ---------- */
  function cookieConsent() { return read('cookies', null); }
  function setCookieConsent(c) { write('cookies', Object.assign({ at: new Date().toISOString() }, c)); }

  JM.store = {
    read, write, remove, isoDate, pad, toMin, toTime, api, ApiError,
    allTreatments, treatment, categoryName, formatPrice, formatDuration,
    promos, discountLabel, bestDiscount, priceSummary,
    currentUser, register, login, logout, updateUser, setConsent, deleteUser, forgotPassword, resetPassword,
    myBookings, cancelMyBooking, moveMyBooking, visitByToken, cancelByToken, moveByToken, createBooking, availability, sendContact,
    cookieConsent, setCookieConsent,
    get window() { return cache.window; }, get offline() { return cache.offline; }
  };
  JM.ready = load();
})();
