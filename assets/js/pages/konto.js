JM.ready.then(function () {
  const S = JM.store, ui = JM.ui, esc = ui.esc, L = JM.L;
  const loc = L('pl-PL', 'en-GB');
  const tName = (b) => { const x = S.treatment(b.treatmentId); return x ? x.name : b.treatmentName; };
  // historia zgód jest zapisana po polsku; w wersji angielskiej tłumaczymy ją przy wyświetlaniu
  const logText = (t) => (JM.lang !== 'en' ? t : [
    ['Akceptacja regulaminu i polityki prywatności', 'Accepted the terms and privacy policy'], ['Rejestracja konta', 'Account created'],
    ['Marketing SMS', 'SMS offers'], ['Marketing e-mail', 'Email offers'],
    ['wycofanie zgody', 'consent withdrawn'], ['brak zgody', 'no consent'], ['zgoda', 'consent given']
  ].reduce((acc, [a, b]) => acc.replace(a, b), t));
  const root = document.getElementById('account');
  const params = new URLSearchParams(location.search);
  const back = params.get('powrot') === 'rezerwacja';
  let tab = location.hash === '#rejestracja' ? 'register' : 'login';
  let msg = '';
  let myBookings = null; // wizyty zalogowanej klientki z serwera
  const resetToken = params.get('reset');

  const months = ['', ...JM.monthNames];
  const field = (id, label, attrs, hint) => `
    <div class="field"><label for="${id}">${label}</label><input id="${id}" ${attrs}>${hint ? `<span class="field-hint">${hint}</span>` : ''}</div>`;

  function authView() {
    const login = `
      <form id="login-form" novalidate>
        ${field('l-email', 'E-mail', 'name="email" type="email" autocomplete="email" required')}
        ${field('l-pass', L('Hasło', 'Password'), 'name="password" type="password" autocomplete="current-password" required')}
        <p class="small"><button type="button" class="link-button" data-reset>${L('Nie pamiętasz hasła?', 'Forgotten your password?')}</button></p>
        <button class="btn btn-primary btn-block" type="submit">${L('Zaloguj się', 'Sign in')}</button>
        <p class="small muted" style="margin-top:20px">${L('Nie masz konta?', 'No account yet?')} <button type="button" class="link-button" data-tab="register">${L('Załóż konto', 'Create one')}</button> ${L('i odbierz 10% zniżki na pierwszy zabieg.', 'and get 10% off your first treatment.')}</p>
      </form>`;
    const register = `
      <div class="perk"><span class="perk-num">10%</span><p>${L('zniżki na pierwszy zabieg po założeniu konta. Naliczy się sama w podsumowaniu rezerwacji.', 'off your first treatment once you create an account. It is applied automatically in the booking summary.')}</p></div>
      <form id="register-form" novalidate>
        <div class="form-grid">
          ${field('r-first', L('Imię', 'First name'), 'name="firstName" autocomplete="given-name" required')}
          ${field('r-last', L('Nazwisko', 'Last name'), 'name="lastName" autocomplete="family-name" required')}
          ${field('r-email', 'E-mail', 'name="email" type="email" autocomplete="email" required')}
          ${field('r-phone', L('Telefon', 'Phone'), 'name="phone" type="tel" autocomplete="tel" required placeholder="+48 600 000 000"', L('Na ten numer wyślemy potwierdzenia i przypomnienia o wizytach.', 'We will text booking confirmations and reminders to this number.'))}
          ${field('r-pass', L('Hasło', 'Password'), 'name="password" type="password" autocomplete="new-password" required minlength="8"', L('Co najmniej 8 znaków.', 'At least 8 characters.'))}
          ${field('r-pass2', L('Powtórz hasło', 'Repeat password'), 'name="password2" type="password" autocomplete="new-password" required')}
          <div class="field span-2"><label for="r-bday">${L('Miesiąc urodzin', 'Birthday month')} <span class="opt">(${L('opcjonalnie', 'optional')})</span></label>
            <select id="r-bday" name="birthMonth">${months.map((m, i) => `<option value="${i || ''}">${m || L('Nie podaję', 'Prefer not to say')}</option>`).join('')}</select>
            <span class="field-hint">${L('W miesiącu urodzin dostaniesz 10% zniżki na dowolny zabieg.', 'In your birthday month you get 10% off any treatment.')}</span></div>
        </div>
        <fieldset class="consent-box">
          <legend>${L('Zgody', 'Consents')}</legend>
          <label class="check"><input type="checkbox" name="terms" required><span>${L('Akceptuję <a href="regulamin.html" target="_blank">Regulamin</a> i zapoznałam/em się z <a href="polityka-prywatnosci.html" target="_blank">Polityką prywatności</a>.', 'I accept the <a href="regulamin.html" target="_blank">Terms and conditions</a> and I have read the <a href="polityka-prywatnosci.html" target="_blank">Privacy policy</a>.')} <span class="req" aria-hidden="true">*</span><small>${L('Wymagane, żeby założyć konto.', 'Required to create an account.')}</small></span></label>
          <label class="check"><input type="checkbox" name="marketingSms"><span>${L('Chcę dostawać SMS-y z ofertami i promocjami gabinetu.', 'I would like to receive text messages with the studio’s offers and promotions.')}<small>${L('Opcjonalne. Zgodę możesz wycofać w każdej chwili w profilu.', 'Optional. You can withdraw your consent at any time in your profile.')}</small></span></label>
          <label class="check"><input type="checkbox" name="marketingEmail"><span>${L('Chcę dostawać e-maile z ofertami i promocjami gabinetu.', 'I would like to receive emails with the studio’s offers and promotions.')}<small>${L('Opcjonalne. Zgodę możesz wycofać w każdej chwili w profilu.', 'Optional. You can withdraw your consent at any time in your profile.')}</small></span></label>
        </fieldset>
        <p class="small muted">${L('Zniżka 10% i oferty w profilu przysługują każdej zarejestrowanej klientce, także bez zgód marketingowych.', 'The 10% discount and the offers in your profile are available to every registered client, with or without marketing consents.')}</p>
        <button class="btn btn-primary btn-block" type="submit">${L('Załóż konto', 'Create account')}</button>
      </form>`;
    return `
      <div class="container page-head">
        <p class="crumbs"><a href="index.html">${L('Strona główna', 'Home')}</a> / ${tab === 'register' ? L('Załóż konto', 'Create an account') : L('Zaloguj się', 'Sign in')}</p>
        <h1>${tab === 'register' ? L('Załóż konto', 'Create an account') : L('Zaloguj się', 'Sign in')}</h1>
        ${back ? `<p class="lead">${L('Po zalogowaniu wrócisz do rezerwacji z wybranym terminem.', 'After signing in you will return to your booking with the time you chose.')}</p>` : ''}
      </div>
      <div class="container auth">
        <div class="tabs" role="tablist">
          <button class="tab" role="tab" type="button" data-tab="login" aria-selected="${tab === 'login'}">${L('Logowanie', 'Sign in')}</button>
          <button class="tab" role="tab" type="button" data-tab="register" aria-selected="${tab === 'register'}">${L('Rejestracja', 'Register')}</button>
        </div>
        ${msg ? `<p class="form-msg" role="alert">${esc(msg)}</p>` : ''}
        <div role="tabpanel">${tab === 'register' ? register : login}</div>
      </div>`;
  }

  function visitRow(b, upcoming) {
    const d = new Date(b.date + 'T12:00:00');
    const fee = b.fee ? ` <span class="badge badge-warn">${L('opłata', 'fee')} ${S.formatPrice(b.fee)}${b.feeStatus === 'paid' ? L(' (zapłacona)', ' (paid)') : b.feeStatus === 'waived' ? L(' (anulowana)', ' (waived)') : ''}</span>` : '';
    const status = b.status === 'cancelled' ? `<span class="badge">${L('odwołana', 'cancelled')}</span>${fee}`
      : b.status === 'no_show' ? `<span class="badge">${L('nieobecność', 'missed')}</span>${fee}`
      : b.status === 'done' || !upcoming ? `<span class="badge badge-ok">${L('odbyta', 'completed')}</span>` : '';
    const action = upcoming && b.canCancel ? `<div class="btn-row visit-actions">${b.canMove ? `<button class="btn btn-outline btn-small" type="button" data-move="${b.id}">${L('Zmień termin', 'Change time')}</button>` : ''}<button class="btn btn-outline btn-small" type="button" data-cancel="${b.id}">${L('Odwołaj', 'Cancel')}</button></div>` : '';
    return `
      <li class="visit-row">
        <div class="visit-date"><strong>${d.getDate()} ${JM.monthGen[d.getMonth()]}</strong><span>${L(JM.dayNames[d.getDay()].toLowerCase(), JM.dayNames[d.getDay()])}, ${b.time}</span></div>
        <div>${esc(tName(b))}<div class="muted">${S.formatPrice(b.toPay ?? b.total)}${b.discount ? ` (${L('zniżka', 'discount')} ${b.discount.percent}%)` : ''}${b.voucher ? ` (${L('bon', 'voucher')} −${S.formatPrice(b.voucher.amount)})` : ''} ${status}</div></div>
        <div>${action}</div>
      </li>`;
  }

  function profileView(u) {
    const all = myBookings || [];
    const upcoming = all.filter((b) => b.status === 'confirmed' && b.canCancel);
    const past = all.filter((b) => !upcoming.includes(b)).reverse();
    const firstAvailable = !u.visits;
    const next = upcoming[0];
    const todayIso = S.isoDate(new Date());
    const offers = S.promos().filter((p) => p.active && p.membersOnly && p.to >= todayIso);
    const c = u.consents;
    const when = (x) => new Date(x.at).toLocaleDateString(loc);

    return `
      <div class="container page-head">
        <p class="crumbs"><a href="index.html">${L('Strona główna', 'Home')}</a> / ${L('Moje konto', 'My account')}</p>
        <h1>${L('Dzień dobry', 'Hello')}, ${esc(u.firstName)}</h1>
        <p class="lead">${L('Tu znajdziesz swoje wizyty, zniżki i ustawienia konta.', 'Here you will find your visits, discounts and account settings.')}</p>
        <button class="btn btn-outline btn-small" type="button" data-logout>${L('Wyloguj się', 'Sign out')}</button>
      </div>
      <div class="container profile">
        <div class="profile-grid">
          <div class="card card-ink">
            ${firstAvailable
              ? `<h2>${L('10% zniżki na pierwszy zabieg', '10% off your first treatment')}</h2><p>${L('Zniżka jest aktywna i naliczy się sama przy rezerwacji.', 'The discount is active and will be applied automatically when you book.')}</p><a class="btn btn-gold" href="rezerwacja.html">${L('Zarezerwuj wizytę', 'Book a visit')}</a>`
              : `<h2>${L('Zniżka powitalna wykorzystana', 'Welcome discount used')}</h2><p>${L('Sprawdź oferty dla zarejestrowanych klientek poniżej.', 'See the offers for registered clients below.')}</p><a class="btn btn-gold" href="rezerwacja.html">${L('Zarezerwuj kolejną wizytę', 'Book your next visit')}</a>`}
          </div>
          <div class="card">
            <h2>${L('Najbliższa wizyta', 'Your next visit')}</h2>
            ${next ? `<p style="margin:0">${esc(tName(next))}<br><strong style="font-weight:500">${ui.fmtDate(next.date)}, ${L('godz.', 'at')} ${next.time}</strong></p><p class="small muted" style="margin-top:12px">${JM.salon.street}, ${JM.salon.city}. ${L('Przypomnienie wyślemy SMS-em dzień wcześniej.', 'We will text you a reminder the day before.')}</p>`
              : `<p class="muted">${L('Nie masz zaplanowanych wizyt.', 'You have no upcoming visits.')}</p><a class="btn btn-outline" href="rezerwacja.html">${L('Zarezerwuj wizytę', 'Book a visit')}</a>`}
          </div>
        </div>

        <section class="profile-section" aria-labelledby="up-title">
          <h2 id="up-title">${L('Nadchodzące wizyty', 'Upcoming visits')}</h2>
          ${myBookings === null ? `<p class="muted">${L('Wczytujemy wizyty…', 'Loading your visits…')}</p>` : upcoming.length ? `<ul class="visit-list">${upcoming.map((b) => visitRow(b, true)).join('')}</ul>` : `<div class="empty"><p>${L('Brak zaplanowanych wizyt.', 'No upcoming visits.')}</p><a class="btn btn-primary btn-small" href="rezerwacja.html">${L('Zarezerwuj wizytę', 'Book a visit')}</a></div>`}
          <p class="small muted" style="margin-top:14px">${L(`Wizytę odwołasz bezpłatnie do ${JM.booking.cancelHours} godzin przed terminem. Przy późniejszym odwołaniu albo nieobecności obowiązuje opłata ${JM.booking.lateCancelFeePercent}% ceny zabiegu. Przypomnienie SMS wysyłamy automatycznie ${JM.booking.reminderHours} godziny przed wizytą.`,
            `You can cancel free of charge up to ${JM.booking.cancelHours} hours before the visit. If you cancel later or do not show up, a fee of ${JM.booking.lateCancelFeePercent}% of the treatment price applies. We text you a reminder automatically ${JM.booking.reminderHours} hours before the visit.`)}</p>
        </section>

        <section class="profile-section" aria-labelledby="hist-title">
          <h2 id="hist-title">${L('Historia wizyt', 'Visit history')}</h2>
          ${past.length ? `<ul class="visit-list">${past.map((b) => visitRow(b, false)).join('')}</ul>` : `<div class="empty"><p>${L('Tu pojawią się Twoje odbyte i odwołane wizyty.', 'Your completed and cancelled visits will appear here.')}</p></div>`}
        </section>

        <section class="profile-section" aria-labelledby="off-title">
          <h2 id="off-title">${L('Oferty dla Ciebie', 'Offers for you')}</h2>
          ${offers.length ? `<div class="offer-list">${offers.map((p) => `
            <article class="offer">
              <p class="offer-percent">−${p.percent}%</p>
              <h3>${esc(p.title)}</h3>
              <p>${esc(p.text)}</p>
              <p class="small muted" style="margin:0">${p.birthday ? (u.birthMonth ? L('W ' + ['', 'styczniu', 'lutym', 'marcu', 'kwietniu', 'maju', 'czerwcu', 'lipcu', 'sierpniu', 'wrześniu', 'październiku', 'listopadzie', 'grudniu'][Number(u.birthMonth)], 'In ' + JM.monthNames[Number(u.birthMonth) - 1]) : L('Podaj miesiąc urodzin w danych poniżej, żeby skorzystać.', 'Add your birthday month in your details below to use it.')) : L('Od ', 'From ') + new Date(p.from + 'T12:00').toLocaleDateString(loc) + L(' do ', ' to ') + new Date(p.to + 'T12:00').toLocaleDateString(loc)}</p>
            </article>`).join('')}</div>` : `<div class="empty"><p>${L('Teraz nie ma aktywnych ofert. Damy znać, gdy pojawi się nowa.', 'There are no active offers right now. We will let you know when a new one appears.')}</p></div>`}
          <p class="small muted" style="margin-top:14px">${L('Zniżki się nie sumują. Przy rezerwacji zastosujemy najkorzystniejszą.', 'Discounts do not add up. When you book, we apply the best one.')}</p>
        </section>

        <section class="profile-section" aria-labelledby="data-title">
          <h2 id="data-title">${L('Moje dane', 'My details')}</h2>
          <form id="data-form" class="card" novalidate style="max-width:760px">
            <div class="form-grid">
              ${field('d-first', L('Imię', 'First name'), `name="firstName" required value="${esc(u.firstName)}"`)}
              ${field('d-last', L('Nazwisko', 'Last name'), `name="lastName" required value="${esc(u.lastName)}"`)}
              ${field('d-phone', L('Telefon', 'Phone'), `name="phone" type="tel" required value="${esc(u.phone)}"`)}
              ${field('d-email', 'E-mail', `name="email" type="email" value="${esc(u.email)}" readonly`, L('Aby zmienić adres e-mail, napisz do nas.', 'To change your email address, write to us.'))}
              <div class="field span-2"><label for="d-bday">${L('Miesiąc urodzin', 'Birthday month')} <span class="opt">(${L('opcjonalnie', 'optional')})</span></label>
                <select id="d-bday" name="birthMonth">${months.map((m, i) => `<option value="${i || ''}" ${String(u.birthMonth) === String(i || '') ? 'selected' : ''}>${m || L('Nie podaję', 'Prefer not to say')}</option>`).join('')}</select></div>
            </div>
            <button class="btn btn-primary" type="submit">${L('Zapisz zmiany', 'Save changes')}</button>
          </form>
        </section>

        <section class="profile-section" aria-labelledby="cons-title" style="max-width:760px">
          <h2 id="cons-title">${L('Zgody', 'Consents')}</h2>
          <div class="switch-row" style="cursor:default"><div><strong style="font-weight:500">${L('Regulamin i polityka prywatności', 'Terms and privacy policy')}</strong><p>${L('Zaakceptowane', 'Accepted on')} ${when(c.terms)}. ${L('Wymagane do korzystania z konta.', 'Required to use the account.')}</p></div><span class="badge badge-ok">${L('aktywna', 'active')}</span></div>
          <label class="switch-row"><div><strong style="font-weight:500">${L('Oferty SMS', 'SMS offers')}</strong><p>${L('Ostatnia zmiana', 'Last changed')} ${when(c.marketingSms)}.</p></div><input type="checkbox" class="switch" data-consent="marketingSms" ${c.marketingSms.value ? 'checked' : ''}></label>
          <label class="switch-row"><div><strong style="font-weight:500">${L('Oferty e-mail', 'Email offers')}</strong><p>${L('Ostatnia zmiana', 'Last changed')} ${when(c.marketingEmail)}.</p></div><input type="checkbox" class="switch" data-consent="marketingEmail" ${c.marketingEmail.value ? 'checked' : ''}></label>
          <p class="small muted" style="margin-top:12px">${L('Potwierdzenia i przypomnienia o wizytach wysyłamy zawsze. To część usługi, a nie marketing.', 'We always send booking confirmations and reminders. They are part of the service, not marketing.')}</p>
          <details class="consent-log"><summary>${L('Historia zmian zgód', 'Consent history')}</summary>
            <ul>${u.consentLog.slice().reverse().map((l) => `<li>${new Date(l.at).toLocaleString(loc)}: ${esc(logText(l.change))}</li>`).join('')}</ul>
          </details>
        </section>

        <section class="profile-section danger-zone" aria-labelledby="del-title" style="max-width:760px">
          <h2 id="del-title">${L('Usuń konto', 'Delete account')}</h2>
          <p>${L('Usuniemy Twoje dane logowania, zgody i dane kontaktowe z konta. Odbyte wizyty zostaną w dokumentacji gabinetu bez powiązania z kontem, tak długo, jak wymagają tego przepisy.', 'We will delete your login details, consents and contact details from the account. Completed visits stay in the studio’s records, no longer linked to the account, for as long as the law requires.')}</p>
          <button class="btn btn-danger" type="button" data-delete>${L('Usuń konto', 'Delete account')}</button>
        </section>
      </div>`;
  }

  function resetView() {
    return `
      <div class="container page-head">
        <p class="crumbs"><a href="index.html">${L('Strona główna', 'Home')}</a> / ${L('Nowe hasło', 'New password')}</p>
        <h1>${L('Ustaw nowe hasło', 'Set a new password')}</h1>
      </div>
      <div class="container auth">
        ${msg ? `<p class="form-msg" role="alert">${esc(msg)}</p>` : ''}
        <form id="reset-form" novalidate>
          ${field('n-pass', L('Nowe hasło', 'New password'), 'name="password" type="password" autocomplete="new-password" required minlength="8"', L('Co najmniej 8 znaków.', 'At least 8 characters.'))}
          ${field('n-pass2', L('Powtórz hasło', 'Repeat password'), 'name="password2" type="password" autocomplete="new-password" required')}
          <button class="btn btn-primary btn-block" type="submit">${L('Zapisz hasło i zaloguj się', 'Save password and sign in')}</button>
        </form>
      </div>`;
  }
  function render() {
    const u = S.currentUser();
    if (resetToken && !u) { root.innerHTML = resetView(); return; }
    root.innerHTML = u ? profileView(u) : authView();
    if (u && myBookings === null) loadBookings();
  }
  async function loadBookings() {
    try { myBookings = await S.myBookings(); } catch (e) { myBookings = []; ui.toast(e.message); }
    if (S.currentUser()) root.innerHTML = profileView(S.currentUser());
  }
  const setNavName = (text) => document.querySelectorAll('.nav-account span').forEach((s) => (s.textContent = text));

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
    msg = ''; myBookings = null; history.replaceState(null, '', 'konto.html'); render(); window.scrollTo(0, 0); ui.toast(text);
    setNavName(S.currentUser().firstName);
  }

  root.addEventListener('click', async (e) => {
    const el = e.target.closest('button'); if (!el) return;
    if (el.dataset.tab) { tab = el.dataset.tab; msg = ''; history.replaceState(null, '', (back ? '?powrot=rezerwacja' : 'konto.html') + (tab === 'register' ? '#rejestracja' : '')); render(); return; }
    if (el.hasAttribute('data-logout')) { await S.logout(); myBookings = null; render(); ui.toast(L('Wylogowano.', 'Signed out.')); setNavName(L('Zaloguj się', 'Sign in')); return; }
    if (el.hasAttribute('data-reset')) {
      const dlg = ui.h(`<dialog class="modal"><form method="dialog" class="modal-body"><h2>${L('Reset hasła', 'Reset password')}</h2><p>${L('Podaj adres e-mail konta. Wyślemy link do ustawienia nowego hasła.', 'Enter the email address of your account. We will send you a link to set a new password.')}</p>
        <div class="field"><label for="rs-email">E-mail</label><input id="rs-email" type="email" autocomplete="email" required value="${esc((root.querySelector('#l-email') || {}).value || '')}"></div>
        <div class="modal-actions"><button class="btn btn-primary" value="ok">${L('Wyślij link', 'Send link')}</button><button class="btn btn-outline" value="cancel" formnovalidate>${L('Anuluj', 'Cancel')}</button></div></form></dialog>`);
      document.body.appendChild(dlg); dlg.showModal();
      dlg.addEventListener('close', async () => {
        const email = dlg.querySelector('#rs-email').value.trim(); dlg.remove();
        if (dlg.returnValue !== 'ok' || !email) return;
        try { await S.forgotPassword(email); ui.toast(L('Jeśli konto istnieje, wysłaliśmy link na podany adres. Sprawdź też folder spam.', 'If the account exists, we have sent a link to that address. Check your spam folder too.')); } catch (err) { ui.toast(err.message); }
      });
      return;
    }
    if (el.dataset.move) {
      const b = (myBookings || []).find((x) => String(x.id) === el.dataset.move); if (!b) return;
      JM.moveDialog(b, async (date, time) => {
        const nb = await S.moveMyBooking(b.id, date, time);
        myBookings = myBookings.map((x) => (x.id === nb.id ? nb : x)).sort((a, z) => (a.date + a.time).localeCompare(z.date + z.time)); render();
        return nb;
      });
      return;
    }
    if (el.dataset.cancel) {
      const b = (myBookings || []).find((x) => String(x.id) === el.dataset.cancel); if (!b) return;
      const warn = b.lateCancel ? `<p class="form-msg" style="margin-top:12px">${L(`Do wizyty zostało mniej niż ${JM.booking.cancelHours} godzin. Zgodnie z regulaminem odwołanie oznacza opłatę ${JM.booking.lateCancelFeePercent}% ceny zabiegu:`, `Your visit is less than ${JM.booking.cancelHours} hours away. Under our terms, cancelling now means a fee of ${JM.booking.lateCancelFeePercent}% of the treatment price:`)} <strong>${S.formatPrice(b.lateFee)}</strong>.</p>` : `<p class="small muted">${L('Odwołanie jest bezpłatne.', 'Cancelling is free of charge.')}</p>`;
      const dlg = ui.h(`<dialog class="modal"><form method="dialog" class="modal-body"><h2>${L('Odwołać wizytę?', 'Cancel this visit?')}</h2><p>${esc(tName(b))}, ${ui.fmtDate(b.date)}, ${L('godz.', 'at')} ${b.time}. ${L('Termin wróci do kalendarza dla innych klientek.', 'The time will become available to other clients.')}</p>${warn}
        <div class="modal-actions"><button class="btn btn-primary" value="ok">${L('Odwołaj wizytę', 'Cancel visit')}</button><button class="btn btn-outline" value="cancel">${L('Zostaw wizytę', 'Keep visit')}</button></div></form></dialog>`);
      document.body.appendChild(dlg); dlg.showModal();
      dlg.addEventListener('close', async () => {
        dlg.remove(); if (dlg.returnValue !== 'ok') return;
        try {
          const c = await S.cancelMyBooking(b.id);
          myBookings = myBookings.map((x) => (x.id === c.id ? c : x)); render();
          ui.toast(c.fee ? L(`Wizyta odwołana. Opłata za późne odwołanie: ${S.formatPrice(c.fee)}.`, `Visit cancelled. Late cancellation fee: ${S.formatPrice(c.fee)}.`) : L('Wizyta odwołana. Wysłaliśmy potwierdzenie SMS-em.', 'Visit cancelled. We have texted you a confirmation.'));
        } catch (err) { ui.toast(err.message); myBookings = null; render(); }
      });
      return;
    }
    if (el.hasAttribute('data-delete')) {
      const dlg = ui.h(`<dialog class="modal"><form method="dialog" class="modal-body"><h2>${L('Usunąć konto?', 'Delete your account?')}</h2><p>${L('Tej operacji nie można cofnąć. Zaplanowane wizyty pozostaną w kalendarzu; jeśli chcesz je odwołać, zrób to przed usunięciem konta.', 'This cannot be undone. Upcoming visits stay in the calendar; if you want to cancel them, do it before deleting your account.')}</p>
        <div class="modal-actions"><button class="btn btn-danger" value="ok">${L('Usuń konto', 'Delete account')}</button><button class="btn btn-outline" value="cancel">${L('Anuluj', 'Cancel')}</button></div></form></dialog>`);
      document.body.appendChild(dlg); dlg.showModal();
      dlg.addEventListener('close', async () => {
        dlg.remove(); if (dlg.returnValue !== 'ok') return;
        try { await S.deleteUser(); location.href = 'index.html'; } catch (err) { ui.toast(err.message); }
      });
    }
  });

  root.addEventListener('change', async (e) => {
    const k = e.target.dataset.consent; if (!k) return;
    const value = e.target.checked; e.target.disabled = true;
    try {
      await S.setConsent(k, value);
      ui.toast(value ? L('Zgoda zapisana.', 'Consent saved.') : L('Zgoda wycofana. Nie będziemy wysyłać ofert tym kanałem.', 'Consent withdrawn. We will not send offers this way.'));
    } catch (err) { ui.toast(err.message); }
    render();
  });
  const showServerError = (f, err) => {
    if (err.field && f.elements[err.field]) { setError(f, err.field, esc(err.message)); f.elements[err.field].focus(); } else { msg = err.message; render(); }
  };

  root.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; clearErrors(f); msg = '';
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : '');
    if (f.id === 'login-form') {
      let bad = false;
      if (!emailRe.test(v('email'))) { setError(f, 'email', L('Wpisz adres e-mail, np. anna@example.com.', 'Enter an email address, e.g. anna@example.com.')); bad = true; }
      if (!f.elements.password.value) { setError(f, 'password', L('Wpisz hasło.', 'Enter your password.')); bad = true; }
      if (bad) return f.querySelector('[aria-invalid]').focus();
      try { await S.login(v('email'), f.elements.password.value); afterAuth(L('Zalogowano.', 'Signed in.')); }
      catch (err) { msg = err.message; render(); }
    }
    if (f.id === 'reset-form') {
      if (f.elements.password.value.length < 8) { setError(f, 'password', L('Hasło musi mieć co najmniej 8 znaków.', 'Your password must be at least 8 characters long.')); return; }
      if (f.elements.password2.value !== f.elements.password.value) { setError(f, 'password2', L('Hasła się różnią.', 'The passwords do not match.')); return; }
      try { await S.resetPassword(resetToken, f.elements.password.value); afterAuth(L('Hasło zmienione. Jesteś zalogowana.', 'Password changed. You are signed in.')); }
      catch (err) { msg = err.message; render(); }
    }
    if (f.id === 'register-form') {
      const checks = [
        ['firstName', !v('firstName'), L('Wpisz imię.', 'Enter your first name.')],
        ['lastName', !v('lastName'), L('Wpisz nazwisko.', 'Enter your last name.')],
        ['email', !emailRe.test(v('email')), L('Wpisz adres e-mail, np. anna@example.com.', 'Enter an email address, e.g. anna@example.com.')],
        ['phone', !phoneRe.test(v('phone')), L('Wpisz numer telefonu, np. +48 600 000 000.', 'Enter a phone number, e.g. +48 600 000 000.')],
        ['password', f.elements.password.value.length < 8, L('Hasło musi mieć co najmniej 8 znaków.', 'Your password must be at least 8 characters long.')],
        ['password2', f.elements.password2.value !== f.elements.password.value, L('Hasła się różnią.', 'The passwords do not match.')],
        ['terms', !f.elements.terms.checked, L('Zaakceptuj regulamin, żeby założyć konto.', 'Accept the terms to create an account.')]
      ];
      let first = null;
      checks.forEach(([n, bad, t]) => { if (bad) { setError(f, n, t); first = first || f.elements[n]; } });
      if (first) return first.focus();
      try {
        await S.register({
          firstName: v('firstName'), lastName: v('lastName'), email: v('email'), phone: v('phone'),
          password: f.elements.password.value, birthMonth: v('birthMonth'),
          marketingSms: f.elements.marketingSms.checked, marketingEmail: f.elements.marketingEmail.checked, terms: f.elements.terms.checked
        });
        afterAuth(L('Konto założone. Zniżka 10% czeka na pierwszy zabieg.', 'Account created. Your 10% discount is waiting for your first treatment.'));
      } catch (err) { showServerError(f, err); }
    }
    if (f.id === 'data-form') {
      if (!v('firstName')) { setError(f, 'firstName', L('Wpisz imię.', 'Enter your first name.')); return; }
      if (!phoneRe.test(v('phone'))) { setError(f, 'phone', L('Wpisz numer telefonu, np. +48 600 000 000.', 'Enter a phone number, e.g. +48 600 000 000.')); return; }
      try {
        await S.updateUser({ firstName: v('firstName'), lastName: v('lastName'), phone: v('phone'), birthMonth: v('birthMonth') });
        render(); ui.toast(L('Zapisano zmiany.', 'Changes saved.')); setNavName(S.currentUser().firstName);
      } catch (err) { showServerError(f, err); }
    }
  });

  render();
});
