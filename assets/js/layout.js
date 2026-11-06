/*
 * Wspólne elementy wszystkich podstron: nagłówek, stopka, menu mobilne,
 * baner cookies, komunikaty.
 */
(function () {
  const S = JM.store;
  const salon = JM.salon;
  const L = JM.L;

  const icons = {
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 7 9 6 9-6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    arrowL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
    arrowR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };

  const nav = [
    { href: 'zabiegi.html', label: L('Zabiegi', 'Treatments'), page: 'zabiegi' },
    { href: 'cennik.html', label: L('Cennik', 'Prices'), page: 'cennik' },
    { href: 'rezerwacja.html', label: L('Zarezerwuj wizytę', 'Book a visit'), page: 'rezerwacja' },
    { href: 'galeria.html', label: L('Galeria', 'Gallery'), page: 'galeria' },
    { href: 'kontakt.html', label: L('Kontakt', 'Contact'), page: 'kontakt' }
  ];

  function h(html) {
    const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtDate(dateStr, withYear) {
    const d = new Date(dateStr + 'T12:00:00');
    const day = JM.lang === 'en' ? JM.dayNames[d.getDay()] : JM.dayNames[d.getDay()].toLowerCase();
    return day + ', ' + d.getDate() + ' ' + JM.monthGen[d.getMonth()] + (withYear === false ? '' : ' ' + d.getFullYear());
  }
  function fmtShort(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return S.pad(d.getDate()) + '.' + S.pad(d.getMonth() + 1);
  }
  function hoursText() {
    const groups = [
      [L('Poniedziałek, wtorek, czwartek', 'Monday, Tuesday, Thursday'), JM.hours[1]],
      [L('Środa', 'Wednesday'), JM.hours[3]],
      [L('Piątek', 'Friday'), JM.hours[5]],
      [L('Sobota', 'Saturday'), JM.hours[6]],
      [L('Niedziela', 'Sunday'), null]
    ];
    return groups.map(([d, hr]) => ({ day: d, hours: hr ? hr[0] + ':00–' + hr[1] + ':00' : L('nieczynne', 'closed') }));
  }

  let toastTimer;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = h('<div class="toast" role="status" aria-live="polite"></div>'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('is-visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-visible'), 4200);
  }

  function header(page) {
    const user = S.currentUser();
    const items = nav.map((n) => `<li><a href="${n.href}"${n.page === page ? ' aria-current="page"' : ''}>${n.label}</a></li>`).join('');
    const account = user
      ? `<a class="nav-account" href="konto.html"${page === 'konto' ? ' aria-current="page"' : ''}>${icons.user}<span>${esc(user.firstName)}</span></a>`
      : `<a class="nav-account" href="konto.html"${page === 'konto' ? ' aria-current="page"' : ''}>${icons.user}<span>${L('Zaloguj się', 'Sign in')}</span></a>`;
    const langs = [['pl', 'PL', 'Polski'], ['en', 'EN', 'English']]
      .map(([code, short, full]) => `<button type="button" data-lang-set="${code}" lang="${code}" aria-label="${full}"${JM.lang === code ? ' aria-pressed="true"' : ' aria-pressed="false"'}>${short}</button>`)
      .join('<span aria-hidden="true">/</span>');
    return h(`
      <header class="site-header">
        <a class="skip-link" href="#main">${L('Przejdź do treści', 'Skip to content')}</a>
        <div class="container header-inner">
          <a class="brand" href="index.html" aria-label="${salon.brand}, ${L('strona główna', 'home page')}">
            <img src="assets/img/logo-mark.webp" alt="" width="58" height="44">
            <span class="brand-text"><span class="brand-name">${salon.brand}</span><span class="brand-sub">${salon.tagline}</span></span>
          </a>
          <nav class="main-nav" aria-label="${L('Menu główne', 'Main menu')}"><ul>${items}</ul></nav>
          ${account}
          <div class="lang-switch" role="group" aria-label="${L('Język strony', 'Site language')}">${langs}</div>
          <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu">
            <span class="menu-toggle-bars" aria-hidden="true"></span><span class="sr-only">Menu</span>
          </button>
        </div>
        <div class="mobile-menu" id="mobile-menu" hidden>
          <ul>${items}<li><a href="konto.html">${user ? L('Moje konto', 'My account') : L('Zaloguj się / Załóż konto', 'Sign in / Create account')}</a></li></ul>
          <p class="mobile-menu-contact"><a href="tel:${salon.phoneHref}">${salon.phone}</a><br>${salon.street}, ${salon.city}</p>
        </div>
      </header>`);
  }

  function footer() {
    const hrs = hoursText().map((r) => `<li><span>${r.day}</span><span>${r.hours}</span></li>`).join('');
    return h(`
      <footer class="site-footer">
        <div class="container footer-grid">
          <div class="footer-brand">
            <img src="assets/img/logo-gold.webp" alt="${salon.brand} ${salon.tagline}" width="170" height="141">
            <p>${L('Gabinet kosmetologii estetycznej w Krakowie.', 'Aesthetic cosmetology studio in Kraków.')}</p>
          </div>
          <div>
            <h2 class="footer-title">${L('Kontakt', 'Contact')}</h2>
            <ul class="footer-list">
              <li>${salon.street}<br>${salon.postal} ${salon.city}</li>
              <li><a href="tel:${salon.phoneHref}">${salon.phone}</a></li>
              <li><a href="mailto:${salon.email}">${salon.email}</a></li>
              <li><a href="${salon.instagram.url}" target="_blank" rel="noopener">Instagram</a></li>
              <li><a href="${salon.facebook.url}" target="_blank" rel="noopener">Facebook</a></li>
            </ul>
          </div>
          <div>
            <h2 class="footer-title">${L('Godziny otwarcia', 'Opening hours')}</h2>
            <ul class="footer-hours">${hrs}</ul>
          </div>
          <div>
            <h2 class="footer-title">${L('Informacje', 'Information')}</h2>
            <ul class="footer-list">
              <li><a href="regulamin.html">${L('Regulamin', 'Terms and conditions')}</a></li>
              <li><a href="polityka-prywatnosci.html">${L('Polityka prywatności', 'Privacy policy')}</a></li>
              <li><a href="polityka-cookies.html">${L('Polityka cookies', 'Cookie policy')}</a></li>
              <li><button type="button" class="link-button" data-cookie-settings>${L('Ustawienia cookies', 'Cookie settings')}</button></li>
              <li><a href="panel.html">${L('Panel gabinetu', 'Studio panel')}</a></li>
            </ul>
          </div>
        </div>
        <div class="container footer-bottom">
          <p>© ${new Date().getFullYear()} ${salon.company}, NIP ${salon.nip}</p>
          ${salon.demoNotice !== false ? `<p>${L('Wersja demonstracyjna strony', 'Demo version of the website')}</p>` : ''}
        </div>
      </footer>`);
  }

  function mobileCta(page) {
    if (['rezerwacja', 'panel'].includes(page)) return null;
    return h('<div class="mobile-cta"><a class="btn btn-primary btn-block" href="rezerwacja.html">' + L('Zarezerwuj wizytę', 'Book a visit') + '</a></div>');
  }

  /* ---------- Cookies ---------- */
  function cookieBanner() {
    if (S.cookieConsent()) return;
    const el = h(`
      <section class="cookie-banner" role="dialog" aria-labelledby="cookie-title" aria-live="polite">
        <h2 id="cookie-title">${L('Pliki cookies', 'Cookies')}</h2>
        <p>${L('Używamy plików cookies niezbędnych do działania strony, logowania i rezerwacji. Za Twoją zgodą wczytamy też mapę Google na stronie kontaktu. Szczegóły znajdziesz w <a href="polityka-cookies.html">polityce cookies</a>.',
          'We use cookies that are needed for the site, signing in and booking to work. With your consent we will also load a Google map on the contact page. You can find the details in our <a href="polityka-cookies.html">cookie policy</a>.')}</p>
        <div class="cookie-actions">
          <button class="btn btn-primary" type="button" data-cookie="all">${L('Akceptuję wszystkie', 'Accept all')}</button>
          <button class="btn btn-outline" type="button" data-cookie="necessary">${L('Tylko niezbędne', 'Necessary only')}</button>
          <button class="link-button" type="button" data-cookie-settings>${L('Ustawienia', 'Settings')}</button>
        </div>
      </section>`);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cookie]'); if (!b) return;
      S.setCookieConsent({ necessary: true, maps: b.dataset.cookie === 'all' });
      el.remove(); document.dispatchEvent(new CustomEvent('jm:cookies'));
    });
    document.body.appendChild(el);
  }
  function cookieSettings() {
    const c = S.cookieConsent() || { maps: false };
    const dlg = h(`
      <dialog class="modal" aria-labelledby="cs-title">
        <form method="dialog" class="modal-body">
          <h2 id="cs-title">${L('Ustawienia cookies', 'Cookie settings')}</h2>
          <div class="switch-row">
            <div><strong>${L('Niezbędne', 'Necessary')}</strong><p>${L('Logowanie, koszyk rezerwacji, zapamiętanie tych ustawień. Bez nich strona nie działa.', 'Signing in, your booking in progress, remembering these settings and your language. The site does not work without them.')}</p></div>
            <span class="badge">${L('Zawsze aktywne', 'Always on')}</span>
          </div>
          <label class="switch-row">
            <div><strong>${L('Mapy Google', 'Google Maps')}</strong><p>${L('Interaktywna mapa na stronie kontaktu. Google może zapisać własne cookies i poznać Twój adres IP.', 'An interactive map on the contact page. Google may set its own cookies and see your IP address.')}</p></div>
            <input type="checkbox" class="switch" name="maps" ${c.maps ? 'checked' : ''}>
          </label>
          <div class="modal-actions">
            <button class="btn btn-primary" value="save">${L('Zapisz ustawienia', 'Save settings')}</button>
            <button class="btn btn-outline" value="cancel" formnovalidate>${L('Anuluj', 'Cancel')}</button>
          </div>
        </form>
      </dialog>`);
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => {
      if (dlg.returnValue === 'save') {
        S.setCookieConsent({ necessary: true, maps: dlg.querySelector('[name=maps]').checked });
        const banner = document.querySelector('.cookie-banner'); if (banner) banner.remove();
        document.dispatchEvent(new CustomEvent('jm:cookies'));
        toast(L('Zapisano ustawienia cookies.', 'Cookie settings saved.'));
      }
      dlg.remove();
    });
    dlg.showModal();
  }

  function init() {
    const page = document.body.dataset.page || '';
    if (page !== 'panel') {
      document.body.prepend(header(page));
      document.body.appendChild(footer());
      const cta = mobileCta(page); if (cta) { document.body.appendChild(cta); document.body.classList.add('has-mobile-cta'); }
    }
    if (page !== 'panel') cookieBanner(); // panel używa tylko niezbędnych ciasteczek

    const toggle = document.querySelector('.menu-toggle');
    if (toggle) {
      const menu = document.getElementById('mobile-menu');
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open)); menu.hidden = open;
        document.body.classList.toggle('menu-open', !open);
      });
    }
    const hdr = document.querySelector('.site-header');
    if (hdr) {
      const onScroll = () => hdr.classList.toggle('is-scrolled', window.scrollY > 8);
      onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    }
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-cookie-settings]')) { e.preventDefault(); cookieSettings(); }
      const lb = e.target.closest('[data-lang-set]');
      if (lb && lb.dataset.langSet !== JM.lang) JM.setLang(lb.dataset.langSet);
    });
    if (JM.lang === 'en') {
      const t = document.querySelector('meta[name="title-en"]');
      if (t) document.title = t.content;
    }
    document.querySelectorAll('[data-fill]').forEach((el) => {
      const v = salon[el.dataset.fill]; if (v != null) el.textContent = v;
    });
    if (S.offline) {
      const main = document.getElementById('main') || document.body;
      main.prepend(h(`<div class="offline-note" role="alert">${L('Nie udało się połączyć z serwerem, więc logowanie i rezerwacja chwilowo nie działają. Odśwież stronę albo zadzwoń: ', 'We could not connect to the server, so signing in and booking are not available right now. Refresh the page or call us: ')}<a href="tel:${salon.phoneHref}">${salon.phone}</a></div>`));
    }
  }

  JM.ui = { h, esc, icons, toast, fmtDate, fmtShort, hoursText, cookieSettings };
  // nagłówek i stopka pojawiają się po wczytaniu danych z serwera (zalogowana klientka, ceny)
  JM.ready.then(init);
})();
