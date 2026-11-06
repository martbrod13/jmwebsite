/*
 * Panel gabinetu (podgląd). W wersji produkcyjnej dostęp tylko dla właścicielki,
 * z logowaniem dwuskładnikowym i danymi z bazy, nie z przeglądarki.
 */
(function () {
  const S = JM.store, ui = JM.ui, esc = ui.esc;
  const root = document.getElementById('admin');
  const DEMO_PASS = 'demo';
  // zalogowane konto panelu (starsze zapisy „true” traktujemy jak konto właścicielki)
  const session = () => { const s = S.read('admin', null); return s === true ? JM.panelAccounts[0] : s; };
  let view = 'pulpit';
  let query = '';

  const views = [
    ['pulpit', 'Pulpit'], ['wizyty', 'Wizyty'], ['klientki', 'Klientki'],
    ['zabiegi', 'Zabiegi i ceny'], ['promocje', 'Promocje'], ['sms', 'SMS-y'], ['godziny', 'Godziny pracy']
  ];

  const nowKey = () => { const d = new Date(); return S.isoDate(d) + ' ' + S.pad(d.getHours()) + ':' + S.pad(d.getMinutes()); };
  const clientOf = (b) => {
    if (b.userId) { const u = S.users().find((x) => x.id === b.userId); if (u) return { name: u.firstName + ' ' + u.lastName, phone: u.phone, type: 'konto' }; }
    if (b.guest) return { name: b.guest.firstName + ' ' + b.guest.lastName, phone: b.guest.phone, type: 'gość' };
    return { name: 'Konto usunięte', phone: '—', type: '—' };
  };
  const upcoming = () => S.bookings().filter((b) => b.status !== 'cancelled' && b.date + ' ' + b.time >= nowKey()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  function clients() {
    const map = new Map();
    S.users().forEach((u) => map.set(u.email, {
      name: u.firstName + ' ' + u.lastName, phone: u.phone, email: u.email, type: 'konto', createdAt: u.createdAt,
      sms: u.consents.marketingSms.value, mail: u.consents.marketingEmail.value, userId: u.id, visits: 0, last: ''
    }));
    S.bookings().forEach((b) => {
      let c;
      if (b.userId) c = [...map.values()].find((x) => x.userId === b.userId);
      else if (b.guest) {
        c = map.get(b.guest.email) || { name: b.guest.firstName + ' ' + b.guest.lastName, phone: b.guest.phone, email: b.guest.email, type: 'gość', sms: b.guest.marketingSms, mail: b.guest.marketingEmail, visits: 0, last: '' };
        map.set(b.guest.email, c);
      }
      if (c && b.status !== 'cancelled') { c.visits++; if (b.date > c.last) c.last = b.date; }
    });
    return [...map.values()];
  }
  const yesNo = (v) => (v ? '<span class="badge badge-ok">tak</span>' : '<span class="badge badge-off">nie</span>');

  /* ---------- Widoki ---------- */
  function vPulpit() {
    const up = upcoming(); const today = S.isoDate(new Date());
    const week = new Date(); week.setDate(week.getDate() + 7);
    const cl = clients();
    return `
      <div class="stat-row">
        <div class="stat"><b>${up.filter((b) => b.date === today).length}</b><span>wizyty dzisiaj</span></div>
        <div class="stat"><b>${up.filter((b) => b.date <= S.isoDate(week)).length}</b><span>wizyty w najbliższych 7 dniach</span></div>
        <div class="stat"><b>${cl.length}</b><span>klientek w bazie</span></div>
        <div class="stat"><b>${cl.filter((c) => c.sms).length}</b><span>zgód na oferty SMS</span></div>
      </div>
      <div class="panel-card">
        <h2>Najbliższe wizyty</h2>
        ${bookingTable(up.slice(0, 8), false)}
      </div>
      <div class="panel-card">
        <h2>Nowe konta</h2>
        <table class="table"><thead><tr><th>Klientka</th><th>Telefon</th><th>Założone</th><th>Zniżka powitalna</th></tr></thead><tbody>
          ${S.users().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((u) => `<tr><td>${esc(u.firstName)} ${esc(u.lastName)}</td><td>${esc(u.phone)}</td><td>${new Date(u.createdAt).toLocaleDateString('pl-PL')}</td><td>${S.visitCount(u.id) ? '<span class="badge">wykorzystana</span>' : '<span class="badge badge-ok">aktywna</span>'}</td></tr>`).join('')}
        </tbody></table>
      </div>`;
  }
  function bookingTable(list, actions) {
    if (!list.length) return '<p class="muted">Brak wizyt.</p>';
    return `<table class="table"><thead><tr><th>Termin</th><th>Zabieg</th><th>Klientka</th><th>Telefon</th><th>Źródło</th><th class="num">Do zapłaty</th>${actions ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.map((b) => { const c = clientOf(b); return `<tr>
        <td>${ui.fmtShort(b.date)}, ${b.time}</td><td>${esc(b.treatmentName)}${b.notes ? `<br><span class="small muted">${esc(b.notes)}</span>` : ''}</td><td>${esc(c.name)}</td><td>${esc(c.phone)}</td>
        <td><span class="badge">${c.type}</span></td><td class="num">${S.formatPrice(b.total)}${b.discount ? `<br><span class="small muted">−${b.discount.percent}%</span>` : ''}</td>
        ${actions ? `<td class="num"><button class="btn btn-outline btn-small" data-cancel="${b.id}">Odwołaj</button></td>` : ''}</tr>`; }).join('')}
    </tbody></table>`;
  }
  function vWizyty() {
    const up = upcoming();
    const days = [...new Set(up.map((b) => b.date))];
    const cancelled = S.bookings().filter((b) => b.status === 'cancelled').slice(-5).reverse();
    return `
      ${days.length ? days.map((d) => `<div class="panel-card day-group"><h3>${ui.fmtDate(d)}</h3>${bookingTable(up.filter((b) => b.date === d), true)}</div>`).join('') : '<div class="panel-card"><p class="muted">Brak zaplanowanych wizyt.</p></div>'}
      <div class="panel-card"><h2>Ostatnio odwołane</h2>
        ${cancelled.length ? `<table class="table"><tbody>${cancelled.map((b) => `<tr><td>${ui.fmtShort(b.date)}, ${b.time}</td><td>${esc(b.treatmentName)}</td><td>${esc(clientOf(b).name)}</td><td class="small muted">odwołała: ${esc(b.cancelledBy || '—')}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Brak.</p>'}
      </div>`;
  }
  function vKlientki() {
    const q = query.toLowerCase();
    const list = clients().filter((c) => !q || (c.name + c.phone + c.email).toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    return `
      <div class="panel-card">
        <div style="display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;margin-bottom:16px">
          <div class="field search" style="margin:0"><label for="q" class="sr-only">Szukaj klientki</label><input id="q" type="search" placeholder="Szukaj po nazwisku, telefonie, e-mailu" value="${esc(query)}"></div>
          <button class="btn btn-outline btn-small" type="button" data-export>Eksportuj CSV</button>
        </div>
        <table class="table"><thead><tr><th>Klientka</th><th>Telefon</th><th>E-mail</th><th>Typ</th><th class="num">Wizyty</th><th>Ostatnia wizyta</th><th>Oferty SMS</th><th>Oferty e-mail</th></tr></thead><tbody>
          ${list.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${esc(c.email)}</td><td><span class="badge">${c.type}</span></td><td class="num">${c.visits}</td><td>${c.last ? ui.fmtShort(c.last) + '.' + c.last.slice(0, 4) : '—'}</td><td>${yesNo(c.sms)}</td><td>${yesNo(c.mail)}</td></tr>`).join('')}
        </tbody></table>
        <p class="small muted" style="margin-top:16px">Kampanie SMS i e-mail trafiają wyłącznie do klientek ze zgodą na dany kanał.</p>
      </div>`;
  }
  function vZabiegi() {
    const all = S.allTreatments();
    return `
      <form id="prices-form">
        ${JM.categories.map((c) => `<div class="panel-card"><h2>${c.name}</h2>
          <table class="table"><thead><tr><th>Zabieg</th><th>Czas</th><th class="num">Cena (zł)</th></tr></thead><tbody>
          ${all.filter((t) => t.category === c.id).map((t) => `<tr><td>${t.name}${t.from ? ' <span class="small muted">(cena „od”)</span>' : ''}</td><td>${S.formatDuration(t.duration)}</td><td class="num"><label class="sr-only" for="pr-${t.id}">Cena: ${t.name}</label><input class="price-input" id="pr-${t.id}" name="${t.id}" type="number" min="0" step="10" value="${t.price}"></td></tr>`).join('')}
          </tbody></table></div>`).join('')}
        <div class="btn-row"><button class="btn btn-primary" type="submit">Zapisz ceny</button><button class="btn btn-outline" type="button" data-reset-prices>Przywróć ceny średnie z Krakowa</button></div>
        <p class="small muted" style="margin-top:12px">Nowe ceny od razu pojawią się w cenniku, opisach zabiegów i rezerwacji.</p>
      </form>`;
  }
  function vPromocje() {
    const list = S.promos();
    return `
      <div class="panel-card">
        <h2>Aktywne i zaplanowane</h2>
        <table class="table"><thead><tr><th>Promocja</th><th class="num">Zniżka</th><th>Obowiązuje</th><th>Dla kogo</th><th>Włączona</th></tr></thead><tbody>
          ${list.map((p) => `<tr><td>${esc(p.title)}<br><span class="small muted">${esc(p.text)}</span></td><td class="num">${p.percent}%</td><td>${p.birthday ? 'miesiąc urodzin' : ui.fmtShort(p.from) + '–' + ui.fmtShort(p.to)}</td><td>${p.membersOnly ? 'zarejestrowane' : 'wszystkie'}</td>
            <td><label class="sr-only" for="pm-${p.id}">Włącz: ${esc(p.title)}</label><input id="pm-${p.id}" type="checkbox" class="switch" data-promo="${p.id}" ${p.active ? 'checked' : ''}></td></tr>`).join('')}
        </tbody></table>
        <p class="small muted" style="margin-top:14px">Przy każdej obniżce strona pokazuje najniższą cenę z 30 dni przed obniżką. Zniżki się nie sumują: klientka dostaje najkorzystniejszą.</p>
      </div>
      <form class="panel-card" id="promo-form" novalidate>
        <h2>Nowa promocja</h2>
        <div class="form-grid">
          <div class="field"><label for="p-title">Nazwa</label><input id="p-title" name="title" required placeholder="Np. Walentynki"></div>
          <div class="field"><label for="p-percent">Zniżka (%)</label><input id="p-percent" name="percent" type="number" min="1" max="50" required value="10"></div>
          <div class="field"><label for="p-from">Od</label><input id="p-from" name="from" type="date" required></div>
          <div class="field"><label for="p-to">Do</label><input id="p-to" name="to" type="date" required></div>
          <div class="field"><label for="p-cat">Zabiegi</label><select id="p-cat" name="cat"><option value="all">Wszystkie</option>${JM.categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
          <div class="field"><label for="p-who">Dla kogo</label><select id="p-who" name="who"><option value="members">Tylko zarejestrowane klientki</option><option value="all">Wszystkie klientki</option></select></div>
          <div class="field span-2"><label for="p-text">Opis dla klientek</label><input id="p-text" name="text" required placeholder="Np. 10% taniej na peelingi chemiczne do końca lutego."></div>
        </div>
        <button class="btn btn-primary" type="submit">Dodaj promocję</button>
      </form>`;
  }
  function segments(text) {
    const gsm = /^[\x20-\x7E\n\r£¥èéùìòÇØøÅå_ÆæßÉ¡ÄÖÑÜ§¿äöñüà]*$/.test(text);
    const per = gsm ? (text.length > 160 ? 153 : 160) : (text.length > 70 ? 67 : 70);
    return { gsm, parts: Math.max(1, Math.ceil(text.length / per)), per };
  }
  function vSms() {
    const sample = { date: S.isoDate(new Date(Date.now() + 2 * 864e5)), time: '10:00', treatmentName: 'Mezoterapia igłowa — twarz', code: 'AB12' };
    const d = new Date(sample.date + 'T12:00:00'); const dd = S.pad(d.getDate()) + '.' + S.pad(d.getMonth() + 1);
    const recipients = clients().filter((c) => c.sms).length;
    const log = S.read('sms', []);
    return `
      <div class="panel-card">
        <h2>Wiadomości automatyczne</h2>
        <p class="small muted">Wysyłane każdej klientce, także bez zgody marketingowej: dotyczą umówionej usługi.</p>
        <label class="switch-row"><div><strong style="font-weight:500">Potwierdzenie rezerwacji</strong><p>Od razu po rezerwacji.</p></div><input type="checkbox" class="switch" checked></label>
        <div class="sms-tpl">${JM.salon.smsSender}: Potwierdzamy wizytę ${dd} o ${sample.time} (${sample.treatmentName}), ${JM.salon.street}. Zmiana lub odwołanie: justynamanka.pl/w/${sample.code}</div>
        <label class="switch-row"><div><strong style="font-weight:500">Przypomnienie</strong><p>${JM.booking.reminderHours} godziny przed wizytą.</p></div><input type="checkbox" class="switch" checked></label>
        <div class="sms-tpl">${JM.salon.smsSender}: Przypominamy o jutrzejszej wizycie o ${sample.time}. Do zobaczenia! Odwołanie: justynamanka.pl/w/${sample.code}</div>
        <label class="switch-row"><div><strong style="font-weight:500">Potwierdzenie odwołania</strong><p>Po odwołaniu wizyty przez klientkę lub gabinet.</p></div><input type="checkbox" class="switch" checked></label>
        <div class="sms-tpl">${JM.salon.smsSender}: Wizyta ${dd} o ${sample.time} została odwołana. Nowy termin zarezerwujesz na justynamanka.pl</div>
      </div>
      <form class="panel-card" id="campaign-form" novalidate>
        <h2>Kampania SMS</h2>
        <p>Odbiorczynie: <strong style="font-weight:500">${recipients}</strong> klientek ze zgodą na oferty SMS.</p>
        <div class="field"><label for="sms-text">Treść</label><textarea id="sms-text" name="text" maxlength="459">${JM.salon.smsSender}: Swiateczna pielegnacja -15% na mezoterapie i stymulatory do 23.12. Rezerwacja: justynamanka.pl. Rezygnacja z ofert: justynamanka.pl/konto</textarea>
          <span class="field-hint" id="sms-count"></span></div>
        <button class="btn btn-primary" type="submit">Wyślij kampanię</button>
      </form>
      <div class="panel-card"><h2>Historia kampanii</h2>
        ${log.length ? `<table class="table"><tbody>${log.slice().reverse().map((l) => `<tr><td>${new Date(l.at).toLocaleString('pl-PL')}</td><td>${esc(l.text)}</td><td class="num">${l.recipients} odb.</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Nie wysłano jeszcze żadnej kampanii.</p>'}
      </div>`;
  }
  function vGodziny() {
    const off = S.read('daysOff', []).slice().sort();
    return `
      <div class="panel-card">
        <h2>Godziny pracy</h2>
        <table class="table"><tbody>${[1, 2, 3, 4, 5, 6, 0].map((d) => `<tr><td>${JM.dayNames[d]}</td><td>${JM.hours[d] ? JM.hours[d][0] + ':00–' + JM.hours[d][1] + ':00' : 'nieczynne'}</td></tr>`).join('')}</tbody></table>
        <p class="small muted" style="margin-top:12px">Święta ustawowe są blokowane automatycznie.</p>
      </div>
      <form class="panel-card" id="dayoff-form" novalidate>
        <h2>Dni wolne i urlopy</h2>
        <p class="small muted">Zablokowany dzień znika z kalendarza rezerwacji. Wizyty już umówione na ten dzień zostają: odwołaj je w zakładce Wizyty.</p>
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
          <div class="field" style="margin:0"><label for="off-date">Dzień</label><input id="off-date" name="date" type="date" required></div>
          <button class="btn btn-primary" type="submit">Zablokuj dzień</button>
        </div>
        ${off.length ? `<table class="table" style="margin-top:20px"><tbody>${off.map((d) => `<tr><td>${ui.fmtDate(d)}</td><td class="num"><button type="button" class="btn btn-outline btn-small" data-unblock="${d}">Odblokuj</button></td></tr>`).join('')}</tbody></table>` : ''}
      </form>`;
  }

  function shell() {
    const fn = { pulpit: vPulpit, wizyty: vWizyty, klientki: vKlientki, zabiegi: vZabiegi, promocje: vPromocje, sms: vSms, godziny: vGodziny }[view];
    const title = views.find((v) => v[0] === view)[1];
    return `
      <div class="admin">
        <aside class="admin-side">
          <img src="assets/img/logo-gold.png" alt="${JM.salon.brand}">
          <nav aria-label="Panel gabinetu"><ul class="admin-nav">
            ${views.map(([id, label]) => `<li><button type="button" data-view="${id}" ${id === view ? 'aria-current="true"' : ''}>${label}</button></li>`).join('')}
          </ul></nav>
          <div class="admin-side-foot">
            <p class="admin-who">${esc(session().name)}<br><span>${esc(session().role)}</span></p>
            <a href="index.html">Zobacz stronę</a>
            <button type="button" class="link-button" data-reset-demo>Przywróć dane przykładowe</button>
            <button type="button" class="link-button" data-admin-logout>Wyloguj się</button>
          </div>
        </aside>
        <div class="admin-main">
          <div class="admin-top"><h1>${title}</h1><span class="demo-flag">Wersja demonstracyjna: dane przykładowe</span></div>
          ${fn()}
        </div>
      </div>`;
  }
  function loginView(err) {
    return `
      <div class="admin-login">
        <form class="card" id="admin-login" novalidate>
          <img src="assets/img/logo.png" alt="${JM.salon.brand}">
          <h1 style="font-size:1.75rem">Panel gabinetu</h1>
          ${err ? `<p class="form-msg" role="alert">${err}</p>` : ''}
          <div class="field"><label for="a-email">E-mail</label><input id="a-email" type="email" value="${JM.panelAccounts[0].email}" autocomplete="username"></div>
          <div class="field"><label for="a-pass">Hasło</label><input id="a-pass" type="password" autocomplete="current-password"><span class="field-hint">Wersja demonstracyjna: hasło „${DEMO_PASS}”. Konta: ${JM.panelAccounts.map((a) => `${a.email} (${a.role.toLowerCase()})`).join(', ')}.</span></div>
          <button class="btn btn-primary btn-block" type="submit">Zaloguj się</button>
          <p class="small" style="margin-top:18px"><a href="index.html">Wróć na stronę</a></p>
        </form>
      </div>`;
  }
  function render() {
    root.innerHTML = session() ? shell() : loginView();
    if (view === 'sms') updateCount();
  }
  function updateCount() {
    const ta = document.getElementById('sms-text'); if (!ta) return;
    const s = segments(ta.value);
    document.getElementById('sms-count').textContent = `${ta.value.length} znaków, ${s.parts} SMS${s.parts > 1 ? 'y' : ''} na odbiorczynię.${s.gsm ? '' : ' Polskie znaki skracają SMS do 70 znaków.'}`;
  }

  root.addEventListener('click', (e) => {
    const el = e.target.closest('button'); if (!el) return;
    if (el.dataset.view) { view = el.dataset.view; render(); window.scrollTo(0, 0); return; }
    if (el.hasAttribute('data-admin-logout')) { S.remove('admin'); render(); return; }
    if (el.hasAttribute('data-reset-demo')) { const who = session(); S.resetDemo(); S.write('admin', who); render(); ui.toast('Przywrócono dane przykładowe.'); return; }
    if (el.dataset.cancel) {
      S.cancelBooking(el.dataset.cancel, 'gabinet'); render(); ui.toast('Wizyta odwołana. Klientka dostanie SMS z informacją.'); return;
    }
    if (el.hasAttribute('data-reset-prices')) { S.resetPrices(); render(); ui.toast('Przywrócono ceny średnie.'); return; }
    if (el.dataset.unblock) { S.write('daysOff', S.read('daysOff', []).filter((d) => d !== el.dataset.unblock)); render(); return; }
    if (el.hasAttribute('data-export')) {
      const rows = [['Imię i nazwisko', 'Telefon', 'E-mail', 'Typ', 'Wizyty', 'Ostatnia wizyta', 'Zgoda SMS', 'Zgoda e-mail']]
        .concat(clients().map((c) => [c.name, c.phone, c.email, c.type, c.visits, c.last, c.sms ? 'tak' : 'nie', c.mail ? 'tak' : 'nie']));
      const csv = '﻿' + rows.map((r) => r.map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(';')).join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'klientki.csv'; a.click();
    }
  });
  root.addEventListener('input', (e) => {
    if (e.target.id === 'q') { query = e.target.value; const pos = e.target.selectionStart; render(); const q = document.getElementById('q'); q.focus(); q.setSelectionRange(pos, pos); }
    if (e.target.id === 'sms-text') updateCount();
  });
  root.addEventListener('change', (e) => {
    const id = e.target.dataset.promo; if (!id) return;
    S.savePromos(S.promos().map((p) => (p.id === id ? Object.assign({}, p, { active: e.target.checked }) : p)));
    ui.toast(e.target.checked ? 'Promocja włączona.' : 'Promocja wyłączona.');
  });
  root.addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.target;
    if (f.id === 'admin-login') {
      const acc = JM.panelAccounts.find((a) => a.email === f.querySelector('#a-email').value.trim().toLowerCase());
      if (!acc || f.querySelector('#a-pass').value !== DEMO_PASS) { root.innerHTML = loginView('Nieprawidłowy e-mail lub hasło.'); return; }
      S.write('admin', acc); render(); return;
    }
    if (f.id === 'prices-form') {
      [...f.querySelectorAll('.price-input')].forEach((i) => { const v = Number(i.value); if (!isNaN(v) && v >= 0) S.setPrice(i.name, v); });
      ui.toast('Zapisano ceny.'); return;
    }
    if (f.id === 'promo-form') {
      const v = (n) => f.elements[n].value.trim();
      if (!v('title') || !v('from') || !v('to') || !v('text') || v('to') < v('from')) { ui.toast('Uzupełnij nazwę, opis i poprawne daty promocji.'); return; }
      const list = S.promos();
      list.push({ id: 'p' + Date.now(), title: v('title'), text: v('text'), percent: Number(v('percent')), from: v('from'), to: v('to'), categories: v('cat') === 'all' ? 'all' : [v('cat')], membersOnly: v('who') === 'members', active: true });
      S.savePromos(list); render(); ui.toast('Dodano promocję.'); return;
    }
    if (f.id === 'campaign-form') {
      const text = f.elements.text.value.trim(); if (!text) return;
      const n = clients().filter((c) => c.sms).length;
      const log = S.read('sms', []); log.push({ at: new Date().toISOString(), text, recipients: n }); S.write('sms', log);
      render(); ui.toast(`Kampania wysłana do ${n} klientek (symulacja).`); return;
    }
    if (f.id === 'dayoff-form') {
      const d = f.elements.date.value; if (!d) return;
      const off = S.read('daysOff', []); if (!off.includes(d)) off.push(d); S.write('daysOff', off); render(); ui.toast('Dzień zablokowany w kalendarzu.');
    }
  });

  render();
})();
