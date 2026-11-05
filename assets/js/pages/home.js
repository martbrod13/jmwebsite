(function () {
  const S = JM.store;
  const list = document.getElementById('cat-list');
  if (!list) return;
  const all = S.allTreatments();
  list.innerHTML = JM.categories.map((c) => {
    const prices = all.filter((t) => t.category === c.id).map((t) => t.price);
    const min = Math.min.apply(null, prices);
    return `<li><a class="cat-row" href="zabiegi.html#${c.id}">
      <span class="cat-name">${c.name}</span>
      <span class="cat-desc">${c.lead}<span>Zobacz zabiegi</span></span>
      <span class="cat-price">${S.formatPrice(min, true)}</span>
    </a></li>`;
  }).join('');
})();
