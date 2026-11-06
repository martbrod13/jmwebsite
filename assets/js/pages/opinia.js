/*
 * Opinia od klientki po odbytej wizycie: na stronie gabinetu, a do tego linki do Google, Booksy i Facebooka.
 * Wejście: link /o/<klucz> (SMS, strona wizyty, konto) albo kod rezerwacji + numer telefonu.
 */
JM.ready.then(async function () {
  const S = JM.store, ui = JM.ui, esc = ui.esc, L = JM.L;
  const root = document.getElementById('review');
  let token = decodeURIComponent(location.hash.slice(1));
  let data = null, links = {};
  const PLATFORMS = [['google', () => L('Opinia w Google', 'Review on Google')], ['booksy', () => L('Opinia na Booksy', 'Review on Booksy')], ['facebook', () => L('Opinia na Facebooku', 'Review on Facebook')]];

  function linksHtml(title) {
    const list = PLATFORMS.filter(([k]) => links[k]);
    if (!list.length) return '';
    return `<div class="rv-links"><p>${title}</p><div class="btn-row">${list.map(([k, n]) => `<a class="btn btn-outline btn-small" href="${esc(links[k])}" target="_blank" rel="noopener">${n()}</a>`).join('')}</div></div>`;
  }

  function findView(msg) {
    return `
      <form class="card visit-card" id="rv-find" novalidate>
        <p>${L('Byłaś u nas na zabiegu? Podziel się opinią. Żebyśmy wiedzieli, której wizyty dotyczy, wpisz kod rezerwacji (jest w SMS-ie i e-mailu z potwierdzeniem) i numer telefonu podany przy rezerwacji.', 'Have you had a treatment with us? Share your review. So we know which visit it is about, enter your booking code (it is in the confirmation text and email) and the phone number you booked with.')}</p>
        ${msg ? `<p class="form-msg" role="alert">${esc(msg)}</p>` : ''}
        <div class="form-grid">
          <div class="field"><label for="rf-code">${L('Kod rezerwacji', 'Booking code')}</label><input id="rf-code" name="code" maxlength="12" autocomplete="off" placeholder="${L('np.', 'e.g.')} 2RAP4H" required></div>
          <div class="field"><label for="rf-phone">${L('Telefon', 'Phone')}</label><input id="rf-phone" name="phone" type="tel" autocomplete="tel" maxlength="20" required></div>
        </div>
        <button class="btn btn-primary" type="submit">${L('Dalej', 'Continue')}</button>
        ${linksHtml(L('Wolisz napisać opinię w innym miejscu? Każda bardzo nam pomaga:', 'Prefer to leave a review elsewhere? Every review helps us a lot:'))}
      </form>`;
  }

  function formView(d, msg) {
    const r = d.draft || d.review || {};
    return `
      <form class="card visit-card rv-form" id="rv-form" novalidate>
        <p class="muted" style="margin-top:0">${d.visit.firstName ? `${L('Dzień dobry', 'Hello')}, ${esc(d.visit.firstName)}. ` : ''}${L('Wizyta', 'Visit')}: ${esc(d.visit.treatmentName)}, ${ui.fmtDate(d.visit.date)}</p>
        <h2 style="margin-top:0">${L('Jak oceniasz wizytę?', 'How was your visit?')}</h2>
        ${d.review ? `<p class="small panel-inline-note">${L('Twoja opinia już do nas dotarła. Dopóki nie pojawi się na stronie, możesz ją zmienić.', 'We have received your review. Until it appears on the website, you can still change it.')}</p>` : ''}
        ${msg ? `<p class="form-msg" role="alert">${esc(msg)}</p>` : ''}
        <fieldset class="stars-input"><legend>${L('Ocena', 'Rating')} <span class="opt">(${L('opcjonalnie', 'optional')})</span></legend>
          <div class="stars-row">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" id="st-${n}" name="rating" value="${n}" ${r.rating === n ? 'checked' : ''}><label for="st-${n}"><span class="sr-only">${L(`${n} na 5`, `${n} out of 5`)}</span><span aria-hidden="true">★</span></label>`).join('')}</div>
        </fieldset>
        <div class="field"><label for="rv-text">${L('Twoja opinia', 'Your review')}</label><textarea id="rv-text" name="text" maxlength="1200" rows="5" placeholder="${L('Np. jak przebiegł zabieg, jak się czujesz z efektem, co Ci się podobało', 'E.g. how the treatment went, how you feel about the result, what you liked')}" required>${esc(r.text || '')}</textarea></div>
        <div class="field"><label for="rv-author">${L('Podpis', 'Signature')}</label><input id="rv-author" name="author" maxlength="40" value="${esc(r.author || d.author)}"><span class="field-hint">${L('Tak podpiszemy opinię, jeśli trafi na stronę.', 'This is how we will sign the review if it appears on the website.')}</span></div>
        <label class="check"><input type="checkbox" name="publish" ${r.publishOk ? 'checked' : ''}><span>${L('Zgadzam się na publikację mojej opinii na stronie gabinetu, z podpisem powyżej.', 'I agree to my review being published on the studio’s website, with the signature above.')}<small>${L('Bez tej zgody opinię przeczyta tylko gabinet. Zgodę możesz wycofać w każdej chwili, pisząc do gabinetu.', 'Without this consent only the studio will read your review. You can withdraw consent at any time by contacting the studio.')}</small></span></label>
        <div class="btn-row"><button class="btn btn-primary" type="submit">${d.review ? L('Zapisz zmiany', 'Save changes') : L('Wyślij opinię', 'Send review')}</button></div>
        ${linksHtml(L('Możesz też wystawić opinię w Google albo na Booksy. To bardzo pomaga innym klientkom nas znaleźć:', 'You can also leave a review on Google or Booksy. It really helps other clients find us:'))}
      </form>`;
  }

  function thanksView(d) {
    const published = d.review && d.review.published;
    return `
      <div class="card visit-card">
        <h2 style="margin-top:0">${published ? L('Twoja opinia jest na stronie', 'Your review is on the website') : L('Dziękujemy za opinię!', 'Thank you for your review!')}</h2>
        <p>${published ? L('Dziękujemy! Jeśli chcesz ją zmienić, napisz do gabinetu.', 'Thank you! If you would like to change it, contact the studio.')
          : d.review.publishOk ? L('Przeczytamy ją i opublikujemy na stronie.', 'We will read it and publish it on the website.') : L('Przeczytamy ją uważnie. Zostanie tylko dla gabinetu.', 'We will read it carefully. It will stay with the studio only.')}</p>
        ${linksHtml(L('Jeśli masz chwilę, wklej ją też w Google albo na Booksy. Dzięki temu łatwiej nas znaleźć:', 'If you have a moment, paste it on Google or Booksy too. It makes us easier to find:'))}
        ${!published ? `<p class="small muted" style="margin-top:20px"><button type="button" class="link-button" data-edit>${L('Zmień opinię', 'Edit your review')}</button></p>` : ''}
        <div class="btn-row" style="margin-top:20px"><a class="btn btn-outline" href="index.html">${L('Strona główna', 'Home page')}</a></div>
      </div>`;
  }

  async function load() {
    if (!token) {
      try { links = (await S.api('GET', '/api/reviews')).links || {}; } catch (e) { links = {}; }
      root.innerHTML = findView(); return;
    }
    try {
      data = await S.api('GET', '/api/review/' + encodeURIComponent(token)); links = data.links || {};
      if (data.visit.status !== 'done') { root.innerHTML = `<div class="card visit-card"><p>${L('Opinię wystawisz po odbytej wizycie.', 'You can leave a review after your visit has taken place.')}</p></div>`; return; }
      root.innerHTML = data.review && (data.review.published || !data.canWrite) ? thanksView(data) : formView(data);
    } catch (err) {
      try { links = (await S.api('GET', '/api/reviews')).links || {}; } catch (e) { links = {}; }
      token = ''; root.innerHTML = findView(err.message);
    }
  }

  root.addEventListener('click', (e) => { if (e.target.closest('[data-edit]')) root.innerHTML = formView(data); });
  root.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; const btn = f.querySelector('[type=submit]'); btn.disabled = true;
    if (f.id === 'rv-find') {
      try {
        const r = await S.api('POST', '/api/review-find', { code: f.elements.code.value.trim(), phone: f.elements.phone.value.trim() });
        token = r.token; history.replaceState(null, '', '#' + token); await load();
      } catch (err) { root.innerHTML = findView(err.message); }
      return;
    }
    const text = f.elements.text.value.trim();
    const checked = f.querySelector('input[name=rating]:checked');
    data.draft = { text, author: f.elements.author.value.trim(), publishOk: f.elements.publish.checked, rating: checked ? Number(checked.value) : null };
    if (text.length < 10) { btn.disabled = false; root.innerHTML = formView(data, L('Napisz kilka słów o wizycie.', 'Write a few words about your visit.')); root.querySelector('#rv-text').focus(); return; }
    try {
      data = await S.api('POST', '/api/review/' + encodeURIComponent(token), { text, author: data.draft.author, publish: data.draft.publishOk, rating: data.draft.rating });
      root.innerHTML = thanksView(data); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { btn.disabled = false; root.innerHTML = formView(data, err.message); }
  });

  load();
});
