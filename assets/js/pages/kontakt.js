(function () {
  const S = JM.store, ui = JM.ui, s = JM.salon;
  const q = encodeURIComponent(s.mapQuery);

  document.getElementById('contact-items').innerHTML = `
    <li>${ui.icons.pin}<div><strong>Adres</strong>${s.street}<br>${s.postal} ${s.city}</div></li>
    <li>${ui.icons.phone}<div><strong>Telefon</strong><a href="tel:${s.phoneHref}">${s.phone}</a></div></li>
    <li>${ui.icons.mail}<div><strong>E-mail</strong><a href="mailto:${s.email}">${s.email}</a></div></li>
    <li>${ui.icons.user}<div><strong>Media społecznościowe</strong><a href="${s.instagram.url}" target="_blank" rel="noopener">Instagram: ${s.instagram.label}</a><br><a href="${s.facebook.url}" target="_blank" rel="noopener">Facebook: ${s.facebook.label}</a></div></li>`;
  document.getElementById('hours').innerHTML = ui.hoursText().map((r) => `<li><span>${r.day}</span><span>${r.hours}</span></li>`).join('');
  document.getElementById('maps-link').href = 'https://www.google.com/maps/dir/?api=1&destination=' + q;

  const box = document.getElementById('mapa');
  function renderMap() {
    const c = S.cookieConsent();
    if (c && c.maps) {
      box.innerHTML = `<iframe title="Mapa dojazdu do gabinetu" src="https://www.google.com/maps?q=${q}&z=16&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
    } else {
      box.innerHTML = `
        <div class="map-placeholder">
          <p class="map-address">${s.street}<br>${s.city}</p>
          <p>Interaktywna mapa Google wczyta się po Twojej zgodzie. Google może wtedy zapisać własne pliki cookies.</p>
          <div><button class="btn btn-primary" type="button" id="map-consent">Pokaż mapę</button></div>
        </div>`;
      document.getElementById('map-consent').addEventListener('click', () => {
        S.setCookieConsent({ necessary: true, maps: true });
        const banner = document.querySelector('.cookie-banner'); if (banner) banner.remove();
        renderMap();
      });
    }
  }
  renderMap();
  document.addEventListener('jm:cookies', renderMap);

  document.getElementById('contact-form').addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.target; let bad = null;
    f.querySelectorAll('.field-error').forEach((x) => x.remove());
    f.querySelectorAll('.has-error').forEach((x) => x.classList.remove('has-error'));
    [['name', 'Wpisz imię.'], ['contact', 'Podaj e-mail lub telefon, żebyśmy mogli odpowiedzieć.'], ['message', 'Wpisz treść wiadomości.']].forEach(([n, t]) => {
      const el = f.elements[n]; if (!el.value.trim()) { el.closest('.field').classList.add('has-error'); el.closest('.field').insertAdjacentHTML('beforeend', `<span class="field-error">${t}</span>`); bad = bad || el; }
    });
    if (bad) return bad.focus();
    f.reset(); ui.toast('Wiadomość wysłana. Odpowiemy najszybciej, jak to możliwe.');
  });
})();
