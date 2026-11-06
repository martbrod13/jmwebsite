/*
 * Ankieta przed zabiegiem. Nieobowiązkowa: klientka odpowiada na te pytania, na które chce.
 * Otwierana z linku (ankieta.html#<klucz wizyty>) albo z konta (ankieta.html?wizyta=<id>).
 */
JM.ready.then(async function () {
  const S = JM.store, ui = JM.ui, esc = ui.esc, L = JM.L;
  const root = document.getElementById('questionnaire');
  const token = decodeURIComponent(location.hash.slice(1));
  const visitId = new URLSearchParams(location.search).get('wizyta');
  const base = token ? '/api/visit/' + encodeURIComponent(token) : visitId ? '/api/me/bookings/' + encodeURIComponent(visitId) : null;
  const backUrl = token ? 'wizyta.html#' + encodeURIComponent(token) : 'konto.html';
  const Q = JM.questionnaire;
  const qText = (q) => L(q.pl, q.en);
  let data = null;

  function tName(v) { const x = S.treatment(v.treatmentId); return x ? x.name : v.treatmentName; }
  function head(v) {
    return `<p class="muted" style="margin:0 0 6px">${v.firstName ? `${L('Dzień dobry', 'Hello')}, ${esc(v.firstName)}. ` : ''}${L('Wizyta', 'Visit')}: ${esc(tName(v))}, ${ui.fmtDate(v.date)}, ${L('godz.', 'at')} ${v.time}</p>`;
  }

  function form(d) {
    const a = d.answers || {};
    return `
      <form class="card q-form" id="q-form" novalidate>
        ${head(d.visit)}
        <p>${L('Ankieta jest nieobowiązkowa. Odpowiedz na te pytania, na które chcesz; pozostałe możemy omówić na miejscu. Odpowiedzi widzi tylko gabinet.', 'The questionnaire is optional. Answer the questions you want to; we can talk about the rest in the studio. Only the studio can see your answers.')}</p>
        ${d.fromPrevious ? `<p class="panel-inline-note small">${L('Wpisaliśmy odpowiedzi z Twojej poprzedniej ankiety. Sprawdź, czy coś się zmieniło, i wyślij ją do tej wizyty.', 'We have filled in your answers from your previous questionnaire. Check whether anything has changed and send it for this visit.')}</p>` : ''}
        ${d.saved ? `<p class="small muted">${L('Ankieta wysłana', 'Questionnaire sent')} ${ui.fmtDate(d.updatedAt.slice(0, 10))}. ${L('Możesz ją zmienić do początku wizyty.', 'You can change it until your visit starts.')}</p>` : ''}
        <ol class="q-list">
          ${Q.map((q) => {
            const cur = a[q.id] || {};
            return `<li><fieldset class="q-item">
              <legend>${esc(qText(q))}</legend>
              <div class="q-yn">
                <label class="yn"><input type="radio" name="q-${q.id}" value="yes" ${cur.a === 'yes' ? 'checked' : ''}><span>${L('Tak', 'Yes')}</span></label>
                <label class="yn"><input type="radio" name="q-${q.id}" value="no" ${cur.a === 'no' ? 'checked' : ''}><span>${L('Nie', 'No')}</span></label>
                ${cur.a ? `<button type="button" class="link-button small" data-clear="${q.id}">${L('Wyczyść', 'Clear')}</button>` : ''}
              </div>
              ${q.detail ? `<div class="field q-detail" ${cur.a === 'yes' ? '' : 'hidden'}><label for="d-${q.id}">${L('Napisz krótko, czego dotyczy', 'Tell us briefly what it is')} <span class="opt">(${L('opcjonalnie', 'optional')})</span></label><input id="d-${q.id}" name="d-${q.id}" maxlength="400" value="${esc(cur.d || '')}"></div>` : ''}
            </fieldset></li>`;
          }).join('')}
        </ol>
        <div class="field"><label for="q-other">${esc(L(JM.questionnaireOther.pl, JM.questionnaireOther.en))} <span class="opt">(${L('opcjonalnie', 'optional')})</span></label>
          <textarea id="q-other" name="other" maxlength="1000">${esc(a.other || '')}</textarea></div>
        <label class="check"><input type="checkbox" name="consent" ${d.saved ? 'checked' : ''}><span>${L(`Zgadzam się na przetwarzanie podanych informacji o moim zdrowiu przez gabinet ${esc(JM.salon.brand + " " + JM.salon.tagline)} w celu bezpiecznego wykonania zabiegu. Zgodę mogę wycofać w każdej chwili, usuwając ankietę. Więcej w <a href="polityka-prywatnosci.html#ankieta" target="_blank">polityce prywatności</a>.`, `I agree to the studio ${esc(JM.salon.brand + " " + JM.salon.tagline)} processing the health information I give in order to carry out the treatment safely. I can withdraw my consent at any time by deleting the questionnaire. More in our <a href="polityka-prywatnosci.html#ankieta-en" target="_blank">privacy policy</a>.`)}<small>${L('Potrzebna tylko wtedy, gdy wysyłasz ankietę.', 'Needed only if you send the questionnaire.')}</small></span></label>
        <p class="form-msg" role="alert" id="q-msg" hidden></p>
        <div class="btn-row">
          <button class="btn btn-primary" type="submit">${d.saved ? L('Zapisz zmiany', 'Save changes') : L('Wyślij ankietę', 'Send questionnaire')}</button>
          <a class="btn btn-outline" href="${backUrl}">${d.saved ? L('Wróć do wizyty', 'Back to your visit') : L('Pomiń ankietę', 'Skip the questionnaire')}</a>
        </div>
        ${d.saved ? `<p class="small muted" style="margin-top:24px">${L('Nie chcesz, żebyśmy przechowywali te odpowiedzi?', 'Do not want us to keep these answers?')} <button type="button" class="link-button" data-delete>${L('Usuń ankietę', 'Delete the questionnaire')}</button></p>` : ''}
      </form>`;
  }

  // po wizycie albo po jej odwołaniu: tylko podgląd
  function readOnly(d) {
    const a = d.answers || {};
    const rows = Q.filter((q) => a[q.id]).map((q) => `<div><dt>${esc(qText(q))}</dt><dd>${a[q.id].a === 'yes' ? L('Tak', 'Yes') : L('Nie', 'No')}${a[q.id].d ? `: ${esc(a[q.id].d)}` : ''}</dd></div>`).join('');
    return `<div class="card visit-card">${head(d.visit)}
      <p>${d.saved ? L('Ankiety do tej wizyty nie można już zmienić. Twoje odpowiedzi:', 'This questionnaire can no longer be changed. Your answers:') : L('Ankiety do tej wizyty nie można już wypełnić.', 'This questionnaire can no longer be filled in for this visit.')}</p>
      ${d.saved ? `<dl class="visit-dl q-answers">${rows}${a.other ? `<div><dt>${esc(L(JM.questionnaireOther.pl, JM.questionnaireOther.en))}</dt><dd>${esc(a.other)}</dd></div>` : ''}</dl>` : ''}
      <div class="btn-row"><a class="btn btn-outline" href="${backUrl}">${L('Wróć', 'Back')}</a></div></div>`;
  }

  function render() { root.innerHTML = data.editable ? form(data) : readOnly(data); }

  async function load() {
    if (!base) { root.innerHTML = `<p>${L('Brakuje kodu wizyty. Otwórz link z e-maila albo ze strony wizyty.', 'The visit code is missing. Open the link from the email or your visit page.')}</p>`; return; }
    try { data = await S.api('GET', base + '/questionnaire'); render(); }
    catch (err) { root.innerHTML = `<p class="form-msg" role="alert">${esc(err.message)}</p><p><a href="tel:${JM.salon.phoneHref}">${JM.salon.phone}</a></p>`; }
  }

  function collect(f) {
    const answers = {};
    Q.forEach((q) => {
      const v = (f.querySelector(`input[name="q-${q.id}"]:checked`) || {}).value;
      if (!v) return;
      answers[q.id] = { a: v };
      if (v === 'yes' && q.detail) { const d = f.elements['d-' + q.id].value.trim(); if (d) answers[q.id].d = d; }
    });
    const other = f.elements.other.value.trim(); if (other) answers.other = other;
    return answers;
  }
  const showMsg = (text) => { const m = root.querySelector('#q-msg'); m.textContent = text; m.hidden = !text; if (text) m.scrollIntoView({ block: 'center', behavior: 'smooth' }); };

  root.addEventListener('change', (e) => {
    const r = e.target.closest('.yn input'); if (!r) return;
    const item = r.closest('.q-item');
    const det = item.querySelector('.q-detail'); if (det) det.hidden = r.value !== 'yes';
    if (!item.querySelector('[data-clear]')) item.querySelector('.q-yn').insertAdjacentHTML('beforeend', `<button type="button" class="link-button small" data-clear="${r.name.slice(2)}">${L('Wyczyść', 'Clear')}</button>`);
  });
  root.addEventListener('click', async (e) => {
    const clr = e.target.closest('[data-clear]');
    if (clr) {
      const item = clr.closest('.q-item');
      item.querySelectorAll('.yn input').forEach((i) => { i.checked = false; });
      const det = item.querySelector('.q-detail'); if (det) det.hidden = true;
      clr.remove(); return;
    }
    if (!e.target.closest('[data-delete]')) return;
    const dlg = ui.h(`<dialog class="modal"><form method="dialog" class="modal-body"><h2>${L('Usunąć ankietę?', 'Delete the questionnaire?')}</h2><p>${L('Twoje odpowiedzi znikną z gabinetu. Możesz wypełnić ankietę od nowa do początku wizyty.', 'Your answers will be deleted from the studio. You can fill in the questionnaire again until your visit starts.')}</p>
      <div class="modal-actions"><button class="btn btn-primary" value="ok">${L('Usuń ankietę', 'Delete')}</button><button class="btn btn-outline" value="cancel">${L('Zostaw', 'Keep')}</button></div></form></dialog>`);
    document.body.appendChild(dlg); dlg.showModal();
    dlg.addEventListener('close', async () => {
      dlg.remove(); if (dlg.returnValue !== 'ok') return;
      try { await S.api('DELETE', base + '/questionnaire', {}); ui.toast(L('Ankieta usunięta.', 'Questionnaire deleted.')); await load(); }
      catch (err) { ui.toast(err.message); }
    });
  });
  root.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    const answers = collect(f);
    if (!Object.keys(answers).length) { showMsg(L('Nie zaznaczono żadnej odpowiedzi. Jeśli nie chcesz wypełniać ankiety, po prostu ją pomiń.', 'No answers selected. If you do not want to fill in the questionnaire, simply skip it.')); return; }
    if (!f.elements.consent.checked) { showMsg(L('Żeby wysłać ankietę, zaznacz zgodę na przetwarzanie informacji o zdrowiu.', 'To send the questionnaire, tick the consent to processing your health information.')); f.elements.consent.focus(); return; }
    const btn = f.querySelector('[type=submit]'); btn.disabled = true;
    try {
      data = await S.api('PUT', base + '/questionnaire', { answers, consent: true });
      root.innerHTML = `<div class="card visit-card"><h2 style="margin-top:0">${L('Dziękujemy, ankieta wysłana', 'Thank you, your questionnaire has been sent')}</h2>
        <p>${L('Przeczytamy ją przed wizytą. Jeśli coś się zmieni, możesz ją poprawić do początku wizyty.', 'We will read it before your visit. If anything changes, you can update it until your visit starts.')}</p>
        <div class="btn-row"><a class="btn btn-primary" href="${backUrl}">${L('Wróć do wizyty', 'Back to your visit')}</a><button class="btn btn-outline" type="button" data-edit>${L('Zmień odpowiedzi', 'Change answers')}</button></div></div>`;
      root.querySelector('[data-edit]').addEventListener('click', render);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { btn.disabled = false; showMsg(err.message); }
  });

  load();
});
