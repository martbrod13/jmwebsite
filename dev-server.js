/*
 * Lokalny serwer prototypu: `npm run dev`
 * Bez instalowania pakietów — używa tylko wbudowanych modułów Node.js.
 * Po zapisaniu zmian w plikach strona w przeglądarce odświeża się sama.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const START_PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.webp': 'image/webp'
};
const RELOAD_SNIPPET = `<script>(function(){try{var es=new EventSource('/__reload');es.onmessage=function(){location.reload();};}catch(e){}})();</script>`;

const clients = new Set();

function send404(res) {
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><meta charset="utf-8"><title>Nie znaleziono</title><p style="font-family:sans-serif;padding:40px">Nie ma takiej strony. <a href="/">Wróć na stronę główną</a></p>');
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  if (url === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let file = path.normalize(path.join(ROOT, url));
  if (!file.startsWith(ROOT)) return send404(res);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) return send404(res);

  const ext = path.extname(file).toLowerCase();
  const type = TYPES[ext] || 'application/octet-stream';
  if (ext === '.html') {
    const html = fs.readFileSync(file, 'utf8').replace('</body>', RELOAD_SNIPPET + '</body>');
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    return res.end(html);
  }
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

// odświeżanie strony po zmianie plików
let timer;
try {
  fs.watch(ROOT, { recursive: true }, (event, name) => {
    if (!name || /(^|[\\/])(\.git|node_modules)([\\/]|$)/.test(name)) return;
    clearTimeout(timer);
    timer = setTimeout(() => clients.forEach((c) => c.write('data: reload\n\n')), 120);
  });
} catch (e) {
  console.log('  (Automatyczne odświeżanie niedostępne w tym systemie — odśwież stronę ręcznie.)');
}

function listen(port) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') { listen(port + 1); return; }
    throw err;
  });
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log('');
    console.log('  Justyna Mańka Beauty & Aesthetics — prototyp strony');
    console.log('');
    console.log(`  - Strona:          ${url}`);
    console.log(`  - Panel gabinetu:  ${url}/panel.html  (hasło: demo)`);
    console.log('');
    console.log('  Ctrl + klik w link otwiera stronę. Zmiany w plikach odświeżają ją automatycznie.');
    console.log('  Zatrzymanie serwera: Ctrl + C');
    console.log('');
  });
}
listen(START_PORT);
