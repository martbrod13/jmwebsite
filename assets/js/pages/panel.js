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

  const views = [
    ['pulpit', 'Pulpit'], ['wizyty', 'Wizyty'], ['klientki', 'Klientki'], ['zabiegi', 'Zabiegi i ceny'],
    ['promocje', 'Promocje'], ['wiadomosci', 'SMS-y i e-maile'], ['godziny', 'Godziny pracy'], ['konto', 'Moje konto']
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
        <td><span class="badge">${b.client.type}</span></td>
        <td class="num">${money(b.total)}${b.discount ? `<br><span class="small muted">−${b.discount.percent}% ${esc(b.discount.label)}</span>` : ''}</td>
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
  const kindName = { confirmation: 'potwierdzenie', reminder: 'przypomnienie', cancellation: 'odwołanie', welcome: 'powitanie', reset: 'reset hasła', contact: 'formularz', campaign: 'kampania' };
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
  function vKonto() {
    return `
      <form class="panel-card" id="pass-form" novalidate style="max-width:560px">
        <h2>Zmiana hasła</h2>
        <p class="small muted">Zalogowana: ${esc(admin.name)} (${esc(admin.email)}). Hasło do panelu musi mieć co najmniej 12 znaków. Po zmianie inne urządzenia zostaną wylogowane.</p>
        <div class="field"><label for="pw-cur">Obecne hasło</label><input id="pw-cur" name="current" type="password" autocomplete="current-password" required></div>
        <div class="field"><label for="pw-new">Nowe hasło</label><input id="pw-new" name="next" type="password" autocomplete="new-password" minlength="12" required></div>
        <button class="btn btn-primary" type="submit">Zmień hasło</button>
      </form>`;
  }

  /* ---------- Dane dla widoków ---------- */
  async function loadView() {
    const today = new Date(); const past = new Date(); past.setDate(past.getDate() - 30);
    const loaders = {
      pulpit: async () => ({ overview: await api('GET', '/api/admin/overview') }),
      wizyty: async () => (await api('GET', `/api/admin/bookings?from=${S.isoDate(past)}`)),
      klientki: async () => (await api('GET', '/api/admin/clients')),
      zabiegi: async () => (await api('GET', '/api/admin/prices')),
      promocje: async () => (await api('GET', '/api/admin/promos')),
      wiadomosci: async () => {
        const [r, m, c] = await Promise.all([api('GET', '/api/admin/reminders'), api('GET', '/api/admin/messages'), api('GET', '/api/admin/clients')]);
        mode = m.mode; return { reminders: r.reminders, messages: m.messages, clients: c.clients };
      },
      godziny: async () => (await api('GET', '/api/admin/days-off')),
      konto: async () => ({})
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
            <a href="index.html">Zobacz stronę</a>
            <button type="button" class="link-button" data-admin-logout>Wyloguj się</button>
          </div>
        </aside>
        <div class="admin-main">
          <div class="admin-top"><h1>${title}</h1>${mode.sms === 'test' || mode.email === 'test' ? '<span class="demo-flag">Tryb testowy wiadomości</span>' : ''}</div>
          ${content}
        </div>
      </div>`;
  }
  async function render(scroll) {
    if (!admin) { root.innerHTML = loginView(); return; }
    try {
      await loadView();
      const fn = { pulpit: vPulpit, wizyty: vWizyty, klientki: vKlientki, zabiegi: vZabiegi, promocje: vPromocje, wiadomosci: vWiadomosci, godziny: vGodziny, konto: vKonto }[view];
      root.innerHTML = shell(fn());
    } catch (err) {
      if (err.status === 401) { admin = null; root.innerHTML = loginView('Sesja wygasła. Zaloguj się ponownie.'); return; }
      root.innerHTML = shell(`<div class="panel-card"><p class="form-msg" role="alert">${esc(err.message)}</p></div>`);
    }
    if (view === 'wiadomosci') updateCount();
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
  root.addEventListener('click', async (e) => {
    const el = e.target.closest('button'); if (!el) return;
    if (el.dataset.view) { view = el.dataset.view; render(true); return; }
    if (el.hasAttribute('data-admin-logout')) { await api('POST', '/api/admin/logout', {}); admin = null; render(); return; }
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
    const id = e.target.dataset.promo; if (!id) return;
    act(() => api('PATCH', '/api/admin/promos/' + id, { active: e.target.checked }), e.target.checked ? 'Promocja włączona.' : 'Promocja wyłączona.');
  });
  root.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    if (f.id === 'admin-login') {
      try {
        const r = await api('POST', '/api/admin/login', { email: f.querySelector('#a-email').value.trim(), password: f.querySelector('#a-pass').value });
        admin = r.admin; view = admin.mustChange ? 'konto' : 'pulpit'; render(true);
      } catch (err) { root.innerHTML = loginView(err.message); }
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

  api('GET', '/api/admin/me').then((r) => { admin = r.admin; mode = r.mode; render(); }).catch(() => { root.innerHTML = loginView('Nie udało się połączyć z serwerem.'); });
});
