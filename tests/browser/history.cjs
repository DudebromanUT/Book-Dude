/* Maddy's built-in reading history (docs/history.json): on a device that already has a book of hers, it lands on her
 * shelves once, her own copy of a book wins, a second start adds nothing, and it is all there offline.
 *
 *   Run:     node tests/browser/history.cjs
 *
 * Needs Playwright 1.56.1 and its Chromium, like clickthrough.cjs. */
const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert');
const { chromium, devices } = require('playwright');

const DOCS = path.join(__dirname, '..', '..', 'docs');
const HISTORY = JSON.parse(fs.readFileSync(path.join(DOCS, 'history.json'), 'utf8'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };

// docs/ at /Book-Dude/; while `offline.history` is set, history.json is missing (for the page and the service worker).
const offline = { history: false };
function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (offline.history && url.pathname.endsWith('/history.json')) { res.writeHead(404); res.end(); return; }
    const rel = decodeURIComponent(url.pathname).replace(/^\/Book-Dude\//, '');
    const file = path.join(DOCS, rel === '' || rel.endsWith('/') ? rel + 'index.html' : rel);
    if (!url.pathname.startsWith('/Book-Dude/') || !file.startsWith(DOCS + path.sep)) { res.writeHead(404); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': (TYPES[path.extname(file)] || 'application/octet-stream'), 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

(async () => {
  const server = await serve();
  const BASE = 'http://127.0.0.1:' + server.address().port + '/Book-Dude/';
  const browser = await chromium.launch();
  const errors = [];
  try {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Denver' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    const finished = async () => {
      await p.$eval('.tab[data-tab="shelves"]', e => e.click()); await sleep(800);
      return clean(await p.textContent('#main .chips'));
    };

    // First visit while the history file can't load: she finishes Hatchet with 7 points.
    offline.history = true;
    await p.goto(BASE); await p.waitForSelector('#sheet[open] .story');
    await p.click('.story .btn[data-act="close-sheet"]'); await sleep(400);
    await p.fill('#q', 'hatchet'); await sleep(600); await p.$eval('#items .card', e => e.click()); await sleep(500);
    await p.$eval('[data-act="status"][data-status="finished"]', e => e.click()); await sleep(300);
    await p.fill('#earned-input', '7'); await p.$eval('form[data-form="quiz"] button[type="submit"]', e => e.click()); await sleep(400);
    await p.$eval('#sheet .sheet-bar [data-act="close-sheet"]', e => e.click()); await sleep(300);
    assert.match(await finished(), /Finished 1(?!\d)/, 'nothing added while the file could not load');

    // Next start, file available: the history lands.
    offline.history = false;
    await p.reload(); await p.waitForSelector('.view-head'); await sleep(2500);
    const total = Object.keys(HISTORY.records).length;
    assert.match(await finished(), new RegExp('Finished ' + total + '(?!\\d)'), 'all history books on Finished');
    assert.match(await finished(), new RegExp('My books ' + Object.keys(HISTORY.customBooks).length + '(?!\\d)'));
    await p.$eval('[data-act="shelf"][data-shelf="finished"]', e => e.click()); await sleep(1500);
    const list = clean(await p.textContent('#main .list'));
    assert.match(list, /Gary PaulsenFinished [A-Z][a-z]{2} \d+, \d{4}7 pts earned/, 'her own Hatchet is kept');
    assert.match(list, /Andrew ClementsFinished [A-Z][a-z]{2} \d{4}Quiz \d+%/, 'history shows the month and quiz score');
    await p.$eval('.tab[data-tab="progress"]', e => e.click()); await sleep(600);
    assert.match(clean(await p.textContent('#main')), /7 of 10 points/, 'history adds no reward points');

    // A second start adds nothing, and it all works offline.
    await p.evaluate(() => navigator.serviceWorker.ready); await sleep(1000);
    await p.reload(); await p.waitForSelector('.view-head'); await sleep(1500);
    assert.match(await finished(), new RegExp('Finished ' + total + '(?!\\d)'));
    await ctx.setOffline(true);
    await p.reload(); await p.waitForSelector('.view-head'); await sleep(1500);
    assert.match(await finished(), new RegExp('Finished ' + total + '(?!\\d)'), 'offline');
    assert.deepStrictEqual(errors, []);
    console.log('History lands once, keeps her own copies, and works offline (' + total + ' books).');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED', e.message.split('\n')[0]); process.exit(1); });
