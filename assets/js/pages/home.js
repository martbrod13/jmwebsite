/* Strona główna: opinie klientek i zaproszenie do wystawienia opinii (na stronie, w Google, na Booksy). */
JM.ready.then(async function () {
  const S = JM.store, ui = JM.ui, esc = ui.esc, L = JM.L;

  // Last minute: wolne okienka na dziś i jutro, kliknięcie otwiera rezerwację z zabiegami, które się zmieszczą
  (async () => {
    const lm = document.getElementById('last-minute'); if (!lm) return;
    let d; try { d = await S.api('GET', '/api/last-minute'); } catch (e) { return; }
    if (!d.days.length) return;
    const today = S.isoDate(new Date());
    const dayName = (iso) => (iso === today ? L('Dziś', 'Today') : L('Jutro', 'Tomorrow')) + ', ' + new Date(iso + 'T12:00:00').toLocaleDateString(JM.lang === 'en' ? 'en-GB' : 'pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
    const fits = (n) => L(`pasuje ${n} ${n === 1 ? 'zabieg' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'zabiegi' : 'zabiegów'}`, `${n} ${n === 1 ? 'treatment fits' : 'treatments fit'}`);
    const hasToday = d.days.some((x) => x.date === today), hasTomorrow = d.days.some((x) => x.date !== today);
    document.getElementById('lm-title').textContent = hasToday && hasTomorrow ? L('Wolne terminy na dziś i jutro', 'Free times today and tomorrow') : hasToday ? L('Wolne terminy na dziś', 'Free times today') : L('Wolne terminy na jutro', 'Free times tomorrow');
    document.getElementById('lm-lead').textContent = d.percent
      ? L(`Przy rezerwacji wizyty, która zaczyna się w ciągu ${d.hours} godzin, cena jest niższa o ${d.percent}%.`, `Visits starting within the next ${d.hours} hours are ${d.percent}% off.`)
      : L('Zwolniło się miejsce? Wybierz godzinę, a pokażemy zabiegi, które się zmieszczą.', 'Pick a time and we will show the treatments that fit.');
    document.getElementById('lm-days').innerHTML = d.days.map((day) => `
      <div class="lm-day"><p class="lm-day-name">${esc(dayName(day.date))}</p>
        <ul>${day.windows.map((w) => `<li><a href="rezerwacja.html?data=${day.date}&amp;od=${w.start}&amp;do=${w.end}"><span>${w.start}–${w.end}</span><small>${fits(w.fits)}</small></a></li>`).join('')}</ul>
      </div>`).join('');
    lm.hidden = false;
  })();
  const box = document.getElementById('opinie'); if (!box) return;
  let reviews = [], links = {};
  try { ({ reviews, links } = await S.api('GET', '/api/reviews')); } catch (e) { return; }
  const ext = [['google', L('Opinia w Google', 'Review on Google')], ['booksy', L('Opinia na Booksy', 'Review on Booksy')], ['facebook', L('Opinia na Facebooku', 'Review on Facebook')]].filter(([k]) => links[k]);
  document.getElementById('reviews-cta').innerHTML = `
    <p>${reviews.length ? L('Byłaś u nas na zabiegu? Twoja opinia pomoże innym klientkom.', 'Have you had a treatment with us? Your review will help other clients.') : L('Byłaś u nas na zabiegu? Podziel się opinią jako jedna z pierwszych klientek.', 'Have you had a treatment with us? Be one of the first to share a review.')}</p>
    <a class="btn btn-primary" href="opinia.html">${L('Wystaw opinię', 'Leave a review')}</a>
    ${ext.map(([k, n]) => `<a class="btn btn-outline" href="${esc(links[k])}" target="_blank" rel="noopener">${n}</a>`).join('')}`;
  box.hidden = false;
  if (!reviews.length) return;
  document.getElementById('reviews-note').hidden = false;
  const SHOW = 3;
  const month = (d) => new Date(d + 'T12:00:00').toLocaleDateString(JM.lang === 'en' ? 'en-GB' : 'pl-PL', { month: 'long', year: 'numeric' });
  const item = (r) => {
    const en = JM.lang === 'en';
    const text = en && r.textEn ? r.textEn : r.text;
    const note = en ? (r.textEn ? 'Translated from Polish' : 'In Polish') : '';
    return `<figure class="review">
      ${r.rating ? `<p class="review-stars" aria-label="${L(`Ocena ${r.rating} na 5`, `Rated ${r.rating} out of 5`)}">${'★'.repeat(r.rating)}<span aria-hidden="true">${'★'.repeat(5 - r.rating)}</span></p>` : ''}
      <blockquote${en && !r.textEn ? ' lang="pl"' : ''}>${esc(text)}</blockquote>
      <figcaption><strong>${esc(r.author)}</strong>${r.treatment ? `<span>${esc(en ? r.treatmentEn : r.treatment)}</span>` : ''}
        <span class="review-meta">${esc({ strona: L('na stronie gabinetu', 'on our website'), 'osobiście': L('w gabinecie', 'in the studio') }[r.source] || r.sourceName)}, ${month(r.givenOn)}${note ? `. ${note}` : ''}</span></figcaption>
    </figure>`;
  };
  const list = document.getElementById('reviews-list');
  list.innerHTML = reviews.slice(0, SHOW).map(item).join('') +
    (reviews.length > SHOW ? `<div class="reviews-more"><button class="btn btn-outline" type="button" data-more>${L('Pokaż więcej opinii', 'Show more reviews')} (${reviews.length - SHOW})</button></div>` : '');
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-more]'); if (!b) return;
    b.parentElement.outerHTML = reviews.slice(SHOW).map(item).join('');
  });
  box.hidden = false;
});
