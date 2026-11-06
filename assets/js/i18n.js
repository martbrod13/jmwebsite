/*
 * Wersje językowe: polski (domyślny) i angielski.
 * Wybór zapisuje się w przeglądarce (jm_lang). Panel gabinetu jest zawsze po polsku.
 * W kodzie: JM.L('tekst po polsku', 'English text').
 * W HTML: <span data-lang="pl">…</span><span data-lang="en">…</span>
 */
window.JM = window.JM || {};

(function () {
  const forcePl = /panel\.html$/.test(location.pathname);
  let lang = 'pl';
  try { if (localStorage.getItem('jm_lang') === 'en' && !forcePl) lang = 'en'; } catch (e) { /* ignore */ }

  JM.lang = lang;
  document.documentElement.lang = lang;
  JM.L = (pl, en) => (JM.lang === 'en' && en != null ? en : pl);
  JM.setLang = (l) => {
    try { localStorage.setItem('jm_lang', l); } catch (e) { /* ignore */ }
    location.reload();
  };

  if (lang !== 'en') return;

  JM.dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  JM.dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  JM.monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  JM.monthGen = JM.monthNames;
  JM.promoEn = {
    'swieta-2026': { title: 'Christmas skincare', text: '15% off mesotherapy and skin boosters for registered clients.' },
    urodziny: { title: 'Birthday gift', text: '10% off any treatment in your birthday month.' }
  };
})();
