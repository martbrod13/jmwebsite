(function () {
  const S = JM.store;
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
          ${t.id === 'konsultacja' ? '' : `<a class="menu-book" href="zabiegi.html#${t.id}" aria-label="Opis zabiegu: ${t.name}">Opis zabiegu</a>`}
          <a class="menu-book" href="rezerwacja.html?zabieg=${t.id}" aria-label="Zarezerwuj: ${t.name}">Zarezerwuj</a>
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
    section('Konsultacja', 'konsultacja', [JM.consultation]) +
    JM.categories.map((c) => section(c.name, c.id, all.filter((t) => t.category === c.id))).join('');
})();
