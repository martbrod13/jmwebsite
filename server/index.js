/*
 * Serwer strony: `npm run dev` (lokalnie) albo `npm start` (produkcja).
 * Tylko wbudowane moduły Node.js — nic nie trzeba instalować.
 */
const env = require('./env');

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`\n  Potrzebny jest Node.js w wersji 22.13 lub nowszej (masz ${process.version}).\n  Pobierz wersję LTS ze strony https://nodejs.org i uruchom ponownie.\n`);
  process.exit(1);
}

const http = require('http');
const fs = require('fs');
const path = require('path');
const seed = require('./seed');
const Backup = require('./backup');
const api = require('./api');
const M = require('./messaging');
const B = require('./booking');
const G = require('./gallery');
const Sec = require('./security');

const ROOT = path.join(__dirname, '..');
const DEV = !env.production;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff'
};
// Serwujemy tylko pliki strony — nigdy bazy, kodu serwera ani .env
const PUBLIC = /^\/(?:[a-z0-9-]+\.html|assets\/(?:css|js|js\/pages|img|fonts)\/[A-Za-z0-9._-]+)$/;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    'frame-src https://www.google.com https://maps.google.com',
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};
if (env.production) SECURITY_HEADERS['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';

// odświeżanie strony po zmianach; po restarcie serwera (inny BOOT) strona też się odświeży
const BOOT = Date.now().toString(36);
// Strony, które Google może indeksować po starcie (SITE_INDEXING=1); konto, panel i wizyta zawsze ukryte
const INDEXABLE = ['index', 'zabiegi', 'cennik', 'rezerwacja', 'galeria', 'kontakt', 'regulamin', 'polityka-prywatnosci', 'polityka-cookies'];
function seoTags(html, page) {
  if (env.indexing && INDEXABLE.includes(page)) html = html.replace('<meta name="robots" content="noindex, nofollow">', '<meta name="robots" content="index, follow">');
  if (!env.publicUrl || !INDEXABLE.includes(page)) return html;
  const url = env.publicUrl + (page === 'index' ? '/' : '/' + page + '.html');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const tags = [
    `<link rel="canonical" href="${url}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="pl_PL">',
    `<meta property="og:site_name" content="${B.C.salon.brand}">`,
    `<meta property="og:title" content="${title}">`,
    desc ? `<meta property="og:description" content="${desc}">` : '',
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${env.publicUrl}/assets/img/og.jpg">`,
    '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
    '<meta name="twitter:card" content="summary_large_image">'
  ].filter(Boolean).join('\n  ');
  return html.replace('</head>', '  ' + tags + '\n</head>');
}
function robots() {
  if (!env.indexing) return 'User-agent: *\nDisallow: /\n';
  return ['User-agent: *', 'Allow: /', 'Disallow: /panel.html', 'Disallow: /konto.html', 'Disallow: /wizyta.html', 'Disallow: /api/', 'Disallow: /w/',
    env.publicUrl ? `Sitemap: ${env.publicUrl}/sitemap.xml` : ''].filter(Boolean).join('\n') + '\n';
}
function sitemap() {
  const urls = INDEXABLE.map((p) => {
    const mod = fs.statSync(path.join(ROOT, p + '.html')).mtime.toISOString().slice(0, 10);
    return `  <url><loc>${env.publicUrl}${p === 'index' ? '/' : '/' + p + '.html'}</loc><lastmod>${mod}</lastmod></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

const RELOAD = `<script>(function(){try{var b,es=new EventSource('/__reload');es.onmessage=function(e){if(e.data==='reload'||(b&&b!==e.data))location.reload();if(e.data!=='reload')b=e.data;};}catch(e){}})();</script>`;
const reloadClients = new Set();

function notFound(res) {
  const file = path.join(ROOT, '404.html');
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(fs.existsSync(file) ? fs.readFileSync(file) : 'Nie znaleziono');
}

function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  if (!PUBLIC.test(pathname)) return notFound(res);
  const file = path.join(ROOT, pathname);
  if (!fs.existsSync(file)) return notFound(res);
  const ext = path.extname(file).toLowerCase();
  const type = TYPES[ext] || 'application/octet-stream';
  if (ext === '.html') {
    let html = seoTags(fs.readFileSync(file, 'utf8'), path.basename(file, '.html'));
    if (DEV) html = html.replace('</body>', RELOAD + '</body>');
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    return res.end(html);
  }
  // w produkcji zdjęcia i czcionki mogą być długo w pamięci przeglądarki
  const cache = DEV ? 'no-cache' : /\.(woff2?|png|jpe?g|webp|svg|ico)$/.test(ext) ? 'public, max-age=2592000' : 'public, max-age=3600';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch (e) { res.writeHead(400); return res.end(); }
  const p = url.pathname;

  if (p.startsWith('/api/')) return api.handle(req, res, url);
  if (p === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end(robots()); }
  if (p === '/sitemap.xml') {
    if (!env.indexing || !env.publicUrl) return notFound(res);
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' }); return res.end(sitemap());
  }
  if (DEV && p === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 1000\n\n'); res.write('data: ' + BOOT + '\n\n'); reloadClients.add(res); req.on('close', () => reloadClients.delete(res)); return;
  }
  // link z SMS-a: /w/<klucz> → strona wizyty (klucz w # nie trafia do logów ani nagłówka Referer)
  const w = p.match(/^\/w\/([A-Za-z0-9_-]{16,64})$/);
  if (w) { res.writeHead(302, { Location: '/wizyta.html#' + w[1] }); return res.end(); }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  // zdjęcia z galerii (z folderu data); ukryte zdjęcia widzi tylko zalogowany panel
  const up = p.match(/^\/uploads\/gallery\/([^/]+)$/);
  if (up) {
    const file = G.fileFor(up[1], !!Sec.readSession(req, 'admin'));
    if (!file) return notFound(res);
    res.writeHead(200, { 'Content-Type': file.endsWith('.webp') ? 'image/webp' : 'image/jpeg', 'Cache-Control': 'public, max-age=3600' });
    return fs.createReadStream(file).pipe(res);
  }
  serveStatic(req, res, p);
});

if (DEV) {
  let timer;
  try {
    fs.watch(ROOT, { recursive: true }, (event, name) => {
      if (!name || /(^|[\\/])(\.git|node_modules|data)([\\/]|$)/.test(name)) return;
      clearTimeout(timer);
      timer = setTimeout(() => reloadClients.forEach((c) => c.write('data: reload\n\n')), 150);
    });
  } catch (e) { /* bez automatycznego odświeżania */ }
}

const initialPassword = seed.run();

// Harmonogram: co minutę przypomnienia 24 h przed wizytą, wysyłka kolejki, zamykanie odbytych wizyt
function tick() {
  try { api.queueReminders(); M.processQueue(); Backup.dailyBackup(); } catch (e) { console.error('Harmonogram:', e.message); }
}
setInterval(tick, 60 * 1000).unref();

function listen(port) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && DEV) return listen(port + 1);
    throw err;
  });
  server.listen(port, env.host, () => {
    const url = `http://localhost:${port}`;
    M.setBaseUrl(url);
    const mode = M.mode();
    console.log('');
    console.log('  Justyna Mańka Beauty & Aesthetics');
    console.log('');
    console.log(`  - Strona:          ${url}`);
    console.log(`  - Panel gabinetu:  ${url}/panel.html`);
    // na serwerze hasła nie wypisujemy (trafiłoby do logów systemu)
    if (initialPassword) console.log(`    Konta panelu: ${B.C.panelAccounts.map((a) => a.email).join(', ')}, hasło: ${env.production ? 'z ADMIN_INITIAL_PASSWORD w .env' : initialPassword}`);
    console.log(`  - SMS-y: ${mode.sms === 'test' ? 'tryb testowy (nic nie jest wysyłane, podgląd w panelu i tutaj)' : 'SMSAPI'}`);
    console.log(`  - E-maile: ${mode.email === 'test' ? 'tryb testowy (podgląd w panelu i tutaj)' : 'Resend'}`);
    console.log(`  - Baza danych: ${path.relative(ROOT, path.join(env.dataDir, 'jm.db'))} (kopia zapasowa codziennie po 3:00)`);
    console.log(`  - Google: ${env.indexing ? 'strona widoczna (SITE_INDEXING=1)' : 'strona ukryta przed wyszukiwarkami'}`);
    console.log('');
    if (DEV) console.log('  Zmiany w plikach odświeżają stronę automatycznie. Zatrzymanie: Ctrl + C');
    console.log('');
    tick();
  });
}
listen(env.port);
