JM.ready.then(function () {
  const S = JM.store, ui = JM.ui, esc = ui.esc, L = JM.L;
  // nazwa zabiegu w języku strony (w rezerwacji zapisujemy polską, bo panel jest po polsku)
  const tName = (b) => { const x = S.treatment(b.treatmentId) || (b.treatmentId === 'konsultacja' && JM.consultation); return x ? x.name : b.treatmentName; };
  const flow = document.getElementById('flow');
  const summary = document.getElementById('summary');
  const stepper = document.getElementById('stepper');
  const DRAFT = 'jm_booking_draft';

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const lastDay = new Date(today); lastDay.setDate(lastDay.getDate() + JM.booking.daysAhead);
  // wolne terminy z serwera: { 'YYYY-MM-DD': ['10:00', ...] | [] (zajęte) | null (nieczynne) }
  const avail = {};
  let loadingKey = '';

  const state = {
    step: 1, cat: 'all', treatmentId: null, date: null, time: null,
    month: new Date(today.getFullYear(), today.getMonth(), 1),
    who: 'guest', guest: { firstName: '', lastName: '', phone: '', email: '', notes: '', marketingSms: false, marketingEmail: false },
    notes: '', booking: null, error: '', phone: '', autoMonth: true
  };

  // wznowienie po zalogowaniu / rejestracji
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT) || 'null');
    if (d && new URLSearchParams(location.search).has('wznow')) {
      Object.assign(state, { treatmentId: d.treatmentId, date: d.date, time: d.time, step: d.date && d.time ? 3 : d.treatmentId ? 2 : 1 });
      if (d.date) state.month = new Date(d.date.slice(0, 7) + '-01T12:00:00');
      sessionStorage.removeItem(DRAFT);
    }
  } catch (e) { /* ignore */ }
  const q = new URLSearchParams(location.search).get('zabieg');
  if (q && S.treatment(q) && !state.treatmentId) { state.treatmentId = q; state.step = 2; }

  const t = () => (state.treatmentId ? S.treatment(state.treatmentId) : null);
  const user = () => S.currentUser();
  function saveDraft() {
    try { sessionStorage.setItem(DRAFT, JSON.stringify({ treatmentId: state.treatmentId, date: state.date, time: state.time })); } catch (e) { /* ignore */ }
  }

  /* ---------- Krok 1: zabieg ---------- */
  function stepTreatment() {
    const cats = [{ id: 'all', name: L('Wszystkie', 'All') }, { id: 'konsultacja', name: L('Konsultacja', 'Consultation') }].concat(JM.categories);
    const items = [JM.consultation].concat(S.allTreatments()).filter((x) => state.cat === 'all' || x.category === state.cat);
    return `
      <h2 class="step-title">${L('Wybierz zabieg', 'Choose a treatment')}</h2>
      <div class="chip-nav" role="group" aria-label="${L('Kategorie', 'Categories')}">
        ${cats.map((c) => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${state.cat === c.id}">${c.name}</button>`).join('')}
      </div>
      <ul class="t-picker">
        ${items.map((x) => `
          <li><label class="t-option${x.id === state.treatmentId ? ' is-selected' : ''}">
            <input type="radio" name="treatment" value="${x.id}" ${x.id === state.treatmentId ? 'checked' : ''}>
            <span>${x.name}<small>${S.categoryName(x.category)}, ${S.formatDuration(x.duration)}</small></span>
            <span class="t-price">${S.formatPrice(x.price, x.from)}</span>
          </label></li>`).join('')}
      </ul>
      <div class="step-actions">
        <span></span>
        <button class="btn btn-primary" type="button" data-go="2" ${state.treatmentId ? '' : 'disabled'}>${L('Dalej: wybierz termin', 'Next: choose a date')}</button>
      </div>`;
  }

  /* ---------- Krok 2: termin ---------- */
  function dayState(d) {
    const iso = S.isoDate(d);
    if (d < today || d > lastDay) return { ok: false, reason: L('poza zakresem', 'not available') };
    const a = (avail[state.treatmentId] || {})[iso];
    if (a === undefined) return { ok: false, loading: true, reason: L('sprawdzamy terminy', 'checking availability') };
    if (a === null) return { ok: false, reason: L('nieczynne', 'closed') };
    return { ok: a.length > 0, slots: a, reason: a.length ? '' : L('brak wolnych terminów', 'fully booked') };
  }
  // pobiera z serwera wolne terminy dla widocznego miesiąca
  async function loadMonth() {
    const tr = t(); if (!tr) return;
    const m = state.month;
    const from = new Date(Math.max(new Date(m.getFullYear(), m.getMonth(), 1), today));
    const to = new Date(Math.min(new Date(m.getFullYear(), m.getMonth() + 1, 0), lastDay));
    if (from > to) return;
    const key = tr.id + S.isoDate(from);
    loadingKey = key;
    try {
      const days = await S.availability(tr.id, S.isoDate(from), S.isoDate(to));
      avail[tr.id] = Object.assign(avail[tr.id] || {}, days);
      if (loadingKey !== key) return;
      // pierwszy miesiąc bez wolnych terminów — przechodzimy od razu do następnego
      if (state.autoMonth && !state.date && !Object.values(days).some((x) => x && x.length) && to < lastDay) {
        state.autoMonth = false; state.month = new Date(m.getFullYear(), m.getMonth() + 1, 1); loadMonth(); return;
      }
      state.autoMonth = false;
      if (state.step === 2) render();
    } catch (err) {
      if (state.step === 2) { state.error = err.message; render(); }
    }
  }
  function refreshAvailability() { delete avail[state.treatmentId]; loadMonth(); }
  function calendar() {
    const m = state.month;
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // tydzień od poniedziałku
    const canPrev = first > new Date(today.getFullYear(), today.getMonth(), 1);
    const canNext = new Date(m.getFullYear(), m.getMonth() + 1, 1) <= lastDay;
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span class="cal-day is-empty" aria-hidden="true"></span>';
    for (let n = 1; n <= days; n++) {
      const d = new Date(m.getFullYear(), m.getMonth(), n);
      const iso = S.isoDate(d); const st = dayState(d);
      const sel = iso === state.date;
      const label = ui.fmtDate(iso) + (st.ok ? L(', wolne terminy: ', ', free slots: ') + st.slots.length : ', ' + st.reason);
      cells += `<button type="button" class="cal-day${st.ok ? ' is-available' : ''}${st.loading ? ' is-loading' : ''}${sel ? ' is-selected' : ''}" data-date="${iso}" ${st.ok ? '' : 'disabled'} ${st.loading ? 'data-loading' : ''} aria-label="${label}" ${sel ? 'aria-pressed="true"' : ''}>${n}</button>`;
    }
    const loading = cells.includes('data-loading');
    return `
      <div${loading ? ' aria-busy="true"' : ''}>
        <div class="cal-head">
          <button type="button" class="icon-btn" data-month="-1" ${canPrev ? '' : 'disabled'} aria-label="${L('Poprzedni miesiąc', 'Previous month')}">${ui.icons.arrowL}</button>
          <h3>${JM.monthNames[m.getMonth()]} ${m.getFullYear()}</h3>
          <button type="button" class="icon-btn" data-month="1" ${canNext ? '' : 'disabled'} aria-label="${L('Następny miesiąc', 'Next month')}">${ui.icons.arrowR}</button>
        </div>
        <div class="cal-grid">
          ${L(['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'], ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']).map((d) => `<span class="cal-dow" aria-hidden="true">${d}</span>`).join('')}
          ${cells}
        </div>
        <div class="cal-legend"><span>${L('wolne terminy', 'free slots')}</span><span class="off">${L('brak terminów lub nieczynne', 'fully booked or closed')}</span></div>
      </div>`;
  }
  function slotsView() {
    if (!state.date) return `<div><p class="slots-head">${L('Godzina', 'Time')}</p><p class="slots-empty">${L('Wybierz dzień w kalendarzu, żeby zobaczyć wolne godziny.', 'Choose a day in the calendar to see the free times.')}</p></div>`;
    const slots = ((avail[state.treatmentId] || {})[state.date]) || [];
    return `<div>
      <p class="slots-head">${L('Wolne godziny', 'Free times')}, ${ui.fmtDate(state.date, false)}</p>
      ${slots.length ? `<div class="slots" role="group" aria-label="${L('Wolne godziny', 'Free times')}">${slots.map((s) => `<button type="button" class="slot" data-time="${s}" aria-pressed="${s === state.time}">${s}</button>`).join('')}</div>`
        : `<p class="slots-empty">${L('Ten dzień jest już zajęty. Wybierz inny.', 'This day is fully booked. Please choose another one.')}</p>`}
      <p class="small muted" style="margin-top:16px">${L('Zabieg trwa', 'The treatment takes')} ${S.formatDuration(t().duration)}. ${L('Nie znalazłaś terminu? Zadzwoń:', 'Can’t find a time that suits you? Call us:')} <a href="tel:${JM.salon.phoneHref}">${JM.salon.phone}</a></p>
    </div>`;
  }
  function stepDate() {
    return `
      <h2 class="step-title">${L('Wybierz termin', 'Choose a date')}</h2>
      ${state.error ? `<p class="form-msg" role="alert">${esc(state.error)}</p>` : ''}
      <div class="cal-wrap">${calendar()}${slotsView()}</div>
      <div class="step-actions">
        <button class="btn btn-outline" type="button" data-go="1">${L('Wstecz', 'Back')}</button>
        <button class="btn btn-primary" type="button" data-go="3" ${state.date && state.time ? '' : 'disabled'}>${L('Dalej: Twoje dane', 'Next: your details')}</button>
      </div>`;
  }

  /* ---------- Krok 3: dane ---------- */
  function stepDetails() {
    const u = user();
    const err = state.error ? `<p class="form-msg" role="alert">${esc(state.error)}</p>` : '';
    if (u) {
      return `
        <h2 class="step-title">${L('Potwierdź rezerwację', 'Confirm your booking')}</h2>
        ${err}
        <div class="card" style="margin-bottom:24px">
          <p class="small muted" style="margin:0 0 4px">${L('Rezerwujesz jako', 'Booking as')}</p>
          <p style="margin:0"><strong style="font-weight:500">${esc(u.firstName)} ${esc(u.lastName)}</strong><br>${esc(u.phone)}, ${esc(u.email)}</p>
          <p class="small" style="margin:12px 0 0">${L('To nie Ty?', 'Not you?')} <button type="button" class="link-button" data-logout>${L('Wyloguj się', 'Sign out')}</button></p>
        </div>
        <form id="confirm-form" novalidate>
          <div class="field"><label for="notes">${L('Uwagi do wizyty', 'Notes for your visit')} <span class="opt">(${L('opcjonalnie', 'optional')})</span></label>
            <textarea id="notes" name="notes" maxlength="400" placeholder="${L('Np. pierwszy raz na tym zabiegu', 'E.g. first time having this treatment')}">${esc(state.notes)}</textarea></div>
          <p class="small muted">${L(`Rezerwując, akceptujesz zasady odwołania z <a href="regulamin.html#odwolanie">regulaminu</a>: bezpłatnie do ${JM.booking.cancelHours} godzin przed wizytą, później opłata ${JM.booking.lateCancelFeePercent}% ceny zabiegu. Potwierdzenie wyślemy SMS-em na numer ${esc(u.phone)}, a przypomnienie ${JM.booking.reminderHours} godziny przed wizytą.`,
            `By booking, you accept the cancellation rules in our <a href="regulamin.html#odwolanie">terms</a>: free up to ${JM.booking.cancelHours} hours before the visit, after that a fee of ${JM.booking.lateCancelFeePercent}% of the treatment price. We will text the confirmation to ${esc(u.phone)} and send a reminder ${JM.booking.reminderHours} hours before the visit.`)}</p>
          <div class="step-actions">
            <button class="btn btn-outline" type="button" data-go="2">${L('Wstecz', 'Back')}</button>
            <button class="btn btn-primary" type="submit">${L('Potwierdź rezerwację', 'Confirm booking')}</button>
          </div>
        </form>`;
    }
    const g = state.guest;
    const who = state.who;
    const choice = `
      <div class="who-choice" role="group" aria-label="${L('Jak chcesz zarezerwować', 'How would you like to book')}">
        <button type="button" class="who-card" data-who="guest" aria-pressed="${who === 'guest'}"><strong>${L('Jako gość', 'As a guest')}</strong><span>${L('Bez zakładania konta', 'No account needed')}</span></button>
        <button type="button" class="who-card" data-who="login" aria-pressed="${who === 'login'}"><strong>${L('Mam konto', 'I have an account')}</strong><span>${L('Zaloguj się', 'Sign in')}</span></button>
        <button type="button" class="who-card" data-who="register" aria-pressed="${who === 'register'}"><strong>${L('Załóż konto', 'Create an account')}</strong><span>${L('10% zniżki na pierwszy zabieg', '10% off your first treatment')}</span></button>
      </div>`;
    let body = '';
    if (who === 'login') {
      body = `
        <form id="login-form" novalidate>
          <div class="field"><label for="l-email">E-mail</label><input id="l-email" name="email" type="email" autocomplete="email" required></div>
          <div class="field"><label for="l-pass">${L('Hasło', 'Password')}</label><input id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
          <div class="step-actions">
            <button class="btn btn-outline" type="button" data-go="2">${L('Wstecz', 'Back')}</button>
            <button class="btn btn-primary" type="submit">${L('Zaloguj się i kontynuuj', 'Sign in and continue')}</button>
          </div>
        </form>`;
    } else if (who === 'register') {
      body = `
        <div class="perk"><span class="perk-num">10%</span><p>${L('Po założeniu konta wrócisz tutaj z wybranym terminem, a zniżka naliczy się w podsumowaniu.', 'Once your account is created, you will come back here with your chosen time, and the discount will appear in the summary.')}</p></div>
        <div class="step-actions">
          <button class="btn btn-outline" type="button" data-go="2">${L('Wstecz', 'Back')}</button>
          <a class="btn btn-primary" href="konto.html?powrot=rezerwacja#rejestracja" data-save-draft>${L('Załóż konto', 'Create an account')}</a>
        </div>`;
    } else {
      body = `
        <form id="guest-form" novalidate>
          <div class="form-grid">
            <div class="field"><label for="g-first">${L('Imię', 'First name')}</label><input id="g-first" name="firstName" autocomplete="given-name" required value="${esc(g.firstName)}"></div>
            <div class="field"><label for="g-last">${L('Nazwisko', 'Last name')}</label><input id="g-last" name="lastName" autocomplete="family-name" required value="${esc(g.lastName)}"></div>
            <div class="field"><label for="g-phone">${L('Telefon', 'Phone')}</label><input id="g-phone" name="phone" type="tel" autocomplete="tel" required placeholder="+48 600 000 000" value="${esc(g.phone)}"><span class="field-hint">${L('Na ten numer wyślemy potwierdzenie i przypomnienie.', 'We will text your confirmation and reminder to this number.')}</span></div>
            <div class="field"><label for="g-email">E-mail</label><input id="g-email" name="email" type="email" autocomplete="email" required value="${esc(g.email)}"></div>
            <div class="field span-2"><label for="g-notes">${L('Uwagi do wizyty', 'Notes for your visit')} <span class="opt">(${L('opcjonalnie', 'optional')})</span></label><textarea id="g-notes" name="notes" maxlength="400">${esc(g.notes)}</textarea></div>
          </div>
          <fieldset class="consent-box">
            <legend>${L('Zgody', 'Consents')}</legend>
            <label class="check"><input type="checkbox" name="terms" required><span>${L(`Akceptuję <a href="regulamin.html" target="_blank">Regulamin</a> i zasady rezerwacji, w tym opłatę ${JM.booking.lateCancelFeePercent}% ceny zabiegu za odwołanie później niż ${JM.booking.cancelHours} godzin przed wizytą lub nieobecność, oraz zapoznałam/em się z <a href="polityka-prywatnosci.html" target="_blank">Polityką prywatności</a>.`,
              `I accept the <a href="regulamin.html" target="_blank">Terms and conditions</a> and booking rules, including a fee of ${JM.booking.lateCancelFeePercent}% of the treatment price for cancelling later than ${JM.booking.cancelHours} hours before the visit or not showing up, and I have read the <a href="polityka-prywatnosci.html" target="_blank">Privacy policy</a>.`)} <span class="req" aria-hidden="true">*</span><small>${L('Wymagane, żeby zarezerwować wizytę.', 'Required to book a visit.')}</small></span></label>
            <label class="check"><input type="checkbox" name="marketingSms" ${g.marketingSms ? 'checked' : ''}><span>${L('Chcę dostawać SMS-y z ofertami i promocjami gabinetu.', 'I would like to receive text messages with the studio’s offers and promotions.')}<small>${L('Opcjonalne. Zgodę możesz wycofać w każdej chwili.', 'Optional. You can withdraw your consent at any time.')}</small></span></label>
            <label class="check"><input type="checkbox" name="marketingEmail" ${g.marketingEmail ? 'checked' : ''}><span>${L('Chcę dostawać e-maile z ofertami i promocjami gabinetu.', 'I would like to receive emails with the studio’s offers and promotions.')}<small>${L('Opcjonalne. Zgodę możesz wycofać w każdej chwili.', 'Optional. You can withdraw your consent at any time.')}</small></span></label>
          </fieldset>
          <div class="step-actions">
            <button class="btn btn-outline" type="button" data-go="2">${L('Wstecz', 'Back')}</button>
            <button class="btn btn-primary" type="submit">${L('Zarezerwuj wizytę', 'Book the visit')}</button>
          </div>
        </form>`;
    }
    return `<h2 class="step-title">${L('Twoje dane', 'Your details')}</h2>${err}${choice}${body}`;
  }

  /* ---------- Krok 4: potwierdzenie ---------- */
  function smsText(b, kind) {
    const d = new Date(b.date + 'T12:00:00');
    const date = S.pad(d.getDate()) + '.' + S.pad(d.getMonth() + 1);
    const url = location.origin + '/w/' + b.token;
    if (kind === 'confirm') return L(`${JM.salon.smsSender}: Potwierdzamy wizytę ${date} o ${b.time} (${tName(b)}), ${JM.salon.street}. Zmiana lub odwołanie: ${url}`,
      `${JM.salon.smsSender}: Your visit on ${date} at ${b.time} (${tName(b)}) is confirmed, ${JM.salon.street}. To change or cancel: ${url}`);
    return L(`${JM.salon.smsSender}: Przypominamy o wizycie jutro o ${b.time} (${tName(b)}), ${JM.salon.street}. Odwołanie: ${url}`,
      `${JM.salon.smsSender}: A reminder about your visit tomorrow at ${b.time} (${tName(b)}), ${JM.salon.street}. To cancel: ${url}`);
  }
  function stepDone() {
    const b = state.booking; const u = user();
    const phone = u ? u.phone : state.phone;
    return `
      <div class="done">
        <div class="done-mark">${ui.icons.check}</div>
        <h2 class="step-title">${L('Wizyta zarezerwowana', 'Your visit is booked')}</h2>
        <p class="lead">${esc(tName(b))}, ${ui.fmtDate(b.date)}, ${L('godz.', 'at')} ${b.time}. ${L('Potwierdzenie wysłaliśmy SMS-em na numer', 'We have texted the confirmation to')} ${esc(phone)}.</p>
        <div class="sms-preview" aria-label="${L('Podgląd wiadomości SMS', 'Text message preview')}">
          <header><span>${JM.salon.smsSender}</span><span>${L('teraz', 'now')}</span></header>
          <div class="sms-bubble">${esc(smsText(b, 'confirm'))}</div>
          <header><span>${JM.salon.smsSender}</span><span>${L(`automatycznie ${JM.booking.reminderHours} h przed wizytą`, `automatically ${JM.booking.reminderHours} h before the visit`)}</span></header>
          <div class="sms-bubble">${esc(smsText(b, 'reminder'))}</div>
        </div>
        <div class="btn-row">
          <button class="btn btn-outline" type="button" data-ics>${L('Dodaj do kalendarza', 'Add to calendar')}</button>
          ${u ? `<a class="btn btn-primary" href="konto.html">${L('Moje wizyty', 'My visits')}</a>` : `<a class="btn btn-primary" href="konto.html#rejestracja">${L('Załóż konto na kolejne wizyty', 'Create an account for future visits')}</a>`}
        </div>
        <p class="small muted" style="margin-top:28px">${L('Kod rezerwacji', 'Booking code')}: <strong>${b.code}</strong>. ${u ? '' : L('Termin zmienisz albo odwołasz przez link z SMS-a i e-maila. ', 'You can change or cancel the visit using the link in the text message and email. ')}${L(`Bezpłatnie odwołasz wizytę do ${JM.booking.cancelHours} godzin przed terminem, później obowiązuje opłata ${JM.booking.lateCancelFeePercent}% ceny zabiegu.`, `You can cancel free of charge up to ${JM.booking.cancelHours} hours before the visit; after that a fee of ${JM.booking.lateCancelFeePercent}% of the treatment price applies.`)}</p>
      </div>`;
  }

  /* ---------- Podsumowanie ---------- */
  function renderSummary() {
    const tr = t(); const u = user();
    if (!tr) { summary.innerHTML = `<h2>${L('Podsumowanie', 'Summary')}</h2><p class="muted">${L('Wybierz zabieg, żeby zobaczyć szczegóły i cenę.', 'Choose a treatment to see the details and price.')}</p>`; return; }
    const ps = S.priceSummary(tr, state.date || S.isoDate(today), state.step === 4 ? null : u);
    const bk = state.booking;
    const p = state.step === 4 && bk ? { base: bk.price, cut: Math.round((bk.price - bk.total) * 100) / 100, total: bk.total, lowest30: bk.lowest30 ?? bk.price,
      discount: bk.discount ? Object.assign({}, bk.discount, { label: S.discountLabel(bk.discount) }) : null } : ps;
    summary.innerHTML = `
      <h2>${L('Podsumowanie', 'Summary')}</h2>
      <dl>
        <div><dt>${L('Zabieg', 'Treatment')}</dt><dd>${tr.name}<br><span class="small muted">${S.formatDuration(tr.duration)}</span></dd></div>
        <div><dt>${L('Termin', 'Date')}</dt><dd>${state.date ? ui.fmtDate(state.date) + (state.time ? ', ' + L('godz.', 'at') + ' ' + state.time : '') : `<span class="muted">${L('nie wybrano', 'not chosen yet')}</span>`}</dd></div>
      </dl>
      <div class="summary-prices">
        <div><span>${L('Cena zabiegu', 'Treatment price')}</span><span>${S.formatPrice(p.base, tr.from)}</span></div>
        ${p.discount ? `<div><span>${esc(p.discount.label)} (−${p.discount.percent}%)</span><span>−${S.formatPrice(p.cut)}</span></div>
          <div class="omni"><span>${L('Najniższa cena z 30 dni przed obniżką', 'Lowest price in the 30 days before the discount')}</span><span>${S.formatPrice(p.lowest30)}</span></div>` : ''}
        <div class="total"><span>${L('Do zapłaty w gabinecie', 'To pay at the studio')}</span><span>${S.formatPrice(p.total, tr.from)}</span></div>
      </div>
      ${!u && tr.price > 0 && state.step < 4 ? `<div class="member-hint"><p>${L('Z kontem ten zabieg kosztowałby', 'With an account this treatment would cost')} ${S.formatPrice(Math.round(tr.price * (100 - JM.discounts.firstVisitPercent)) / 100, tr.from)}.</p><a href="konto.html?powrot=rezerwacja#rejestracja" data-save-draft>${L('Załóż konto', 'Create an account')}</a> ${L('albo', 'or')} <button type="button" class="link-button" data-who="login">${L('zaloguj się', 'sign in')}</button></div>` : ''}
      <p class="summary-foot">${L(`Płatność w gabinecie po wizycie. Bezpłatne odwołanie do ${JM.booking.cancelHours} godzin przed terminem, później opłata ${JM.booking.lateCancelFeePercent}% ceny zabiegu.`, `Payment at the studio after the visit. Free cancellation up to ${JM.booking.cancelHours} hours before the visit; after that a fee of ${JM.booking.lateCancelFeePercent}% of the treatment price.`)}</p>`;
  }

  function render(focus) {
    [...stepper.children].forEach((li, i) => {
      li.classList.toggle('is-current', i + 1 === state.step);
      li.classList.toggle('is-done', i + 1 < state.step);
      if (i + 1 === state.step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    flow.innerHTML = state.step === 1 ? stepTreatment() : state.step === 2 ? stepDate() : state.step === 3 ? stepDetails() : stepDone();
    renderSummary();
    if (focus) {
      const h = flow.querySelector('.step-title'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      const top = document.querySelector('.booking').getBoundingClientRect().top + window.scrollY - 110;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  /* ---------- Walidacja ---------- */
  function validate(form, rules) {
    let first = null;
    form.querySelectorAll('.field-error').forEach((e) => e.remove());
    form.querySelectorAll('.has-error').forEach((e) => e.classList.remove('has-error'));
    Object.entries(rules).forEach(([name, check]) => {
      const el = form.elements[name]; const msg = check(el);
      if (msg) {
        const box = el.closest('.field') || el.closest('.check');
        if (box) { box.classList.add('has-error'); box.insertAdjacentHTML('beforeend', `<span class="field-error">${msg}</span>`); }
        el.setAttribute('aria-invalid', 'true'); if (!first) first = el;
      } else el.removeAttribute('aria-invalid');
    });
    if (first) first.focus();
    return !first;
  }
  const req = (msg) => (el) => (el.value.trim() ? '' : msg);
  const phoneOk = (el) => (/^(\+?48)?[\s-]?(\d[\s-]?){9}$/.test(el.value.trim()) ? '' : L('Wpisz numer telefonu, np. +48 600 000 000.', 'Enter a phone number, e.g. +48 600 000 000.'));
  const emailOk = (el) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()) ? '' : L('Wpisz adres e-mail, np. anna@example.com.', 'Enter an email address, e.g. anna@example.com.'));

  async function finish(form, data) {
    const btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    try {
      state.booking = await S.createBooking(Object.assign({ treatmentId: t().id, date: state.date, time: state.time }, data));
      state.phone = data.guest ? data.guest.phone : '';
      state.step = 4; state.error = ''; render(true);
    } catch (err) {
      if (err.field === 'slot') { state.error = err.message; state.step = 2; state.time = null; refreshAvailability(); render(true); return; }
      const el = err.field && form.elements[err.field];
      if (el) { validate(form, { [err.field]: () => err.message }); } else { state.error = err.message; render(); }
    } finally { btn.disabled = false; btn.removeAttribute('aria-busy'); }
  }

  /* ---------- Zdarzenia ---------- */
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('button, a'); if (!el) return;
    if (el.dataset.cat) { state.cat = el.dataset.cat; render(); return; }
    if (el.dataset.go) {
      const go = Number(el.dataset.go);
      if (go === 3 && !(state.date && state.time)) return;
      state.step = go; state.error = ''; render(true);
      if (go === 2) loadMonth();
      return;
    }
    if (el.dataset.month) {
      const m = state.month; state.month = new Date(m.getFullYear(), m.getMonth() + Number(el.dataset.month), 1); state.error = ''; render(); loadMonth(); return;
    }
    if (el.dataset.date) { state.date = el.dataset.date; state.time = null; state.error = ''; render(); flow.querySelector('.slots, .slots-empty')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    if (el.dataset.time) { state.time = el.dataset.time; render(); return; }
    if (el.dataset.who) {
      state.who = el.dataset.who; state.error = '';
      if (state.step !== 3) state.step = state.date && state.time ? 3 : state.step;
      render(); return;
    }
    if (el.hasAttribute('data-save-draft')) { saveDraft(); return; }
    if (el.hasAttribute('data-logout')) { await S.logout(); state.who = 'guest'; render(); ui.toast(L('Wylogowano.', 'Signed out.')); return; }
    if (el.hasAttribute('data-ics')) { downloadIcs(state.booking); }
  });
  flow.addEventListener('change', (e) => {
    if (e.target.name === 'treatment') {
      state.treatmentId = e.target.value; state.date = null; state.time = null; state.autoMonth = true; state.month = new Date(today.getFullYear(), today.getMonth(), 1); render(); loadMonth();
      flow.querySelector('[data-go="2"]').focus();
    }
  });
  flow.addEventListener('input', (e) => {
    const f = e.target.form; if (!f || f.id !== 'guest-form') return;
    const el = e.target; state.guest[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  });
  flow.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    if (f.id === 'guest-form') {
      const ok = validate(f, {
        firstName: req(L('Wpisz imię.', 'Enter your first name.')), lastName: req(L('Wpisz nazwisko.', 'Enter your last name.')), phone: phoneOk, email: emailOk,
        terms: (el) => (el.checked ? '' : L('Zaakceptuj regulamin, żeby zarezerwować wizytę.', 'Accept the terms to book a visit.'))
      });
      if (!ok) return;
      const g = Object.fromEntries(['firstName', 'lastName', 'phone', 'email'].map((k) => [k, f.elements[k].value.trim()]));
      g.marketingSms = f.elements.marketingSms.checked; g.marketingEmail = f.elements.marketingEmail.checked; g.terms = f.elements.terms.checked;
      finish(f, { guest: g, notes: f.elements.notes.value.trim() });
    } else if (f.id === 'login-form') {
      if (!validate(f, { email: emailOk, password: (el) => (el.value ? '' : L('Wpisz hasło.', 'Enter your password.')) })) return;
      try { await S.login(f.elements.email.value, f.elements.password.value); state.error = ''; render(true); ui.toast(L('Zalogowano.', 'Signed in.')); }
      catch (err) { state.error = err.message; render(); }
    } else if (f.id === 'confirm-form') {
      finish(f, { notes: f.elements.notes.value.trim() });
    }
  });

  function downloadIcs(b) {
    const start = b.date.replace(/-/g, '') + 'T' + b.time.replace(':', '') + '00';
    const endMin = S.toMin(b.time) + b.duration;
    const end = b.date.replace(/-/g, '') + 'T' + S.toTime(endMin).replace(':', '') + '00';
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JM Beauty//PL', 'BEGIN:VEVENT', 'UID:' + b.code + '@justynamanka.pl',
      'DTSTART;TZID=Europe/Warsaw:' + start, 'DTEND;TZID=Europe/Warsaw:' + end,
      'SUMMARY:' + tName(b) + ' – ' + JM.salon.brand, 'LOCATION:' + JM.salon.street + '\\, ' + JM.salon.city,
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = L('wizyta-', 'visit-') + b.date + '.ics'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  render();
  if (state.treatmentId) loadMonth();
});
