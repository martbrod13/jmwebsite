(function () {
  const S = JM.store;
  const all = S.allTreatments();
  const row = (t) => `
    <tr>
      <td class="price-name">${t.name}<small>${t.short}</small></td>
      <td>${S.formatDuration(t.duration)}</td>
      <td>${S.formatPrice(t.price, t.from)}</td>
      <td><a class="btn btn-outline btn-small" href="rezerwacja.html?zabieg=${t.id}" aria-label="Zarezerwuj: ${t.name}">Zarezerwuj</a></td>
    </tr>`;
  const table = (title, id, items) => `
    <section class="price-section" id="${id}" aria-labelledby="pt-${id}">
      <h2 id="pt-${id}">${title}</h2>
      <table class="price-table">
        <thead><tr><th scope="col">Zabieg</th><th scope="col">Czas</th><th scope="col">Cena</th><th scope="col"><span class="sr-only">Rezerwacja</span></th></tr></thead>
        <tbody>${items.map(row).join('')}</tbody>
      </table>
    </section>`;
  document.getElementById('prices').innerHTML =
    table('Konsultacja', 'konsultacja', [JM.consultation]) +
    JM.categories.map((c) => table(c.name, c.id, all.filter((t) => t.category === c.id))).join('');
})();
