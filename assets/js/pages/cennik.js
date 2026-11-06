JM.ready.then(function () {
  const S = JM.store, L = JM.L;
  const all = S.allTreatments();
  const row = (t) => `
    <li class="menu-item">
      <div class="menu-row">
        <span class="menu-name">${t.name}</span>
        <span class="menu-dots" aria-hidden="true"></span>
        <span class="menu-price">${S.formatPrice(t.price, t.from)}</span>
      </div>
      <div class="menu-meta">
        <span class="menu-time">${S.formatDuration(t.duration)}</span>
        <span class="menu-links">
          ${t.id === 'konsultacja' ? '' : `<a class="menu-book" href="zabiegi.html#${t.id}" aria-label="${L('Opis zabiegu', 'Treatment description')}: ${t.name}">${L('Opis zabiegu', 'Description')}</a>`}
          <a class="menu-book" href="rezerwacja.html?zabieg=${t.id}" aria-label="${L('Zarezerwuj', 'Book')}: ${t.name}">${L('Zarezerwuj', 'Book')}</a>
        </span>
      </div>
    </li>`;
  const section = (title, id, items) => `
    <section class="menu-section" id="${id}" aria-labelledby="pt-${id}">
      <h2 id="pt-${id}">${title}</h2>
      <span class="ornament" aria-hidden="true"></span>
      <ul class="menu-list">${items.map(row).join('')}</ul>
    </section>`;
  document.getElementById('prices').innerHTML =
    section(L('Konsultacja', 'Consultation'), 'konsultacja', [JM.consultation]) +
    JM.categories.map((c) => section(c.name, c.id, all.filter((t) => t.category === c.id))).join('');
  // pakiety zabiegów z panelu (kupowane w gabinecie)
  S.api('GET', '/api/packages').then(({ types }) => {
    if (!types.length) return;
    const months = (m) => L(`${m} ${m === 1 ? 'miesiąc' : m % 10 >= 2 && m % 10 <= 4 && (m % 100 < 10 || m % 100 >= 20) ? 'miesiące' : 'miesięcy'}`, `${m} ${m === 1 ? 'month' : 'months'}`);
    document.getElementById('prices').insertAdjacentHTML('beforeend', `
      <section class="menu-section" id="pakiety" aria-labelledby="pt-pakiety">
        <h2 id="pt-pakiety">${L('Pakiety zabiegów', 'Treatment packages')}</h2>
        <span class="ornament" aria-hidden="true"></span>
        <p class="menu-intro">${L('Zabiegi z serii taniej, w jednym pakiecie. Pakiet kupisz w gabinecie, a kolejne wizyty rezerwujesz online jak zwykle: zalogowana na swoje konto wybierasz „z pakietu” i nic nie płacisz na miejscu.', 'Treatments from a series for less, in one package. You buy the package at the studio and book each visit online as usual: when signed in, choose “from package” and pay nothing on the day.')} <a href="${L('regulamin.html#pakiety', 'regulamin.html#pakiety-en')}">${L('Zasady pakietów', 'Package terms')}</a></p>
        <ul class="menu-list">${types.map((t) => `
          <li class="menu-item">
            <div class="menu-row"><span class="menu-name">${L(t.name, t.nameEn)}</span><span class="menu-dots" aria-hidden="true"></span><span class="menu-price">${S.formatPrice(t.price)}</span></div>
            <div class="menu-meta"><span class="menu-time">${L(`${t.sessions} ${t.sessions % 10 >= 2 && t.sessions % 10 <= 4 && (t.sessions % 100 < 10 || t.sessions % 100 >= 20) ? 'zabiegi' : 'zabiegów'}, ${S.formatPrice(t.perSession)} za zabieg, ważny ${months(t.validMonths)}`, `${t.sessions} treatments, ${S.formatPrice(t.perSession)} per treatment, valid for ${months(t.validMonths)}`)}</span>
              <span class="menu-links"><a class="menu-book" href="zabiegi.html#${t.treatmentId}">${L('Opis zabiegu', 'Description')}</a></span></div>
          </li>`).join('')}</ul>
      </section>`);
  }).catch(() => { /* bez pakietów cennik działa normalnie */ });
});
