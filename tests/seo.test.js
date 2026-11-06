/* Tryb „po starcie”: SITE_INDEXING=1 i adres strony — Google widzi publiczne strony, a konto i panel nie. */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 3990 + Math.floor(Math.random() * 9);
const BASE = `http://localhost:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-seo-'));
let server;
before(async () => {
  server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(__dirname, '..', 'server', 'index.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: dataDir, SITE_INDEXING: '1', PUBLIC_URL: 'https://justynamanka.pl' }), stdio: 'ignore'
  });
  for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/api/health'); return; } catch (e) { await new Promise((r) => setTimeout(r, 100)); } }
});
after(() => { server.kill(); fs.rmSync(dataDir, { recursive: true, force: true }); });

test('po starcie: robots.txt, mapa strony, indeksowanie i Open Graph', async () => {
  const robots = await (await fetch(BASE + '/robots.txt')).text();
  assert.match(robots, /Allow: \//); assert.match(robots, /Disallow: \/panel\.html/); assert.match(robots, /Sitemap: https:\/\/justynamanka\.pl\/sitemap\.xml/);
  const map = await (await fetch(BASE + '/sitemap.xml')).text();
  assert.match(map, /<loc>https:\/\/justynamanka\.pl\/<\/loc>/); assert.match(map, /cennik\.html/); assert.doesNotMatch(map, /panel|konto|wizyta/);
  const home = await (await fetch(BASE + '/')).text();
  assert.match(home, /content="index, follow"/); assert.match(home, /rel="canonical" href="https:\/\/justynamanka\.pl\/"/); assert.match(home, /og:image" content="https:\/\/justynamanka\.pl\/assets\/img\/og\.jpg"/);
  for (const p of ['/panel.html', '/konto.html', '/wizyta.html']) assert.match(await (await fetch(BASE + p)).text(), /noindex, nofollow/, p);
});
