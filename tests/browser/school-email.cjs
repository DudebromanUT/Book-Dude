/* Quiz results from the school's emails: a grown-up pastes the link, new quizzes land on her shelf with points and
 * % score (a book not in the app is added), the jar moves, a result typed by hand stays, and nothing lands twice.
 * The Google script's link is played by this test, serving her first real quiz email plus two made-up ones.
 *
 *   Run:     node tests/browser/school-email.cjs
 *
 * Needs Playwright 1.56.1 and its Chromium, like clickthrough.cjs. */
const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert');
const { chromium, devices } = require('playwright');

const DOCS = path.join(__dirname, '..', '..', 'docs');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
const LINK = 'https://script.google.com/macros/s/AKfyTEST-123/exec?key=abc123';
const QUIZZES = [
  { id: '19a2b01', date: '2026-10-19', title: 'Adventure in Grand Canyon National Park', author: 'Aaron Johnson', points: 7, possible: 7, score: 100, level: 4.7 },
  { id: '19a2b02', date: '2026-10-20', title: 'Hatchet', author: 'Gary Paulsen', points: 6, possible: 7, score: 80, level: 5.7 },
  { id: '19a2b03', date: '2026-10-20', title: 'Frindle', author: 'Andrew Clements', points: 2, possible: 2, score: 100, level: 5.4 }
];

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
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
  let asked = 0;
  try {
    // No offline worker here, so the stand-in link answers every request the page makes.
    const ctx = await browser.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Denver', serviceWorkers: 'block' });
    await ctx.route('https://script.google.com/**', route => {
      asked++;
      const ok = new URL(route.request().url()).searchParams.get('key') === 'abc123';
      route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(ok ? { app: 'book-dude-school', quizzes: QUIZZES } : { error: 'That link is not right.' }) });
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    const toast = async () => { await p.waitForSelector('#toast.show', { timeout: 8000 }); const t = clean(await p.textContent('#toast')); await p.waitForSelector('#toast:not(.show)', { timeout: 15000 }); return t; };
    const shelves = async () => { await p.$eval('.tab[data-tab="shelves"]', e => e.click()); await sleep(700); return clean(await p.textContent('#main .chips')); };
    const openBook = async q => { await p.$eval('.tab[data-tab="explore"]', e => e.click()); await sleep(300); await p.fill('#q', q); await sleep(700); await p.$eval('#items .card', e => e.click()); await sleep(500); };
    const closeBook = () => p.$eval('#sheet .sheet-bar [data-act="close-sheet"]', e => e.click()).then(() => sleep(300));

    await p.goto(BASE); await p.waitForSelector('#sheet[open] .story');
    await p.click('.story .btn[data-act="close-sheet"]'); await sleep(2500);
    assert.equal(asked, 0, 'no link, no asking');

    // Hatchet's 7 points were already typed in by hand.
    await openBook('hatchet');
    if (!(await p.$('#earned-input'))) await p.$eval('[data-act="status"][data-status="finished"]', e => e.click());
    await sleep(300); await p.fill('#earned-input', '7'); await p.$eval('form[data-form="quiz"] button[type="submit"]', e => e.click()); await sleep(400);
    await closeBook(); await toast().catch(() => '');

    // A wrong link is turned away; the real one brings the quizzes in.
    await p.$eval('.tab[data-tab="more"]', e => e.click()); await sleep(400);
    await p.fill('#school-link', 'https://example.com/quizzes'); await p.dispatchEvent('#school-link', 'change');
    assert.match(await toast(), /isn’t the school quiz link/);
    assert.equal(await p.inputValue('#school-link'), '');
    await p.fill('#school-link', LINK); await p.dispatchEvent('#school-link', 'change');
    await sleep(300);
    const news = clean(await p.textContent('#toast'));
    console.log('toast:', news);
    assert.match(news, /3 new quizzes from school!/);
    await p.waitForSelector('#toast:not(.show)', { timeout: 15000 });
    assert.match(clean(await p.textContent('.panel:has(#school-link)')), /3 quizzes added so far/);

    // Grand Canyon wasn't in the app: added, Finished, 7 points and 100% on its cover.
    assert.match(await shelves(), /Read Books 636(?!\d)/);
    await openBook('grand canyon');
    const page = clean(await p.textContent('#sheet'));
    assert.match(page, /Aaron Johnson/); assert.match(page, /Lvl 4\.7/); assert.match(page, /7 pts/); assert.match(page, /100%/);
    assert.equal(await p.$eval('#sheet .book-hero .cover .result', e => e.textContent), '7 pts · 100%');
    await closeBook();
    // Hatchet keeps the 7 typed by hand (not the email's 6) and its 100% from her history; Frindle (history) gets its points.
    await openBook('hatchet');
    assert.equal(await p.$eval('#sheet .book-hero .cover .result', e => e.textContent), '7 pts · 100%');
    await closeBook();
    await openBook('frindle');
    assert.equal(await p.$eval('#sheet .book-hero .cover .result', e => e.textContent), '2 pts · 90%');
    await closeBook();
    await p.$eval('.tab[data-tab="progress"]', e => e.click()); await sleep(600);
    assert.match(clean(await p.textContent('#main')), /16 points all time/);

    // Opening again asks the link again, but nothing lands twice.
    const before = asked;
    await p.reload(); await p.waitForSelector('.view-head'); await sleep(2500);
    assert.ok(asked > before, 'asked again on opening');
    assert.match(await shelves(), /Read Books 636(?!\d)/);
    await p.$eval('.tab[data-tab="progress"]', e => e.click()); await sleep(600);
    assert.match(clean(await p.textContent('#main')), /16 points all time/);
    await p.$eval('.tab[data-tab="more"]', e => e.click()); await sleep(400);
    await p.$eval('[data-act="school-sync"]', e => e.click());
    assert.equal(await toast(), 'No new quizzes from school yet.');
    assert.deepStrictEqual(errors, []);
    console.log('School quiz emails land once, keep hand-typed points, and add books not in the app.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED', e.message.split('\n').slice(0, 3).join(' ')); process.exit(1); });
