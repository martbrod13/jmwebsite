/* Lista oczekujących: strona z linku w SMS-ie. Pokazuje wolne terminy i pozwala się wypisać. */
JM.ready.then(async function () {
  const S = JM.store, ui = JM.ui, esc = ui.esc, L = JM.L;
  const root = document.getElementById('waitlist');
  // klucz jest w części # adresu, więc nie trafia do logów serwera
  const token = decodeURIComponent(location.hash.slice(1));
  const tName = (e) => { const x = S.treatment(e.treatmentId); return x ? x.name : e.treatment; };
  const bookUrl = (e, date) => `rezerwacja.html?zabieg=${encodeURIComponent(e.treatmentId)}&data=${date}`;

  function view(e) {
    const period = `${ui.fmtShort(e.from)} – ${ui.fmtShort(e.to)}`;
    const free = e.free || [];
    let body;
    if (e.status === 'booked') body = `<p>${L('Ten zapis jest zamknięty, bo masz już wizytę na ten zabieg.', 'This sign-up is closed because you already have a visit booked for this treatment.')}</p>`;
    else if (e.status === 'expired') body = `<p>${L('Okres oczekiwania już minął.', 'The waiting period has ended.')}</p><div class="btn-row"><a class="btn btn-primary" href="rezerwacja.html?zabieg=${encodeURIComponent(e.treatmentId)}">${L('Sprawdź nowe terminy', 'See new dates')}</a></div>`;
    else if (free.length) {
      body = `
        <p>${L('Te terminy są teraz wolne. Zarezerwuj, zanim zrobi to ktoś inny z listy.', 'These times are free right now. Book before someone else on the list does.')}</p>
        <ul class="wl-free">${free.map((f) => `<li><a class="wl-day" href="${bookUrl(e, f.date)}"><span>${ui.fmtDate(f.date)}</span><span class="small muted">${L('od', 'from')} ${f.first}${f.count > 1 ? `, ${L('wolnych godzin', 'free times')}: ${f.count}` : ''}</span></a></li>`).join('')}</ul>`;
    } else {
      body = `<p>${L('Ktoś był szybszy i w tej chwili nie ma wolnych terminów. Zostajesz na liście: gdy zwolni się kolejne miejsce, wyślemy SMS.', 'Someone was quicker and there are no free times right now. You stay on the list: we will text you when another time opens up.')}</p>`;
    }
    return `
      <div class="card visit-card">
        <p class="muted" style="margin-top:0">${L('Dzień dobry', 'Hello')}, ${esc(e.firstName)}</p>
        <h2 style="margin-top:0">${esc(tName(e))}</h2>
        <dl class="visit-dl">
          <div><dt>${L('Czekasz na termin', 'Waiting for a time')}</dt><dd>${period}</dd></div>
        </dl>
        ${body}
        ${e.status === 'waiting' ? `<p class="small muted" style="margin-top:28px">${L('Nie potrzebujesz już terminu?', 'No longer need a time?')} <button type="button" class="link-button" data-leave>${L('Wypisz mnie z listy', 'Remove me from the list')}</button></p>` : ''}
      </div>`;
  }

  async function load() {
    if (!token) { root.innerHTML = `<p>${L('Brakuje kodu zapisu. Otwórz link z SMS-a.', 'The sign-up code is missing. Open the link from your text message.')}</p>`; return; }
    try {
      const d = await S.api('GET', '/api/waitlist/' + encodeURIComponent(token));
      root.innerHTML = view(d.entry);
    } catch (err) {
      root.innerHTML = `<p class="form-msg" role="alert">${esc(err.message)}</p><p><a class="btn btn-primary" href="rezerwacja.html">${L('Zarezerwuj wizytę', 'Book a visit')}</a></p>`;
    }
  }

  root.addEventListener('click', (e) => {
    if (!e.target.closest('[data-leave]')) return;
    const dlg = ui.h(`<dialog class="modal"><form method="dialog" class="modal-body"><h2>${L('Wypisać Cię z listy?', 'Remove you from the list?')}</h2><p>${L('Nie dostaniesz już SMS-ów o wolnych terminach. Usuniemy Twoje imię i numer z listy.', 'You will no longer get texts about free times. We will delete your name and number from the list.')}</p>
      <div class="modal-actions"><button class="btn btn-primary" value="ok">${L('Wypisz mnie', 'Remove me')}</button><button class="btn btn-outline" value="cancel">${L('Zostaję na liście', 'Stay on the list')}</button></div></form></dialog>`);
    document.body.appendChild(dlg); dlg.showModal();
    dlg.addEventListener('close', async () => {
      dlg.remove(); if (dlg.returnValue !== 'ok') return;
      try {
        await S.api('POST', '/api/waitlist/' + encodeURIComponent(token) + '/remove', {});
        root.innerHTML = `<div class="card visit-card"><h2 style="margin-top:0">${L('Wypisaliśmy Cię z listy', 'You have been removed from the list')}</h2><p>${L('Twoje dane zostały usunięte. Termin zawsze możesz znaleźć sama w kalendarzu.', 'Your details have been deleted. You can always find a time yourself in the calendar.')}</p><div class="btn-row"><a class="btn btn-primary" href="rezerwacja.html">${L('Zarezerwuj wizytę', 'Book a visit')}</a></div></div>`;
      } catch (err) { ui.toast(err.message); load(); }
    });
  });

  load();
});
