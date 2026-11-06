/*
 * Panel jako aplikacja na telefonie. Ten plik pozwala dodać panel do ekranu telefonu.
 * Niczego nie zapisuje na zapas: dane zawsze idą prosto z serwera. Bez internetu pokazuje krótką informację.
 */
const OFFLINE = `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Panel gabinetu</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f3ece2;color:#462a1f;font-family:system-ui,sans-serif;text-align:center;padding:24px}
h1{font-family:Georgia,serif;font-weight:400;font-size:1.75rem;margin:0 0 12px}p{margin:0 0 24px;color:#5e443a}button{font:inherit;background:#462a1f;color:#ecd9aa;border:0;padding:12px 24px}</style></head>
<body><div><h1>Brak połączenia</h1><p>Panel potrzebuje internetu, żeby pokazać aktualne wizyty.</p><button onclick="location.reload()">Spróbuj ponownie</button></div></body></html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
