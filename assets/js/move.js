/* Zmiana terminu wizyty przez klientkę (profil i strona wizyty z linku w SMS-ie). */
window.JM = window.JM || {};
JM.moveDialog = function (b, save) {
  const S = JM.store, ui = JM.ui, L = JM.L;
  const dlg = ui.h(`<dialog class="modal modal-wide"><div class="modal-body">
    <h2>${L('Zmień termin', 'Change the time')}</h2>
    <p class="small muted">${L('Obecny termin', 'Current time')}: ${ui.fmtDate(b.date)}, ${b.time}. ${L(`Termin zmienisz bezpłatnie do ${JM.booking.cancelHours} godzin przed wizytą.`, `You can change the time free of charge up to ${JM.booking.cancelHours} hours before the visit.`)}</p>
    <div class="mv-days" role="group" aria-label="${L('Dzień', 'Day')}"><p class="muted">${L('Sprawdzamy wolne terminy…', 'Checking availability…')}</p></div>
    <div class="mv-times" role="group" aria-label="${L('Godzina', 'Time')}"></div>
    <p class="form-msg" role="alert" hidden></p>
    <div class="modal-actions"><button class="btn btn-primary" type="button" data-mv-save disabled>${L('Zapisz nowy termin', 'Save new time')}</button><button class="btn btn-outline" type="button" data-mv-close>${L('Anuluj', 'Cancel')}</button></div>
  </div></dialog>`);
  document.body.appendChild(dlg); dlg.showModal();
  const close = () => { dlg.close(); dlg.remove(); };
  dlg.addEventListener('cancel', () => dlg.remove());
  const daysBox = dlg.querySelector('.mv-days'), timesBox = dlg.querySelector('.mv-times'), msg = dlg.querySelector('.form-msg'), btn = dlg.querySelector('[data-mv-save]');
  let days = {}, pick = { date: null, time: null };

  const label = (ds) => { const d = new Date(ds + 'T12:00:00'); return `<span>${JM.dayShort[d.getDay()]}</span><b>${d.getDate()}.${S.pad(d.getMonth() + 1)}</b>`; };
  function renderTimes() {
    const slots = (days[pick.date] || []).filter((t) => !(pick.date === b.date && t === b.time));
    timesBox.innerHTML = pick.date ? `<p class="slots-head">${ui.fmtDate(pick.date)}</p><div class="slots">${slots.map((t) => `<button type="button" class="slot" data-mv-time="${t}" aria-pressed="${t === pick.time}">${t}</button>`).join('')}</div>` : '';
    btn.disabled = !(pick.date && pick.time);
  }
  (async () => {
    try {
      const w = S.window || {}; const from = S.isoDate(new Date());
      const to = w.last || S.isoDate(new Date(Date.now() + JM.booking.daysAhead * 864e5));
      days = await S.availability(b.treatmentId, from, to);
      const free = Object.keys(days).filter((d) => days[d] && days[d].length);
      daysBox.innerHTML = free.length
        ? `<div class="mv-strip">${free.map((d) => `<button type="button" class="mv-day" data-mv-date="${d}" aria-pressed="false">${label(d)}</button>`).join('')}</div>`
        : `<p>${L('Brak wolnych terminów online. Zadzwoń:', 'No free times online. Please call us:')} <a href="tel:${JM.salon.phoneHref}">${JM.salon.phone}</a></p>`;
    } catch (e) { daysBox.innerHTML = `<p class="form-msg">${ui.esc(e.message)}</p>`; }
  })();

  dlg.addEventListener('click', async (e) => {
    if (e.target === dlg || e.target.closest('[data-mv-close]')) return close();
    const d = e.target.closest('[data-mv-date]');
    if (d) { pick = { date: d.dataset.mvDate, time: null }; dlg.querySelectorAll('.mv-day').forEach((x) => x.setAttribute('aria-pressed', String(x === d))); renderTimes(); return; }
    const t = e.target.closest('[data-mv-time]');
    if (t) { pick.time = t.dataset.mvTime; renderTimes(); return; }
    if (e.target.closest('[data-mv-save]')) {
      btn.disabled = true; msg.hidden = true;
      try { const nb = await save(pick.date, pick.time); close(); ui.toast(L(`Termin zmieniony: ${ui.fmtDate(nb.date)}, ${nb.time}. Wysłaliśmy SMS z potwierdzeniem.`, `Time changed: ${ui.fmtDate(nb.date)}, ${nb.time}. We have texted you a confirmation.`)); }
      catch (err) { msg.textContent = err.message; msg.hidden = false; btn.disabled = false; }
    }
  });
};
