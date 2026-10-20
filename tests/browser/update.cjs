/* Updates: the app shows its version at the top, and a new version that's ready while the app is opening switches over
 * by itself (no banner, nothing lost); one that arrives later waits for the "Update app" banner.
 *
 *   Run:     node tests/browser/update.cjs
 *
 * Needs Playwright 1.56.1 and its Chromium, like clickthrough.cjs. */
const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert');
const { chromium, devices } = require('playwright');

const DOCS = path.join(__dirname, '..', '..', 'docs');
const VERSION = /APP_VERSION = '([^']*)'/.exec(fs.readFileSync(path.join(DOCS, 'app', 'version.js'), 'utf8'))[1];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };

// docs/ at /Book-Dude/. `release` stands in for a deploy: it changes the offline version in sw.js.
const site = { release: '' };
function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const rel = decodeURIComponent(url.pathname).replace(/^\/Book-Dude\//, '');
    const file = path.join(DOCS, rel === '' || rel.endsWith('/') ? rel + 'index.html' : rel);
    if (!url.pathname.startsWith('/Book-Dude/') || !file.startsWith(DOCS + path.sep)) { res.writeHead(404); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      if (rel === 'sw.js' && site.release) data = Buffer.from(String(data).replace(/const VERSION = "([^"]*)"/, 'const VERSION = "$1-' + site.release + '"'));
      res.writeHead(200, { 'Content-Type': (TYPES[path.extname(file)] || 'application/octet-stream'), 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const offlineVersion = p => p.evaluate(async () => (await caches.keys()).filter(k => k.startsWith('reading-room:')).map(k => k.split(':').pop()).sort().join(','));

(async () => {
  const server = await serve();
  const BASE = 'http://127.0.0.1:' + server.address().port + '/Book-Dude/';
  const browser = await chromium.launch();
  const errors = [];
  try {
    const ctx = await browser.newContext({ ...devices['iPad (gen 7)'], timezoneId: 'America/Denver' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(BASE); await p.waitForSelector('#sheet[open] .story');
    await p.click('.story .btn[data-act="close-sheet"]');
    await p.evaluate(() => navigator.serviceWorker.ready); await sleep(1500);

    // The version, in small print at the top.
    assert.equal(await p.textContent('#app-version'), 'App version ' + VERSION);
    assert.match(VERSION, /^(0[1-9]|1[0-2])\.\d{2}(\.\d{2})?$/);
    const first = await offlineVersion(p);

    // A deploy happens; the next time the app opens, the new version switches over by itself.
    site.release = 'a';
    let loads = 0;
    p.on('load', () => { loads++; });
    await p.reload();
    for (let i = 0; i < 30 && !(loads >= 2 && await offlineVersion(p).catch(() => '') === first + '-a'); i++) await sleep(1000);
    assert.ok(loads >= 2, 'the app reloaded itself into the new version');
    assert.equal(await offlineVersion(p), first + '-a', 'only the new version is kept');
    assert.equal(await p.isHidden('#update'), true, 'no banner needed');

    // Another deploy while she's been using the app a while: it waits for the banner, so nothing she's doing is cut off.
    // (The deploy happens only after those first 30 seconds, so the check made when the app opened can't see it.)
    await sleep(Math.max(0, 31000 - await p.evaluate(() => performance.now())));
    await p.evaluate(() => { window.__waited = true; });
    site.release = 'b';
    await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
    await p.waitForSelector('#update:not([hidden])', { timeout: 30000 });
    assert.equal(await p.evaluate(() => window.__waited), true, 'no reload on its own');
    await p.click('[data-act="update-app"]');
    await p.waitForFunction(() => !window.__waited, null, { timeout: 15000 });
    await sleep(1000);
    assert.equal(await offlineVersion(p), first + '-b');
    assert.deepStrictEqual(errors, []);
    console.log('App version ' + VERSION + ' shows; a ready update switches over when the app opens, and waits for the banner later.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED', e.message.split('\n').slice(0, 3).join(' ')); process.exit(1); });
