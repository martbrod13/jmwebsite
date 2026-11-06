JM.ready.then(function () {
  const S = JM.store, ui = JM.ui, s = JM.salon, L = JM.L;
  const q = encodeURIComponent(s.mapQuery);

  document.getElementById('contact-items').innerHTML = `
    <li>${ui.icons.pin}<div><strong>${L('Adres', 'Address')}</strong>${s.street}<br>${s.postal} ${s.city}</div></li>
    <li>${ui.icons.phone}<div><strong>${L('Telefon', 'Phone')}</strong><a href="tel:${s.phoneHref}">${s.phone}</a></div></li>
    <li>${ui.icons.mail}<div><strong>E-mail</strong><a href="mailto:${s.email}">${s.email}</a></div></li>
    <li>${ui.icons.user}<div><strong>${L('Media społecznościowe', 'Social media')}</strong><a href="${s.instagram.url}" target="_blank" rel="noopener">Instagram: ${s.instagram.label}</a><br><a href="${s.facebook.url}" target="_blank" rel="noopener">Facebook: ${s.facebook.label}</a></div></li>`;
  document.getElementById('hours').innerHTML = ui.hoursText().map((r) => `<li><span>${r.day}</span><span>${r.hours}</span></li>`).join('');
  document.getElementById('maps-link').href = 'https://www.google.com/maps/dir/?api=1&destination=' + q;

  const box = document.getElementById('mapa');
  function renderMap() {
    const c = S.cookieConsent();
    if (c && c.maps) {
      box.innerHTML = `<iframe title="${L('Mapa dojazdu do gabinetu', 'Map to the studio')}" src="https://www.google.com/maps?q=${q}&z=16&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
    } else {
      box.innerHTML = `
        <div class="map-placeholder">
          <p class="map-address">${s.street}<br>${s.city}</p>
          <p>${L('Interaktywna mapa Google wczyta się po Twojej zgodzie. Google może wtedy zapisać własne pliki cookies.', 'The interactive Google map loads once you agree. Google may then set its own cookies.')}</p>
          <div><button class="btn btn-primary" type="button" id="map-consent">${L('Pokaż mapę', 'Show map')}</button></div>
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

  document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; let bad = null;
    f.querySelectorAll('.field-error').forEach((x) => x.remove());
    f.querySelectorAll('.has-error').forEach((x) => x.classList.remove('has-error'));
    [['name', L('Wpisz imię.', 'Enter your name.')], ['contact', L('Podaj e-mail lub telefon, żebyśmy mogli odpowiedzieć.', 'Give us an email or phone number so we can reply.')], ['message', L('Wpisz treść wiadomości.', 'Write your message.')]].forEach(([n, t]) => {
      const el = f.elements[n]; if (!el.value.trim()) { el.closest('.field').classList.add('has-error'); el.closest('.field').insertAdjacentHTML('beforeend', `<span class="field-error">${t}</span>`); bad = bad || el; }
    });
    if (bad) return bad.focus();
    const btn = f.querySelector('[type=submit]'); btn.disabled = true;
    try {
      await S.sendContact({ name: f.elements.name.value, contact: f.elements.contact.value, message: f.elements.message.value });
      f.reset(); ui.toast(L('Wiadomość wysłana. Odpowiemy najszybciej, jak to możliwe.', 'Message sent. We will reply as soon as we can.'));
    } catch (err) { ui.toast(err.message); } finally { btn.disabled = false; }
  });
});
