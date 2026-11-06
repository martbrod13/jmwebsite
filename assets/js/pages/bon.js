/* Bon podarunkowy do wydruku albo PDF (tylko dla zalogowanego panelu). */
JM.ready.then(async function () {
  const S = JM.store;
  const root = document.getElementById('bon');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const id = new URLSearchParams(location.search).get('id');
  try {
    const { voucher: v, salon } = await S.api('GET', '/api/admin/vouchers/' + encodeURIComponent(id));
    const until = new Date(v.validUntil + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
    const amount = v.amount.toLocaleString('pl-PL', { maximumFractionDigits: 2 });
    document.title = `Bon ${v.code} | ${salon.brand}`;
    root.innerHTML = `
      <article class="voucher" aria-label="Bon podarunkowy ${esc(v.code)}">
        <div class="v-side"><img src="assets/img/logo-gold.webp" alt="${esc(salon.brand)}"></div>
        <div class="v-main">
          <p class="v-kicker">Bon podarunkowy</p>
          <p class="v-amount">${amount}<span> zł</span></p>
          ${v.recipient ? `<p class="v-for">dla <em>${esc(v.recipient)}</em></p>` : ''}
          ${v.message ? `<p class="v-msg">${esc(v.message)}</p>` : ''}
          ${v.giver ? `<p class="v-from">${esc(v.giver)}</p>` : ''}
          <dl class="v-meta">
            <div><dt>Kod bonu</dt><dd>${esc(v.code)}</dd></div>
            <div><dt>Ważny do</dt><dd>${until}</dd></div>
          </dl>
          <p class="v-how">Do wykorzystania na dowolne zabiegi w gabinecie, także w kilku częściach. Kod wpisz przy rezerwacji na stronie albo podaj w gabinecie. ${esc(salon.street)}, ${esc(salon.city)} · ${esc(salon.phone)}</p>
        </div>
      </article>
      ${v.status !== 'active' ? '<p class="form-msg" style="max-width:210mm;margin:16px auto">Ten bon jest unieważniony.</p>' : ''}`;
  } catch (e) {
    root.innerHTML = `<p class="form-msg" style="max-width:520px;margin:0 auto">${e.status === 401 ? 'Zaloguj się do <a href="panel.html">panelu gabinetu</a>, żeby wydrukować bon.' : esc(e.message)}</p>`;
  }
});
