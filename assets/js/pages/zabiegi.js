(function () {
  const S = JM.store, ui = JM.ui;
  const all = S.allTreatments();
  const list = (items) => '<ul class="dash-list">' + items.map((i) => `<li>${i}</li>`).join('') + '</ul>';

  document.getElementById('chip-nav').innerHTML =
    JM.categories.map((c) => `<li><a class="chip" href="#${c.id}">${c.name}</a></li>`).join('') +
    '<li><a class="chip" href="#konsultacja">Konsultacja</a></li>';

  function item(t) {
    return `
      <div class="acc-item" id="${t.id}">
        <h3 style="margin:0">
          <button class="acc-trigger" type="button" aria-expanded="false" aria-controls="p-${t.id}">
            <span><span class="acc-title">${t.name}</span><span class="acc-sub">${t.short}</span></span>
            <span class="acc-meta"><span>${S.formatDuration(t.duration)}</span><span>${S.formatPrice(t.price, t.from)}</span></span>
            <span class="acc-icon">${ui.icons.chevron}</span>
          </button>
        </h3>
        <div class="acc-panel" id="p-${t.id}" role="region" aria-label="${t.name}"><div>
          <div class="acc-content">
            <div>
              <p>${t.desc}</p>
              <h3>Dla kogo</h3>${list(t.forWhom)}
              <h3>Przebieg</h3><p>${t.steps}</p>
              <h3>Efekty</h3><p>${t.results}</p>
            </div>
            <aside class="acc-aside">
              <dl>
                <div><dt>Cena</dt><dd class="price-big">${S.formatPrice(t.price, t.from)}</dd></div>
                <div><dt>Czas wizyty</dt><dd>${S.formatDuration(t.duration)}</dd></div>
                <div><dt>Zalecana seria</dt><dd>${t.series}</dd></div>
              </dl>
              <a class="btn btn-primary btn-block" href="rezerwacja.html?zabieg=${t.id}">Zarezerwuj ten zabieg</a>
            </aside>
          </div>
        </div></div>
      </div>`;
  }
  function info(c) {
    return `
      <div class="acc-item acc-item-info" id="${c.id}-info">
        <h3 style="margin:0">
          <button class="acc-trigger" type="button" aria-expanded="false" aria-controls="p-${c.id}-info">
            <span><span class="acc-title">Przygotowanie, przeciwwskazania i zalecenia po zabiegu</span></span>
            <span class="acc-meta"></span>
            <span class="acc-icon">${ui.icons.chevron}</span>
          </button>
        </h3>
        <div class="acc-panel" id="p-${c.id}-info" role="region" aria-label="Przygotowanie i zalecenia: ${c.name}"><div>
          <div class="acc-content">
            <div>
              <h3>Jak się przygotować</h3>${list(c.prep)}
              <h3>Po zabiegu</h3>${list(c.after)}
            </div>
            <aside class="acc-aside">
              <h3>Przeciwwskazania</h3>${list(c.contra)}
              <p class="small" style="margin-top:18px">Przed zabiegiem wypełnisz w gabinecie kartę konsultacyjną. Jeśli nie wiesz, czy możesz wykonać zabieg, zadzwoń albo umów bezpłatną konsultację.</p>
            </aside>
          </div>
        </div></div>
      </div>`;
  }

  document.getElementById('categories').innerHTML = JM.categories.map((c) => `
    <section class="cat-block" id="${c.id}" aria-labelledby="h-${c.id}">
      <div class="cat-intro">
        <h2 id="h-${c.id}">${c.name}</h2>
        <p>${c.about}</p>
      </div>
      <div class="acc">
        ${all.filter((t) => t.category === c.id).map(item).join('')}
        ${info(c)}
      </div>
    </section>`).join('');

  function setOpen(el, open) {
    el.classList.toggle('is-open', open);
    el.querySelector('.acc-trigger').setAttribute('aria-expanded', String(open));
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.acc-trigger'); if (!btn) return;
    const it = btn.closest('.acc-item');
    setOpen(it, !it.classList.contains('is-open'));
  });

  const hash = decodeURIComponent(location.hash.slice(1));
  const target = hash && document.getElementById(hash);
  if (target && target.classList.contains('acc-item')) {
    setOpen(target, true);
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  } else if (target) {
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
})();
