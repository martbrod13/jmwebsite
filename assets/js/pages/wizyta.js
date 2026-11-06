/* Strona wizyty z linku w SMS-ie i e-mailu: podgląd i odwołanie bez logowania. */
JM.ready.then(async function () {
  const S = JM.store, ui = JM.ui, esc = ui.esc, L = JM.L;
  const root = document.getElementById('visit');
  // klucz jest w części # adresu, więc nie trafia do logów serwera ani do innych stron
  const token = decodeURIComponent(location.hash.slice(1));
  const tName = (b) => { const x = S.treatment(b.treatmentId); return x ? x.name : b.treatmentName; };

  function view(b, firstName) {
    const statusText = {
      confirmed: '',
      done: L('Wizyta się odbyła.', 'This visit has taken place.'),
      no_show: L('Wizyta oznaczona jako nieobecność.', 'This visit was marked as missed.'),
      cancelled: b.cancelledBy === 'salon' ? L('Gabinet odwołał tę wizytę. Skontaktujemy się w sprawie nowego terminu.', 'The studio cancelled this visit. We will contact you about a new time.') : L('Wizyta została odwołana.', 'This visit has been cancelled.')
    }[b.status];
    const fee = b.fee ? `<p class="form-msg">${L('Opłata za późne odwołanie zgodnie z regulaminem:', 'Late cancellation fee under our terms:')} <strong>${S.formatPrice(b.fee)}</strong>${b.feeStatus === 'paid' ? L(' (zapłacona)', ' (paid)') : b.feeStatus === 'waived' ? L(' (anulowana)', ' (waived)') : ''}.</p>` : '';
    return `
      <div class="card visit-card">
        ${firstName ? `<p class="muted" style="margin-top:0">${L('Dzień dobry', 'Hello')}, ${esc(firstName)}</p>` : ''}
        <h2 style="margin-top:0">${esc(tName(b))}</h2>
        <dl class="visit-dl">
          <div><dt>${L('Termin', 'Date')}</dt><dd>${ui.fmtDate(b.date)}, ${L('godz.', 'at')} ${b.time}</dd></div>
          <div><dt>${L('Czas zabiegu', 'Treatment time')}</dt><dd>${S.formatDuration(b.duration)}</dd></div>
          <div><dt>${L('Adres', 'Address')}</dt><dd>${JM.salon.street}, ${JM.salon.city}</dd></div>
          <div><dt>${L('Do zapłaty w gabinecie', 'To pay at the studio')}</dt><dd>${S.formatPrice(b.toPay ?? b.total)}${b.discount ? ` <span class="small muted">(${esc(S.discountLabel(b.discount))}, −${b.discount.percent}%)</span>` : ''}${b.voucher ? `<br><span class="small muted">${L('bon podarunkowy', 'gift voucher')} −${S.formatPrice(b.voucher.amount)}</span>` : ''}</dd></div>
          <div><dt>${L('Kod rezerwacji', 'Booking code')}</dt><dd><strong>${esc(b.code)}</strong></dd></div>
        </dl>
        ${statusText ? `<p><span class="badge">${statusText}</span></p>` : ''}
        ${fee}
        ${b.canCancel ? `
          <p class="small muted">${b.lateCancel
            ? L(`Do wizyty zostało mniej niż ${JM.booking.cancelHours} godzin. Zgodnie z regulaminem odwołanie oznacza opłatę ${JM.booking.lateCancelFeePercent}% ceny zabiegu: <strong>${S.formatPrice(b.lateFee)}</strong>.`, `Your visit is less than ${JM.booking.cancelHours} hours away. Under our terms, cancelling now means a fee of ${JM.booking.lateCancelFeePercent}% of the treatment price: <strong>${S.formatPrice(b.lateFee)}</strong>.`)
            : L(`Bezpłatnie odwołasz wizytę do ${JM.booking.cancelHours} godzin przed terminem.`, `You can cancel free of charge up to ${JM.booking.cancelHours} hours before the visit.`)}
            ${b.canMove ? '' : L('Termin możesz już zmienić tylko telefonicznie:', 'You can now change the time only by phone:') + ` <a href="tel:${JM.salon.phoneHref}">${JM.salon.phone}</a>.`}</p>
          <div class="btn-row">${b.canMove ? `<button class="btn btn-primary" type="button" data-move>${L('Zmień termin', 'Change time')}</button>` : ''}<button class="btn btn-outline" type="button" data-cancel>${L('Odwołaj wizytę', 'Cancel visit')}</button></div>`
        : `<div class="btn-row"><a class="btn btn-primary" href="rezerwacja.html">${L('Zarezerwuj wizytę', 'Book a visit')}</a></div>`}
      </div>
      ${extras(b)}`;
  }

  // ankieta przed zabiegiem i SMS po wizycie
  function extras(b) {
    const q = b.questionnaire || {};
    const qRow = b.status === 'confirmed' && (q.editable || q.filled) ? `
      <div class="extra-row">
        <div><h3>${L('Ankieta przed zabiegiem', 'Pre-treatment questionnaire')}</h3>
          <p class="small muted">${q.filled ? L('Wysłana. Możesz ją zmienić do początku wizyty.', 'Sent. You can change it until your visit starts.') : L('Nieobowiązkowa, zajmie około 2 minut: kilka pytań o zdrowie, np. o alergie i leki. Możemy też porozmawiać o tym na miejscu.', 'Optional, takes about 2 minutes: a few health questions, e.g. about allergies and medication. We can also talk about it in the studio.')}</p></div>
        <a class="btn btn-outline btn-small" href="ankieta.html#${encodeURIComponent(token)}">${q.filled ? L('Zobacz ankietę', 'View') : L('Wypełnij ankietę', 'Fill in')}</a>
      </div>` : '';
    const sRow = ['confirmed', 'done'].includes(b.status) ? `
      <div class="extra-row">
        <div><h3>${L('SMS po wizycie', 'Text after your visit')}</h3>
          <p class="small muted">${b.afterSms ? L('Włączony: po wizycie poprosimy o opinię, a gdy przyjdzie czas, przypomnimy o korekcie lub kolejnym zabiegu.', 'On: after the visit we will ask for your feedback and, when it is time, remind you about a touch-up or the next treatment.') : L('Wyłączony. Włącz, jeśli chcesz dostać przypomnienie o korekcie lub kolejnym zabiegu.', 'Off. Turn it on if you would like a reminder about a touch-up or the next treatment.')}</p></div>
        <button class="btn btn-outline btn-small" type="button" data-after-sms="${b.afterSms ? 'off' : 'on'}">${b.afterSms ? L('Wyłącz', 'Turn off') : L('Włącz', 'Turn on')}</button>
      </div>` : '';
    return qRow || sRow ? `<div class="card visit-card visit-extras">${qRow}${sRow}</div>` : '';
  }

  async function load() {
    if (!token) { root.innerHTML = `<p>${L('Brakuje kodu wizyty. Otwórz link z SMS-a albo e-maila.', 'The visit code is missing. Open the link from your text message or email.')}</p>`; return; }
    try {
      const d = await S.visitByToken(token);
      current = d.booking; root.innerHTML = view(d.booking, d.firstName);
      root.dataset.first = d.firstName || '';
    } catch (err) {
      root.innerHTML = `<p class="form-msg" role="alert">${esc(err.message)}</p><p><a href="tel:${JM.salon.phoneHref}">${JM.salon.phone}</a></p>`;
    }
  }

  let current = null;
  root.addEventListener('click', async (e) => {
    const sms = e.target.closest('[data-after-sms]');
    if (sms && current) {
      try {
        const d = await S.api('POST', `/api/visit/${encodeURIComponent(token)}/after-sms`, { on: sms.dataset.afterSms === 'on' });
        current = d.booking; root.innerHTML = view(current, root.dataset.first);
        ui.toast(current.afterSms ? L('Włączono SMS po wizycie.', 'Texts after the visit turned on.') : L('Wyłączono SMS po wizycie.', 'Texts after the visit turned off.'));
      } catch (err) { ui.toast(err.message); }
      return;
    }
    if (e.target.closest('[data-move]') && current) {
      JM.moveDialog(current, async (date, time) => { const nb = await S.moveByToken(token, date, time); current = nb; root.innerHTML = view(nb, root.dataset.first); return nb; });
      return;
    }
    if (!e.target.closest('[data-cancel]')) return;
    const dlg = ui.h(`<dialog class="modal"><form method="dialog" class="modal-body"><h2>${L('Odwołać wizytę?', 'Cancel this visit?')}</h2><p>${L('Termin wróci do kalendarza dla innych klientek.', 'The time will become available to other clients.')}</p>
      <div class="modal-actions"><button class="btn btn-primary" value="ok">${L('Odwołaj wizytę', 'Cancel visit')}</button><button class="btn btn-outline" value="cancel">${L('Zostaw wizytę', 'Keep visit')}</button></div></form></dialog>`);
    document.body.appendChild(dlg); dlg.showModal();
    dlg.addEventListener('close', async () => {
      dlg.remove(); if (dlg.returnValue !== 'ok') return;
      try {
        const b = await S.cancelByToken(token);
        root.innerHTML = view(b, root.dataset.first);
        ui.toast(b.fee ? L(`Wizyta odwołana. Opłata za późne odwołanie: ${S.formatPrice(b.fee)}.`, `Visit cancelled. Late cancellation fee: ${S.formatPrice(b.fee)}.`) : L('Wizyta odwołana. Wysłaliśmy potwierdzenie SMS-em.', 'Visit cancelled. We have texted you a confirmation.'));
      } catch (err) { ui.toast(err.message); load(); }
    });
  });

  load();
});
