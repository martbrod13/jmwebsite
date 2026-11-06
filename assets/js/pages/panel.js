/*
 * Panel gabinetu: wizyty, klientki, ceny, promocje, SMS-y i e-maile, dni wolne.
 * Dane z serwera; dostęp tylko po zalogowaniu kontem z config.js (JM.panelAccounts).
 */
JM.ready.then(function () {
  const S = JM.store, ui = JM.ui, esc = ui.esc;
  const root = document.getElementById('admin');
  const api = S.api;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  let admin = null, mode = { sms: 'test', email: 'test' };
  let view = 'pulpit', query = '', campaignChannel = 'sms';
  let data = {};

  /* ---------- Na żywo: odświeżanie po rezerwacjach klientek ---------- */
  const LIVE_VIEWS = ['pulpit', 'kalendarz', 'wizyty', 'oczekujace', 'statystyki'];
  const baseTitle = document.title;
  let es = null, pendingRefresh = false, unseen = 0, highlightId = null;
  const canNotify = () => 'Notification' in window && Notification.permission === 'granted';
  function startLive() {
    if (es || !window.EventSource) return;
    es = new EventSource('/api/admin/events');
    es.addEventListener('change', (e) => {
      let d; try { d = JSON.parse(e.data); } catch (err) { return; }
      if (d.by === 'client') {
        const what = { booked: 'Nowa rezerwacja online', moved: 'Klientka zmieniła termin', cancelled: 'Klientka odwołała wizytę' }[d.type];
        if (what) {
          const text = `${d.client}, ${d.treatment}, ${ui.fmtDate(d.date)}, ${d.time}`;
          ui.toast(`${what}: ${text}`);
          if (d.type !== 'cancelled') highlightId = d.id;
          if (document.hidden) {
            unseen++; document.title = `(${unseen}) ${baseTitle}`;
            if (canNotify()) { try { new Notification(what, { body: text, icon: '/assets/img/logo-mark.webp', tag: 'jm-' + d.id }); } catch (err) { /* przeglądarka bez powiadomień */ } }
          }
        }
      }
      if (!LIVE_VIEWS.includes(view)) return;
      if (document.querySelector('dialog[open]')) pendingRefresh = true; else rerender();
    });
    es.onerror = () => { if (!admin) stopLive(); };
  }
  function stopLive() { if (es) { es.close(); es = null; } }
  function afterDialog() { setTimeout(() => { if (pendingRefresh && !document.querySelector('dialog[open]')) { pendingRefresh = false; rerender(); } }, 50); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { unseen = 0; document.title = baseTitle; } });

  const views = [
    ['pulpit', 'Pulpit'], ['kalendarz', 'Kalendarz'], ['wizyty', 'Wizyty'], ['oczekujace', 'Lista oczekujących'], ['klientki', 'Klientki'], ['statystyki', 'Statystyki'], ['zabiegi', 'Zabiegi i ceny'],
    ['promocje', 'Promocje'], ['bony', 'Bony podarunkowe'], ['galeria', 'Galeria'], ['wiadomosci', 'SMS-y i e-maile'], ['godziny', 'Godziny pracy'], ['konto', 'Moje konto']
  ];
  const money = (v) => S.formatPrice(v);
  const dt = (iso) => { const d = new Date(iso); return d.toLocaleDateString('pl-PL') + ', ' + S.pad(d.getHours()) + ':' + S.pad(d.getMinutes()); };
  const yesNo = (v) => (v ? '<span class="badge badge-ok">tak</span>' : '<span class="badge badge-off">nie</span>');
  const statusBadge = (b) => ({
    confirmed: '', done: '<span class="badge badge-ok">odbyta</span>', no_show: '<span class="badge badge-warn">nieobecność</span>',
    cancelled: `<span class="badge">odwołana (${b.cancelledBy === 'salon' ? 'gabinet' : 'klientka'})</span>`
  }[b.status] || '');
  const feeBadge = (b) => (b.fee ? `<span class="badge ${b.feeStatus === 'due' ? 'badge-warn' : ''}">opłata ${money(b.fee)} · ${{ due: 'do zapłaty', paid: 'zapłacona', waived: 'anulowana' }[b.feeStatus]}</span>` : '');

  /* ---------- Tabela wizyt ---------- */
  function bookingTable(list, actions) {
    if (!list.length) return '<p class="muted">Brak wizyt.</p>';
    return `<table class="table"><thead><tr><th>Termin</th><th>Zabieg</th><th>Klientka</th><th>Telefon</th><th>Źródło</th><th class="num">Do zapłaty</th>${actions ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.map((b) => `<tr>
        <td>${ui.fmtShort(b.date)}, ${b.time}</td>
        <td>${esc(b.treatmentName)}${b.notes ? `<br><span class="small muted">${esc(b.notes)}</span>` : ''}${b.lang === 'en' ? ' <span class="badge">EN</span>' : ''}</td>
        <td>${esc(b.client.name)}${b.demo ? ' <span class="badge badge-off">przykład</span>' : ''}</td><td><a href="tel:${esc(b.client.phone)}">${esc(b.client.phone)}</a></td>
        <td><span class="badge">${b.client.type}</span>${b.source && b.source !== 'online' ? `<br><span class="small muted">${SOURCES[b.source] || b.source}</span>` : ''}</td>
        <td class="num">${money(b.toPay)}${b.discount ? `<br><span class="small muted">−${b.discount.percent}% ${esc(b.discount.label)}</span>` : ''}${b.voucher ? `<br><span class="small muted">bon −${money(b.voucher.amount)}</span>` : ''}</td>
        ${actions ? `<td class="num">${actions(b)}</td>` : ''}</tr>`).join('')}
    </tbody></table>`;
  }

  /* ---------- Widoki ---------- */
  function vPulpit() {
    const o = data.overview;
    return `
      ${o.hasDemo ? `<div class="panel-card panel-note"><p><strong style="font-weight:500">W bazie są dane przykładowe</strong> (klientki i wizyty oznaczone „przykład”). Nie dostają żadnych SMS-ów ani e-maili. Usuń je przed startem strony.</p><button class="btn btn-outline btn-small" type="button" data-clear-demo>Usuń dane przykładowe</button></div>` : ''}
      ${admin.mustChange ? '<div class="panel-card panel-note"><p>Zmień hasło startowe w zakładce <button type="button" class="link-button" data-view="konto">Moje konto</button>.</p></div>' : ''}
      <div class="stat-row">
        <div class="stat"><b>${o.today}</b><span>wizyty dzisiaj</span></div>
        <div class="stat"><b>${o.week}</b><span>wizyty w najbliższych 7 dniach</span></div>
        <div class="stat"><b>${o.clients}</b><span>klientek w bazie</span></div>
        <div class="stat"><b>${money(o.feesDue) === 'bezpłatnie' ? '0 zł' : money(o.feesDue)}</b><span>opłat za odwołania do zapłaty</span></div>
      </div>
      <div class="panel-card"><h2>Najbliższe wizyty</h2>${bookingTable(o.upcoming)}</div>
      <div class="panel-card"><h2>Nowe konta</h2>
        ${o.newAccounts.length ? `<table class="table"><thead><tr><th>Klientka</th><th>Telefon</th><th>Założone</th><th>Zniżka powitalna</th></tr></thead><tbody>
          ${o.newAccounts.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${new Date(c.createdAt).toLocaleDateString('pl-PL')}</td><td>${c.firstVisitUsed ? '<span class="badge">wykorzystana</span>' : '<span class="badge badge-ok">aktywna</span>'}</td></tr>`).join('')}
        </tbody></table>` : '<p class="muted">Brak kont.</p>'}
      </div>
      <div class="panel-card"><h2>Wiadomości z formularza kontaktowego</h2>
        ${o.contact.length ? `<table class="table"><tbody>${o.contact.map((m) => `<tr><td style="white-space:nowrap">${dt(m.created_at)}</td><td>${esc(m.name)}<br><span class="small muted">${esc(m.contact)}</span></td><td>${esc(m.message)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Brak wiadomości.</p>'}
      </div>`;
  }
  function vWizyty() {
    const today = S.isoDate(new Date());
    const up = data.bookings.filter((b) => b.status === 'confirmed' && b.date >= today);
    const past = data.bookings.filter((b) => b.date < today || b.status !== 'confirmed').reverse();
    const days = [...new Set(up.map((b) => b.date))];
    const fees = data.bookings.filter((b) => b.fee && b.feeStatus === 'due');
    const pastActions = (b) => [
      b.status === 'done' ? `<button class="btn btn-outline btn-small" data-noshow="${b.id}">Nieobecność</button>` : '',
      b.fee && b.feeStatus === 'due' ? `<button class="btn btn-outline btn-small" data-fee="${b.id}" data-status="paid">Zapłacona</button> <button class="link-button small" data-fee="${b.id}" data-status="waived">Anuluj opłatę</button>` : ''
    ].join(' ');
    return `
      ${fees.length ? `<div class="panel-card"><h2>Opłaty za późne odwołanie i nieobecność</h2>
        <p class="small muted">Zgodnie z regulaminem: ${JM.booking.lateCancelFeePercent}% ceny zabiegu przy odwołaniu później niż ${JM.booking.cancelHours} h przed wizytą albo nieobecności. Klientka płaci przelewem albo przy następnej wizycie.</p>
        ${bookingTable(fees, (b) => `${feeBadge(b)}<br>${pastActions(b)}`)}</div>` : ''}
      ${days.length ? days.map((d) => `<div class="panel-card day-group"><h3>${ui.fmtDate(d)}</h3>${bookingTable(up.filter((b) => b.date === d), (b) => `<button class="btn btn-outline btn-small" data-cancel="${b.id}">Odwołaj</button>`)}</div>`).join('') : '<div class="panel-card"><p class="muted">Brak zaplanowanych wizyt.</p></div>'}
      <div class="panel-card"><h2>Ostatnie 30 dni i odwołane</h2>
        ${bookingTable(past.slice(0, 40), (b) => `${statusBadge(b)} ${feeBadge(b)}<br>${pastActions(b)}`)}
        <p class="small muted" style="margin-top:12px">Wizyty, które się skończyły, oznaczają się jako odbyte automatycznie. Jeśli klientka nie przyszła, kliknij „Nieobecność”: system naliczy opłatę z regulaminu.</p>
      </div>`;
  }
  function vKlientki() {
    const q = query.toLowerCase();
    const list = data.clients.filter((c) => !q || (c.name + c.phone + c.email).toLowerCase().includes(q));
    return `
      <div class="panel-card">
        <div style="display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;margin-bottom:16px">
          <div class="field search" style="margin:0"><label for="q" class="sr-only">Szukaj klientki</label><input id="q" type="search" placeholder="Szukaj po nazwisku, telefonie, e-mailu" value="${esc(query)}"></div>
          <a class="btn btn-outline btn-small" href="/api/admin/clients.csv" download>Eksportuj CSV</a>
        </div>
        <table class="table"><thead><tr><th>Klientka</th><th>Telefon</th><th>E-mail</th><th>Typ</th><th class="num">Wizyty</th><th>Ostatnia wizyta</th><th>Oferty SMS</th><th>Oferty e-mail</th></tr></thead><tbody>
          ${list.map((c) => `<tr><td>${esc(c.name)}${c.demo ? ' <span class="badge badge-off">przykład</span>' : ''}</td><td>${esc(c.phone)}</td><td>${esc(c.email)}</td><td><span class="badge">${c.type}</span></td><td class="num">${c.visits}</td><td>${c.last ? ui.fmtShort(c.last) + '.' + c.last.slice(0, 4) : '—'}</td><td>${yesNo(c.sms)}</td><td>${yesNo(c.mail)}</td></tr>`).join('')}
        </tbody></table>
        <p class="small muted" style="margin-top:16px">Kampanie SMS i e-mail trafiają wyłącznie do klientek ze zgodą na dany kanał. Plik CSV zawiera dane osobowe: przechowuj go bezpiecznie i usuń, gdy nie jest potrzebny.</p>
      </div>`;
  }
  function vZabiegi() {
    const cats = [{ id: 'konsultacja', name: 'Konsultacja' }].concat(JM.categories.map((c) => ({ id: c.id, name: c.namePl || c.name })));
    return `
      <form id="prices-form">
        ${cats.map((c) => `<div class="panel-card"><h2>${c.name}</h2>
          <table class="table"><thead><tr><th>Zabieg</th><th>Czas</th><th class="num">Najniższa z 30 dni</th><th class="num">Cena (zł)</th></tr></thead><tbody>
          ${data.prices.filter((t) => t.category === c.id).map((t) => `<tr><td>${esc(t.name)}${t.from ? ' <span class="small muted">(cena „od”)</span>' : ''}</td><td>${S.formatDuration(t.duration)}</td>
            <td class="num small muted">${t.lowest30 !== t.price ? money(t.lowest30) : '—'}</td>
            <td class="num"><label class="sr-only" for="pr-${t.id}">Cena: ${esc(t.name)}</label><input class="price-input" id="pr-${t.id}" name="${t.id}" type="number" min="0" step="10" value="${t.price}" data-base="${t.basePrice}"></td></tr>`).join('')}
          </tbody></table></div>`).join('')}
        <div class="btn-row"><button class="btn btn-primary" type="submit">Zapisz ceny</button><button class="btn btn-outline" type="button" data-base-prices>Wpisz ceny z pliku treatments.js</button></div>
        <p class="small muted" style="margin-top:12px">Nowe ceny od razu pojawią się w cenniku i rezerwacji. Każda zmiana zapisuje się w historii, więc przy obniżkach strona sama pokazuje najniższą cenę z 30 dni (dyrektywa Omnibus).</p>
      </form>`;
  }
  function vPromocje() {
    return `
      <div class="panel-card">
        <h2>Promocje</h2>
        <table class="table"><thead><tr><th>Promocja</th><th class="num">Zniżka</th><th>Obowiązuje</th><th>Dla kogo</th><th>Włączona</th><th></th></tr></thead><tbody>
          ${data.promos.map((p) => `<tr><td>${esc(p.title)}<br><span class="small muted">${esc(p.text)}</span></td><td class="num">${p.percent}%</td><td>${p.birthday ? 'miesiąc urodzin' : ui.fmtShort(p.from) + '–' + ui.fmtShort(p.to) + '.' + p.to.slice(0, 4)}</td><td>${p.membersOnly ? 'zarejestrowane' : 'wszystkie'}</td>
            <td><label class="sr-only" for="pm-${p.id}">Włącz: ${esc(p.title)}</label><input id="pm-${p.id}" type="checkbox" class="switch" data-promo="${p.id}" ${p.active ? 'checked' : ''}></td>
            <td class="num"><button type="button" class="link-button small" data-del-promo="${p.id}">Usuń</button></td></tr>`).join('')}
        </tbody></table>
        <p class="small muted" style="margin-top:14px">Zniżka powitalna ${JM.discounts.firstVisitPercent}% dla nowych kont działa zawsze. Zniżki się nie sumują: klientka dostaje najkorzystniejszą. Przy każdej obniżce strona pokazuje najniższą cenę z 30 dni.</p>
      </div>
      <form class="panel-card" id="promo-form" novalidate>
        <h2>Nowa promocja</h2>
        <div class="form-grid">
          <div class="field"><label for="p-title">Nazwa</label><input id="p-title" name="title" required maxlength="80" placeholder="Np. Walentynki"></div>
          <div class="field"><label for="p-percent">Zniżka (%)</label><input id="p-percent" name="percent" type="number" min="1" max="50" required value="10"></div>
          <div class="field"><label for="p-from">Od</label><input id="p-from" name="from" type="date" required></div>
          <div class="field"><label for="p-to">Do</label><input id="p-to" name="to" type="date" required></div>
          <div class="field"><label for="p-cat">Zabiegi</label><select id="p-cat" name="cat"><option value="all">Wszystkie</option>${JM.categories.map((c) => `<option value="${c.id}">${c.namePl || c.name}</option>`).join('')}</select></div>
          <div class="field"><label for="p-who">Dla kogo</label><select id="p-who" name="who"><option value="members">Tylko zarejestrowane klientki</option><option value="all">Wszystkie klientki</option></select></div>
          <div class="field span-2"><label for="p-text">Opis dla klientek</label><input id="p-text" name="text" required maxlength="240" placeholder="Np. 10% taniej na peelingi chemiczne do końca lutego."></div>
        </div>
        <button class="btn btn-primary" type="submit">Dodaj promocję</button>
      </form>`;
  }
  function segments(text) {
    const gsm = /^[\x20-\x7E\n\r£¥èéùìòÇØøÅå_ÆæßÉ¡ÄÖÑÜ§¿äöñüà]*$/.test(text);
    const per = gsm ? (text.length > 160 ? 153 : 160) : (text.length > 70 ? 67 : 70);
    return { gsm, parts: Math.max(1, Math.ceil(text.length / per)) };
  }
  const msgStatus = (m) => ({ test: '<span class="badge">test</span>', sent: '<span class="badge badge-ok">wysłana</span>', queued: '<span class="badge">w kolejce</span>', failed: `<span class="badge badge-warn" title="${esc(m.error || '')}">błąd</span>` }[m.status]);
  const kindName = { moved: 'zmiana terminu', reminder_prev: 'przypomnienie (stary termin)', confirmation: 'potwierdzenie', reminder: 'przypomnienie', cancellation: 'odwołanie', welcome: 'powitanie', reset: 'reset hasła', contact: 'formularz', campaign: 'kampania' };
  function vWiadomosci() {
    const testMode = mode.sms === 'test' || mode.email === 'test';
    const smsC = data.clients.filter((c) => c.sms && !c.demo).length, mailC = data.clients.filter((c) => c.mail && !c.demo).length;
    return `
      ${testMode ? `<div class="panel-card panel-note"><p><strong style="font-weight:500">Tryb testowy.</strong> ${mode.sms === 'test' ? 'SMS-y' : ''}${mode.sms === 'test' && mode.email === 'test' ? ' i ' : ''}${mode.email === 'test' ? 'e-maile' : ''} nie wychodzą do klientek. Trafiają do listy poniżej i do terminala, w którym działa serwer. Prawdziwą wysyłkę włącza się w pliku <code>.env</code> (instrukcja w README).</p></div>` : ''}
      <div class="panel-card">
        <h2>Wiadomości automatyczne</h2>
        <p class="small muted">Wysyłane każdej klientce, także bez zgody marketingowej, bo dotyczą umówionej usługi. Klientki z angielskiej wersji strony dostają je po angielsku.</p>
        <table class="table"><tbody>
          <tr><td>Potwierdzenie rezerwacji</td><td>SMS i e-mail od razu po rezerwacji, z linkiem do podglądu i odwołania wizyty</td></tr>
          <tr><td>Przypomnienie</td><td>SMS ${JM.booking.reminderHours} godziny przed wizytą (gdy rezerwacja była wcześniej niż ${JM.booking.reminderHours} h przed terminem)</td></tr>
          <tr><td>Odwołanie</td><td>SMS i e-mail po odwołaniu przez klientkę albo gabinet, z informacją o ewentualnej opłacie</td></tr>
          <tr><td>Konto</td><td>E-mail powitalny i link do ustawienia nowego hasła</td></tr>
        </tbody></table>
      </div>
      <div class="panel-card">
        <h2>Zaplanowane przypomnienia</h2>
        ${data.reminders.length ? `<table class="table"><thead><tr><th>Wysyłka</th><th>Wizyta</th><th>Klientka</th><th>Telefon</th><th>Status</th></tr></thead><tbody>
          ${data.reminders.map((b) => `<tr><td>${dt(b.reminderAt)}</td><td>${ui.fmtShort(b.date)}, ${b.time} · ${esc(b.treatmentName)}</td><td>${esc(b.client.name)}${b.lang === 'en' ? ' <span class="badge">EN</span>' : ''}${b.demo ? ' <span class="badge badge-off">przykład</span>' : ''}</td><td>${esc(b.client.phone)}</td>
            <td>${b.demo ? '<span class="badge badge-off">bez wysyłki</span>' : { scheduled: '<span class="badge">zaplanowane</span>', skipped: '<span class="badge badge-off">rezerwacja &lt; 24 h</span>', test: '<span class="badge">wysłane (test)</span>', sent: '<span class="badge badge-ok">wysłane</span>', queued: '<span class="badge">w kolejce</span>', failed: '<span class="badge badge-warn">błąd</span>' }[b.reminderStatus]}</td></tr>`).join('')}
        </tbody></table>` : '<p class="muted">Brak zaplanowanych wizyt.</p>'}
      </div>
      <form class="panel-card" id="campaign-form" novalidate>
        <h2>Kampania</h2>
        <div class="chip-nav" role="group" aria-label="Kanał" style="margin-bottom:16px">
          <button type="button" class="chip" data-channel="sms" aria-pressed="${campaignChannel === 'sms'}">SMS (${smsC} odbiorczyń)</button>
          <button type="button" class="chip" data-channel="email" aria-pressed="${campaignChannel === 'email'}">E-mail (${mailC} odbiorczyń)</button>
        </div>
        <p class="small muted">Tylko klientki ze zgodą na oferty tym kanałem. Dane przykładowe są pomijane.</p>
        ${campaignChannel === 'email' ? '<div class="field"><label for="c-subject">Temat</label><input id="c-subject" name="subject" maxlength="120" placeholder="Np. Świąteczna pielęgnacja -15%"></div>' : ''}
        <div class="field"><label for="c-text">Treść</label><textarea id="c-text" name="text" maxlength="${campaignChannel === 'sms' ? 459 : 4000}">${campaignChannel === 'sms' ? `${JM.salon.smsSender}: Swiateczna pielegnacja -15% na mezoterapie i stymulatory do 23.12. Rezerwacja: justynamanka.pl. Rezygnacja z ofert: justynamanka.pl/konto` : ''}</textarea>
          <span class="field-hint" id="c-count"></span></div>
        <button class="btn btn-primary" type="submit">Wyślij kampanię</button>
      </form>
      <div class="panel-card"><h2>Wysłane wiadomości</h2>
        ${data.messages.length ? `<table class="table"><thead><tr><th>Kiedy</th><th>Kanał</th><th>Rodzaj</th><th>Do</th><th>Treść</th><th>Status</th></tr></thead><tbody>
          ${data.messages.map((m) => `<tr><td style="white-space:nowrap">${dt(m.created_at)}</td><td>${m.channel === 'sms' ? 'SMS' : 'e-mail'}</td><td>${kindName[m.kind] || m.kind}</td><td>${esc(m.to_addr)}</td>
            <td class="small">${m.channel === 'sms' ? esc(m.body) : `${esc(m.subject)}<br><a href="/api/admin/messages/${m.id}" target="_blank" rel="noopener">Podgląd e-maila</a>`}</td><td>${msgStatus(m)}</td></tr>`).join('')}
        </tbody></table>` : '<p class="muted">Jeszcze nic nie wysłano.</p>'}
      </div>`;
  }
  function vGodziny() {
    return `
      <div class="panel-card">
        <h2>Godziny pracy</h2>
        <table class="table"><tbody>${[1, 2, 3, 4, 5, 6, 0].map((d) => `<tr><td>${['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'][d]}</td><td>${JM.hours[d] ? JM.hours[d][0] + ':00–' + JM.hours[d][1] + ':00' : 'nieczynne'}</td></tr>`).join('')}</tbody></table>
        <p class="small muted" style="margin-top:12px">Godziny zmienia się w pliku <code>assets/js/config.js</code>. Święta ustawowe są blokowane automatycznie.</p>
      </div>
      <form class="panel-card" id="dayoff-form" novalidate>
        <h2>Dni wolne i urlopy</h2>
        <p class="small muted">Zablokowany dzień znika z kalendarza rezerwacji. Wizyty już umówione na ten dzień zostają: odwołaj je w zakładce Wizyty (klientki dostaną SMS).</p>
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
          <div class="field" style="margin:0"><label for="off-date">Dzień</label><input id="off-date" name="date" type="date" required min="${S.isoDate(new Date())}"></div>
          <div class="field" style="margin:0"><label for="off-note">Notatka <span class="opt">(opcjonalnie)</span></label><input id="off-note" name="note" maxlength="120" placeholder="Np. szkolenie"></div>
          <button class="btn btn-primary" type="submit">Zablokuj dzień</button>
        </div>
        ${data.days.length ? `<table class="table" style="margin-top:20px"><tbody>${data.days.map((d) => `<tr><td>${ui.fmtDate(d.date)}</td><td class="small muted">${esc(d.note || '')}</td><td class="num"><button type="button" class="btn btn-outline btn-small" data-unblock="${d.date}">Odblokuj</button></td></tr>`).join('')}</tbody></table>` : ''}
      </form>`;
  }
  function icalCard() {
    const url = location.origin + '/kalendarz/' + data.ical.token + '.ics';
    const webcal = url.replace(/^https?:/, 'webcal:');
    return `
      <div class="panel-card" style="max-width:560px">
        <h2>Kalendarz w telefonie</h2>
        <p class="small muted">Wizyty i blokady same pojawią się w kalendarzu w Twoim telefonie, obok prywatnych spraw. W kalendarzu widać zabieg i imię z inicjałem nazwiska; telefon klientki i uwagi zostają w panelu. Link jest prywatny: nie wysyłaj go nikomu.</p>
        ${local ? '<p class="small panel-inline-note">Kalendarz Google i telefon pobierają wizyty z internetu, więc subskrypcja zadziała po publikacji strony. Teraz możesz pobrać plik i zobaczyć, jak wyglądają wizyty.</p>' : ''}
        <div class="field"><label for="ical-url">Twój link do kalendarza</label><input id="ical-url" readonly value="${esc(url)}"></div>
        <div class="btn-row">
          <button type="button" class="btn btn-primary btn-small" data-copy-ical>Kopiuj link</button>
          ${local ? `<a class="btn btn-outline btn-small" href="${esc(url)}" download="gabinet.ics">Pobierz plik</a>` : `<a class="btn btn-outline btn-small" href="${esc(webcal)}">Dodaj na iPhonie</a><a class="btn btn-outline btn-small" href="https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}" target="_blank" rel="noopener">Dodaj do Kalendarza Google</a>`}
        </div>
        <details class="move-box"><summary>Jak dodać ręcznie</summary>
          <p class="small"><strong style="font-weight:500">Kalendarz Google:</strong> na komputerze otwórz calendar.google.com → po lewej „Inne kalendarze” → „+” → „Z adresu URL” → wklej link. Kalendarz pojawi się też w aplikacji na telefonie.</p>
          <p class="small"><strong style="font-weight:500">iPhone:</strong> Ustawienia → Kalendarz → Konta → Dodaj konto → Inne → Dodaj subskrybowany kalendarz → wklej link.</p>
          <p class="small muted">Google odświeża subskrybowane kalendarze co kilka godzin, iPhone częściej. Nowe rezerwacje od razu widać w panelu.</p>
        </details>
        <p class="small" style="margin-top:14px"><button type="button" class="link-button" data-renew-ical>Wygeneruj nowy link</button> <span class="muted">— stary przestanie działać, np. gdy ktoś niepowołany go zobaczył.</span></p>
      </div>`;
  }
  function vKonto() {
    return `
      <form class="panel-card" id="pass-form" novalidate style="max-width:560px">
        <h2>Zmiana hasła</h2>
        <p class="small muted">Zalogowana: ${esc(admin.name)} (${esc(admin.email)}). Hasło do panelu musi mieć co najmniej 12 znaków. Po zmianie inne urządzenia zostaną wylogowane.</p>
        <div class="field"><label for="pw-cur">Obecne hasło</label><input id="pw-cur" name="current" type="password" autocomplete="current-password" required></div>
        <div class="field"><label for="pw-new">Nowe hasło</label><input id="pw-new" name="next" type="password" autocomplete="new-password" minlength="12" required></div>
        <button class="btn btn-primary" type="submit">Zmień hasło</button>
      </form>
      ${icalCard()}
      <div class="panel-card" style="max-width:560px">
        <h2>Kopie zapasowe</h2>
        <p class="small muted">Serwer robi kopię bazy automatycznie raz dziennie (po 3:00) i trzyma ${14} ostatnich w folderze <code>${esc(data.backup.dir)}</code>, razem ze zdjęciami z galerii. Raz na jakiś czas pobierz kopię i zapisz ją poza serwerem, np. na dysku w chmurze. Plik zawiera dane osobowe klientek: nie wysyłaj go mailem.</p>
        <p>Ostatnia kopia: <strong style="font-weight:500">${data.backup.last ? dt(data.backup.last) : 'jeszcze nie było'}</strong>${data.backup.count ? ` · kopii na serwerze: ${data.backup.count}` : ''}</p>
        <div class="btn-row"><button type="button" class="btn btn-outline btn-small" data-backup-now>Zrób kopię teraz</button><a class="btn btn-outline btn-small" href="/api/admin/backup/download">Pobierz kopię bazy</a></div>
      </div>`;
  }

  /* ---------- Kalendarz tygodnia ---------- */
  const PPM = 1.1; // pikseli na minutę
  const SOURCES = { online: 'strona', telefon: 'telefon', instagram: 'Instagram', 'osobiście': 'osobiście', inne: 'inne' };
  const mondayOf = (d) => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  let calWeek = mondayOf(new Date());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const toMin = S.toMin, toTime = S.toTime;
  const shortDay = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];

  function weekLabel() {
    const a = calWeek, b = addDays(calWeek, 6);
    const m = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
    return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${m[b.getMonth()]} ${b.getFullYear()}` : `${a.getDate()} ${m[a.getMonth()]} – ${b.getDate()} ${m[b.getMonth()]} ${b.getFullYear()}`;
  }
  function vKalendarz() {
    const cal = data.calendar;
    // zakres godzin: godziny pracy, poszerzone o wizyty i blokady poza nimi
    let lo = cal.range[0], hi = cal.range[1];
    cal.bookings.forEach((b) => { lo = Math.min(lo, toMin(b.time)); hi = Math.max(hi, toMin(b.end)); });
    cal.blocks.forEach((x) => { lo = Math.min(lo, toMin(x.start)); hi = Math.max(hi, toMin(x.end)); });
    lo = Math.floor(lo / 60) * 60; hi = Math.ceil(hi / 60) * 60;
    const H = (hi - lo) * PPM;
    const y = (min) => (min - lo) * PPM;
    const today = S.isoDate(new Date());
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const hours = []; for (let m = lo; m <= hi; m += 60) hours.push(m);
    const col = (day) => {
      const d = new Date(day.date + 'T12:00:00');
      const shade = (a, b, label) => (b > a ? `<div class="wk-closed" style="top:${y(a)}px;height:${(b - a) * PPM}px">${label ? `<span>${esc(label)}</span>` : ''}</div>` : '');
      const closed = day.hours ? shade(lo, day.hours[0]) + shade(day.hours[1], hi) : shade(lo, hi, day.closed);
      const evs = cal.bookings.filter((b) => b.date === day.date).map((b) => {
        const s = toMin(b.time), e = toMin(b.end); const short = (e - s) < 40;
        return `<button type="button" class="wk-ev${b.id === highlightId ? ' is-new' : ''}${b.status === 'done' ? ' is-done' : ''}${b.status === 'no_show' ? ' is-noshow' : ''}${b.demo ? ' is-demo' : ''}${short ? ' is-short' : ''}" data-booking="${b.id}" style="top:${y(s)}px;height:${Math.max((e - s) * PPM - 2, 18)}px" title="${esc(b.time + '–' + b.end + ' ' + b.treatmentName + ', ' + b.client.name)}">
          <span class="wk-ev-time">${b.time}–${b.end}${b.source && b.source !== 'online' ? ` · ${SOURCES[b.source]}` : ''}</span>
          <span class="wk-ev-name">${esc(b.client.name)}</span>
          ${short ? '' : `<span class="wk-ev-t">${esc(b.treatmentName)}</span>`}</button>`;
      }).join('');
      const blocks = cal.blocks.filter((x) => x.date === day.date).map((x) => {
        const s = toMin(x.start), e = toMin(x.end);
        return `<button type="button" class="wk-block" data-block="${x.id}" style="top:${y(s)}px;height:${Math.max((e - s) * PPM - 2, 16)}px"><span>${x.start}–${x.end} ${esc(x.note || 'Blokada')}</span></button>`;
      }).join('');
      const now = day.date === today && nowMin > lo && nowMin < hi ? `<div class="wk-now" style="top:${y(nowMin)}px" aria-hidden="true"></div>` : '';
      return `<div class="wk-day${day.date === today ? ' is-today' : ''}" data-date="${day.date}" style="height:${H}px" role="group" aria-label="${ui.fmtDate(day.date)}">${closed}${blocks}${evs}${now}</div>`;
    };
    const count = cal.bookings.filter((b) => b.status === 'confirmed').length;
    return `
      <div class="wk-toolbar">
        <div class="wk-nav">
          <button type="button" class="icon-btn" data-week="-1" aria-label="Poprzedni tydzień">${ui.icons.arrowL}</button>
          <h2>${weekLabel()}</h2>
          <button type="button" class="icon-btn" data-week="1" aria-label="Następny tydzień">${ui.icons.arrowR}</button>
          <button type="button" class="btn btn-outline btn-small" data-week="0">Dziś</button>
        </div>
        <div class="btn-row"><button type="button" class="btn btn-primary btn-small" data-new-booking>Nowa wizyta</button><button type="button" class="btn btn-outline btn-small" data-new-block>Zablokuj czas</button></div>
      </div>
      <p class="small muted wk-hint">${count} ${count === 1 ? 'wizyta' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? 'wizyty' : 'wizyt'} w tym tygodniu. Kliknij wolne miejsce w kalendarzu, żeby dodać wizytę o tej godzinie. Wizyty z telefonu i blokady od razu znikają z rezerwacji online.</p>
      <div class="wk-scroll"><div class="wk">
        <div class="wk-head"><span></span>${cal.days.map((d) => { const x = new Date(d.date + 'T12:00:00'); return `<span class="${d.date === today ? 'is-today' : ''}">${shortDay[x.getDay()]} <b>${x.getDate()}.${S.pad(x.getMonth() + 1)}</b></span>`; }).join('')}</div>
        <div class="wk-body">
          <div class="wk-times" style="height:${H}px">${hours.map((m) => `<span style="top:${y(m)}px">${toTime(m)}</span>`).join('')}</div>
          ${cal.days.map(col).join('')}
        </div>
      </div></div>`;
  }

  /* ---------- Okna: nowa wizyta, szczegóły, blokada ---------- */
  let cache = { prices: null, clients: null };
  async function ensureLists(force) {
    if (!cache.prices || force) cache.prices = (await api('GET', '/api/admin/prices')).prices;
    if (!cache.clients || force) cache.clients = (await api('GET', '/api/admin/clients')).clients;
  }
  function openDialog(html, onSubmit, onReady) {
    const dlg = ui.h(`<dialog class="modal modal-wide">${html}</dialog>`);
    document.body.appendChild(dlg); dlg.showModal();
    const close = () => { dlg.close(); dlg.remove(); };
    dlg.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target === dlg) close(); });
    dlg.addEventListener('cancel', () => { dlg.remove(); afterDialog(); });
    dlg.addEventListener('close', afterDialog);
    const form = dlg.querySelector('form');
    if (form && onSubmit) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]'); btn.disabled = true;
      const err = form.querySelector('.form-msg'); if (err) err.remove();
      try { await onSubmit(form, close); } catch (ex) { form.insertAdjacentHTML('afterbegin', `<p class="form-msg" role="alert">${esc(ex.message)}</p>`); form.scrollTop = 0; } finally { btn.disabled = false; }
    });
    if (onReady) onReady(dlg);
    return dlg;
  }
  // wysyła żądanie; jeśli serwer prosi o potwierdzenie (poza godzinami, przeszłość), pyta i ponawia
  async function withConfirm(fn) {
    try { return await fn(false); } catch (ex) {
      if (ex.field === 'confirm' && window.confirm(ex.message)) return fn(true);
      if (ex.field === 'confirm') throw new Error('Nie zapisano. Wybierz inny termin.');
      throw ex;
    }
  }

  async function newBookingDialog(date, time) {
    await ensureLists();
    const cats = [{ id: 'konsultacja', name: 'Konsultacja' }].concat(JM.categories.map((c) => ({ id: c.id, name: c.namePl || c.name })));
    const opts = cats.map((c) => `<optgroup label="${esc(c.name)}">${cache.prices.filter((t) => t.category === c.id).map((t) => `<option value="${t.id}" data-duration="${t.duration}" data-price="${t.price}">${esc(t.name)}</option>`).join('')}</optgroup>`).join('');
    const first = cache.prices[0];
    openDialog(`
      <form class="modal-body" novalidate>
        <h2>Nowa wizyta</h2>
        <fieldset class="nb-who">
          <legend>Klientka</legend>
          <div class="field"><label for="nb-q">Znajdź w bazie</label><input id="nb-q" type="search" placeholder="Nazwisko, telefon albo e-mail" autocomplete="off"></div>
          <ul class="nb-results" id="nb-results"></ul>
          <div class="nb-picked" id="nb-picked" hidden></div>
          <div class="form-grid" id="nb-new">
            <div class="field"><label for="nb-first">Imię</label><input id="nb-first" name="firstName" autocomplete="off"></div>
            <div class="field"><label for="nb-last">Nazwisko <span class="opt">(opcjonalnie)</span></label><input id="nb-last" name="lastName" autocomplete="off"></div>
            <div class="field"><label for="nb-phone">Telefon</label><input id="nb-phone" name="phone" type="tel" placeholder="+48 600 000 000" autocomplete="off"></div>
            <div class="field"><label for="nb-email">E-mail <span class="opt">(opcjonalnie)</span></label><input id="nb-email" name="email" type="email" autocomplete="off"></div>
          </div>
        </fieldset>
        <div class="form-grid">
          <div class="field span-2"><label for="nb-t">Zabieg</label><select id="nb-t" name="treatmentId">${opts}</select></div>
          <div class="field"><label for="nb-date">Dzień</label><input id="nb-date" name="date" type="date" required value="${date || S.isoDate(new Date())}"></div>
          <div class="field"><label for="nb-time">Godzina</label><input id="nb-time" name="time" type="time" step="300" required value="${time || '10:00'}"></div>
          <div class="field"><label for="nb-dur">Czas (minuty)</label><input id="nb-dur" name="duration" type="number" min="10" max="600" step="5" value="${first.duration}"></div>
          <div class="field"><label for="nb-price">Cena (zł)</label><input id="nb-price" name="price" type="number" min="0" step="10" value="${first.price}"></div>
          <div class="field"><label for="nb-src">Skąd wizyta</label><select id="nb-src" name="source"><option value="telefon">Telefon</option><option value="instagram">Instagram</option><option value="osobiście">Osobiście w gabinecie</option><option value="inne">Inne</option></select></div>
          <div class="field"><label for="nb-voucher">Kod bonu <span class="opt">(opcjonalnie)</span></label><input id="nb-voucher" name="voucherCode" maxlength="20" placeholder="JM-XXXX-XXXX" autocomplete="off"></div>
          <div class="field span-2"><label for="nb-notes">Uwagi <span class="opt">(opcjonalnie)</span></label><textarea id="nb-notes" name="notes" maxlength="400"></textarea></div>
        </div>
        <label class="check"><input type="checkbox" name="notify" checked><span>Wyślij klientce SMS z potwierdzeniem i linkiem do wizyty<small>Przypomnienie ${JM.booking.reminderHours} h przed wizytą wyśle się tak jak przy rezerwacji online.</small></span></label>
        <div class="modal-actions"><button class="btn btn-primary" type="submit">Zapisz wizytę</button><button class="btn btn-outline" type="button" data-close>Anuluj</button></div>
      </form>`,
    async (f, close) => {
      const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : '');
      const picked = f.dataset.clientId;
      const payload = (force) => ({ treatmentId: v('treatmentId'), date: v('date'), time: v('time'), duration: Number(v('duration')), price: v('price'), source: v('source'), notes: v('notes'), voucherCode: v('voucherCode'), notify: f.elements.notify.checked, force,
        clientId: picked && f.dataset.clientType === 'konto' ? Number(picked) : undefined,
        guest: picked && f.dataset.clientType === 'konto' ? undefined : { firstName: v('firstName'), lastName: v('lastName'), phone: v('phone'), email: v('email') } });
      await withConfirm((force) => api('POST', '/api/admin/bookings', payload(force)));
      close(); cache.clients = null; ui.toast(f.elements.notify.checked ? 'Wizyta zapisana. Klientka dostała SMS.' : 'Wizyta zapisana.'); rerender();
    },
    (dlg) => {
      const f = dlg.querySelector('form'), q = dlg.querySelector('#nb-q'), list = dlg.querySelector('#nb-results'), picked = dlg.querySelector('#nb-picked'), fresh = dlg.querySelector('#nb-new');
      const sel = dlg.querySelector('#nb-t');
      sel.addEventListener('change', () => { const o = sel.selectedOptions[0]; f.elements.duration.value = o.dataset.duration; f.elements.price.value = o.dataset.price; });
      q.addEventListener('input', () => {
        const s = q.value.trim().toLowerCase(); const digits = s.replace(/\D/g, '');
        const hits = s.length < 2 ? [] : cache.clients.filter((c) => (c.name + ' ' + c.email).toLowerCase().includes(s) || (digits.length >= 3 && String(c.phone).replace(/\D/g, '').includes(digits))).slice(0, 6);
        list.innerHTML = hits.map((c, i) => `<li><button type="button" data-pick="${i}">${esc(c.name)} <span class="small muted">${esc(c.phone)}${c.email ? ' · ' + esc(c.email) : ''} · ${c.type}</span></button></li>`).join('')
          + (s.length >= 2 && !hits.length ? '<li class="small muted">Nie ma jej w bazie: wpisz dane poniżej.</li>' : '');
        list.onclick = (e) => {
          const b = e.target.closest('[data-pick]'); if (!b) return; const c = hits[Number(b.dataset.pick)];
          f.dataset.clientId = c.id || ''; f.dataset.clientType = c.type;
          f.elements.firstName.value = c.firstName || ''; f.elements.lastName.value = c.lastName || ''; f.elements.phone.value = c.phone || ''; f.elements.email.value = c.email || '';
          picked.hidden = false; picked.innerHTML = `<strong style="font-weight:500">${esc(c.name)}</strong> <span class="small muted">${esc(c.phone)} · ${c.type === 'konto' ? 'ma konto' : 'gość'}</span> <button type="button" class="link-button small" data-unpick>zmień</button>`;
          fresh.hidden = c.type === 'konto'; list.innerHTML = ''; q.value = '';
        };
      });
      picked.addEventListener('click', (e) => { if (!e.target.closest('[data-unpick]')) return; delete f.dataset.clientId; delete f.dataset.clientType; picked.hidden = true; fresh.hidden = false; f.reset(); q.focus(); });
      q.focus();
    });
  }

  function bookingDialog(b) {
    const past = new Date(b.date + 'T' + b.time + ':00') < new Date();
    openDialog(`
      <form class="modal-body" novalidate>
        <h2>${esc(b.treatmentName)}</h2>
        <dl class="visit-dl">
          <div><dt>Termin</dt><dd>${ui.fmtDate(b.date)}, ${b.time}–${b.end}</dd></div>
          <div><dt>Klientka</dt><dd>${esc(b.client.name)}${b.demo ? ' <span class="badge badge-off">przykład</span>' : ''}<br><a href="tel:${esc(b.client.phone)}">${esc(b.client.phone)}</a>${b.client.email ? ` · <a href="mailto:${esc(b.client.email)}">${esc(b.client.email)}</a>` : ''}</dd></div>
          <div><dt>Do zapłaty</dt><dd>${money(b.toPay)}${b.discount ? ` <span class="small muted">(−${b.discount.percent}% ${esc(b.discount.label)})</span>` : ''}${b.voucher ? `<br><span class="small muted">bon ${esc(b.voucher.code)}: −${money(b.voucher.amount)} (cena ${money(b.total)})</span>` : ''}</dd></div>
          <div><dt>Skąd</dt><dd>${SOURCES[b.source] || 'strona'} · ${b.client.type}${b.lang === 'en' ? ' · EN' : ''} · kod ${esc(b.code)}</dd></div>
          ${b.notes ? `<div><dt>Uwagi</dt><dd>${esc(b.notes)}</dd></div>` : ''}
          ${b.status !== 'confirmed' || b.fee ? `<div><dt>Status</dt><dd>${statusBadge(b)} ${feeBadge(b)}</dd></div>` : ''}
        </dl>
        ${b.status === 'confirmed' ? `
          <details class="move-box"${past ? '' : ''}><summary>Przenieś na inny termin</summary>
            <div class="form-grid" style="margin-top:14px">
              <div class="field"><label for="mv-date">Nowy dzień</label><input id="mv-date" name="date" type="date" value="${b.date}"></div>
              <div class="field"><label for="mv-time">Nowa godzina</label><input id="mv-time" name="time" type="time" step="300" value="${b.time}"></div>
            </div>
            <label class="check"><input type="checkbox" name="notify" checked><span>Wyślij klientce SMS o nowym terminie</span></label>
            <button class="btn btn-primary btn-small" type="submit">Przenieś wizytę</button>
          </details>` : ''}
        <div class="modal-actions">
          ${b.status === 'confirmed' && !past ? '<button class="btn btn-outline" type="button" data-dlg-cancel>Odwołaj wizytę</button>' : ''}
          ${past && ['confirmed', 'done'].includes(b.status) ? '<button class="btn btn-outline" type="button" data-dlg-noshow>Nieobecność</button>' : ''}
          <button class="btn btn-outline" type="button" data-close>Zamknij</button>
        </div>
      </form>`,
    async (f, close) => {
      const v = (n) => f.elements[n].value;
      await withConfirm((force) => api('POST', `/api/admin/bookings/${b.id}/move`, { date: v('date'), time: v('time'), notify: f.elements.notify.checked, force }));
      close(); ui.toast(f.elements.notify.checked ? 'Wizyta przeniesiona. Klientka dostała SMS.' : 'Wizyta przeniesiona.'); rerender();
    },
    (dlg) => {
      dlg.addEventListener('click', async (e) => {
        if (e.target.closest('[data-dlg-cancel]')) {
          if (!confirmDialog('Odwołać wizytę?', 'Klientka dostanie SMS i e-mail z informacją. Opłata nie jest naliczana, bo odwołuje gabinet.')) return;
          dlg.remove(); act(() => api('POST', `/api/admin/bookings/${b.id}/cancel`, {}), 'Wizyta odwołana. Klientka dostała wiadomość.');
        }
        if (e.target.closest('[data-dlg-noshow]')) {
          if (!confirmDialog('Oznaczyć nieobecność?', `System naliczy opłatę ${JM.booking.lateCancelFeePercent}% ceny zabiegu zgodnie z regulaminem. Możesz ją później anulować w zakładce Wizyty.`)) return;
          dlg.remove(); act(() => api('POST', `/api/admin/bookings/${b.id}/no-show`, {}), 'Oznaczono nieobecność.');
        }
      });
    });
  }

  function blockDialog(date, time) {
    const end = time ? toTime(Math.min(toMin(time) + 60, 23 * 60 + 55)) : '14:00';
    openDialog(`
      <form class="modal-body" novalidate>
        <h2>Zablokuj czas</h2>
        <p class="small muted">Na przykład przerwa, wyjście albo szkolenie. Zablokowanego czasu nie da się zarezerwować online. Na cały dzień wolny użyj zakładki Godziny pracy.</p>
        <div class="form-grid">
          <div class="field"><label for="bl-date">Dzień</label><input id="bl-date" name="date" type="date" value="${date || S.isoDate(new Date())}"></div>
          <div class="field"><label for="bl-note">Opis <span class="opt">(opcjonalnie)</span></label><input id="bl-note" name="note" maxlength="120" placeholder="Np. przerwa"></div>
          <div class="field"><label for="bl-start">Od</label><input id="bl-start" name="start" type="time" step="300" value="${time || '13:00'}"></div>
          <div class="field"><label for="bl-end">Do</label><input id="bl-end" name="end" type="time" step="300" value="${end}"></div>
        </div>
        <div class="modal-actions"><button class="btn btn-primary" type="submit">Zablokuj</button><button class="btn btn-outline" type="button" data-close>Anuluj</button></div>
      </form>`,
    async (f, close) => {
      const r = await api('POST', '/api/admin/blocks', { date: f.elements.date.value, start: f.elements.start.value, end: f.elements.end.value, note: f.elements.note.value });
      close(); ui.toast(r.clash ? `Czas zablokowany. Uwaga: w tym czasie jest już ${r.clash} umówiona wizyta.` : 'Czas zablokowany.'); rerender();
    });
  }

  /* ---------- Galeria ---------- */
  const catName = (id) => { const c = JM.categories.find((x) => x.id === id); return c ? (c.namePl || c.name) : id; };
  const catOptions = (sel) => JM.categories.map((c) => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${esc(c.namePl || c.name)}</option>`).join('');
  function vGaleria() {
    const photos = data.photos;
    return `
      <form class="panel-card" id="gallery-form" novalidate>
        <h2>Dodaj zdjęcia</h2>
        <p class="small muted">Zdjęcia zmniejszą się automatycznie, a dane z aparatu (np. lokalizacja GPS) zostaną usunięte, zanim trafią na serwer. Najlepiej wgrywać zdjęcia „przed i po” jako jedno zdjęcie (kolaż).</p>
        <div class="form-grid">
          <div class="field span-2"><span class="label-text" id="g-files-label">Zdjęcia (JPG, PNG albo WebP)</span>
            <div class="file-pick"><input id="g-files" name="files" type="file" accept="image/jpeg,image/png,image/webp" multiple required aria-labelledby="g-files-label g-files-btn">
              <label for="g-files" class="btn btn-outline btn-small" id="g-files-btn">Wybierz zdjęcia</label><span class="small muted" id="g-files-name">Nie wybrano zdjęć</span></div></div>
          <div class="field"><label for="g-cat">Kategoria</label><select id="g-cat" name="category">${catOptions()}</select></div>
          <div class="field"><label for="g-note">Notatka o zgodzie <span class="opt">(widzi tylko panel)</span></label><input id="g-note" name="consentNote" maxlength="200" placeholder="Np. Anna K., zgoda podpisana 12.11.2026"></div>
          <div class="field"><label for="g-alt">Opis zdjęcia</label><input id="g-alt" name="altPl" maxlength="160" required placeholder="Np. Brwi pudrowe, efekt po wygojeniu"></div>
          <div class="field"><label for="g-alt-en">Opis po angielsku <span class="opt">(opcjonalnie)</span></label><input id="g-alt-en" name="altEn" maxlength="160" placeholder="E.g. Powder brows, healed result"></div>
        </div>
        <label class="check"><input type="checkbox" name="consent" required><span>Mam pisemną zgodę klientki (lub klientek) na publikację tych zdjęć na stronie<small>Bez zgody zdjęcie z twarzą to publikacja wizerunku bez podstawy prawnej. Zgodę przechowuj w gabinecie; klientka może ją wycofać, wtedy ukryj albo usuń zdjęcie.</small></span></label>
        <p class="small muted" id="g-progress" aria-live="polite"></p>
        <button class="btn btn-primary" type="submit">Dodaj do galerii</button>
      </form>
      <div class="panel-card">
        <h2>Zdjęcia w galerii (${photos.length})</h2>
        ${photos.length ? `<ul class="g-admin">${photos.map((g, i) => `
          <li class="${g.published ? '' : 'is-hidden'}">
            <img src="${g.thumb}" alt="${esc(g.altPl)}" width="${g.width}" height="${g.height}" loading="lazy">
            <div class="g-admin-body">
              <p><strong style="font-weight:500">${esc(g.altPl)}</strong><br><span class="small muted">${esc(catName(g.category))}${g.altEn ? ' · EN: ' + esc(g.altEn) : ''}</span></p>
              <p class="small muted">Zgoda: ${new Date(g.consentAt).toLocaleDateString('pl-PL')}${g.consentNote ? ' · ' + esc(g.consentNote) : ''}</p>
              <p>${g.published ? '<span class="badge badge-ok">widoczne na stronie</span>' : '<span class="badge badge-off">ukryte</span>'}</p>
              <div class="g-admin-actions">
                <button type="button" class="icon-btn" data-g-move="${g.id}" data-dir="-1" aria-label="Przesuń wcześniej" ${i === 0 ? 'disabled' : ''}>${ui.icons.arrowL}</button>
                <button type="button" class="icon-btn" data-g-move="${g.id}" data-dir="1" aria-label="Przesuń dalej" ${i === photos.length - 1 ? 'disabled' : ''}>${ui.icons.arrowR}</button>
                <button type="button" class="btn btn-outline btn-small" data-g-edit="${g.id}">Edytuj</button>
                <button type="button" class="btn btn-outline btn-small" data-g-toggle="${g.id}">${g.published ? 'Ukryj' : 'Pokaż'}</button>
                <button type="button" class="link-button small" data-g-del="${g.id}">Usuń</button>
              </div>
            </div>
          </li>`).join('')}</ul>` : '<p class="muted">Galeria jest pusta. Dopóki nie ma zdjęć, strona Galeria pokazuje odnośnik do Instagrama.</p>'}
      </div>`;
  }
  // Zmniejsza zdjęcie w przeglądarce i zapisuje je od nowa (bez EXIF, z prawidłowym obrotem)
  async function shrink(file, max, quality) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close && bmp.close();
    let blob = await new Promise((r) => c.toBlob(r, 'image/webp', quality));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', quality)); // starsze Safari
    const b64 = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
    return { b64, w, h };
  }
  async function uploadPhotos(f) {
    const files = [...f.elements.files.files];
    const prog = f.querySelector('#g-progress');
    if (!files.length) { ui.toast('Wybierz zdjęcia.'); return; }
    if (!f.elements.consent.checked) { ui.toast('Potwierdź zgodę klientki na publikację.'); f.elements.consent.focus(); return; }
    if (!f.elements.altPl.value.trim()) { ui.toast('Dodaj krótki opis zdjęcia.'); f.elements.altPl.focus(); return; }
    const btn = f.querySelector('[type=submit]'); btn.disabled = true;
    let ok = 0;
    try {
      for (const [i, file] of files.entries()) {
        prog.textContent = `Przygotowuję zdjęcie ${i + 1} z ${files.length}…`;
        const big = await shrink(file, 1800, 0.84), small = await shrink(file, 720, 0.8);
        await api('POST', '/api/admin/gallery', {
          image: big.b64, thumb: small.b64, width: big.w, height: big.h, category: f.elements.category.value,
          altPl: f.elements.altPl.value, altEn: f.elements.altEn.value, consent: true, consentNote: f.elements.consentNote.value
        });
        ok++;
      }
      ui.toast(ok === 1 ? 'Dodano zdjęcie do galerii.' : `Dodano ${ok} zdjęcia do galerii.`);
      await rerender();
    } catch (err) {
      prog.textContent = ''; btn.disabled = false;
      ui.toast((ok ? `Dodano ${ok}, potem błąd: ` : '') + (err.message || 'Nie udało się odczytać zdjęcia. Spróbuj zapisać je jako JPG.'));
    }
  }
  function galleryEdit(g) {
    openDialog(`
      <form class="modal-body" novalidate>
        <h2>Edytuj zdjęcie</h2>
        <img src="${g.thumb}" alt="" style="max-height:220px;width:auto;margin-bottom:18px">
        <div class="form-grid">
          <div class="field span-2"><label for="ge-alt">Opis zdjęcia</label><input id="ge-alt" name="altPl" maxlength="160" value="${esc(g.altPl)}"></div>
          <div class="field span-2"><label for="ge-alt-en">Opis po angielsku</label><input id="ge-alt-en" name="altEn" maxlength="160" value="${esc(g.altEn)}"></div>
          <div class="field"><label for="ge-cat">Kategoria</label><select id="ge-cat" name="category">${catOptions(g.category)}</select></div>
        </div>
        <div class="modal-actions"><button class="btn btn-primary" type="submit">Zapisz</button><button class="btn btn-outline" type="button" data-close>Anuluj</button></div>
      </form>`,
    async (f, close) => {
      await api('PATCH', '/api/admin/gallery/' + g.id, { altPl: f.elements.altPl.value, altEn: f.elements.altEn.value, category: f.elements.category.value });
      close(); ui.toast('Zapisano.'); rerender();
    });
  }

  /* ---------- Lista oczekujących ---------- */
  function vOczekujace() {
    const all = data.entries; const today = S.isoDate(new Date());
    const waiting = all.filter((e) => e.status === 'waiting'), closed = all.filter((e) => e.status !== 'waiting');
    const cats = [{ id: 'konsultacja', name: 'Konsultacja' }].concat(JM.categories.map((c) => ({ id: c.id, name: c.namePl || c.name })));
    const opts = cats.map((c) => `<optgroup label="${esc(c.name)}">${cache.prices.filter((t) => t.category === c.id).map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</optgroup>`).join('');
    const inTwo = new Date(); inTwo.setDate(inTwo.getDate() + 14);
    const smsInfo = (e) => (e.notices ? `SMS ${e.notices === 1 ? 'wysłany' : `wysłany ${e.notices}×`}, ostatni ${dt(e.notifiedAt)}` : '');
    const state = (e) => {
      if (e.status === 'booked') return '<span class="badge badge-ok">zarezerwowała</span>';
      if (e.status === 'expired') return '<span class="badge badge-off">okres minął</span>';
      return `<span class="badge">czeka</span>${e.freeNow ? `<br><span class="small muted">wolne dni w okresie: ${e.freeNow}</span>` : ''}`;
    };
    const table = (list, actions) => `<div class="table-scroll"><table class="table"><thead><tr><th>Klientka</th><th>Zabieg</th><th>Okres</th><th>Status</th><th>Zapis</th>${actions ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.map((e) => `<tr>
        <td>${esc(e.firstName)}${e.lang === 'en' ? ' <span class="badge">EN</span>' : ''}<br><a href="tel:${esc(e.phone)}">${esc(e.phone)}</a></td>
        <td>${esc(e.treatment)}</td>
        <td>${ui.fmtShort(e.from)} – ${ui.fmtShort(e.to)}</td>
        <td>${state(e)}${smsInfo(e) ? `<br><span class="small muted">${smsInfo(e)}</span>` : ''}</td>
        <td class="small">${dt(e.createdAt)}<br><span class="muted">${e.source === 'telefon' ? 'dodana w panelu' : 'przez stronę'}</span></td>
        ${actions ? `<td class="num"><button class="link-button small" type="button" data-wl-remove="${e.id}">Usuń</button></td>` : ''}</tr>`).join('')}
    </tbody></table></div>`;
    return `
      <div class="panel-card">
        <h2>Czekają na termin</h2>
        <p class="small muted">Klientka wybiera zabieg i okres, w którym nie ma wolnych terminów. Gdy w tym okresie zwolni się miejsce (ktoś odwoła albo przeniesie wizytę, zdejmiesz blokadę lub dzień wolny), dostaje SMS z linkiem do rezerwacji. Kilka osób czekających na ten sam zabieg dostaje SMS jednocześnie, termin ma ta, która pierwsza zarezerwuje. SMS-y wychodzą między 8:00 a 21:00, najwyżej jeden na 6 godzin dla jednej osoby. Gdy klientka zarezerwuje ten zabieg, znika z listy czekających.</p>
        ${waiting.length ? table(waiting, true) : '<p class="muted">Nikt teraz nie czeka. Formularz zapisu jest na stronie rezerwacji, pod kalendarzem.</p>'}
      </div>
      <details class="panel-card wl-add"${waiting.length ? '' : ' open'}>
        <summary><h2>Dodaj osobę z telefonu</h2></summary>
        <form id="waitlist-admin-form" novalidate>
          <div class="form-grid">
            <div class="field span-2"><label for="wa-t">Zabieg</label><select id="wa-t" name="treatmentId">${opts}</select></div>
            <div class="field"><label for="wa-from">Od</label><input id="wa-from" name="from" type="date" value="${today}" required></div>
            <div class="field"><label for="wa-to">Do</label><input id="wa-to" name="to" type="date" value="${S.isoDate(inTwo)}" required></div>
            <div class="field"><label for="wa-name">Imię</label><input id="wa-name" name="firstName" maxlength="60" autocomplete="off" required></div>
            <div class="field"><label for="wa-phone">Telefon</label><input id="wa-phone" name="phone" type="tel" maxlength="20" placeholder="+48 600 000 000" autocomplete="off" required></div>
            <div class="field"><label for="wa-lang">Język SMS-a</label><select id="wa-lang" name="lang"><option value="pl">polski</option><option value="en">angielski</option></select></div>
          </div>
          <p class="small muted">Powiedz klientce, że dostanie SMS o zwolnionym terminie i że może się wypisać przez link z wiadomości.</p>
          <button class="btn btn-primary" type="submit">Dodaj do listy</button>
        </form>
      </details>
      ${closed.length ? `<div class="panel-card"><h2>Zakończone</h2><p class="small muted">Dane znikają same 30 dni po końcu okresu oczekiwania.</p>${table(closed, true)}</div>` : ''}`;
  }

  /* ---------- Statystyki ---------- */
  let statsDays = 90;
  const MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  const MONTHS_IN = ['styczniu', 'lutym', 'marcu', 'kwietniu', 'maju', 'czerwcu', 'lipcu', 'sierpniu', 'wrześniu', 'październiku', 'listopadzie', 'grudniu'];
  const MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  const mIdx = (m) => Number(m.slice(5, 7)) - 1;
  const monthName = (m) => MONTHS[mIdx(m)] + ' ' + m.slice(0, 4);
  const plural = (n, one, few, many) => (n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);
  const nVisits = (n) => `${n} ${plural(n, 'wizyta', 'wizyty', 'wizyt')}`;
  const zl = (v) => Math.round(v).toLocaleString('pl-PL') + ' zł';
  const pctOf = (n, all) => (all ? Math.round((n / all) * 100) : 0);
  const SOURCE_NAMES = { online: 'Rezerwacja na stronie', telefon: 'Telefon', instagram: 'Instagram', 'osobiście': 'Osobiście w gabinecie', inne: 'Inne' };
  const PERIODS = [[30, '30 dni'], [90, '90 dni'], [365, '12 miesięcy']];

  // podziałka osi: 4–5 równych, okrągłych kroków
  function niceScale(max) {
    if (max <= 0) return { step: 500, top: 2000 };
    const raw = max / 4; const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw);
    return { step, top: Math.ceil(max / step) * step };
  }
  const tickLabel = (v, top) => (top >= 10000 ? (v ? Math.round(v / 1000) + ' tys.' : '0') : Math.round(v).toLocaleString('pl-PL')) + ' zł';

  function monthChart(st) {
    const ms = st.months;
    const { step, top } = niceScale(Math.max(...ms.map((m) => m.doneValue + m.plannedValue)));
    const ticks = []; for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
    const h = (v) => ((v / top) * 100).toFixed(2) + '%';
    return `
      <ul class="chart-legend" aria-hidden="true"><li><i class="key-done"></i>Odbyte</li><li><i class="key-plan"></i>Zaplanowane</li></ul>
      <div class="cc">
        <div class="cc-plot">
          ${ticks.map((v) => `<div class="cc-tick" style="bottom:${h(v)}"><span>${tickLabel(v, top)}</span></div>`).join('')}
          <div class="cc-cols">
            ${ms.map((m, i) => {
              const total = m.doneValue + m.plannedValue; const cur = m.month === st.thisMonth;
              return `<div class="cc-col${cur ? ' is-current' : ''}" tabindex="0" data-tip="months" data-i="${i}"
                aria-label="${monthName(m.month)}: odbyte ${zl(m.doneValue)}, zaplanowane ${zl(m.plannedValue)}">
                <div class="cc-stack" style="height:${h(total)}">
                  ${m.plannedValue > 0 ? `<i class="cc-plan" style="flex-grow:${m.plannedValue}"></i>` : ''}
                  ${m.doneValue > 0 ? `<i class="cc-done" style="flex-grow:${m.doneValue}"></i>` : ''}
                  ${cur && total > 0 ? `<b class="cc-cap">${zl(total)}</b>` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="cc-x" aria-hidden="true">${ms.map((m) => `<span${m.month === st.thisMonth ? ' class="is-current"' : ''}>${MONTHS_SHORT[mIdx(m.month)]}${mIdx(m.month) === 0 ? `<br>${m.month.slice(0, 4)}` : ''}</span>`).join('')}</div>
      </div>
      <details class="chart-table"><summary>Pokaż dane w tabeli</summary><div class="table-scroll"><table class="table">
        <thead><tr><th>Miesiąc</th><th class="num">Odbyte</th><th class="num">Wartość odbytych</th><th class="num">Zaplanowane</th><th class="num">Wartość zaplanowanych</th><th class="num">Odwołane przez klientkę</th><th class="num">Odwołane przez gabinet</th><th class="num">Nieobecności</th><th class="num">Opłaty za odwołania</th></tr></thead>
        <tbody>${ms.map((m) => `<tr><td>${monthName(m.month)}</td><td class="num">${m.done}</td><td class="num">${zl(m.doneValue)}</td><td class="num">${m.planned}</td><td class="num">${zl(m.plannedValue)}</td>
          <td class="num">${m.cancelledClient}</td><td class="num">${m.cancelledSalon}</td><td class="num">${m.noShow}</td><td class="num">${m.fees ? `${zl(m.fees)}${m.feesPaid ? ` <span class="small muted">(zapłacone ${zl(m.feesPaid)})</span>` : ''}` : '–'}</td></tr>`).join('')}</tbody>
      </table></div></details>`;
  }

  function barList(rows, kind, valueLabel) {
    if (!rows.length) return '<p class="muted">Brak danych w tym okresie.</p>';
    const max = Math.max(...rows.map((r) => r.n), 1);
    return `<div class="hb">${rows.map((r, i) => `
      <div class="hb-row" tabindex="0" data-tip="${kind}" data-i="${i}" aria-label="${esc(r.label)}: ${valueLabel(r)}">
        <span class="hb-name">${esc(r.label)}</span>
        <span class="hb-track"><i style="width:calc((100% - 52px) * ${(r.n / max).toFixed(4)})"></i><b>${valueLabel(r)}</b></span>
      </div>`).join('')}</div>`;
  }
  function statsRows(st) {
    const all = st.treatments.reduce((s, t) => s + t.n, 0);
    const every = st.treatments.map((t) => ({ label: t.name, n: t.n, value: t.value, share: pctOf(t.n, all) }));
    // wykres pokazuje 8 najczęstszych, reszta jest w tabeli i w podsumowaniu pod wykresem
    const treat = every.slice(0, 8);
    const rest = every.slice(8);
    const made = st.sources.reduce((s, x) => s + x.n, 0);
    const sources = st.sources.map((x) => ({ label: SOURCE_NAMES[x.source] || x.source, n: x.n, share: pctOf(x.n, made) }));
    return { treat, every, rest, sources, all, made };
  }

  function vStatystyki() {
    const st = data.stats; const m = st.month; const r = st.recent;
    const { treat, every, rest, sources, all, made } = statsRows(st);
    const period = PERIODS.find((p) => p[0] === st.days)[1];
    const lost = r.cancelled + r.noShow;
    return `
      ${st.hasDemo ? '<p class="small muted panel-inline-note">Statystyki liczą też dane przykładowe. Po ich usunięciu zostaną tylko prawdziwe wizyty.</p>' : ''}
      <div class="stat-row">
        <div class="stat"><b>${zl(m.doneValue)}</b><span>odbyte zabiegi w ${MONTHS_IN[mIdx(st.thisMonth)]}, ${nVisits(m.done)}</span></div>
        <div class="stat"><b>${zl(m.plannedValue)}</b><span>zaplanowane do końca miesiąca, ${nVisits(m.planned)}</span></div>
        <div class="stat"><b>${st.newClients}</b><span>${plural(st.newClients, 'nowa klientka', 'nowe klientki', 'nowych klientek')} w ostatnich 30 dniach</span></div>
        <div class="stat"><b>${r.n ? pctOf(lost, r.n) + '%' : '–'}</b><span>wizyt odwołanych lub nieodbytych w ostatnich 30 dniach (${r.cancelled} odw., ${r.noShow} nieob.)</span></div>
      </div>
      <div class="panel-card">
        <h2>Wartość wizyt miesiąc po miesiącu</h2>
        <p class="small muted">Ceny po rabatach. Odwołane wizyty i nieobecności nie wchodzą do sumy, znajdziesz je w tabeli.</p>
        ${monthChart(st)}
      </div>
      <div class="stats-filter" role="group" aria-label="Okres dla zestawień poniżej">
        <span class="small muted">Okres:</span>
        ${PERIODS.map(([d, label]) => `<button type="button" class="chip" data-stats-days="${d}" aria-pressed="${d === st.days}">${label}</button>`).join('')}
      </div>
      <div class="stats-grid">
        <div class="panel-card">
          <h2>Najczęstsze zabiegi</h2>
          <p class="small muted">Wizyty odbyte i zaplanowane na dziś, z ostatnich ${period}, razem ${nVisits(all)}.</p>
          ${barList(treat, 'treat', (x) => String(x.n))}
          ${rest.length ? `<p class="small muted hb-rest">Pozostałe ${rest.length} ${plural(rest.length, 'zabieg', 'zabiegi', 'zabiegów')}: razem ${nVisits(rest.reduce((n, t) => n + t.n, 0))}. Wszystkie są w tabeli.</p>` : ''}
          ${treat.length ? `<details class="chart-table"><summary>Pokaż dane w tabeli</summary><table class="table"><thead><tr><th>Zabieg</th><th class="num">Wizyty</th><th class="num">Udział</th><th class="num">Wartość</th></tr></thead>
            <tbody>${every.map((t) => `<tr><td>${esc(t.label)}</td><td class="num">${t.n}</td><td class="num">${t.share}%</td><td class="num">${zl(t.value)}</td></tr>`).join('')}</tbody></table></details>` : ''}
        </div>
        <div>
          <div class="panel-card">
            <h2>Skąd przychodzą rezerwacje</h2>
            <p class="small muted">Wizyty zapisane w ostatnich ${{ 30: '30 dniach', 90: '90 dniach', 365: '12 miesiącach' }[st.days]}, razem ${made}.</p>
            ${barList(sources, 'src', (x) => x.share + '%')}
            ${sources.length ? `<details class="chart-table"><summary>Pokaż dane w tabeli</summary><table class="table"><thead><tr><th>Źródło</th><th class="num">Rezerwacje</th><th class="num">Udział</th></tr></thead>
              <tbody>${sources.map((x) => `<tr><td>${esc(x.label)}</td><td class="num">${x.n}</td><td class="num">${x.share}%</td></tr>`).join('')}</tbody></table></details>` : ''}
          </div>
          <div class="panel-card">
            <h2>Bony podarunkowe</h2>
            <dl class="stats-dl">
              <div><dt>Sprzedane w tym okresie</dt><dd>${zl(st.vouchers.soldValue)} <span class="small muted">(${st.vouchers.sold} ${plural(st.vouchers.sold, 'bon', 'bony', 'bonów')})</span></dd></div>
              <div><dt>Wykorzystane w tym okresie</dt><dd>${zl(st.vouchers.used)}</dd></div>
              <div><dt>Do wykorzystania na ważnych bonach</dt><dd>${zl(st.vouchers.open)}</dd></div>
            </dl>
          </div>
        </div>
      </div>`;
  }

  // dymek z wartościami: ten sam po najechaniu myszą i po przejściu klawiszem Tab
  let tipEl = null;
  function tipRow(cls, strong, rest) {
    const row = document.createElement('div'); row.className = 'tip-row';
    if (cls) { const k = document.createElement('i'); k.className = cls; row.append(k); }
    const b = document.createElement('b'); b.textContent = strong; row.append(b, document.createTextNode(' ' + rest));
    return row;
  }
  function showTip(el) {
    const st = data && data.stats; if (!st) return;
    const i = Number(el.dataset.i); const kind = el.dataset.tip;
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'chart-tip'; tipEl.setAttribute('role', 'tooltip'); document.body.append(tipEl); }
    tipEl.replaceChildren();
    const title = document.createElement('p'); title.className = 'tip-title'; tipEl.append(title);
    if (kind === 'months') {
      const m = st.months[i]; title.textContent = monthName(m.month);
      tipEl.append(tipRow('key-done', zl(m.doneValue), `odbyte, ${nVisits(m.done)}`), tipRow('key-plan', zl(m.plannedValue), `zaplanowane, ${nVisits(m.planned)}`));
      const lostM = m.cancelledClient + m.cancelledSalon;
      if (lostM || m.noShow) tipEl.append(tipRow('', String(lostM), `${plural(lostM, 'odwołana', 'odwołane', 'odwołanych')}, ${m.noShow} ${plural(m.noShow, 'nieobecność', 'nieobecności', 'nieobecności')}`));
    } else {
      const { treat, sources } = statsRows(st);
      const r = (kind === 'treat' ? treat : sources)[i]; title.textContent = r.label;
      if (kind === 'treat') tipEl.append(tipRow('', nVisits(r.n), `(${r.share}% wszystkich)`), tipRow('', zl(r.value), 'wartość'));
      else tipEl.append(tipRow('', r.share + '%', `rezerwacji, ${r.n} ${plural(r.n, 'wizyta', 'wizyty', 'wizyt')}`));
    }
    const box = (el.querySelector('.cc-stack, .hb-track i') || el).getBoundingClientRect();
    tipEl.style.display = 'block';
    const w = tipEl.offsetWidth, hgt = tipEl.offsetHeight;
    let left = kind === 'months' ? box.left + box.width / 2 - w / 2 : box.right - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = box.top - hgt - 10; if (top < 8) top = box.bottom + 10;
    tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
  }
  function hideTip() { if (tipEl) tipEl.style.display = 'none'; }

  /* ---------- Bony podarunkowe ---------- */
  function vBony() {
    const list = data.vouchers;
    const inYear = new Date(); inYear.setFullYear(inYear.getFullYear() + 1);
    const state = (v) => v.status === 'void' ? '<span class="badge badge-off">unieważniony</span>' : !v.valid ? '<span class="badge badge-off">po terminie</span>' : v.balance <= 0 ? '<span class="badge">wykorzystany</span>' : '<span class="badge badge-ok">aktywny</span>';
    return `
      <form class="panel-card" id="voucher-form" novalidate>
        <h2>Wystaw bon</h2>
        <p class="small muted">Bon dostaje unikalny kod. Klientka wpisuje go przy rezerwacji online albo podaje w gabinecie. Z salda schodzi kwota odbytej wizyty, więc bon można wykorzystać w kilku częściach.</p>
        <div class="form-grid">
          <div class="field"><label for="v-amount">Kwota (zł)</label><input id="v-amount" name="amount" type="number" min="10" step="10" value="300" required></div>
          <div class="field"><label for="v-until">Ważny do</label><input id="v-until" name="validUntil" type="date" value="${S.isoDate(inYear)}" required></div>
          <div class="field"><label for="v-to">Dla kogo <span class="opt">(na bonie)</span></label><input id="v-to" name="recipient" maxlength="80" placeholder="Np. Anny"></div>
          <div class="field"><label for="v-from">Od kogo <span class="opt">(na bonie)</span></label><input id="v-from" name="giver" maxlength="80" placeholder="Np. Kasia i Tomek"></div>
          <div class="field span-2"><label for="v-msg">Dedykacja <span class="opt">(na bonie, opcjonalnie)</span></label><input id="v-msg" name="message" maxlength="240" placeholder="Np. Wszystkiego najlepszego z okazji urodzin!"></div>
          <div class="field span-2"><label for="v-paid">Płatność <span class="opt">(widzi tylko panel)</span></label><input id="v-paid" name="paidNote" maxlength="120" placeholder="Np. zapłacono kartą w gabinecie 6.11"></div>
        </div>
        <button class="btn btn-primary" type="submit">Wystaw bon</button>
      </form>
      <div class="panel-card">
        <h2>Bony (${list.length})</h2>
        ${list.length ? `<table class="table"><thead><tr><th>Kod</th><th>Dla kogo</th><th class="num">Kwota</th><th class="num">Do wykorzystania</th><th>Ważny do</th><th>Status</th><th></th></tr></thead><tbody>
          ${list.map((v) => `<tr>
            <td><strong style="font-weight:500;letter-spacing:.04em">${esc(v.code)}</strong>${v.paidNote ? `<br><span class="small muted">${esc(v.paidNote)}</span>` : ''}</td>
            <td>${esc(v.recipient || '—')}${v.giver ? `<br><span class="small muted">od: ${esc(v.giver)}</span>` : ''}</td>
            <td class="num">${money(v.amount)}</td>
            <td class="num">${money(v.available) === 'bezpłatnie' ? '0 zł' : money(v.available)}${v.available !== v.balance ? `<br><span class="small muted">saldo ${money(v.balance)}, reszta zarezerwowana</span>` : ''}</td>
            <td>${new Date(v.validUntil + 'T12:00').toLocaleDateString('pl-PL')}</td>
            <td>${state(v)}</td>
            <td class="num v-actions">
              <a class="btn btn-outline btn-small" href="bon.html?id=${v.id}" target="_blank" rel="noopener">Drukuj</a>
              ${v.valid && v.available > 0 ? `<button type="button" class="btn btn-outline btn-small" data-v-redeem="${v.id}">Rozlicz</button>` : ''}
              <button type="button" class="link-button small" data-v-history="${v.id}">Historia</button>
              <button type="button" class="link-button small" data-v-void="${v.id}" data-void="${v.status === 'void' ? 0 : 1}">${v.status === 'void' ? 'Przywróć' : 'Unieważnij'}</button>
            </td></tr>`).join('')}
        </tbody></table>` : '<p class="muted">Nie wystawiono jeszcze żadnego bonu.</p>'}
        <p class="small muted" style="margin-top:14px">„Rozlicz” służy do bonów wykorzystanych w gabinecie bez rezerwacji przez stronę. Wizyty zarezerwowane z kodem bonu rozliczają się same po odbytej wizycie; nieobecność zwraca kwotę na bon.</p>
      </div>`;
  }
  function voucherRedeem(v) {
    openDialog(`
      <form class="modal-body" novalidate>
        <h2>Rozlicz bon ${esc(v.code)}</h2>
        <p class="small muted">Do wykorzystania: ${money(v.available)}. Kwota zejdzie z salda bonu.</p>
        <div class="form-grid">
          <div class="field"><label for="vr-amount">Kwota (zł)</label><input id="vr-amount" name="amount" type="number" min="1" step="1" max="${v.available}" value="${v.available}"></div>
          <div class="field"><label for="vr-note">Za co <span class="opt">(opcjonalnie)</span></label><input id="vr-note" name="note" maxlength="160" placeholder="Np. mezoterapia 12.11"></div>
        </div>
        <div class="modal-actions"><button class="btn btn-primary" type="submit">Rozlicz</button><button class="btn btn-outline" type="button" data-close>Anuluj</button></div>
      </form>`,
    async (f, close) => {
      await api('POST', `/api/admin/vouchers/${v.id}/redeem`, { amount: Number(f.elements.amount.value), note: f.elements.note.value });
      close(); ui.toast('Bon rozliczony.'); rerender();
    });
  }
  function voucherHistory(v) {
    const rows = v.uses.map((u) => `<tr><td>${dt(u.at)}</td><td>${u.booking_id ? `wizyta ${u.date ? ui.fmtShort(u.date) + ', ' + u.time : ''} ${esc(u.treatment_name || '')}` : esc(u.note || 'rozliczenie w gabinecie')}</td><td class="num">−${money(u.amount)}</td></tr>`)
      .concat(v.planned.map((b) => `<tr><td class="muted">zaplanowane</td><td>wizyta ${ui.fmtShort(b.date)}, ${b.time} ${esc(b.treatment_name)}</td><td class="num muted">−${money(b.voucher_amount)}</td></tr>`));
    openDialog(`
      <div class="modal-body">
        <h2>Bon ${esc(v.code)}</h2>
        <p class="small muted">Wystawiony ${dt(v.createdAt)} przez ${esc(v.createdBy)} na ${money(v.amount)}. Saldo: ${money(v.balance) === 'bezpłatnie' ? '0 zł' : money(v.balance)}.</p>
        ${rows.length ? `<table class="table"><tbody>${rows.join('')}</tbody></table>` : '<p class="muted">Bon nie był jeszcze używany.</p>'}
        <div class="modal-actions"><button class="btn btn-outline" type="button" data-close>Zamknij</button></div>
      </div>`);
  }

  /* ---------- Dane dla widoków ---------- */
  async function loadView() {
    const today = new Date(); const past = new Date(); past.setDate(past.getDate() - 30);
    const loaders = {
      pulpit: async () => ({ overview: await api('GET', '/api/admin/overview') }),
      kalendarz: async () => ({ calendar: await api('GET', `/api/admin/calendar?from=${S.isoDate(calWeek)}&to=${S.isoDate(addDays(calWeek, 6))}`) }),
      wizyty: async () => (await api('GET', `/api/admin/bookings?from=${S.isoDate(past)}`)),
      klientki: async () => (await api('GET', '/api/admin/clients')),
      oczekujace: async () => { await ensureLists(); return api('GET', '/api/admin/waitlist'); },
      statystyki: async () => ({ stats: await api('GET', `/api/admin/stats?days=${statsDays}`) }),
      zabiegi: async () => (await api('GET', '/api/admin/prices')),
      promocje: async () => (await api('GET', '/api/admin/promos')),
      galeria: async () => (await api('GET', '/api/admin/gallery')),
      bony: async () => (await api('GET', '/api/admin/vouchers')),
      wiadomosci: async () => {
        const [r, m, c] = await Promise.all([api('GET', '/api/admin/reminders'), api('GET', '/api/admin/messages'), api('GET', '/api/admin/clients')]);
        mode = m.mode; return { reminders: r.reminders, messages: m.messages, clients: c.clients };
      },
      godziny: async () => (await api('GET', '/api/admin/days-off')),
      konto: async () => { const [backup, ical] = await Promise.all([api('GET', '/api/admin/backup'), api('GET', '/api/admin/ical')]); return { backup, ical }; }
    };
    data = await loaders[view]();
    void today;
  }

  function shell(content) {
    const title = views.find((v) => v[0] === view)[1];
    return `
      <div class="admin">
        <aside class="admin-side">
          <img src="assets/img/logo-gold.webp" alt="${JM.salon.brand}">
          <nav aria-label="Panel gabinetu"><ul class="admin-nav">
            ${views.map(([id, label]) => `<li><button type="button" data-view="${id}" ${id === view ? 'aria-current="true"' : ''}>${label}</button></li>`).join('')}
          </ul></nav>
          <div class="admin-side-foot">
            <p class="admin-who">${esc(admin.name)}<br><span>${esc(admin.role)}</span></p>
            <button type="button" class="link-button" data-view="konto">Zmień hasło</button>
            <a href="index.html">Zobacz stronę</a>
            <button type="button" class="link-button" data-admin-logout>Wyloguj się</button>
          </div>
        </aside>
        <div class="admin-main">
          <div class="admin-top"><h1>${title}</h1><div class="admin-top-side">
            ${LIVE_VIEWS.includes(view) ? '<span class="live-dot" title="Nowe rezerwacje pojawiają się tu same, bez odświeżania">na żywo</span>' : ''}
            ${'Notification' in window && Notification.permission === 'default' ? '<button type="button" class="link-button small" data-notify-on>Włącz powiadomienia</button>' : ''}
            ${mode.sms === 'test' || mode.email === 'test' ? '<span class="demo-flag">Tryb testowy wiadomości</span>' : ''}</div></div>
          ${content}
        </div>
      </div>`;
  }
  async function render(scroll) {
    hideTip();
    if (!admin) { root.innerHTML = loginView(); return; }
    try {
      await loadView();
      const fn = { pulpit: vPulpit, kalendarz: vKalendarz, wizyty: vWizyty, oczekujace: vOczekujace, klientki: vKlientki, statystyki: vStatystyki, zabiegi: vZabiegi, promocje: vPromocje, bony: vBony, galeria: vGaleria, wiadomosci: vWiadomosci, godziny: vGodziny, konto: vKonto }[view];
      root.innerHTML = shell(fn());
    } catch (err) {
      if (err.status === 401) { admin = null; root.innerHTML = loginView('Sesja wygasła. Zaloguj się ponownie.'); return; }
      root.innerHTML = shell(`<div class="panel-card"><p class="form-msg" role="alert">${esc(err.message)}</p></div>`);
    }
    if (view === 'wiadomosci') updateCount();
    if (view === 'kalendarz') {
      // na telefonie przewijamy kalendarz do dzisiejszego dnia
      const sc = root.querySelector('.wk-scroll'), t = root.querySelector('.wk-day.is-today');
      if (sc && t && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = t.offsetLeft - 56;
    }
    if (scroll) window.scrollTo(0, 0);
  }
  function rerender() { const y = window.scrollY; return render().then(() => window.scrollTo(0, y)); }

  function loginView(err) {
    return `
      <div class="admin-login">
        <form class="card" id="admin-login" novalidate>
          <img src="assets/img/logo.webp" alt="${JM.salon.brand}">
          <h1 style="font-size:1.75rem">Panel gabinetu</h1>
          ${err ? `<p class="form-msg" role="alert">${esc(err)}</p>` : ''}
          <div class="field"><label for="a-email">E-mail</label><input id="a-email" type="email" autocomplete="username" value="${local ? esc(JM.panelAccounts[0].email) : ''}"></div>
          <div class="field"><label for="a-pass">Hasło</label><input id="a-pass" type="password" autocomplete="current-password">
            ${local ? `<span class="field-hint">Lokalnie hasło startowe to „demo” (zmienisz je w zakładce Moje konto). Konta: ${JM.panelAccounts.map((a) => a.email).join(', ')}.</span>` : ''}</div>
          <button class="btn btn-primary btn-block" type="submit">Zaloguj się</button>
          <p class="small" style="margin-top:18px"><a href="index.html">Wróć na stronę</a></p>
        </form>
      </div>`;
  }
  function updateCount() {
    const ta = document.getElementById('c-text'); const out = document.getElementById('c-count'); if (!ta || !out) return;
    if (campaignChannel !== 'sms') { out.textContent = ''; return; }
    const s = segments(ta.value);
    out.textContent = `${ta.value.length} znaków, ${s.parts} SMS${s.parts > 1 ? 'y' : ''} na odbiorczynię.${s.gsm ? '' : ' Polskie znaki skracają SMS do 70 znaków.'}`;
  }
  async function act(fn, okText) {
    try { const r = await fn(); if (okText) ui.toast(typeof okText === 'function' ? okText(r) : okText); await rerender(); } catch (err) { ui.toast(err.message); }
  }

  /* ---------- Zdarzenia ---------- */
  // dymki na wykresach w statystykach
  root.addEventListener('pointerover', (e) => { const el = e.target.closest('[data-tip]'); if (el) showTip(el); });
  root.addEventListener('pointerout', (e) => { const el = e.target.closest('[data-tip]'); if (el && !el.contains(e.relatedTarget)) hideTip(); });
  root.addEventListener('focusin', (e) => { const el = e.target.closest('[data-tip]'); if (el) showTip(el); });
  root.addEventListener('focusout', (e) => { if (e.target.closest('[data-tip]')) hideTip(); });
  window.addEventListener('scroll', hideTip, { passive: true });

  root.addEventListener('click', async (e) => {
    const el = e.target.closest('button'); if (!el) return;
    if (el.dataset.view) { view = el.dataset.view; render(true); return; }
    if (el.dataset.wlRemove) {
      if (!confirmDialog('Usunąć z listy oczekujących?', 'Klientka nie dostanie już SMS-a o wolnym terminie. Jej dane znikną z listy.')) return;
      return act(() => api('DELETE', `/api/admin/waitlist/${el.dataset.wlRemove}`), 'Usunięto z listy.');
    }
    if (el.dataset.statsDays) {
      statsDays = Number(el.dataset.statsDays);
      root.querySelectorAll('.stats-grid').forEach((g) => { g.style.opacity = '.45'; });
      render(); return;
    }
    if (el.hasAttribute('data-admin-logout')) { await api('POST', '/api/admin/logout', {}); admin = null; stopLive(); render(); return; }
    if (el.hasAttribute('data-clear-demo')) {
      if (!confirmDialog('Usunąć dane przykładowe?', 'Przykładowe klientki i ich wizyty znikną z bazy. Prawdziwe dane zostają.')) return;
      return act(() => api('POST', '/api/admin/demo/clear', {}), 'Usunięto dane przykładowe.');
    }
    if (el.dataset.cancel) {
      if (!confirmDialog('Odwołać wizytę?', 'Klientka dostanie SMS i e-mail z informacją. Opłata nie jest naliczana, bo odwołuje gabinet.')) return;
      return act(() => api('POST', `/api/admin/bookings/${el.dataset.cancel}/cancel`, {}), 'Wizyta odwołana. Klientka dostała wiadomość.');
    }
    if (el.dataset.noshow) {
      if (!confirmDialog('Oznaczyć nieobecność?', `System naliczy opłatę ${JM.booking.lateCancelFeePercent}% ceny zabiegu zgodnie z regulaminem. Możesz ją później anulować.`)) return;
      return act(() => api('POST', `/api/admin/bookings/${el.dataset.noshow}/no-show`, {}), 'Oznaczono nieobecność.');
    }
    if (el.dataset.fee) return act(() => api('POST', `/api/admin/bookings/${el.dataset.fee}/fee`, { status: el.dataset.status }), el.dataset.status === 'paid' ? 'Opłata oznaczona jako zapłacona.' : 'Opłata anulowana.');
    if (el.hasAttribute('data-base-prices')) { root.querySelectorAll('.price-input').forEach((i) => { i.value = i.dataset.base; }); ui.toast('Wpisano ceny z pliku. Kliknij „Zapisz ceny”, żeby je zatwierdzić.'); return; }
    if (el.dataset.unblock) return act(() => api('DELETE', '/api/admin/days-off/' + el.dataset.unblock, {}), 'Dzień odblokowany.');
    if (el.dataset.delPromo) {
      if (!confirmDialog('Usunąć promocję?', 'Jeśli tylko chcesz ją na chwilę wyłączyć, użyj przełącznika.')) return;
      return act(() => api('DELETE', '/api/admin/promos/' + el.dataset.delPromo, {}), 'Promocja usunięta.');
    }
    if (el.dataset.channel) { campaignChannel = el.dataset.channel; rerender(); }
    if (el.hasAttribute('data-notify-on')) {
      Notification.requestPermission().then((p) => { ui.toast(p === 'granted' ? 'Powiadomienia włączone: nowa rezerwacja pokaże się na ekranie, nawet gdy panel jest w tle.' : 'Powiadomienia wyłączone. Nowe rezerwacje i tak pojawią się w panelu.'); rerender(); });
      return;
    }
    if (el.hasAttribute('data-copy-ical')) {
      const inp = document.getElementById('ical-url');
      try { await navigator.clipboard.writeText(inp.value); } catch (err) { inp.select(); document.execCommand && document.execCommand('copy'); }
      ui.toast('Skopiowano link do kalendarza.'); return;
    }
    if (el.hasAttribute('data-renew-ical')) {
      if (!confirmDialog('Wygenerować nowy link?', 'Stary link przestanie działać. Kalendarz trzeba będzie dodać w telefonie od nowa.')) return;
      return act(() => api('POST', '/api/admin/ical/renew', {}), 'Nowy link gotowy. Dodaj kalendarz w telefonie ponownie.');
    }
    if (el.hasAttribute('data-backup-now')) return act(() => api('POST', '/api/admin/backup', {}), 'Kopia zapasowa gotowa.');
    if (el.dataset.vRedeem) { voucherRedeem(data.vouchers.find((x) => String(x.id) === el.dataset.vRedeem)); return; }
    if (el.dataset.vHistory) { voucherHistory(data.vouchers.find((x) => String(x.id) === el.dataset.vHistory)); return; }
    if (el.dataset.vVoid) {
      const on = el.dataset.void === '1';
      if (on && !confirmDialog('Unieważnić bon?', 'Bonu nie da się wtedy użyć przy rezerwacji ani w gabinecie. Możesz go później przywrócić.')) return;
      return act(() => api('POST', `/api/admin/vouchers/${el.dataset.vVoid}/void`, { void: on }), on ? 'Bon unieważniony.' : 'Bon przywrócony.');
    }
    if (el.dataset.gMove) return act(() => api('POST', `/api/admin/gallery/${el.dataset.gMove}/move`, { dir: Number(el.dataset.dir) }));
    if (el.dataset.gToggle) { const g = data.photos.find((x) => String(x.id) === el.dataset.gToggle); return act(() => api('PATCH', '/api/admin/gallery/' + g.id, { published: !g.published }), g.published ? 'Zdjęcie ukryte na stronie.' : 'Zdjęcie widoczne na stronie.'); }
    if (el.dataset.gEdit) { galleryEdit(data.photos.find((x) => String(x.id) === el.dataset.gEdit)); return; }
    if (el.dataset.gDel) {
      if (!confirmDialog('Usunąć zdjęcie?', 'Zdjęcie zniknie ze strony i z serwera. Tej operacji nie można cofnąć.')) return;
      return act(() => api('DELETE', '/api/admin/gallery/' + el.dataset.gDel, {}), 'Zdjęcie usunięte.');
    }
    if (el.dataset.week !== undefined) { const n = Number(el.dataset.week); calWeek = n ? addDays(calWeek, 7 * n) : mondayOf(new Date()); rerender(); return; }
    if (el.hasAttribute('data-new-booking')) { newBookingDialog(); return; }
    if (el.hasAttribute('data-new-block')) { blockDialog(); return; }
    if (el.dataset.booking) { const b = data.calendar.bookings.find((x) => String(x.id) === el.dataset.booking); if (b) bookingDialog(b); return; }
    if (el.dataset.block) {
      const x = data.calendar.blocks.find((z) => String(z.id) === el.dataset.block);
      if (x && confirmDialog('Usunąć blokadę?', `${ui.fmtDate(x.date)}, ${x.start}–${x.end}${x.note ? ' (' + x.note + ')' : ''}. Ten czas znów będzie dostępny do rezerwacji online.`)) act(() => api('DELETE', '/api/admin/blocks/' + x.id, {}), 'Blokada usunięta.');
    }
  });
  // klik w wolne miejsce kalendarza = nowa wizyta o tej godzinie (zaokrąglonej do 15 minut)
  root.addEventListener('click', (e) => {
    const day = e.target.closest('.wk-day'); if (!day || e.target.closest('button')) return;
    const cal = data.calendar; if (!cal) return;
    const lo = Math.floor(Math.min(cal.range[0], ...cal.bookings.map((b) => toMin(b.time)), ...cal.blocks.map((x) => toMin(x.start))) / 60) * 60;
    const min = lo + Math.floor((e.clientY - day.getBoundingClientRect().top) / PPM / 15) * 15;
    newBookingDialog(day.dataset.date, toTime(Math.max(0, Math.min(min, 23 * 60 + 45))));
  });
  // proste potwierdzenie (window.confirm jest czytelne i dostępne także z klawiatury)
  function confirmDialog(title, text) { return window.confirm(title + '\n\n' + text); }

  root.addEventListener('input', (e) => {
    if (e.target.id === 'q') {
      query = e.target.value; const pos = e.target.selectionStart;
      root.querySelector('.admin-main').innerHTML = root.querySelector('.admin-main .admin-top').outerHTML + vKlientki();
      const q = document.getElementById('q'); q.focus(); q.setSelectionRange(pos, pos);
    }
    if (e.target.id === 'c-text') updateCount();
  });
  root.addEventListener('change', (e) => {
    if (e.target.id !== 'g-files') return;
    const n = e.target.files.length, out = document.getElementById('g-files-name');
    out.textContent = !n ? 'Nie wybrano zdjęć' : n === 1 ? e.target.files[0].name : `${n} ${n < 5 ? 'zdjęcia' : 'zdjęć'}: ${[...e.target.files].slice(0, 3).map((f) => f.name).join(', ')}${n > 3 ? '…' : ''}`;
  });
  root.addEventListener('change', (e) => {
    const id = e.target.dataset.promo; if (!id) return;
    act(() => api('PATCH', '/api/admin/promos/' + id, { active: e.target.checked }), e.target.checked ? 'Promocja włączona.' : 'Promocja wyłączona.');
  });
  root.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    if (f.id === 'admin-login') {
      try {
        const r = await api('POST', '/api/admin/login', { email: f.querySelector('#a-email').value.trim(), password: f.querySelector('#a-pass').value });
        admin = r.admin; view = admin.mustChange ? 'konto' : 'pulpit'; render(true); startLive();
      } catch (err) { root.innerHTML = loginView(err.message); }
      return;
    }
    if (f.id === 'gallery-form') return uploadPhotos(f);
    if (f.id === 'waitlist-admin-form') {
      const v = (n) => f.elements[n].value.trim();
      try {
        await api('POST', '/api/admin/waitlist', { treatmentId: v('treatmentId'), from: v('from'), to: v('to'), firstName: v('firstName'), phone: v('phone'), lang: v('lang') });
        await rerender(); ui.toast('Dodano do listy oczekujących.');
      } catch (err) { ui.toast(err.message); }
      return;
    }
    if (f.id === 'voucher-form') {
      const v = (n) => f.elements[n].value.trim();
      try {
        const r = await api('POST', '/api/admin/vouchers', { amount: Number(v('amount')), validUntil: v('validUntil'), recipient: v('recipient'), giver: v('giver'), message: v('message'), paidNote: v('paidNote') });
        await rerender();
        ui.toast(`Bon ${r.voucher.code} wystawiony. Kliknij „Drukuj”, żeby przygotować go do wręczenia.`);
      } catch (err) { ui.toast(err.message); }
      return;
    }
    if (f.id === 'prices-form') {
      const prices = {}; f.querySelectorAll('.price-input').forEach((i) => { if (i.value !== '') prices[i.name] = Number(i.value); });
      return act(() => api('PUT', '/api/admin/prices', { prices }), 'Zapisano ceny.');
    }
    if (f.id === 'promo-form') {
      const v = (n) => f.elements[n].value.trim();
      return act(() => api('POST', '/api/admin/promos', { title: v('title'), text: v('text'), percent: Number(v('percent')), from: v('from'), to: v('to'), categories: v('cat') === 'all' ? 'all' : [v('cat')], membersOnly: v('who') === 'members' }), 'Dodano promocję.');
    }
    if (f.id === 'campaign-form') {
      const text = f.elements.text.value.trim(); const subject = f.elements.subject ? f.elements.subject.value.trim() : '';
      if (!window.confirm('Wysłać kampanię do wszystkich klientek ze zgodą?')) return;
      return act(() => api('POST', '/api/admin/campaign', { channel: campaignChannel, text, subject }), (r) => `Kampania wysłana do ${r.recipients} klientek${mode[campaignChannel] === 'test' ? ' (tryb testowy)' : ''}.`);
    }
    if (f.id === 'dayoff-form') {
      const date = f.elements.date.value; if (!date) { ui.toast('Wybierz dzień.'); return; }
      return act(() => api('POST', '/api/admin/days-off', { date, note: f.elements.note.value }), (r) => r.clash ? `Dzień zablokowany. Uwaga: są na niego umówione wizyty (${r.clash}). Odwołaj je w zakładce Wizyty.` : 'Dzień zablokowany w kalendarzu.');
    }
    if (f.id === 'pass-form') {
      try { await api('POST', '/api/admin/password', { current: f.elements.current.value, next: f.elements.next.value }); admin.mustChange = false; f.reset(); ui.toast('Hasło zmienione.'); }
      catch (err) { ui.toast(err.message); }
    }
  });

  api('GET', '/api/admin/me').then((r) => { admin = r.admin; mode = r.mode; render(); if (admin) startLive(); }).catch(() => { root.innerHTML = loginView('Nie udało się połączyć z serwerem.'); });
});
