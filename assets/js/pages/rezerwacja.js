(function () {
  const S = JM.store, ui = JM.ui, esc = ui.esc;
  const flow = document.getElementById('flow');
  const summary = document.getElementById('summary');
  const stepper = document.getElementById('stepper');
  const DRAFT = 'jm_booking_draft';

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const lastDay = new Date(today); lastDay.setDate(lastDay.getDate() + JM.booking.daysAhead);

  const state = {
    step: 1, cat: 'all', treatmentId: null, date: null, time: null,
    month: new Date(today.getFullYear(), today.getMonth(), 1),
    who: 'guest', guest: { firstName: '', lastName: '', phone: '', email: '', notes: '', marketingSms: false, marketingEmail: false },
    notes: '', booking: null, error: ''
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
    const cats = [{ id: 'all', name: 'Wszystkie' }, { id: 'konsultacja', name: 'Konsultacja' }].concat(JM.categories);
    const items = [JM.consultation].concat(S.allTreatments()).filter((x) => state.cat === 'all' || x.category === state.cat);
    return `
      <h2 class="step-title">Wybierz zabieg</h2>
      <div class="chip-nav" role="group" aria-label="Kategorie">
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
        <button class="btn btn-primary" type="button" data-go="2" ${state.treatmentId ? '' : 'disabled'}>Dalej: wybierz termin</button>
      </div>`;
  }

  /* ---------- Krok 2: termin ---------- */
  function dayState(d) {
    const iso = S.isoDate(d);
    if (d < today || d > lastDay) return { ok: false, reason: 'poza zakresem' };
    if (!S.dayHours(iso)) return { ok: false, reason: 'nieczynne' };
    const slots = S.slotsFor(iso, t().duration);
    return { ok: slots.length > 0, slots, reason: slots.length ? '' : 'brak wolnych terminów' };
  }
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
      const label = ui.fmtDate(iso) + (st.ok ? ', wolne terminy: ' + st.slots.length : ', ' + st.reason);
      cells += `<button type="button" class="cal-day${st.ok ? ' is-available' : ''}${sel ? ' is-selected' : ''}" data-date="${iso}" ${st.ok ? '' : 'disabled'} aria-label="${label}" ${sel ? 'aria-pressed="true"' : ''}>${n}</button>`;
    }
    return `
      <div>
        <div class="cal-head">
          <button type="button" class="icon-btn" data-month="-1" ${canPrev ? '' : 'disabled'} aria-label="Poprzedni miesiąc">${ui.icons.arrowL}</button>
          <h3>${JM.monthNames[m.getMonth()]} ${m.getFullYear()}</h3>
          <button type="button" class="icon-btn" data-month="1" ${canNext ? '' : 'disabled'} aria-label="Następny miesiąc">${ui.icons.arrowR}</button>
        </div>
        <div class="cal-grid">
          ${['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map((d) => `<span class="cal-dow" aria-hidden="true">${d}</span>`).join('')}
          ${cells}
        </div>
        <div class="cal-legend"><span>wolne terminy</span><span class="off">brak terminów lub nieczynne</span></div>
      </div>`;
  }
  function slotsView() {
    if (!state.date) return '<div><p class="slots-head">Godzina</p><p class="slots-empty">Wybierz dzień w kalendarzu, żeby zobaczyć wolne godziny.</p></div>';
    const slots = S.slotsFor(state.date, t().duration);
    return `<div>
      <p class="slots-head">Wolne godziny, ${ui.fmtDate(state.date, false)}</p>
      ${slots.length ? `<div class="slots" role="group" aria-label="Wolne godziny">${slots.map((s) => `<button type="button" class="slot" data-time="${s}" aria-pressed="${s === state.time}">${s}</button>`).join('')}</div>`
        : '<p class="slots-empty">Ten dzień jest już zajęty. Wybierz inny.</p>'}
      <p class="small muted" style="margin-top:16px">Zabieg trwa ${S.formatDuration(t().duration)}. Nie znalazłaś terminu? Zadzwoń: <a href="tel:${JM.salon.phoneHref}">${JM.salon.phone}</a></p>
    </div>`;
  }
  function stepDate() {
    return `
      <h2 class="step-title">Wybierz termin</h2>
      <div class="cal-wrap">${calendar()}${slotsView()}</div>
      <div class="step-actions">
        <button class="btn btn-outline" type="button" data-go="1">Wstecz</button>
        <button class="btn btn-primary" type="button" data-go="3" ${state.date && state.time ? '' : 'disabled'}>Dalej: Twoje dane</button>
      </div>`;
  }

  /* ---------- Krok 3: dane ---------- */
  function stepDetails() {
    const u = user();
    const err = state.error ? `<p class="form-msg" role="alert">${esc(state.error)}</p>` : '';
    if (u) {
      return `
        <h2 class="step-title">Potwierdź rezerwację</h2>
        ${err}
        <div class="card" style="margin-bottom:24px">
          <p class="small muted" style="margin:0 0 4px">Rezerwujesz jako</p>
          <p style="margin:0"><strong style="font-weight:500">${esc(u.firstName)} ${esc(u.lastName)}</strong><br>${esc(u.phone)}, ${esc(u.email)}</p>
          <p class="small" style="margin:12px 0 0">To nie Ty? <button type="button" class="link-button" data-logout>Wyloguj się</button></p>
        </div>
        <form id="confirm-form" novalidate>
          <div class="field"><label for="notes">Uwagi do wizyty <span class="opt">(opcjonalnie)</span></label>
            <textarea id="notes" name="notes" maxlength="400" placeholder="Np. pierwszy raz na tym zabiegu">${esc(state.notes)}</textarea></div>
          <p class="small muted">Rezerwując, potwierdzasz zasady odwołania wizyty opisane w <a href="regulamin.html#rezerwacje">regulaminie</a>. Potwierdzenie i przypomnienie wyślemy SMS-em na numer ${esc(u.phone)}.</p>
          <div class="step-actions">
            <button class="btn btn-outline" type="button" data-go="2">Wstecz</button>
            <button class="btn btn-primary" type="submit">Potwierdź rezerwację</button>
          </div>
        </form>`;
    }
    const g = state.guest;
    const who = state.who;
    const choice = `
      <div class="who-choice" role="group" aria-label="Jak chcesz zarezerwować">
        <button type="button" class="who-card" data-who="guest" aria-pressed="${who === 'guest'}"><strong>Jako gość</strong><span>Bez zakładania konta</span></button>
        <button type="button" class="who-card" data-who="login" aria-pressed="${who === 'login'}"><strong>Mam konto</strong><span>Zaloguj się</span></button>
        <button type="button" class="who-card" data-who="register" aria-pressed="${who === 'register'}"><strong>Załóż konto</strong><span>10% zniżki na pierwszy zabieg</span></button>
      </div>`;
    let body = '';
    if (who === 'login') {
      body = `
        <form id="login-form" novalidate>
          <div class="field"><label for="l-email">E-mail</label><input id="l-email" name="email" type="email" autocomplete="email" required></div>
          <div class="field"><label for="l-pass">Hasło</label><input id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
          <div class="step-actions">
            <button class="btn btn-outline" type="button" data-go="2">Wstecz</button>
            <button class="btn btn-primary" type="submit">Zaloguj się i kontynuuj</button>
          </div>
        </form>`;
    } else if (who === 'register') {
      body = `
        <div class="perk"><span class="perk-num">10%</span><p>Po założeniu konta wrócisz tutaj z wybranym terminem, a zniżka naliczy się w podsumowaniu.</p></div>
        <div class="step-actions">
          <button class="btn btn-outline" type="button" data-go="2">Wstecz</button>
          <a class="btn btn-primary" href="konto.html?powrot=rezerwacja#rejestracja" data-save-draft>Załóż konto</a>
        </div>`;
    } else {
      body = `
        <form id="guest-form" novalidate>
          <div class="form-grid">
            <div class="field"><label for="g-first">Imię</label><input id="g-first" name="firstName" autocomplete="given-name" required value="${esc(g.firstName)}"></div>
            <div class="field"><label for="g-last">Nazwisko</label><input id="g-last" name="lastName" autocomplete="family-name" required value="${esc(g.lastName)}"></div>
            <div class="field"><label for="g-phone">Telefon</label><input id="g-phone" name="phone" type="tel" autocomplete="tel" required placeholder="+48 600 000 000" value="${esc(g.phone)}"><span class="field-hint">Na ten numer wyślemy potwierdzenie i przypomnienie.</span></div>
            <div class="field"><label for="g-email">E-mail</label><input id="g-email" name="email" type="email" autocomplete="email" required value="${esc(g.email)}"></div>
            <div class="field span-2"><label for="g-notes">Uwagi do wizyty <span class="opt">(opcjonalnie)</span></label><textarea id="g-notes" name="notes" maxlength="400">${esc(g.notes)}</textarea></div>
          </div>
          <fieldset class="consent-box">
            <legend>Zgody</legend>
            <label class="check"><input type="checkbox" name="terms" required><span>Akceptuję <a href="regulamin.html" target="_blank">Regulamin</a> i zasady rezerwacji oraz zapoznałam/em się z <a href="polityka-prywatnosci.html" target="_blank">Polityką prywatności</a>. <span class="req" aria-hidden="true">*</span><small>Wymagane, żeby zarezerwować wizytę.</small></span></label>
            <label class="check"><input type="checkbox" name="marketingSms" ${g.marketingSms ? 'checked' : ''}><span>Chcę dostawać SMS-y z ofertami i promocjami gabinetu.<small>Opcjonalne. Zgodę możesz wycofać w każdej chwili.</small></span></label>
            <label class="check"><input type="checkbox" name="marketingEmail" ${g.marketingEmail ? 'checked' : ''}><span>Chcę dostawać e-maile z ofertami i promocjami gabinetu.<small>Opcjonalne. Zgodę możesz wycofać w każdej chwili.</small></span></label>
          </fieldset>
          <div class="step-actions">
            <button class="btn btn-outline" type="button" data-go="2">Wstecz</button>
            <button class="btn btn-primary" type="submit">Zarezerwuj wizytę</button>
          </div>
        </form>`;
    }
    return `<h2 class="step-title">Twoje dane</h2>${err}${choice}${body}`;
  }

  /* ---------- Krok 4: potwierdzenie ---------- */
  function smsText(b, kind) {
    const d = new Date(b.date + 'T12:00:00');
    const date = S.pad(d.getDate()) + '.' + S.pad(d.getMonth() + 1);
    if (kind === 'confirm') return `${JM.salon.smsSender}: Potwierdzamy wizytę ${date} o ${b.time} (${b.treatmentName}), ${JM.salon.street}. Zmiana lub odwołanie: justynamanka.pl/w/${b.code}`;
    return `${JM.salon.smsSender}: Przypominamy o jutrzejszej wizycie o ${b.time}. Do zobaczenia! Odwołanie: justynamanka.pl/w/${b.code}`;
  }
  function stepDone() {
    const b = state.booking; const u = user();
    const phone = u ? u.phone : b.guest.phone;
    return `
      <div class="done">
        <div class="done-mark">${ui.icons.check}</div>
        <h2 class="step-title">Wizyta zarezerwowana</h2>
        <p class="lead">${esc(b.treatmentName)}, ${ui.fmtDate(b.date)}, godz. ${b.time}. Potwierdzenie wysłaliśmy SMS-em na numer ${esc(phone)}.</p>
        <div class="sms-preview" aria-label="Podgląd wiadomości SMS">
          <header><span>${JM.salon.smsSender}</span><span>teraz</span></header>
          <div class="sms-bubble">${esc(smsText(b, 'confirm'))}</div>
          <header><span>${JM.salon.smsSender}</span><span>dzień przed wizytą</span></header>
          <div class="sms-bubble">${esc(smsText(b, 'reminder'))}</div>
        </div>
        <div class="btn-row">
          <button class="btn btn-outline" type="button" data-ics>Dodaj do kalendarza</button>
          ${u ? '<a class="btn btn-primary" href="konto.html">Moje wizyty</a>' : '<a class="btn btn-primary" href="konto.html#rejestracja">Załóż konto na kolejne wizyty</a>'}
        </div>
        <p class="small muted" style="margin-top:28px">Kod rezerwacji: <strong>${b.code}</strong>. Bezpłatnie odwołasz wizytę do ${JM.booking.cancelHours} godzin przed terminem.</p>
      </div>`;
  }

  /* ---------- Podsumowanie ---------- */
  function renderSummary() {
    const tr = t(); const u = user();
    if (!tr) { summary.innerHTML = '<h2>Podsumowanie</h2><p class="muted">Wybierz zabieg, żeby zobaczyć szczegóły i cenę.</p>'; return; }
    const ps = S.priceSummary(tr, state.date || S.isoDate(today), state.step === 4 ? null : u);
    const p = state.step === 4 && state.booking ? { base: state.booking.price, cut: state.booking.price - state.booking.total, total: state.booking.total, discount: state.booking.discount, lowest30: state.booking.price } : ps;
    summary.innerHTML = `
      <h2>Podsumowanie</h2>
      <dl>
        <div><dt>Zabieg</dt><dd>${tr.name}<br><span class="small muted">${S.formatDuration(tr.duration)}</span></dd></div>
        <div><dt>Termin</dt><dd>${state.date ? ui.fmtDate(state.date) + (state.time ? ', godz. ' + state.time : '') : '<span class="muted">nie wybrano</span>'}</dd></div>
      </dl>
      <div class="summary-prices">
        <div><span>Cena zabiegu</span><span>${S.formatPrice(p.base, tr.from)}</span></div>
        ${p.discount ? `<div><span>${esc(p.discount.label)} (−${p.discount.percent}%)</span><span>−${S.formatPrice(p.cut)}</span></div>
          <div class="omni"><span>Najniższa cena z 30 dni przed obniżką</span><span>${S.formatPrice(p.lowest30)}</span></div>` : ''}
        <div class="total"><span>Do zapłaty w gabinecie</span><span>${S.formatPrice(p.total, tr.from)}</span></div>
      </div>
      ${!u && tr.price > 0 && state.step < 4 ? `<div class="member-hint"><p>Z kontem ten zabieg kosztowałby ${S.formatPrice(Math.round(tr.price * (100 - JM.discounts.firstVisitPercent)) / 100, tr.from)}.</p><a href="konto.html?powrot=rezerwacja#rejestracja" data-save-draft>Załóż konto</a> albo <button type="button" class="link-button" data-who="login">zaloguj się</button></div>` : ''}
      <p class="summary-foot">Płatność w gabinecie po wizycie. Bezpłatne odwołanie do ${JM.booking.cancelHours} godzin przed terminem.</p>`;
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
  const req = (label) => (el) => (el.value.trim() ? '' : 'Wpisz ' + label + '.');
  const phoneOk = (el) => (/^(\+?48)?[\s-]?(\d[\s-]?){9}$/.test(el.value.trim()) ? '' : 'Wpisz numer telefonu, np. +48 600 000 000.');
  const emailOk = (el) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()) ? '' : 'Wpisz adres e-mail, np. anna@example.com.');

  function finish(data) {
    const tr = t(); const u = user();
    if (!S.slotsFor(state.date, tr.duration).includes(state.time)) {
      state.error = 'Ten termin został właśnie zajęty. Wybierz inną godzinę.'; state.step = 2; state.time = null; render(true); return;
    }
    const ps = S.priceSummary(tr, state.date, u);
    state.booking = S.createBooking(Object.assign({
      treatmentId: tr.id, treatmentName: tr.name, duration: tr.duration, date: state.date, time: state.time,
      price: ps.base, total: ps.total, discount: ps.discount, userId: u ? u.id : null
    }, data));
    state.step = 4; state.error = ''; render(true);
  }

  /* ---------- Zdarzenia ---------- */
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('button, a'); if (!el) return;
    if (el.dataset.cat) { state.cat = el.dataset.cat; render(); return; }
    if (el.dataset.go) {
      const go = Number(el.dataset.go);
      if (go === 3 && !(state.date && state.time)) return;
      state.step = go; state.error = ''; render(true); return;
    }
    if (el.dataset.month) {
      const m = state.month; state.month = new Date(m.getFullYear(), m.getMonth() + Number(el.dataset.month), 1); render(); return;
    }
    if (el.dataset.date) { state.date = el.dataset.date; state.time = null; render(); flow.querySelector('.slots, .slots-empty')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    if (el.dataset.time) { state.time = el.dataset.time; render(); return; }
    if (el.dataset.who) {
      state.who = el.dataset.who; state.error = '';
      if (state.step !== 3) state.step = state.date && state.time ? 3 : state.step;
      render(); return;
    }
    if (el.hasAttribute('data-save-draft')) { saveDraft(); return; }
    if (el.hasAttribute('data-logout')) { S.logout(); state.who = 'guest'; render(); ui.toast('Wylogowano.'); return; }
    if (el.hasAttribute('data-ics')) { downloadIcs(state.booking); }
  });
  flow.addEventListener('change', (e) => {
    if (e.target.name === 'treatment') {
      state.treatmentId = e.target.value; state.date = null; state.time = null; render();
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
        firstName: req('imię'), lastName: req('nazwisko'), phone: phoneOk, email: emailOk,
        terms: (el) => (el.checked ? '' : 'Zaakceptuj regulamin, żeby zarezerwować wizytę.')
      });
      if (!ok) return;
      const g = Object.fromEntries(['firstName', 'lastName', 'phone', 'email', 'notes'].map((k) => [k, f.elements[k].value.trim()]));
      g.marketingSms = f.elements.marketingSms.checked; g.marketingEmail = f.elements.marketingEmail.checked;
      g.consentAt = new Date().toISOString();
      finish({ guest: g, notes: g.notes });
    } else if (f.id === 'login-form') {
      if (!validate(f, { email: emailOk, password: (el) => (el.value ? '' : 'Wpisz hasło.') })) return;
      try { await S.login(f.elements.email.value, f.elements.password.value); state.error = ''; render(true); ui.toast('Zalogowano.'); }
      catch (err) { state.error = err.message; render(); }
    } else if (f.id === 'confirm-form') {
      finish({ notes: f.elements.notes.value.trim(), guest: null });
    }
  });

  function downloadIcs(b) {
    const start = b.date.replace(/-/g, '') + 'T' + b.time.replace(':', '') + '00';
    const endMin = S.toMin(b.time) + b.duration;
    const end = b.date.replace(/-/g, '') + 'T' + S.toTime(endMin).replace(':', '') + '00';
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JM Beauty//PL', 'BEGIN:VEVENT', 'UID:' + b.id + '@justynamanka.pl',
      'DTSTART;TZID=Europe/Warsaw:' + start, 'DTEND;TZID=Europe/Warsaw:' + end,
      'SUMMARY:' + b.treatmentName + ' – ' + JM.salon.brand, 'LOCATION:' + JM.salon.street + '\\, ' + JM.salon.city,
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'wizyta-' + b.date + '.ics'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // skok do pierwszego wolnego miesiąca z terminami
  if (state.step === 2 && !state.date) {
    const m = state.month;
    const anyFree = (mm) => { const n = new Date(mm.getFullYear(), mm.getMonth() + 1, 0).getDate(); for (let i = 1; i <= n; i++) { if (dayState(new Date(mm.getFullYear(), mm.getMonth(), i)).ok) return true; } return false; };
    if (!anyFree(m)) state.month = new Date(m.getFullYear(), m.getMonth() + 1, 1);
  }
  render();
})();
