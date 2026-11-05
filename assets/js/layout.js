/*
 * Wspólne elementy wszystkich podstron: nagłówek, stopka, menu mobilne,
 * baner cookies, komunikaty.
 */
(function () {
  const S = JM.store;
  const salon = JM.salon;

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
    { href: 'zabiegi.html', label: 'Zabiegi', page: 'zabiegi' },
    { href: 'cennik.html', label: 'Cennik', page: 'cennik' },
    { href: 'rezerwacja.html', label: 'Zarezerwuj wizytę', page: 'rezerwacja' },
    { href: 'galeria.html', label: 'Galeria', page: 'galeria' },
    { href: 'kontakt.html', label: 'Kontakt', page: 'kontakt' }
  ];

  function h(html) {
    const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtDate(dateStr, withYear) {
    const d = new Date(dateStr + 'T12:00:00');
    return JM.dayNames[d.getDay()].toLowerCase() + ', ' + d.getDate() + ' ' + JM.monthGen[d.getMonth()] + (withYear === false ? '' : ' ' + d.getFullYear());
  }
  function fmtShort(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return S.pad(d.getDate()) + '.' + S.pad(d.getMonth() + 1);
  }
  function hoursText() {
    const groups = [
      ['Poniedziałek, wtorek, czwartek', JM.hours[1]],
      ['Środa', JM.hours[3]],
      ['Piątek', JM.hours[5]],
      ['Sobota', JM.hours[6]],
      ['Niedziela', null]
    ];
    return groups.map(([d, hr]) => ({ day: d, hours: hr ? hr[0] + ':00–' + hr[1] + ':00' : 'nieczynne' }));
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
      : `<a class="nav-account" href="konto.html"${page === 'konto' ? ' aria-current="page"' : ''}>${icons.user}<span>Zaloguj się</span></a>`;
    return h(`
      <header class="site-header">
        <a class="skip-link" href="#main">Przejdź do treści</a>
        <div class="container header-inner">
          <a class="brand" href="index.html" aria-label="${salon.brand}, strona główna">
            <img src="assets/img/logo-mark.png" alt="" width="58" height="44">
            <span class="brand-text"><span class="brand-name">${salon.brand}</span><span class="brand-sub">${salon.tagline}</span></span>
          </a>
          <nav class="main-nav" aria-label="Menu główne"><ul>${items}</ul></nav>
          ${account}
          <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu">
            <span class="menu-toggle-bars" aria-hidden="true"></span><span class="sr-only">Menu</span>
          </button>
        </div>
        <div class="mobile-menu" id="mobile-menu" hidden>
          <ul>${items}<li><a href="konto.html">${user ? 'Moje konto' : 'Zaloguj się / Załóż konto'}</a></li></ul>
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
            <img src="assets/img/logo-gold.png" alt="${salon.brand} ${salon.tagline}" width="170" height="141">
            <p>Gabinet kosmetologii estetycznej w Krakowie.</p>
          </div>
          <div>
            <h2 class="footer-title">Kontakt</h2>
            <ul class="footer-list">
              <li>${salon.street}<br>${salon.postal} ${salon.city}</li>
              <li><a href="tel:${salon.phoneHref}">${salon.phone}</a></li>
              <li><a href="mailto:${salon.email}">${salon.email}</a></li>
              <li><a href="${salon.instagram.url}" target="_blank" rel="noopener">Instagram</a></li>
              <li><a href="${salon.facebook.url}" target="_blank" rel="noopener">Facebook</a></li>
            </ul>
          </div>
          <div>
            <h2 class="footer-title">Godziny otwarcia</h2>
            <ul class="footer-hours">${hrs}</ul>
          </div>
          <div>
            <h2 class="footer-title">Informacje</h2>
            <ul class="footer-list">
              <li><a href="regulamin.html">Regulamin</a></li>
              <li><a href="polityka-prywatnosci.html">Polityka prywatności</a></li>
              <li><a href="polityka-cookies.html">Polityka cookies</a></li>
              <li><button type="button" class="link-button" data-cookie-settings>Ustawienia cookies</button></li>
              <li><a href="panel.html">Panel gabinetu</a></li>
            </ul>
          </div>
        </div>
        <div class="container footer-bottom">
          <p>© ${new Date().getFullYear()} ${salon.company}, NIP ${salon.nip}</p>
          <p>Wersja demonstracyjna strony</p>
        </div>
      </footer>`);
  }

  function mobileCta(page) {
    if (['rezerwacja', 'panel'].includes(page)) return null;
    return h('<div class="mobile-cta"><a class="btn btn-primary btn-block" href="rezerwacja.html">Zarezerwuj wizytę</a></div>');
  }

  /* ---------- Cookies ---------- */
  function cookieBanner() {
    if (S.cookieConsent()) return;
    const el = h(`
      <section class="cookie-banner" role="dialog" aria-labelledby="cookie-title" aria-live="polite">
        <h2 id="cookie-title">Pliki cookies</h2>
        <p>Używamy plików cookies niezbędnych do działania strony, logowania i rezerwacji. Za Twoją zgodą wczytamy też mapę Google na stronie kontaktu. Szczegóły znajdziesz w <a href="polityka-cookies.html">polityce cookies</a>.</p>
        <div class="cookie-actions">
          <button class="btn btn-primary" type="button" data-cookie="all">Akceptuję wszystkie</button>
          <button class="btn btn-outline" type="button" data-cookie="necessary">Tylko niezbędne</button>
          <button class="link-button" type="button" data-cookie-settings>Ustawienia</button>
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
          <h2 id="cs-title">Ustawienia cookies</h2>
          <div class="switch-row">
            <div><strong>Niezbędne</strong><p>Logowanie, koszyk rezerwacji, zapamiętanie tych ustawień. Bez nich strona nie działa.</p></div>
            <span class="badge">Zawsze aktywne</span>
          </div>
          <label class="switch-row">
            <div><strong>Mapy Google</strong><p>Interaktywna mapa na stronie kontaktu. Google może zapisać własne cookies i poznać Twój adres IP.</p></div>
            <input type="checkbox" class="switch" name="maps" ${c.maps ? 'checked' : ''}>
          </label>
          <div class="modal-actions">
            <button class="btn btn-primary" value="save">Zapisz ustawienia</button>
            <button class="btn btn-outline" value="cancel" formnovalidate>Anuluj</button>
          </div>
        </form>
      </dialog>`);
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => {
      if (dlg.returnValue === 'save') {
        S.setCookieConsent({ necessary: true, maps: dlg.querySelector('[name=maps]').checked });
        const banner = document.querySelector('.cookie-banner'); if (banner) banner.remove();
        document.dispatchEvent(new CustomEvent('jm:cookies'));
        toast('Zapisano ustawienia cookies.');
      }
      dlg.remove();
    });
    dlg.showModal();
  }

  function init() {
    const page = document.body.dataset.page || '';
    S.seedDemo();
    if (page !== 'panel') {
      document.body.prepend(header(page));
      document.body.appendChild(footer());
      const cta = mobileCta(page); if (cta) { document.body.appendChild(cta); document.body.classList.add('has-mobile-cta'); }
    }
    cookieBanner();

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
    });
    document.querySelectorAll('[data-fill]').forEach((el) => {
      const v = salon[el.dataset.fill]; if (v != null) el.textContent = v;
    });
  }

  JM.ui = { h, esc, icons, toast, fmtDate, fmtShort, hoursText, cookieSettings };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
