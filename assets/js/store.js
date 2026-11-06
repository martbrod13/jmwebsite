/*
 * Warstwa danych prototypu.
 * Wszystko zapisuje się w localStorage tej przeglądarki — w wersji produkcyjnej
 * te funkcje zastąpi API (baza danych, logowanie, bramka SMS).
 */
window.JM = window.JM || {};

(function () {
  const PREFIX = 'jm_';
  const memory = {};

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return key in memory ? memory[key] : fallback;
    }
  }
  function write(key, value) {
    memory[key] = value;
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* tryb prywatny itp. */ }
  }
  function remove(key) {
    delete memory[key];
    try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
  }

  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const nowIso = () => new Date().toISOString();

  async function hash(text) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('jm:' + text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      let h = 0; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
      return 'f' + (h >>> 0).toString(16);
    }
  }

  /* ---------- Zabiegi i ceny ---------- */
  function priceOverrides() { return read('prices', {}); }
  function allTreatments() {
    const ov = priceOverrides();
    return JM.treatments.map((t) => (ov[t.id] != null ? Object.assign({}, t, { price: ov[t.id] }) : t));
  }
  function treatment(id) {
    if (id === JM.consultation.id) return JM.consultation;
    return allTreatments().find((t) => t.id === id) || null;
  }
  function setPrice(id, price) {
    const ov = priceOverrides(); ov[id] = price; write('prices', ov);
  }
  function resetPrices() { remove('prices'); }
  function categoryName(id) {
    if (id === 'konsultacja') return 'Konsultacja';
    const c = JM.categories.find((x) => x.id === id); return c ? c.name : '';
  }
  function formatPrice(v, from) {
    if (v === 0) return 'bezpłatnie';
    const s = v.toLocaleString('pl-PL', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' zł';
    return from ? 'od ' + s : s;
  }
  function formatDuration(min) {
    const h = Math.floor(min / 60), m = min % 60;
    if (!h) return m + ' min';
    return h + ' h' + (m ? ' ' + m + ' min' : '');
  }

  /* ---------- Promocje ---------- */
  function promos() { return read('promos', JM.defaultPromos); }
  function savePromos(list) { write('promos', list); }

  /* ---------- Użytkowniczki ---------- */
  function users() { return read('users', []); }
  function saveUsers(list) { write('users', list); }
  function currentUser() {
    const s = read('session', null); if (!s) return null;
    return users().find((u) => u.id === s.userId) || null;
  }
  async function register(data) {
    const list = users();
    const email = data.email.trim().toLowerCase();
    if (list.some((u) => u.email === email)) throw new Error('Konto z tym adresem e-mail już istnieje. Zaloguj się albo zresetuj hasło.');
    const at = nowIso();
    const user = {
      id: uid('u'), createdAt: at,
      firstName: data.firstName.trim(), lastName: data.lastName.trim(),
      email, phone: data.phone.trim(), birthMonth: data.birthMonth || '',
      password: await hash(data.password),
      consents: {
        terms: { value: true, at },
        privacy: { value: true, at },
        marketingSms: { value: !!data.marketingSms, at },
        marketingEmail: { value: !!data.marketingEmail, at }
      },
      consentLog: [
        { at, change: 'Akceptacja regulaminu i polityki prywatności' },
        { at, change: 'Marketing SMS: ' + (data.marketingSms ? 'zgoda' : 'brak zgody') },
        { at, change: 'Marketing e-mail: ' + (data.marketingEmail ? 'zgoda' : 'brak zgody') }
      ]
    };
    list.push(user); saveUsers(list);
    write('session', { userId: user.id, at });
    return user;
  }
  async function login(email, password) {
    const u = users().find((x) => x.email === email.trim().toLowerCase());
    if (!u || u.password !== (await hash(password))) throw new Error('Nieprawidłowy e-mail lub hasło.');
    write('session', { userId: u.id, at: nowIso() });
    return u;
  }
  function logout() { remove('session'); }
  function updateUser(id, patch) {
    const list = users(); const i = list.findIndex((u) => u.id === id); if (i < 0) return null;
    list[i] = Object.assign({}, list[i], patch); saveUsers(list); return list[i];
  }
  function setConsent(id, key, value) {
    const list = users(); const u = list.find((x) => x.id === id); if (!u) return;
    const at = nowIso();
    u.consents[key] = { value, at };
    const labels = { marketingSms: 'Marketing SMS', marketingEmail: 'Marketing e-mail' };
    u.consentLog.push({ at, change: labels[key] + ': ' + (value ? 'zgoda' : 'wycofanie zgody') });
    saveUsers(list);
  }
  function deleteUser(id) {
    saveUsers(users().filter((u) => u.id !== id));
    // wizyty zostają w kalendarzu gabinetu, ale bez powiązania z kontem
    write('bookings', bookings().map((b) => (b.userId === id ? Object.assign({}, b, { userId: null, anonymized: true }) : b)));
    logout();
  }

  /* ---------- Wizyty ---------- */
  function bookings() { return read('bookings', []); }
  function saveBookings(list) { write('bookings', list); }
  function userBookings(userId) {
    return bookings().filter((b) => b.userId === userId).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }
  function visitCount(userId) {
    return bookings().filter((b) => b.userId === userId && b.status !== 'cancelled').length;
  }
  function createBooking(data) {
    const list = bookings();
    const b = Object.assign({ id: uid('w'), code: Math.random().toString(36).slice(2, 6).toUpperCase(), createdAt: nowIso(), status: 'confirmed' }, data);
    list.push(b); saveBookings(list); return b;
  }
  const startOf = (b) => new Date(b.date + 'T' + b.time + ':00');
  // Odwołanie później niż X godzin przed wizytą = opłata (procent ceny zabiegu)
  function isLateCancel(b) { return (startOf(b) - Date.now()) / 36e5 < JM.booking.cancelHours; }
  function lateFee(b) { return Math.round((b.total ?? b.price) * JM.booking.lateCancelFeePercent) / 100; }
  function cancelBooking(id, by) {
    const list = bookings(); const b = list.find((x) => x.id === id); if (!b) return null;
    b.status = 'cancelled'; b.cancelledAt = nowIso(); b.cancelledBy = by || 'klientka';
    b.cancellationFee = by === 'klientka' && isLateCancel(b) ? lateFee(b) : 0;
    saveBookings(list); return b;
  }
  function canCancel(b) { return b.status !== 'cancelled' && startOf(b) > Date.now(); }
  function reminderAt(b) { return new Date(startOf(b).getTime() - JM.booking.reminderHours * 36e5); }

  /* ---------- Dostępność terminów ---------- */
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toTime = (min) => pad(Math.floor(min / 60)) + ':' + pad(min % 60);

  // Deterministyczne „zajęte” terminy, żeby kalendarz wyglądał jak w prawdziwym gabinecie
  function demoBusy(dateStr, startMin) {
    let h = 0; const s = dateStr + '|' + Math.floor(startMin / 90);
    for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
    return h % 100 < 32;
  }
  function dayHours(date) {
    const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
    if (JM.closedDates.includes(isoDate(d))) return null;
    const off = read('daysOff', []);
    if (off.includes(isoDate(d))) return null;
    return JM.hours[d.getDay()];
  }
  function slotsFor(dateStr, duration, ignoreBookingId) {
    const hrs = dayHours(dateStr); if (!hrs) return [];
    const open = hrs[0] * 60, close = hrs[1] * 60;
    const taken = bookings().filter((b) => b.date === dateStr && b.status !== 'cancelled' && b.id !== ignoreBookingId)
      .map((b) => [toMin(b.time), toMin(b.time) + b.duration]);
    const now = new Date();
    const minStart = new Date(now.getTime() + JM.booking.minLeadHours * 36e5);
    const out = [];
    for (let m = open; m + duration <= close; m += JM.booking.slotStep) {
      const startDate = new Date(dateStr + 'T' + toTime(m) + ':00');
      if (startDate < minStart) continue;
      let free = true;
      for (let x = m; x < m + duration; x += 30) if (demoBusy(dateStr, x)) { free = false; break; }
      if (free) free = !taken.some(([a, b]) => m < b && m + duration > a);
      if (free) out.push(toTime(m));
    }
    return out;
  }

  /* ---------- Rabaty ---------- */
  function bestDiscount(t, dateStr, user) {
    if (!user || !t.price) return null;
    const options = [];
    if (visitCount(user.id) === 0) {
      options.push({ id: 'first', label: 'Pierwsza wizyta z kontem', percent: JM.discounts.firstVisitPercent });
    }
    promos().filter((p) => p.active).forEach((p) => {
      if (dateStr < p.from || dateStr > p.to) return;
      if (p.categories !== 'all' && !p.categories.includes(t.category)) return;
      if (p.birthday) {
        if (!user.birthMonth || Number(user.birthMonth) !== Number(dateStr.slice(5, 7))) return;
      }
      options.push({ id: p.id, label: p.title, percent: p.percent });
    });
    if (!options.length) return null;
    // rabaty się nie sumują — stosujemy najkorzystniejszy
    return options.sort((a, b) => b.percent - a.percent)[0];
  }
  function priceSummary(t, dateStr, user) {
    const d = bestDiscount(t, dateStr, user);
    const base = t.price;
    const cut = d ? Math.round(base * d.percent) / 100 : 0;
    return { base, discount: d, cut, total: Math.round((base - cut) * 100) / 100, lowest30: base };
  }

  /* ---------- Cookies ---------- */
  function cookieConsent() { return read('cookies', null); }
  function setCookieConsent(c) { write('cookies', Object.assign({ at: nowIso() }, c)); }

  /* ---------- Dane przykładowe dla panelu gabinetu ---------- */
  function seedDemo() {
    if (read('seeded', false)) return;
    const demoClients = [
      ['Anna', 'Kowalczyk', '+48 601 224 318', 'anna.kowalczyk@example.com', true, true],
      ['Marta', 'Wiśniewska', '+48 512 908 447', 'marta.w@example.com', true, false],
      ['Karolina', 'Zielińska', '+48 698 115 902', 'k.zielinska@example.com', false, false],
      ['Ola', 'Nowicka', '+48 789 330 614', 'ola.nowicka@example.com', true, true],
      ['Magdalena', 'Lis', '+48 535 471 280', 'm.lis@example.com', false, true]
    ];
    const at = new Date(Date.now() - 1000 * 3600 * 24 * 40).toISOString();
    const list = users();
    const ids = demoClients.map(([fn, ln, ph, em, sms, mail]) => {
      const u = {
        id: uid('u'), createdAt: at, firstName: fn, lastName: ln, email: em, phone: ph, birthMonth: '', password: 'demo', demo: true,
        consents: { terms: { value: true, at }, privacy: { value: true, at }, marketingSms: { value: sms, at }, marketingEmail: { value: mail, at } },
        consentLog: [{ at, change: 'Rejestracja konta' }]
      };
      list.push(u); return u;
    });
    saveUsers(list);
    const plan = [
      [1, '10:00', 'mezo-twarz', 0], [1, '13:00', 'pmu-brwi', 1], [2, '09:30', 'kwas-migdalowy', 2],
      [3, '16:00', 'stym-ha', 3], [4, '11:00', 'pmu-korekta', 1], [6, '12:00', 'prx-twarz', 4],
      [8, '10:30', 'mikro-twarz', 0], [-7, '12:00', 'konsultacja', 2], [-14, '10:00', 'pmu-brwi', 1]
    ];
    const bl = bookings();
    plan.forEach(([dOff, time, tid, ci]) => {
      const d = new Date(); d.setDate(d.getDate() + dOff);
      while (!dayHours(isoDate(d))) d.setDate(d.getDate() + 1);
      const t = treatment(tid); const u = ids[ci];
      bl.push({
        id: uid('w'), code: Math.random().toString(36).slice(2, 6).toUpperCase(), createdAt: at, status: dOff < 0 ? 'done' : 'confirmed',
        treatmentId: tid, treatmentName: t.name, duration: t.duration, date: isoDate(d), time,
        userId: u.id, guest: null, price: t.price, total: t.price, discount: null, demo: true
      });
    });
    bl.push({
      id: uid('w'), code: 'G7QK', createdAt: at, status: 'confirmed', treatmentId: 'mezo-glowa', treatmentName: treatment('mezo-glowa').name,
      duration: 40, date: isoDate(new Date(Date.now() + 864e5 * 5)), time: '15:00', userId: null,
      guest: { firstName: 'Joanna', lastName: 'Mazur', phone: '+48 604 771 239', email: 'joanna.mazur@example.com', marketingSms: false, marketingEmail: false },
      price: 450, total: 450, discount: null, demo: true
    });
    saveBookings(bl);
    write('seeded', true);
  }
  function resetDemo() {
    ['users', 'bookings', 'session', 'seeded', 'prices', 'promos', 'admin', 'daysOff', 'sms'].forEach(remove);
    seedDemo();
  }

  JM.store = {
    read, write, remove, isoDate, pad, toMin, toTime,
    allTreatments, treatment, setPrice, resetPrices, categoryName, formatPrice, formatDuration,
    promos, savePromos,
    users, currentUser, register, login, logout, updateUser, setConsent, deleteUser,
    bookings, userBookings, visitCount, createBooking, cancelBooking, canCancel, isLateCancel, lateFee, reminderAt,
    dayHours, slotsFor, bestDiscount, priceSummary,
    cookieConsent, setCookieConsent, seedDemo, resetDemo, hash
  };
})();
