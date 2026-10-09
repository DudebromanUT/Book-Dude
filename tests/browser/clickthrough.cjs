/* Clicks through every feature of the app on a phone-sized screen, writes down what each step shows, and
 * compares that with tests/browser/clickthrough.expected.txt. Any difference fails, with the lines that changed.
 *
 *   Run:     node tests/browser/clickthrough.cjs
 *   Accept:  UPDATE=1 node tests/browser/clickthrough.cjs   (after a deliberate change; then review the diff of the .txt file)
 *   Slow:    THROTTLE=4 node tests/browser/clickthrough.cjs (checks the run still passes on a computer 4 times slower)
 *
 * Needs Playwright 1.56.1 and its Chromium: npm install --no-save playwright@1.56.1 && npx playwright install chromium
 *
 * Every run is the same: the app is served from docs/ at /Book-Dude/ like GitHub Pages, the clock starts at
 * 9:30 a.m. on October 9, 2026 in Utah, and the "random" numbers repeat. Book data shows up in the results
 * (ratings, counts, sort order), so a change to docs/books.csv changes the expected file too. */
const { chromium, devices } = require('playwright');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const DOCS = path.join(__dirname, '..', '..', 'docs');
const EXPECTED = path.join(__dirname, 'clickthrough.expected.txt');
const PHOTO = path.join(DOCS, 'img', 'dog.jpg'); // Stands in for a cover photo she takes.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'book-dude-'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.csv': 'text/csv', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };

// docs/ at /Book-Dude/, the way GitHub Pages serves it.
function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const rel = decodeURIComponent(url.pathname).replace(/^\/Book-Dude\//, '');
    const file = path.join(DOCS, rel === '' || rel.endsWith('/') ? rel + 'index.html' : rel);
    if (!url.pathname.startsWith('/Book-Dude/') || !file.startsWith(DOCS + path.sep)) { res.writeHead(404); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      const type = TYPES[path.extname(file)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type.startsWith('image/') ? type : type + '; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const log = [];
const note = (k, v) => log.push(k + ': ' + (typeof v === 'string' ? clean(v) : JSON.stringify(v)));

async function clickThrough(BASE) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true, locale: 'en-US', timezoneId: 'America/Denver' });
  // The page's clock starts at the test date and runs normally (only Date moves; timers are untouched),
  // "random" numbers repeat, and it is Safari in a browser tab (not the Home Screen) so the install tip shows.
  await ctx.addInitScript(start => {
    const RealDate = Date, offset = start - RealDate.now();
    window.Date = class extends RealDate {
      constructor(...args) { if (args.length) super(...args); else super(RealDate.now() + offset); }
      static now() { return RealDate.now() + offset; }
    };
    let s = 12345;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    Object.defineProperty(navigator, 'standalone', { get: () => false, configurable: true });
  }, Date.parse('2026-10-09T09:30:00-06:00'));
  const p = await ctx.newPage();
  if (Number(process.env.THROTTLE) > 1) await (await ctx.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.THROTTLE) });
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('console ' + m.text()); });

  // Waits by checking the page every 100 ms, and says what it was waiting for if it gives up.
  const until = async (fn, arg, timeout = 15000) => {
    const end = Date.now() + timeout;
    for (;;) {
      const value = await p.evaluate(fn, arg);
      if (value) return value;
      if (Date.now() > end) throw new Error('timed out waiting for: ' + String(fn).replace(/\s+/g, ' ').slice(0, 90));
      await sleep(100);
    }
  };
  const shown = sel => until(s => !!document.querySelector(s), sel);
  const petHere = () => until(() => { const c = document.querySelector('.critters .critter'); return !!(c && c.style.transform); });
  const text = async sel => clean(await p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText : '(none)'; }, sel));
  const attr = (sel, a) => p.evaluate(([s, a]) => { const e = document.querySelector(s); return e ? e.getAttribute(a) : '(none)'; }, [sel, a]);
  const all = (sel, how) => p.evaluate(([s, how]) => [...document.querySelectorAll(s)].map(e => (how === 'label' ? e.getAttribute('aria-label') : e.innerText).replace(/\s+/g, ' ').trim()), [sel, how]);
  const cards = n => all('#items .card .t').then(a => a.slice(0, n).join(' | '));
  // Each step clears the toast first, so reading it waits for the message that step shows. (The toast can be
  // missing for a moment: it moves into an open sheet, and a new sheet's content replaces it until the next message.)
  const arm = () => p.evaluate(() => { const t = document.querySelector('#toast'); if (t) t.textContent = ''; });
  const toast = () => until(() => { const t = document.querySelector('#toast'); return !!(t && t.textContent.trim()); }, null, 5000)
    .then(() => text('#toast'), () => '(no message)');
  const sheet = () => text('#sheet');
  const confirmText = () => shown('#confirm[open]').then(() => text('#confirm'));
  // A plain DOM click, found and clicked in one step. (The tab bar can sit over buttons near the bottom of a phone
  // screen, and the More tab redraws while covers save, which would leave a separately found button stale.)
  const tap = sel => p.evaluate(s => { const el = document.querySelector(s); if (!el) throw new Error('nothing matches ' + s); el.click(); }, sel);
  const click = async (sel, wait = 250) => { await arm(); await tap(sel); await sleep(wait); };
  const setVal = async (sel, v) => {
    await arm();
    await p.evaluate(([s, v]) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, String(v)]);
    await sleep(300);
  };
  const search = async q => { await p.fill('#q', q); await sleep(600); };
  const openSheet = async sel => { await click(sel, 100); await shown('#sheet[open]'); await sleep(300); };
  const closeSheet = () => click('#sheet .sheet-bar [data-act="close-sheet"]', 350);
  const pickPhoto = async sel => {
    const [chooser] = await Promise.all([p.waitForEvent('filechooser'), p.click(sel)]);
    await arm();
    await chooser.setFiles(PHOTO);
    await sleep(1000);
  };

  // ---- First launch: the story, then the pets go home so nothing random runs on its own.
  await p.goto(BASE);
  await shown('#sheet[open] .story');
  const story = await sheet();
  note('story length', String(story.length));
  note('story start', story.slice(0, 400));
  note('story end', story.slice(-300));
  await click('.story .btn[data-act="close-sheet"]', 400);
  await petHere();
  note('pet visiting', await attr('.critters .critter', 'aria-label'));
  await p.evaluate(() => navigator.serviceWorker.ready);
  await click('.tab[data-tab="more"]', 400);
  await click('#pets-on', 200);
  note('pets off toast', await toast());
  note('pet layer after off', String(await p.locator('.critters').count()));
  await click('.tab[data-tab="explore"]', 400);

  // ---- Explore.
  note('explore head', await text('.view-head'));
  note('result count', await text('#result-count'));
  note('collections', await text('#coll-chips'));
  note('install tip', await text('#install-tip'));
  note('first cards', (await all('#items .card', 'label')).slice(0, 6).join(' || '));
  note('bubble', await text('.dude'));
  for (let i = 0; i < 3; i++) { await click('.dude .line', 200); note('next saying ' + i, await text('.dude .line')); }
  await click('[data-act="dismiss-tip"]');
  note('tip after dismiss', await text('#install-tip'));

  await search('dragon');
  note('search dragon count', await text('#result-count'));
  note('search dragon cards', await cards(6));
  note('active chips', await text('#active-filters'));
  await click('[data-act="clear-filter"][data-key="query"]', 400);
  note('after clear query', await text('#result-count') + ' / q=' + await p.inputValue('#q'));

  await click('[data-act="toggle-filters"]');
  note('filters open', await attr('#filters', 'hidden') + ' ' + await attr('[data-act="toggle-filters"]', 'aria-expanded'));
  await p.selectOption('select[data-filter="level"]', '4'); await sleep(300);
  note('level 4', await text('#result-count') + ' / ' + await text('#active-filters') + ' / count=' + await text('#filter-count'));
  await p.selectOption('select[data-filter="points"]', 'lt3'); await sleep(300);
  await p.selectOption('select[data-filter="interest"]', 'MG'); await sleep(300);
  note('level+points+interest', await text('#result-count') + ' / ' + await cards(4));
  await click('#hide-finished', 300);
  note('hide finished', await text('#active-filters'));
  await click('[data-act="clear-filter"][data-key="points"]', 300);
  note('cleared points chip', await text('#active-filters') + ' / select=' + await p.inputValue('select[data-filter="points"]'));
  await click('[data-act="reset-filters"]', 300);
  note('reset filters', await text('#result-count') + ' / ' + await text('#active-filters') + ' / hide=' + await p.isChecked('#hide-finished'));
  await p.selectOption('select[data-filter="ages"]', { index: 2 }); await sleep(300);
  await p.selectOption('select[data-filter="genre"]', { index: 2 }); await sleep(300);
  note('ages+genre', await text('#result-count') + ' / ' + await text('#active-filters'));
  await click('[data-act="reset-filters"]', 300);

  for (const s of ['award-old', 'title', 'author', 'level-up', 'level-down', 'points-down', 'points-up', 'amz-rating', 'ol-rating', 'score', 'my-rating', 'award-new']) {
    await p.selectOption('select[data-filter="sort"]', s); await sleep(300);
    note('sort ' + s, await cards(4) + ' / tags: ' + (await all('#items .card .tags')).slice(0, 2).join(' | '));
  }
  await click('[data-act="layout"][data-layout="list"]', 300);
  note('list layout', (await all('#items .row')).slice(0, 3).join(' || '));
  await click('[data-act="layout"][data-layout="grid"]', 300);
  await click('[data-act="collection"][data-key="Beehive"]', 300);
  note('beehive', await text('#result-count') + ' / ' + await cards(3));
  await click('[data-act="collection"][data-key=""]', 300);
  await click('#more-btn', 400);
  note('after show more', String(await p.locator('#items .card').count()));
  await click('[data-act="toggle-filters"]');
  await search('zzqx');
  note('no results', await text('#results'));
  await click('#results [data-act="reset-all"]', 400);
  note('after reset-all', await text('#result-count') + ' / q=' + await p.inputValue('#q'));
  await openSheet('[data-act="surprise"]');
  note('surprise', await text('#sheet h1') + ' / ' + await toast());
  await closeSheet();

  // ---- A book's page.
  await search('hatchet');
  await openSheet('#items .card');
  note('book sheet', await sheet());
  note('library link', await attr('#sheet .library-btn', 'href'));
  await click('[data-act="status"][data-status="reading"]', 300);
  note('reading shelf box', await text('#shelf-box'));
  await setVal('#progress', 40);
  note('progress', await text('#progress-out'));
  await p.fill('#started-date', '2026-10-01'); await p.dispatchEvent('#started-date', 'change'); await sleep(300);
  await click('[data-act="status"][data-status="finished"]', 300);
  note('finished toast', await toast());
  note('finished shelf box', await text('#shelf-box'));
  note('confetti bits', String(await p.locator('#confetti i').count() > 0));
  await p.fill('#finished-date', '2026-10-05'); await p.dispatchEvent('#finished-date', 'change'); await sleep(300);
  await click('[data-act="fav"]', 300);
  note('fav', await toast() + ' / ' + await attr('[data-act="fav"]', 'aria-pressed'));
  await click('[data-act="rate"][data-n="4"]', 300);
  note('rate 4', await text('#rating-says'));
  await click('[data-act="rate"][data-n="4"]', 300);
  note('rate 4 again', await text('#rating-says'));
  await click('[data-act="rate"][data-n="5"]', 300);
  note('rate 5', await text('#rating-says'));
  await p.fill('#note', 'Brian and the hatchet.'); await sleep(100);
  note('note typing', await text('#note-status'));
  await until(() => document.querySelector('#note-status').textContent === 'Saved.', null, 5000).catch(() => {});
  note('note saved', await text('#note-status'));
  await click('form[data-form="quiz"] button[type="submit"]', 200);
  note('quiz empty', await text('#quiz-error'));
  await p.fill('#earned-input', 'abc'); await click('form[data-form="quiz"] button[type="submit"]', 200);
  note('quiz abc', await text('#quiz-error'));
  await p.fill('#earned-input', '7'); await p.fill('#quiz-date', '2026-10-06'); await click('form[data-form="quiz"] button[type="submit"]', 300);
  note('quiz 7', await toast());
  note('quiz box', await text('#shelf-box'));
  await click('[data-act="clear-quiz"]', 300);
  note('clear quiz confirm', await confirmText());
  await click('[data-act="confirm-ok"]', 300);
  note('cleared', await toast() + ' / ' + await text('#shelf-box'));
  await p.fill('#earned-input', '7'); await click('form[data-form="quiz"] button[type="submit"]', 300);
  note('quiz 7 again', await toast());
  await closeSheet();
  note('explore after sheet', await text('#result-count') + ' / ' + (await all('#items .card', 'label')).slice(0, 1).join(''));
  note('bubble ps', await text('.dude .ps'));

  // ---- My Shelves, and a book she adds herself.
  await click('.tab[data-tab="shelves"]', 400);
  note('shelves', await text('#main'));
  for (const s of ['finished', 'favorites', 'want', 'paused', 'mine', 'reading']) { await click('[data-act="shelf"][data-shelf="' + s + '"]', 250); note('shelf ' + s, await text('#main .list')); }
  await openSheet('.view-head [data-act="add-book"]');
  note('add form', await sheet());
  await click('form[data-form="book"] button[type="submit"]', 200);
  note('add empty', await text('#bk-error'));
  await p.fill('#bk-title', 'hatchet'); await click('form[data-form="book"] button[type="submit"]', 200);
  note('add dupe', await text('#bk-error'));
  await p.fill('#bk-title', 'The Moose Who Read Everything: Book One'); await p.fill('#bk-author', 'Pat Example');
  await p.fill('#bk-level', '2,6'); await p.fill('#bk-points', 'one'); await click('form[data-form="book"] button[type="submit"]', 200);
  note('add bad points', await text('#bk-error'));
  await p.fill('#bk-points', '1');
  note('error hides on typing', String(await p.isHidden('#bk-error')));
  await p.fill('#bk-desc', 'A moose reads every book in the library.');
  await click('[data-act="pick-status"][data-status="reading"]', 200);
  note('picked status', await attr('form[data-form="book"]', 'data-status'));
  await pickPhoto('[data-act="form-photo"]');
  note('form photo', await text('#bk-photo') + ' / img=' + await p.locator('#bk-photo img.photo-preview').count());
  await click('[data-act="form-photo-remove"]', 200);
  note('form photo removed', await text('#bk-photo'));
  await pickPhoto('[data-act="form-photo"]');
  await click('form[data-form="book"] button[type="submit"]', 500);
  note('added toast', await toast());
  note('custom sheet', await sheet());
  note('custom cover photo', String((await attr('#sheet .book-hero img.cover-art', 'src') || '').slice(0, 23)));
  await click('[data-act="edit-book"]', 300);
  note('edit form', await text('#sheet .form-title') + ' / ' + await p.inputValue('#bk-title') + ' / photo=' + await p.locator('#bk-photo img.photo-preview').count());
  await click('[data-act="cancel-edit"]', 300);
  note('after cancel edit', await text('#sheet h1'));
  await click('[data-act="edit-book"]', 300);
  await p.fill('#bk-title', 'The Moose Who Read Everything: Book Two'); await click('form[data-form="book"] button[type="submit"]', 500);
  note('edited', await toast() + ' / ' + await text('#sheet h1'));
  await pickPhoto('[data-act="quick-photo"]');
  note('quick photo', await toast());
  await click('[data-act="delete-book"]', 300);
  note('delete confirm', await confirmText());
  await click('#confirm [data-act="close-confirm"]', 300);
  note('confirm closed', String(await p.evaluate(() => document.querySelector('#confirm').open)));
  await click('[data-act="delete-book"]', 300);
  await shown('#confirm[open]');
  await click('[data-act="confirm-ok"]', 500);
  note('deleted', await toast() + ' / sheet open=' + await p.evaluate(() => document.querySelector('#sheet').open));
  note('shelves after delete', await text('#main .chips'));
  // One to keep, added from a search that finds nothing.
  await click('.tab[data-tab="explore"]', 400);
  await search('the purple pancake detectives');
  await openSheet('#results [data-act="add-book"]');
  note('prefilled', await p.inputValue('#bk-title'));
  await p.fill('#bk-author', 'Sam Sample'); await p.fill('#bk-points', '5');
  await click('form[data-form="book"] button[type="submit"]', 500);
  note('own book added', await toast() + ' / ' + await text('#sheet .book-hero'));
  await closeSheet();
  note('my books chip', await text('#coll-chips'));

  // ---- Progress.
  await click('.tab[data-tab="progress"]', 500);
  note('progress', await text('#main'));
  note('chart', await attr('.chart', 'aria-label'));
  note('jar', await attr('.jar', 'aria-label'));
  await click('[data-act="period"][data-period="all"]', 300);
  note('all time hero', await text('.hero'));
  await click('[data-act="period"][data-period="2026"]', 300);
  await click('[data-act="edit-goal"]', 300);
  await p.fill('#goal-input', 'abc'); await click('form[data-form="goal"] button[type="submit"]', 300);
  note('goal abc', await toast());
  await p.fill('#goal-input', '50'); await click('form[data-form="goal"] button[type="submit"]', 300);
  note('goal 50', await text('.hero'));
  await click('[data-act="edit-goal"]', 300);
  await click('[data-act="remove-goal"]', 300);
  note('goal removed', await text('.hero'));
  await click('[data-act="open-file"][data-i="1"]', 300);
  note('locked file', await toast());
  await openSheet('[data-act="open-file"][data-i="0"]');
  note('file sheet', await sheet());
  await click('#sheet .row-actions [data-act="close-sheet"]', 300);
  await click('[data-act="shelf-go"]', 400);
  note('shelf-go', await text('#main .chips [aria-pressed="true"]') + ' / hash=' + await p.evaluate(() => location.hash));

  // ---- More: her name and color, the pets, book money, backups.
  await click('.tab[data-tab="more"]', 400);
  // Covers save in the background at their own pace (tests/covers.test.cjs covers that), so that line is left out.
  note('more', (await text('#main')).replace(/ (?:Saving book covers…|Book covers saved).*?(?= Running in the browser| Installed)/, ''));
  await arm(); await p.fill('#reader-name', 'Maddy'); await p.dispatchEvent('#reader-name', 'change');
  note('name', await toast());
  await click('[data-act="accent"][data-accent="teal"]', 300);
  note('accent', await p.evaluate(() => document.documentElement.dataset.accent) + ' / ' + await attr('[data-act="accent"][data-accent="teal"]', 'aria-pressed'));
  await click('#pets-on', 200);
  note('pets on', await toast() + ' / layer=' + await p.locator('.critters').count());
  await petHere();
  await click('#pets-on', 200);
  note('pets off again', await toast() + ' / layer=' + await p.locator('.critters').count());
  await click('#reward-on', 300);
  note('reward off', await toast());
  await click('#reward-on', 300);
  note('reward on', await toast());
  await setVal('#reward-per', 'abc');
  note('reward per abc', await toast() + ' / ' + await p.inputValue('#reward-per'));
  await setVal('#reward-every', '0');
  note('reward every 0', await toast() + ' / ' + await p.inputValue('#reward-every'));
  await setVal('#reward-every', '5'); await sleep(100);
  note('reward every 5', await text('.panel:has(#reward-on)'));
  await setVal('#reward-where', 'the library fund');
  note('reward where', await p.inputValue('#reward-where'));
  await click('[data-act="paid-plus"]', 300);
  note('paid plus', await text('#reward-paid'));
  await click('[data-act="paid-minus"]', 300);
  note('paid minus', await text('#reward-paid'));
  await setVal('#reward-per', '0'); await sleep(100);
  note('reward per 0', await text('.panel:has(#reward-on)'));
  await setVal('#reward-prize', 'Ice cream');
  note('reward prize', await p.inputValue('#reward-prize'));
  await click('.tab[data-tab="progress"]', 500);
  note('jar full', await text('.jar-card'));
  await click('[data-act="reward-given"]', 300);
  note('reward given confirm', await confirmText());
  await click('[data-act="confirm-ok"]', 400);
  note('reward given', await toast() + ' / ' + await text('.jar-card .jar-tally'));

  await click('.tab[data-tab="more"]', 400);
  await arm();
  const [download] = await Promise.all([p.waitForEvent('download'), tap('[data-act="export"]')]);
  note('export toast', await toast());
  const file = path.join(TMP, 'backup.json');
  await download.saveAs(file);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const strip = o => JSON.parse(JSON.stringify(o, (k, v) => (/At$/.test(k) ? '(time)' : k === 'photo' && v ? v.slice(0, 23) : v)));
  note('backup', strip({ app: data.app, version: data.version,
    records: Object.values(data.records).map(r => Object.assign({}, r, { id: r.id.startsWith('mine:') ? 'mine:*' : r.id })),
    books: Object.values(data.customBooks).map(b => Object.assign({}, b, { id: 'mine:*' })), settings: data.settings }));
  await p.setInputFiles('#restore-file', file);
  note('restore same', await confirmText());
  await click('#confirm [data-act="close-confirm"]', 300);
  // The same backup plus one more finished book and a goal for 2025.
  const extra = JSON.parse(fs.readFileSync(file, 'utf8'));
  const holes = 'holes--louis-sachar';
  extra.records[holes] = { id: holes, status: 'finished', finishedDate: '2026-09-01', earnedPoints: 6, quizDate: '2026-09-02', updatedAt: '2026-10-08T00:00:00.000Z' };
  extra.settings.goals = { 2025: 40 };
  const file2 = path.join(TMP, 'backup-2.json');
  fs.writeFileSync(file2, JSON.stringify(extra));
  await p.setInputFiles('#restore-file', file2);
  note('restore more', await confirmText());
  await click('[data-act="confirm-ok"]', 600);
  note('restored', await toast());
  await p.setInputFiles('#restore-file', { name: 'junk.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":1}') });
  note('restore junk', await confirmText());
  await click('#confirm [data-act="close-confirm"]', 300);
  note('more after restore', await text('#main .panel:has([data-act="export"])'));

  // ---- Tabs by address and the brand link, the story again, and the update button.
  await p.evaluate(() => { location.hash = 'progress'; }); await sleep(500);
  note('hash progress', await text('#main h1'));
  await click('.brand', 500);
  note('brand', await text('#main h1') + ' / hash=' + await p.evaluate(() => location.hash));
  await click('.tab[data-tab="more"]', 400);
  await openSheet('#main [data-act="story"]');
  note('story again', String((await sheet()).length));
  await click('.story .btn[data-act="close-sheet"]', 300);
  await click('.tab[data-tab="explore"]', 400);
  await openSheet('.dude-avatar');
  note('story from avatar', String((await sheet()).length));
  await closeSheet();
  await p.evaluate(() => { document.querySelector('#update').hidden = false; });
  await Promise.all([p.waitForNavigation(), tap('[data-act="update-app"]')]);
  await shown('.dude'); await sleep(600);
  note('after update reload', await text('#main h1') + ' / ' + await text('.view-head .kicker') + ' / accent=' + await p.evaluate(() => document.documentElement.dataset.accent));
  await click('.tab[data-tab="shelves"]', 400);
  note('reloaded shelves', await text('#main .chips'));
  note('errors', errors.length ? errors.join(' || ') : 'none');
  await browser.close();
}

function compare(actual) {
  if (process.env.UPDATE) {
    fs.writeFileSync(EXPECTED, actual);
    console.log('Saved ' + path.relative(process.cwd(), EXPECTED) + ' (' + log.length + ' steps). Review its diff before committing.');
    return true;
  }
  const expected = fs.existsSync(EXPECTED) ? fs.readFileSync(EXPECTED, 'utf8') : '';
  if (actual === expected) {
    console.log('All ' + log.length + ' steps match ' + path.relative(process.cwd(), EXPECTED) + '.');
    return true;
  }
  const a = actual.split('\n'), e = expected.split('\n');
  const changed = [];
  for (let i = 0; i < Math.max(a.length, e.length); i++) if (a[i] !== e[i]) changed.push(i);
  console.error(changed.length + ' line(s) differ from ' + path.relative(process.cwd(), EXPECTED) + ':');
  for (const i of changed.slice(0, 15)) console.error('  line ' + (i + 1) + '\n  - ' + (e[i] === undefined ? '(missing)' : e[i]) + '\n  + ' + (a[i] === undefined ? '(missing)' : a[i]));
  if (changed.length > 15) console.error('  ...and ' + (changed.length - 15) + ' more.');
  console.error('If the change is intended, run: UPDATE=1 node tests/browser/clickthrough.cjs');
  return false;
}

(async () => {
  const server = await serve();
  let ok = false;
  try {
    await clickThrough('http://127.0.0.1:' + server.address().port + '/Book-Dude/');
    ok = compare(log.join('\n') + '\n');
  } catch (e) {
    console.error('Stopped at step ' + (log.length + 1) + ' (after "' + (log.length ? log[log.length - 1].split(':')[0] : 'start') + '"): ' + e.message.split('\n')[0]);
  } finally {
    server.close();
    fs.rmSync(TMP, { recursive: true, force: true });
  }
  process.exit(ok ? 0 : 1);
})();
