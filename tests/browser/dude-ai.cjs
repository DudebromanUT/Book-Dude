/* The Dude's Claude features in the app, with the Google script played by this test: a quiz arrives with a Dude joke,
 * the weekly numbers go to the script, "What should I read next?" shows only real books, the Dude Terminal answers like a
 * machine (no typing bubble), always shows the AI line and the Talk to a grown-up button, suggests breaks, and keeps to its
 * limits, and the grown-up switch turns it off. With Claude off in the script, none of it shows.
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
  const script = { ai: true, chat: { on: true, open: true, hours: '7-21', left: 40 }, chatAnswer: null, slow: false, release: () => {} };
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
      if (body.action === 'grownup') return send({ ok: true });
      if (body.action === 'chat') {
        const answer = () => send(script.chatAnswer || { reply: 'Hatchet is about Brian, a plane, and one very useful hatchet.', left: 39 });
        if (!script.slow) return answer();
        script.slow = false;
        return new Promise(resolve => { script.release = () => resolve(answer()); });
      }
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
    assert.match(clean(await p.textContent('.panel:has(#school-link)')), /Let her use the Dude Terminal/);
    await tab('explore');
    assert.equal(clean(await p.textContent('.dude .line')), JOKE);
    assert.equal(clean(await p.textContent('.dude .bubble-link')), 'Hatchet');
    assert.deepEqual(await p.$$eval('.dude-asks button', b => b.map(x => x.textContent)), ['Dude Terminal', 'What should I read next?']);

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

    // The Dude Terminal: the line that never scrolls away, the big grown-up button, her message, the answer.
    const AI_LINE = 'This is an AI. Mom and Dad can read these chats.';
    const lines = () => p.$$eval('#sheet .t-line', l => l.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    await p.click('[data-act="dude-chat"]'); await sleep(400);
    assert.equal(clean(await p.textContent('#sheet .t-status')), AI_LINE);
    assert.equal(clean(await p.textContent('#sheet .grownup-btn')), 'Talk to a grown-up');
    assert.deepEqual(await lines(), ['DUDE-OS 1.986 READY.', 'DUDE> Hi Maddy. Ask me about a book or a word, or ask for a joke.']);
    script.slow = true;
    await p.fill('#chat-input', 'what is Hatchet about?');
    await p.$eval('form[data-form="dude-chat"] button[type="submit"]', e => e.click());
    await sleep(300);
    // While it waits: a machine "WORKING" line, never a human-style typing bubble.
    assert.equal(await p.$('#sheet .typing'), null);
    assert.match(clean(await p.textContent('#sheet .t-wait')), /^WORKING/);
    script.release();
    await p.waitForFunction(() => document.querySelectorAll('#sheet .t-line.t-dude').length >= 2, null, { timeout: 10000 });
    assert.deepEqual((await lines()).slice(2), ['MADDY> what is Hatchet about?', 'DUDE> Hatchet is about Brian, a plane, and one very useful hatchet.']);
    assert.equal(await p.$('#sheet .t-wait'), null);
    const chat = posts.filter(x => x.body.action === 'chat')[0].body;
    assert.deepEqual(chat.messages, [{ role: 'user', text: 'what is Hatchet about?' }]);
    assert.deepEqual(chat.recent, ['Hatchet']);
    assert.doesNotMatch(clean(await p.textContent('#sheet .ai-sheet')), /left today|streak/i, 'nothing counting down or adding up');

    // The sound key flips and is remembered.
    assert.equal(clean(await p.textContent('#sheet .t-sound')), 'SOUND ON');
    await p.click('#sheet .t-sound');
    assert.equal(clean(await p.textContent('#sheet .t-sound')), 'SOUND OFF');

    // Talk to a grown-up: a calm, plain screen, and her parents get the last messages.
    await p.click('#sheet .grownup-btn');
    assert.match(clean(await p.textContent('#sheet .grownup-panel')), /Go find Mom, Dad, or another grown-up you trust, right now/);
    assert.match(clean(await p.textContent('#sheet .grownup-panel')), /call 911/);
    await p.waitForFunction(() => /We sent Mom and Dad a message too/.test(document.querySelector('#sheet .grownup-sent').textContent), null, { timeout: 10000 });
    const help = posts.filter(x => x.body.action === 'grownup')[0].body;
    assert.deepEqual(help.messages.map(m => m.role), ['user', 'assistant']);
    await p.click('[data-act="grownup-back"]'); await sleep(200);
    assert.equal(clean(await p.textContent('#sheet .t-status')), AI_LINE);

    // The day's limit: her message goes back in the box... and the box goes away, with no "come back tomorrow".
    script.chatAnswer = { error: 'limit', left: 0 };
    await p.fill('#chat-input', 'one more');
    await p.$eval('form[data-form="dude-chat"] button[type="submit"]', e => e.click()); await sleep(800);
    assert.match(clean(await p.textContent('#sheet .ai-sheet')), /THAT’S ALL THE TERMINAL TIME FOR TODAY/);
    assert.doesNotMatch(clean(await p.textContent('#sheet .ai-sheet')), /come back|tomorrow/i);
    assert.equal(await p.$('#chat-input'), null);
    assert.equal(clean(await p.textContent('#sheet .t-status')), AI_LINE);
    assert.ok(await p.$('#sheet .grownup-btn'), 'still there at the limit');
    assert.equal(posts.filter(x => x.body.action === 'chat')[1].body.messages.length, 3, 'the history goes with it');
    await p.$eval('#sheet .sheet-bar [data-act="close-sheet"]', e => e.click()); await sleep(300);

    // The grown-up switch turns the terminal off on this device; the picks stay.
    await tab('more');
    await p.$eval('#dude-chat-on', e => e.click()); await sleep(400);
    await tab('explore');
    assert.deepEqual(await p.$$eval('.dude-asks button', b => b.map(x => x.textContent)), ['What should I read next?']);
    await tab('more');
    await p.$eval('#dude-chat-on', e => e.click()); await sleep(400);

    // After hours: it says when it runs, and the grown-up button still works, even with no internet.
    script.chat = { on: true, open: false, hours: '7-21', left: 40 };
    await p.reload(); await p.waitForSelector('.view-head'); await tab('explore'); await p.waitForSelector('.dude-asks', { timeout: 10000 });
    await p.click('[data-act="dude-chat"]'); await sleep(400);
    assert.match(clean(await p.textContent('#sheet .ai-sheet')), /THE TERMINAL IS OFF RIGHT NOW\. IT RUNS FROM 7 A\.M\. TO 9 P\.M\./);
    assert.equal(await p.$('#chat-input'), null);
    assert.equal(clean(await p.textContent('#sheet .t-status')), AI_LINE);
    await ctx.setOffline(true);
    await p.click('#sheet .grownup-btn');
    assert.match(clean(await p.textContent('#sheet .grownup-panel')), /Go find Mom, Dad/);
    await p.waitForFunction(() => /didn’t go through, so go find them yourself/.test(document.querySelector('#sheet .grownup-sent').textContent), null, { timeout: 10000 });
    await ctx.setOffline(false);
    assert.equal(posts.filter(x => x.body.action === 'report').length, 1, 'reopening doesn’t send the numbers again so soon');
    await p.$eval('#sheet .sheet-bar [data-act="close-sheet"]', e => e.click()); await sleep(300);

    // The soft break timer: after 15 minutes at the terminal it suggests a break, without stopping anything.
    script.chat = { on: true, open: true, hours: '7-21', left: 40 };
    const p2 = await ctx.newPage();
    p2.on('pageerror', e => errors.push(e.message));
    await p2.clock.install();
    await p2.goto(BASE + '#explore'); await p2.waitForSelector('.dude-asks', { timeout: 10000 });
    await p2.click('[data-act="dude-chat"]'); await sleep(300);
    assert.equal(await p2.$('#sheet .t-break'), null);
    await p2.clock.fastForward('15:30');
    await p2.waitForSelector('#sheet .t-break', { timeout: 5000 });
    assert.match(clean(await p2.textContent('#sheet .t-break')), /BREAK TIME\? You’ve been at the terminal 15 minutes\./);
    assert.ok(await p2.$('#chat-input'), 'she can still type');
    await p2.click('#sheet .t-break .t-key'); await sleep(300);
    assert.equal(await p2.$('#sheet[open]'), null, 'OK, BREAK closes the terminal');
    await p2.close();

    // With Claude off in the script, none of it shows.
    script.ai = false;
    await p.reload(); await p.waitForSelector('.view-head'); await tab('explore'); await sleep(2500);
    assert.equal(await p.$('.dude-asks'), null);
    assert.deepEqual(errors, []);
    console.log('The Dude jokes about new quizzes, picks real books, runs a safe terminal, and hides when Claude is off.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED', e.message.split('\n').slice(0, 4).join(' ')); process.exit(1); });
