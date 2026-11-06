/* Galeria efektów: zdjęcia dodane w panelu, filtr kategorii i powiększenie. */
JM.ready.then(async function () {
  const ui = JM.ui, esc = ui.esc, L = JM.L;
  const root = document.getElementById('gallery');
  const empty = document.getElementById('gallery-empty');
  let photos = [];
  try { photos = (await JM.store.api('GET', '/api/gallery')).photos; } catch (e) { photos = []; }
  if (!photos.length) { empty.hidden = false; return; }

  const alt = (g) => (JM.lang === 'en' && g.altEn ? g.altEn : g.altPl);
  const catName = (id) => { const c = JM.categories.find((x) => x.id === id); return c ? c.name : ''; };
  const cats = JM.categories.filter((c) => photos.some((g) => g.category === c.id));
  let filter = 'all';
  const shown = () => photos.filter((g) => filter === 'all' || g.category === filter);

  function render() {
    const list = shown();
    root.innerHTML = `
      ${cats.length > 1 ? `<div class="chip-nav gallery-filter" role="group" aria-label="${L('Kategorie', 'Categories')}">
        <button type="button" class="chip" data-filter="all" aria-pressed="${filter === 'all'}">${L('Wszystkie', 'All')}</button>
        ${cats.map((c) => `<button type="button" class="chip" data-filter="${c.id}" aria-pressed="${filter === c.id}">${esc(c.name)}</button>`).join('')}
      </div>` : ''}
      <ul class="gallery-photos">
        ${list.map((g, i) => `<li><figure>
          <button type="button" class="g-photo" data-open="${i}" aria-label="${L('Powiększ', 'Enlarge')}: ${esc(alt(g))}">
            <img src="${g.thumb}" alt="${esc(alt(g))}" width="${g.width}" height="${g.height}" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async">
          </button>
          <figcaption><span>${esc(catName(g.category))}</span>${esc(alt(g))}</figcaption>
        </figure></li>`).join('')}
      </ul>`;
  }

  /* ---------- Powiększenie ---------- */
  let dlg = null, idx = 0;
  function show() {
    const list = shown(), g = list[idx];
    dlg.querySelector('.lb-img').innerHTML = `<img src="${g.src}" alt="${esc(alt(g))}" width="${g.width}" height="${g.height}">`;
    dlg.querySelector('.lb-cap').innerHTML = `<span>${esc(catName(g.category))}</span> ${esc(alt(g))} <em>${idx + 1} / ${list.length}</em>`;
    dlg.querySelector('[data-lb="-1"]').hidden = list.length < 2;
    dlg.querySelector('[data-lb="1"]').hidden = list.length < 2;
  }
  function step(d) { const n = shown().length; idx = (idx + d + n) % n; show(); }
  function open(i) {
    idx = i;
    dlg = ui.h(`<dialog class="lightbox" aria-label="${L('Zdjęcie', 'Photo')}">
      <button type="button" class="lb-close" data-lb-close aria-label="${L('Zamknij', 'Close')}">×</button>
      <button type="button" class="lb-nav lb-prev" data-lb="-1" aria-label="${L('Poprzednie zdjęcie', 'Previous photo')}">${ui.icons.arrowL}</button>
      <div class="lb-img"></div>
      <button type="button" class="lb-nav lb-next" data-lb="1" aria-label="${L('Następne zdjęcie', 'Next photo')}">${ui.icons.arrowR}</button>
      <p class="lb-cap"></p>
    </dialog>`);
    document.body.appendChild(dlg); show(); dlg.showModal();
    const opener = root.querySelector(`[data-open="${i}"]`);
    dlg.addEventListener('close', () => { dlg.remove(); dlg = null; if (opener) opener.focus(); });
    dlg.addEventListener('click', (e) => {
      if (e.target.closest('[data-lb-close]') || e.target === dlg) return dlg.close();
      const b = e.target.closest('[data-lb]'); if (b) step(Number(b.dataset.lb));
    });
    dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
    let x0 = null;
    dlg.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); x0 = null; });
  }

  root.addEventListener('click', (e) => {
    const f = e.target.closest('[data-filter]'); if (f) { filter = f.dataset.filter; render(); return; }
    const o = e.target.closest('[data-open]'); if (o) open(Number(o.dataset.open));
  });
  render();
});
