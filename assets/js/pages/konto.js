(function () {
  const S = JM.store, ui = JM.ui, esc = ui.esc;
  const root = document.getElementById('account');
  const params = new URLSearchParams(location.search);
  const back = params.get('powrot') === 'rezerwacja';
  let tab = location.hash === '#rejestracja' ? 'register' : 'login';
  let msg = '';

  const months = ['', ...JM.monthNames];
  const field = (id, label, attrs, hint) => `
    <div class="field"><label for="${id}">${label}</label><input id="${id}" ${attrs}>${hint ? `<span class="field-hint">${hint}</span>` : ''}</div>`;

  function authView() {
    const login = `
      <form id="login-form" novalidate>
        ${field('l-email', 'E-mail', 'name="email" type="email" autocomplete="email" required')}
        ${field('l-pass', 'Hasło', 'name="password" type="password" autocomplete="current-password" required')}
        <p class="small"><button type="button" class="link-button" data-reset>Nie pamiętasz hasła?</button></p>
        <button class="btn btn-primary btn-block" type="submit">Zaloguj się</button>
        <p class="small muted" style="margin-top:20px">Nie masz konta? <button type="button" class="link-button" data-tab="register">Załóż konto</button> i odbierz 10% zniżki na pierwszy zabieg.</p>
      </form>`;
    const register = `
      <div class="perk"><span class="perk-num">10%</span><p>zniżki na pierwszy zabieg po założeniu konta. Naliczy się sama w podsumowaniu rezerwacji.</p></div>
      <form id="register-form" novalidate>
        <div class="form-grid">
          ${field('r-first', 'Imię', 'name="firstName" autocomplete="given-name" required')}
          ${field('r-last', 'Nazwisko', 'name="lastName" autocomplete="family-name" required')}
          ${field('r-email', 'E-mail', 'name="email" type="email" autocomplete="email" required')}
          ${field('r-phone', 'Telefon', 'name="phone" type="tel" autocomplete="tel" required placeholder="+48 600 000 000"', 'Na ten numer wyślemy potwierdzenia i przypomnienia o wizytach.')}
          ${field('r-pass', 'Hasło', 'name="password" type="password" autocomplete="new-password" required minlength="8"', 'Co najmniej 8 znaków.')}
          ${field('r-pass2', 'Powtórz hasło', 'name="password2" type="password" autocomplete="new-password" required')}
          <div class="field span-2"><label for="r-bday">Miesiąc urodzin <span class="opt">(opcjonalnie)</span></label>
            <select id="r-bday" name="birthMonth">${months.map((m, i) => `<option value="${i || ''}">${m || 'Nie podaję'}</option>`).join('')}</select>
            <span class="field-hint">W miesiącu urodzin dostaniesz 10% zniżki na dowolny zabieg.</span></div>
        </div>
        <fieldset class="consent-box">
          <legend>Zgody</legend>
          <label class="check"><input type="checkbox" name="terms" required><span>Akceptuję <a href="regulamin.html" target="_blank">Regulamin</a> i zapoznałam/em się z <a href="polityka-prywatnosci.html" target="_blank">Polityką prywatności</a>. <span class="req" aria-hidden="true">*</span><small>Wymagane, żeby założyć konto.</small></span></label>
          <label class="check"><input type="checkbox" name="marketingSms"><span>Chcę dostawać SMS-y z ofertami i promocjami gabinetu.<small>Opcjonalne. Zgodę możesz wycofać w każdej chwili w profilu.</small></span></label>
          <label class="check"><input type="checkbox" name="marketingEmail"><span>Chcę dostawać e-maile z ofertami i promocjami gabinetu.<small>Opcjonalne. Zgodę możesz wycofać w każdej chwili w profilu.</small></span></label>
        </fieldset>
        <p class="small muted">Zniżka 10% i oferty w profilu przysługują każdej zarejestrowanej klientce, także bez zgód marketingowych.</p>
        <button class="btn btn-primary btn-block" type="submit">Załóż konto</button>
      </form>`;
    return `
      <div class="container page-head">
        <p class="crumbs"><a href="index.html">Strona główna</a> / ${tab === 'register' ? 'Załóż konto' : 'Zaloguj się'}</p>
        <h1>${tab === 'register' ? 'Załóż konto' : 'Zaloguj się'}</h1>
        ${back ? '<p class="lead">Po zalogowaniu wrócisz do rezerwacji z wybranym terminem.</p>' : ''}
      </div>
      <div class="container auth">
        <div class="tabs" role="tablist">
          <button class="tab" role="tab" type="button" data-tab="login" aria-selected="${tab === 'login'}">Logowanie</button>
          <button class="tab" role="tab" type="button" data-tab="register" aria-selected="${tab === 'register'}">Rejestracja</button>
        </div>
        ${msg ? `<p class="form-msg" role="alert">${esc(msg)}</p>` : ''}
        <div role="tabpanel">${tab === 'register' ? register : login}</div>
      </div>`;
  }

  function visitRow(b, upcoming) {
    const d = new Date(b.date + 'T12:00:00');
    const status = b.status === 'cancelled' ? '<span class="badge">odwołana</span>' : b.status === 'done' || !upcoming ? '<span class="badge badge-ok">odbyta</span>' : '';
    let action = '';
    if (upcoming && b.status !== 'cancelled') {
      action = S.canCancel(b)
        ? `<button class="btn btn-outline btn-small" type="button" data-cancel="${b.id}">Odwołaj</button>`
        : `<span class="small muted">Odwołanie tylko telefonicznie: <a href="tel:${JM.salon.phoneHref}">${JM.salon.phone}</a></span>`;
    }
    return `
      <li class="visit-row">
        <div class="visit-date"><strong>${d.getDate()} ${JM.monthGen[d.getMonth()]}</strong><span>${JM.dayNames[d.getDay()].toLowerCase()}, ${b.time}</span></div>
        <div>${esc(b.treatmentName)}<div class="muted">${b.discount ? `${S.formatPrice(b.total)} (zniżka ${b.discount.percent}%)` : S.formatPrice(b.total)} ${status}</div></div>
        <div>${action}</div>
      </li>`;
  }

  function profileView(u) {
    const all = S.userBookings(u.id);
    const nowKey = S.isoDate(new Date()) + ' ' + S.pad(new Date().getHours()) + ':' + S.pad(new Date().getMinutes());
    const upcoming = all.filter((b) => b.status !== 'cancelled' && b.status !== 'done' && b.date + ' ' + b.time >= nowKey);
    const past = all.filter((b) => !upcoming.includes(b)).reverse();
    const firstAvailable = S.visitCount(u.id) === 0;
    const next = upcoming[0];
    const todayIso = S.isoDate(new Date());
    const offers = S.promos().filter((p) => p.active && p.membersOnly && p.to >= todayIso);
    const c = u.consents;
    const when = (x) => new Date(x.at).toLocaleDateString('pl-PL');

    return `
      <div class="container page-head">
        <p class="crumbs"><a href="index.html">Strona główna</a> / Moje konto</p>
        <h1>Dzień dobry, ${esc(u.firstName)}</h1>
        <p class="lead">Tu znajdziesz swoje wizyty, zniżki i ustawienia konta.</p>
        <button class="btn btn-outline btn-small" type="button" data-logout>Wyloguj się</button>
      </div>
      <div class="container profile">
        <div class="profile-grid">
          <div class="card card-ink">
            ${firstAvailable
              ? `<h2>10% zniżki na pierwszy zabieg</h2><p>Zniżka jest aktywna i naliczy się sama przy rezerwacji.</p><a class="btn btn-gold" href="rezerwacja.html">Zarezerwuj wizytę</a>`
              : `<h2>Zniżka powitalna wykorzystana</h2><p>Sprawdź oferty dla zarejestrowanych klientek poniżej.</p><a class="btn btn-gold" href="rezerwacja.html">Zarezerwuj kolejną wizytę</a>`}
          </div>
          <div class="card">
            <h2>Najbliższa wizyta</h2>
            ${next ? `<p style="margin:0">${esc(next.treatmentName)}<br><strong style="font-weight:500">${ui.fmtDate(next.date)}, godz. ${next.time}</strong></p><p class="small muted" style="margin-top:12px">${JM.salon.street}, ${JM.salon.city}. Przypomnienie wyślemy SMS-em dzień wcześniej.</p>`
              : '<p class="muted">Nie masz zaplanowanych wizyt.</p><a class="btn btn-outline" href="rezerwacja.html">Zarezerwuj wizytę</a>'}
          </div>
        </div>

        <section class="profile-section" aria-labelledby="up-title">
          <h2 id="up-title">Nadchodzące wizyty</h2>
          ${upcoming.length ? `<ul class="visit-list">${upcoming.map((b) => visitRow(b, true)).join('')}</ul>` : '<div class="empty"><p>Brak zaplanowanych wizyt.</p><a class="btn btn-primary btn-small" href="rezerwacja.html">Zarezerwuj wizytę</a></div>'}
          <p class="small muted" style="margin-top:14px">Wizytę odwołasz bezpłatnie do ${JM.booking.cancelHours} godzin przed terminem.</p>
        </section>

        <section class="profile-section" aria-labelledby="hist-title">
          <h2 id="hist-title">Historia wizyt</h2>
          ${past.length ? `<ul class="visit-list">${past.map((b) => visitRow(b, false)).join('')}</ul>` : '<div class="empty"><p>Tu pojawią się Twoje odbyte i odwołane wizyty.</p></div>'}
        </section>

        <section class="profile-section" aria-labelledby="off-title">
          <h2 id="off-title">Oferty dla Ciebie</h2>
          ${offers.length ? `<div class="offer-list">${offers.map((p) => `
            <article class="offer">
              <p class="offer-percent">−${p.percent}%</p>
              <h3>${esc(p.title)}</h3>
              <p>${esc(p.text)}</p>
              <p class="small muted" style="margin:0">${p.birthday ? (u.birthMonth ? 'W ' + ['', 'styczniu', 'lutym', 'marcu', 'kwietniu', 'maju', 'czerwcu', 'lipcu', 'sierpniu', 'wrześniu', 'październiku', 'listopadzie', 'grudniu'][Number(u.birthMonth)] : 'Podaj miesiąc urodzin w danych poniżej, żeby skorzystać.') : 'Od ' + new Date(p.from + 'T12:00').toLocaleDateString('pl-PL') + ' do ' + new Date(p.to + 'T12:00').toLocaleDateString('pl-PL')}</p>
            </article>`).join('')}</div>` : '<div class="empty"><p>Teraz nie ma aktywnych ofert. Damy znać, gdy pojawi się nowa.</p></div>'}
          <p class="small muted" style="margin-top:14px">Zniżki się nie sumują. Przy rezerwacji zastosujemy najkorzystniejszą.</p>
        </section>

        <section class="profile-section" aria-labelledby="data-title">
          <h2 id="data-title">Moje dane</h2>
          <form id="data-form" class="card" novalidate style="max-width:760px">
            <div class="form-grid">
              ${field('d-first', 'Imię', `name="firstName" required value="${esc(u.firstName)}"`)}
              ${field('d-last', 'Nazwisko', `name="lastName" required value="${esc(u.lastName)}"`)}
              ${field('d-phone', 'Telefon', `name="phone" type="tel" required value="${esc(u.phone)}"`)}
              ${field('d-email', 'E-mail', `name="email" type="email" value="${esc(u.email)}" readonly`, 'Aby zmienić adres e-mail, napisz do nas.')}
              <div class="field span-2"><label for="d-bday">Miesiąc urodzin <span class="opt">(opcjonalnie)</span></label>
                <select id="d-bday" name="birthMonth">${months.map((m, i) => `<option value="${i || ''}" ${String(u.birthMonth) === String(i || '') ? 'selected' : ''}>${m || 'Nie podaję'}</option>`).join('')}</select></div>
            </div>
            <button class="btn btn-primary" type="submit">Zapisz zmiany</button>
          </form>
        </section>

        <section class="profile-section" aria-labelledby="cons-title" style="max-width:760px">
          <h2 id="cons-title">Zgody</h2>
          <div class="switch-row" style="cursor:default"><div><strong style="font-weight:500">Regulamin i polityka prywatności</strong><p>Zaakceptowane ${when(c.terms)}. Wymagane do korzystania z konta.</p></div><span class="badge badge-ok">aktywna</span></div>
          <label class="switch-row"><div><strong style="font-weight:500">Oferty SMS</strong><p>Ostatnia zmiana ${when(c.marketingSms)}.</p></div><input type="checkbox" class="switch" data-consent="marketingSms" ${c.marketingSms.value ? 'checked' : ''}></label>
          <label class="switch-row"><div><strong style="font-weight:500">Oferty e-mail</strong><p>Ostatnia zmiana ${when(c.marketingEmail)}.</p></div><input type="checkbox" class="switch" data-consent="marketingEmail" ${c.marketingEmail.value ? 'checked' : ''}></label>
          <p class="small muted" style="margin-top:12px">Potwierdzenia i przypomnienia o wizytach wysyłamy zawsze. To część usługi, a nie marketing.</p>
          <details class="consent-log"><summary>Historia zmian zgód</summary>
            <ul>${u.consentLog.slice().reverse().map((l) => `<li>${new Date(l.at).toLocaleString('pl-PL')}: ${esc(l.change)}</li>`).join('')}</ul>
          </details>
        </section>

        <section class="profile-section danger-zone" aria-labelledby="del-title" style="max-width:760px">
          <h2 id="del-title">Usuń konto</h2>
          <p>Usuniemy Twoje dane logowania, zgody i dane kontaktowe z konta. Odbyte wizyty zostaną w dokumentacji gabinetu bez powiązania z kontem, tak długo, jak wymagają tego przepisy.</p>
          <button class="btn btn-danger" type="button" data-delete>Usuń konto</button>
        </section>
      </div>`;
  }

  function render() {
    const u = S.currentUser();
    root.innerHTML = u ? profileView(u) : authView();
  }

  function setError(form, name, text) {
    const el = form.elements[name]; const box = el.closest('.field') || el.closest('.check');
    box.classList.add('has-error'); box.insertAdjacentHTML('beforeend', `<span class="field-error">${text}</span>`);
    el.setAttribute('aria-invalid', 'true');
  }
  function clearErrors(form) {
    form.querySelectorAll('.field-error').forEach((e) => e.remove());
    form.querySelectorAll('.has-error').forEach((e) => e.classList.remove('has-error'));
    form.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneRe = /^(\+?48)?[\s-]?(\d[\s-]?){9}$/;
  function afterAuth(text) {
    if (back) { location.href = 'rezerwacja.html?wznow=1'; return; }
    msg = ''; history.replaceState(null, '', 'konto.html'); render(); window.scrollTo(0, 0); ui.toast(text);
    document.querySelectorAll('.nav-account span').forEach((s) => (s.textContent = S.currentUser().firstName));
  }

  root.addEventListener('click', (e) => {
    const el = e.target.closest('button'); if (!el) return;
    if (el.dataset.tab) { tab = el.dataset.tab; msg = ''; history.replaceState(null, '', (back ? '?powrot=rezerwacja' : 'konto.html') + (tab === 'register' ? '#rejestracja' : '')); render(); return; }
    if (el.hasAttribute('data-logout')) { S.logout(); render(); ui.toast('Wylogowano.'); document.querySelectorAll('.nav-account span').forEach((s) => (s.textContent = 'Zaloguj się')); return; }
    if (el.hasAttribute('data-reset')) {
      const dlg = ui.h(`<dialog class="modal"><form method="dialog" class="modal-body"><h2>Reset hasła</h2><p>Podaj adres e-mail konta. Wyślemy link do ustawienia nowego hasła.</p>
        <div class="field"><label for="rs-email">E-mail</label><input id="rs-email" type="email" required></div>
        <div class="modal-actions"><button class="btn btn-primary" value="ok">Wyślij link</button><button class="btn btn-outline" value="cancel" formnovalidate>Anuluj</button></div></form></dialog>`);
      document.body.appendChild(dlg); dlg.showModal();
      dlg.addEventListener('close', () => { if (dlg.returnValue === 'ok') ui.toast('Jeśli konto istnieje, wysłaliśmy link na podany adres.'); dlg.remove(); });
      return;
    }
    if (el.dataset.cancel) {
      const b = S.bookings().find((x) => x.id === el.dataset.cancel);
      const dlg = ui.h(`<dialog class="modal"><form method="dialog" class="modal-body"><h2>Odwołać wizytę?</h2><p>${esc(b.treatmentName)}, ${ui.fmtDate(b.date)}, godz. ${b.time}. Termin wróci do kalendarza dla innych klientek.</p>
        <div class="modal-actions"><button class="btn btn-primary" value="ok">Odwołaj wizytę</button><button class="btn btn-outline" value="cancel">Zostaw wizytę</button></div></form></dialog>`);
      document.body.appendChild(dlg); dlg.showModal();
      dlg.addEventListener('close', () => { if (dlg.returnValue === 'ok') { S.cancelBooking(b.id, 'klientka'); render(); ui.toast('Wizyta odwołana. Wysłaliśmy potwierdzenie SMS-em.'); } dlg.remove(); });
      return;
    }
    if (el.hasAttribute('data-delete')) {
      const dlg = ui.h(`<dialog class="modal"><form method="dialog" class="modal-body"><h2>Usunąć konto?</h2><p>Tej operacji nie można cofnąć. Zaplanowane wizyty pozostaną w kalendarzu; jeśli chcesz je odwołać, zrób to przed usunięciem konta.</p>
        <div class="modal-actions"><button class="btn btn-danger" value="ok">Usuń konto</button><button class="btn btn-outline" value="cancel">Anuluj</button></div></form></dialog>`);
      document.body.appendChild(dlg); dlg.showModal();
      dlg.addEventListener('close', () => { if (dlg.returnValue === 'ok') { S.deleteUser(S.currentUser().id); location.href = 'index.html'; } dlg.remove(); });
    }
  });

  root.addEventListener('change', (e) => {
    const k = e.target.dataset.consent; if (!k) return;
    S.setConsent(S.currentUser().id, k, e.target.checked);
    ui.toast(e.target.checked ? 'Zgoda zapisana.' : 'Zgoda wycofana. Nie będziemy wysyłać ofert tym kanałem.');
    render();
  });

  root.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; clearErrors(f); msg = '';
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : '');
    if (f.id === 'login-form') {
      let bad = false;
      if (!emailRe.test(v('email'))) { setError(f, 'email', 'Wpisz adres e-mail, np. anna@example.com.'); bad = true; }
      if (!f.elements.password.value) { setError(f, 'password', 'Wpisz hasło.'); bad = true; }
      if (bad) return f.querySelector('[aria-invalid]').focus();
      try { await S.login(v('email'), f.elements.password.value); afterAuth('Zalogowano.'); }
      catch (err) { msg = err.message; render(); }
    }
    if (f.id === 'register-form') {
      const checks = [
        ['firstName', !v('firstName'), 'Wpisz imię.'],
        ['lastName', !v('lastName'), 'Wpisz nazwisko.'],
        ['email', !emailRe.test(v('email')), 'Wpisz adres e-mail, np. anna@example.com.'],
        ['phone', !phoneRe.test(v('phone')), 'Wpisz numer telefonu, np. +48 600 000 000.'],
        ['password', f.elements.password.value.length < 8, 'Hasło musi mieć co najmniej 8 znaków.'],
        ['password2', f.elements.password2.value !== f.elements.password.value, 'Hasła się różnią.'],
        ['terms', !f.elements.terms.checked, 'Zaakceptuj regulamin, żeby założyć konto.']
      ];
      let first = null;
      checks.forEach(([n, bad, t]) => { if (bad) { setError(f, n, t); first = first || f.elements[n]; } });
      if (first) return first.focus();
      try {
        await S.register({
          firstName: v('firstName'), lastName: v('lastName'), email: v('email'), phone: v('phone'),
          password: f.elements.password.value, birthMonth: v('birthMonth'),
          marketingSms: f.elements.marketingSms.checked, marketingEmail: f.elements.marketingEmail.checked
        });
        afterAuth('Konto założone. Zniżka 10% czeka na pierwszy zabieg.');
      } catch (err) { msg = err.message; render(); }
    }
    if (f.id === 'data-form') {
      if (!v('firstName')) { setError(f, 'firstName', 'Wpisz imię.'); return; }
      if (!phoneRe.test(v('phone'))) { setError(f, 'phone', 'Wpisz numer telefonu, np. +48 600 000 000.'); return; }
      S.updateUser(S.currentUser().id, { firstName: v('firstName'), lastName: v('lastName'), phone: v('phone'), birthMonth: v('birthMonth') });
      render(); ui.toast('Zapisano zmiany.');
    }
  });

  render();
})();
