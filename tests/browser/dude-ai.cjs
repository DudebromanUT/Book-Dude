/* The Dude's Claude features in the app, with the Google script played by this test: a quiz arrives with a Dude joke,
 * the weekly numbers go to the script, "What should I read next?" shows only real books, the chat talks and shows its
 * limits, and the grown-up switch turns the chat off. With Claude off in the script, none of it shows.
 *
 *   Run:     node tests/browser/dude-ai.cjs
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
const JOKE = 'Brian had one hatchet. The Dude has eleven pockets and still can’t find his glasses.';

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
  // What the stand-in script says, and everything Book Dude sent it.
  const script = { ai: true, chat: { on: true, open: true, hours: '7-21', left: 40 }, chatAnswer: null };
  const posts = [];
  try {
    const ctx = await browser.newContext({ ...devices['iPad (gen 7)'], timezoneId: 'America/Denver', serviceWorkers: 'block' });
    await ctx.addInitScript(() => { window.fetch = ((real) => (url, opts) => String(url).endsWith('history.json') ? Promise.resolve(new Response('', { status: 404 })) : real(url, opts))(window.fetch); });
    await ctx.route('https://script.google.com/**', route => {
      const req = route.request();
      const send = obj => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(obj) });
      if (req.method() === 'GET') {
        return send({ app: 'book-dude-school', ai: script.ai, chat: script.ai ? script.chat : { on: false },
          quizzes: [{ id: 'q1', date: '2026-10-19', title: 'Hatchet', author: 'Gary Paulsen', points: 7, possible: 7, score: 100, level: 5.7, joke: JOKE }] });
      }
      const body = JSON.parse(req.postData());
      posts.push({ body, type: req.headers()['content-type'] || '' });
      if (body.action === 'report') return send({ ok: true });
      if (body.action === 'picks') {
        const ids = body.candidates.map(c => c.id);
        return send({ picks: [{ id: 'not-a-book', why: 'Made up' }].concat(ids.slice(0, 3).map(id => ({ id, why: 'You will love ' + id + '.' }))) });
      }
      if (body.action === 'chat') return send(script.chatAnswer || { reply: 'Hatchet is about Brian, a plane, and one very useful hatchet.', left: 39 });
      return send({ error: 'bad' });
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    const tab = async t => { await p.$eval('.tab[data-tab="' + t + '"]', e => e.click()); await sleep(500); };

    await p.goto(BASE); await p.waitForSelector('#sheet[open] .story');
    await p.click('.story .btn[data-act="close-sheet"]'); await sleep(500);
    assert.equal(await p.$('.dude-asks'), null, 'nothing before the link is in');

    // The link goes in: the quiz lands, and the Dude's line is his joke about it, linked to the book.
    await tab('more');
    await p.fill('#school-link', LINK); await p.dispatchEvent('#school-link', 'change');
    await p.waitForFunction(() => /from school/.test(document.querySelector('#toast').textContent), null, { timeout: 10000 });
    assert.match(clean(await p.textContent('.panel:has(#school-link)')), /Let her talk with the Dude/);
    await tab('explore');
    assert.equal(clean(await p.textContent('.dude .line')), JOKE);
    assert.equal(clean(await p.textContent('.dude .bubble-link')), 'Hatchet');
    assert.deepEqual(await p.$$eval('.dude-asks button', b => b.map(x => x.textContent)), ['Talk to the Dude', 'What should I read next?']);

    // The weekly numbers went to the script once: titles and numbers only, as plain text.
    const reports = posts.filter(x => x.body.action === 'report');
    assert.equal(reports.length, 1);
    assert.match(reports[0].type, /^text\/plain/);
    assert.equal(reports[0].body.points, 7);
    assert.equal(reports[0].body.pointsWeek >= 0, true);
    assert.deepEqual(Object.keys(reports[0].body).sort(), ['action', 'choices', 'finished', 'minutesWaiting', 'moneyWaiting', 'points', 'pointsWeek', 'reading']);

    // What should I read next: three real books with the Dude's reasons; nothing she finished was offered.
    await p.click('[data-act="dude-picks"]');
    await p.waitForSelector('#sheet .pick', { timeout: 10000 });
    const picks = await p.$$eval('#sheet .pick', ps => ps.map(x => x.querySelector('.why').textContent));
    assert.equal(picks.length, 3);
    assert.ok(picks.every(t => /^The Dude says: You will love /.test(t)));
    const asked = posts.find(x => x.body.action === 'picks').body;
    assert.ok(asked.candidates.length >= 12 && asked.candidates.length <= 60);
    assert.ok(!asked.candidates.some(c => /^hatchet--/.test(c.id)), 'not a book she finished');
    assert.ok(asked.candidates.every(c => c.id && c.title && 'about' in c));
    await p.$eval('#sheet .pick .card', e => e.click()); await sleep(500);
    assert.ok(await p.$('#sheet .book-hero'), 'a pick opens its book');
    await p.$eval('#sheet .sheet-bar [data-act="close-sheet"]', e => e.click()); await sleep(300);

    // The chat: the honest notice, her message, the Dude's answer.
    await p.click('[data-act="dude-chat"]'); await sleep(400);
    assert.match(clean(await p.textContent('#sheet .ai-sheet')), /The Dude is played by an AI, so he can get things wrong\. Mom and Dad can read these chats\./);
    await p.fill('#chat-input', 'what is Hatchet about?');
    await p.$eval('form[data-form="dude-chat"] button[type="submit"]', e => e.click());
    await p.waitForFunction(() => document.querySelectorAll('#sheet .msg.dude:not(.typing)').length >= 2, null, { timeout: 10000 });
    assert.deepEqual(await p.$$eval('#sheet .msg', m => m.map(x => x.className.replace('msg ', '') + ': ' + x.textContent)).then(a => a.slice(1)),
      ['me: what is Hatchet about?', 'dude: Hatchet is about Brian, a plane, and one very useful hatchet.']);
    const chat = posts.filter(x => x.body.action === 'chat')[0].body;
    assert.deepEqual(chat.messages, [{ role: 'user', text: 'what is Hatchet about?' }]);
    assert.deepEqual(chat.recent, ['Hatchet']);

    // A limit reached: her message goes back in the box... and the box goes away, with a note why.
    script.chatAnswer = { error: 'limit', left: 0 };
    await p.fill('#chat-input', 'one more');
    await p.$eval('form[data-form="dude-chat"] button[type="submit"]', e => e.click()); await sleep(800);
    assert.match(clean(await p.textContent('#sheet .ai-sheet')), /That’s all the chatting the Dude can do today/);
    assert.equal(await p.$('#chat-input'), null);
    assert.equal(posts.filter(x => x.body.action === 'chat')[1].body.messages.length, 3, 'the history goes with it');
    await p.$eval('#sheet .sheet-bar [data-act="close-sheet"]', e => e.click()); await sleep(300);

    // The grown-up switch turns the chat off on this device; the picks stay.
    await tab('more');
    await p.$eval('#dude-chat-on', e => e.click()); await sleep(400);
    await tab('explore');
    assert.deepEqual(await p.$$eval('.dude-asks button', b => b.map(x => x.textContent)), ['What should I read next?']);
    await tab('more');
    await p.$eval('#dude-chat-on', e => e.click()); await sleep(400);

    // After hours, the chat says when it opens; reopening doesn't send the numbers again so soon.
    script.chat = { on: true, open: false, hours: '7-21', left: 40 };
    await p.reload(); await p.waitForSelector('.view-head'); await tab('explore'); await p.waitForSelector('.dude-asks', { timeout: 10000 });
    await p.click('[data-act="dude-chat"]'); await sleep(400);
    assert.match(clean(await p.textContent('#sheet .ai-sheet')), /The Dude is asleep\. You can chat from 7 a\.m\. to 9 p\.m\./);
    assert.equal(await p.$('#chat-input'), null);
    assert.equal(posts.filter(x => x.body.action === 'report').length, 1);
    await p.$eval('#sheet .sheet-bar [data-act="close-sheet"]', e => e.click()); await sleep(300);

    // With Claude off in the script, none of it shows.
    script.ai = false;
    await p.reload(); await p.waitForSelector('.view-head'); await tab('explore'); await sleep(2500);
    assert.equal(await p.$('.dude-asks'), null);
    assert.deepEqual(errors, []);
    console.log('The Dude jokes about new quizzes, picks real books, chats with limits, and hides when Claude is off.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED', e.message.split('\n').slice(0, 4).join(' ')); process.exit(1); });
