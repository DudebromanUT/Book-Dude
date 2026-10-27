/* The Claude features in the app, with the Google script played by this test: a quiz arrives with a Dude joke, the
 * weekly numbers go to the script, and "What should I read next?" shows only real books. COBOL has its own tab that
 * opens on a main menu: the chat answers like a machine (no typing bubble, no name), always shows the AI line and the
 * small yellow Talk to a grown-up button, works its PF keys (PF3 always steps back toward the menu), suggests breaks,
 * keeps to its limits and hours, and follows the grown-up switch; its history file and test give 2 points once. After
 * a few minutes away the app asks the script again. With Claude off in the script, the picks don't show and the chat
 * says it's off, but the history file and test still work, from the tab and from About the Dude.
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
// What's on screen, with a space where one block ends and the next begins.
const txt = (pg, sel) => pg.$eval(sel, e => e.innerText.replace(/\s+/g, ' ').trim());

(async () => {
  const server = await serve();
  const BASE = 'http://127.0.0.1:' + server.address().port + '/Book-Dude/';
  const browser = await chromium.launch();
  const errors = [];
  // What the stand-in script says, and everything Book Dude sent it.
  const script = { ai: true, chat: { on: true, open: true, hours: '7-20', left: 40 }, chatAnswer: null, slow: false, release: () => {}, gets: 0 };
  const posts = [];
  try {
    const ctx = await browser.newContext({ ...devices['iPad (gen 7)'], timezoneId: 'America/Denver', serviceWorkers: 'block' });
    await ctx.addInitScript(() => { window.fetch = ((real) => (url, opts) => String(url).endsWith('history.json') ? Promise.resolve(new Response('', { status: 404 })) : real(url, opts))(window.fetch); });
    await ctx.route('https://script.google.com/**', route => {
      const req = route.request();
      const send = obj => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(obj) });
      if (req.method() === 'GET') {
        script.gets++;
        if (script.getMode === 'fail') return route.abort();
        const feed = () => send({ app: 'book-dude-school', ai: script.ai, chat: script.ai ? script.chat : { on: false },
          quizzes: [{ id: 'q1', date: '2026-10-19', title: 'Hatchet', author: 'Gary Paulsen', points: 7, possible: 7, score: 100, level: 5.7, joke: JOKE }] });
        if (script.getMode !== 'hold') return feed();
        return new Promise(resolve => { script.releaseGet = () => { script.getMode = 'ok'; resolve(feed()); }; });
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
    // Midday in Utah: COBOL's chat is open 7 a.m. to 8 p.m. by the iPad's clock.
    await p.clock.setFixedTime(new Date('2026-10-23T12:00:00-06:00'));
    const tab = async t => { await p.$eval('.tab[data-tab="' + t + '"]', e => e.click()); await sleep(500); };

    await p.goto(BASE); await p.waitForSelector('#sheet[open] .story');
    assert.match((await txt(p, '.story .cobol-intro')), /TEST AVAILABLE: PASS WITH 8 OF 10 \(80%\) TO EARN 2 POINTS\./);
    await p.click('.story .btn[data-act="close-sheet"]'); await sleep(500);
    assert.equal(await p.$('.dude-asks'), null, 'nothing before the link is in');
    // Before the school link is in, COBOL's tab is there, and says it isn't set up on this device.
    await tab('cobol');
    assert.match(await txt(p, '#main .t-opt[data-option="1"]'), /NOT SET UP ON THIS DEVICE$/);
    await p.click('#main .t-opt[data-option="1"]'); await sleep(200);
    assert.match(await txt(p, '#main .cobol-view'), /COBOL IS NOT SET UP ON THIS DEVICE YET\. A GROWN-UP ADDS THE SCHOOL QUIZ LINK IN FARTY PANTS CENTRAL\./);
    await p.click('#main [data-act="cobol-pf3"]'); await sleep(200);
    assert.equal(script.gets, 0, 'no link, no asking');

    // The link goes in: the quiz lands, and the Dude's line is his joke about it, linked to the book.
    await tab('more');
    await p.fill('#school-link', LINK); await p.dispatchEvent('#school-link', 'change');
    await p.waitForFunction(() => /from school/.test(document.querySelector('#toast').textContent), null, { timeout: 10000 });
    assert.match((await txt(p, '.panel:has(#school-link)')), /Let her chat with COBOL/);
    await tab('explore');
    assert.equal((await txt(p, '.dude .line')), JOKE);
    assert.equal((await txt(p, '.dude .bubble-link')), 'Hatchet');
    assert.deepEqual(await p.$$eval('.dude-asks button', b => b.map(x => x.textContent)), ['What should I read next?'], 'COBOL has its own tab instead');

    // The weekly numbers went to the script once: titles and numbers only, as plain text.
    const reports = posts.filter(x => x.body.action === 'report');
    assert.equal(reports.length, 1);
    assert.match(reports[0].type, /^text\/plain/);
    assert.equal(reports[0].body.points, 7);
    assert.equal(reports[0].body.pointsWeek >= 0, true);
    assert.deepEqual(Object.keys(reports[0].body).sort(), ['action', 'choices', 'exams', 'finished', 'minutesWaiting', 'moneyWaiting', 'points', 'pointsWeek', 'reading']);
    assert.deepEqual(reports[0].body.exams, []);

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

    // The COBOL tab opens on the main menu: the line that never scrolls away, the small yellow grown-up button, and
    // three options, each saying where it stands.
    const AI_LINE = 'This is an AI. Mom and Dad can read these chats.';
    const V = '#main .cobol-view';
    const lines = () => p.$$eval(V + ' .t-line', l => l.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    const pfKeys = () => p.$$eval(V + ' .t-pf button', b => b.map(x => x.textContent));
    const options = () => p.$$eval(V + ' .t-opt', b => b.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
    const screenName = () => txt(p, V + ' .t-head span:last-child');
    const key = async k => { await p.click(V + ' [data-act="cobol-pf' + k + '"]'); await sleep(200); };
    const option = async n => { await p.click(V + ' .t-opt[data-option="' + n + '"]'); await sleep(200); };
    const records = () => p.evaluate(async () => (await import('/Book-Dude/app/state.js')).state.records['exam:cobol'] || null);
    await tab('cobol');
    assert.equal(await screenName(), 'MAIN MENU');
    assert.equal((await txt(p, V + ' .t-status')), AI_LINE);
    assert.equal((await txt(p, V + ' .grownup-btn')), 'Talk to a grown-up');
    const btn = await p.$eval(V + ' .grownup-btn', e => ({ bg: getComputedStyle(e).backgroundColor, h: e.getBoundingClientRect().height }));
    assert.equal(btn.bg, 'rgb(242, 181, 58)', 'yellow');
    assert.ok(btn.h <= 44, 'small: ' + btn.h);
    assert.deepEqual(await options(), ['1 CHAT WITH COBOL OPEN UNTIL 8 P.M.', '2 HISTORY FILE HOW COBOL WAS BORN', '3 HISTORY TEST PASS WITH 80%: 2 POINTS']);
    assert.deepEqual(await pfKeys(), ['PF1 HISTORY', 'PF3 EXIT', 'PF5 SOUND ON']);
    // Typing an option: a number that isn't one says so; 1 opens the chat.
    await p.fill('#cobol-option', '9'); await p.$eval('form[data-form="cobol-option"] button', e => e.click()); await sleep(200);
    assert.match(await txt(p, V), /INVALID OPTION\. TYPE 1, 2 OR 3\./);
    await p.fill('#cobol-option', '1'); await p.$eval('form[data-form="cobol-option"] button', e => e.click()); await sleep(300);
    assert.equal(await screenName(), 'CHAT');
    assert.equal((await txt(p, V + ' .t-status')), AI_LINE);
    assert.deepEqual(await lines(), ['BOOK DUDE MAINFRAME. COBOL ONLINE SINCE 1959.',
      'COBOL> GREETINGS, HUMAN. COBOL IS READY. Ask me about books, words, science, history, or anything you are curious about.']);
    script.slow = true;
    await p.fill('#chat-input', 'what is Hatchet about?');
    await p.$eval('form[data-form="cobol-chat"] button[type="submit"]', e => e.click());
    await sleep(300);
    // While it waits: a machine "WORKING" line and the mainframe's "X SYSTEM", never a human-style typing bubble.
    assert.equal(await p.$('#main .typing'), null);
    assert.match((await txt(p, V + ' .t-wait')), /^WORKING/);
    assert.match((await txt(p, V + ' .t-oia')), /^X SYSTEM/);
    script.release();
    await p.waitForFunction(() => document.querySelectorAll('#main .t-line.t-cobol').length >= 2, null, { timeout: 10000 });
    assert.deepEqual((await lines()).slice(2), ['HUMAN> what is Hatchet about?', 'COBOL> Hatchet is about Brian, a plane, and one very useful hatchet.']);
    assert.equal(await p.$(V + ' .t-wait'), null);
    const chat = posts.filter(x => x.body.action === 'chat')[0].body;
    assert.deepEqual(chat.messages, [{ role: 'user', text: 'what is Hatchet about?' }]);
    assert.deepEqual(chat.recent, ['Hatchet']);
    assert.doesNotMatch(JSON.stringify(chat), /Maddy|Madeleine/, 'her name never goes to the script');
    assert.doesNotMatch((await txt(p, V)), /Maddy|left today|streak/i, 'no name, nothing counting down or adding up');

    // PF5 flips the beeps, and the choice is remembered.
    await key(5);
    assert.deepEqual(await pfKeys(), ['PF1 HISTORY', 'PF3 EXIT', 'PF5 SOUND OFF']);

    // Talk to a grown-up: a calm, plain screen that says to go talk to Mom or Dad (no phone numbers), and her parents
    // get the last messages.
    await p.click(V + ' .grownup-btn');
    const panel = (await txt(p, V + ' .grownup-panel'));
    assert.match(panel, /Go talk to Mom or Dad right now\. ?Tell them you want to talk\. You are not in trouble\./);
    assert.doesNotMatch(panel, /911|988|\bcall (911|988)|hotline|\d{3}[ -]\d{4}/i, 'no phone numbers');
    await p.waitForFunction(() => /We sent Mom and Dad a message too/.test(document.querySelector('#main .grownup-sent').textContent), null, { timeout: 10000 });
    const help = posts.filter(x => x.body.action === 'grownup')[0].body;
    assert.deepEqual(help.messages.map(m => m.role), ['user', 'assistant']);
    await p.click('[data-act="grownup-back"]'); await sleep(200);
    assert.equal(await screenName(), 'CHAT');
    assert.deepEqual(await pfKeys(), ['PF1 HISTORY', 'PF3 EXIT', 'PF5 SOUND OFF']);

    // PF1: the history file, in COBOL's voice, starting with how the menu and the PF keys work. PF3 goes back to the
    // menu, and the chat keeps its place.
    await key(1);
    assert.equal(await screenName(), 'HISTORY FILE');
    const file = (await txt(p, V + ' .t-file'));
    assert.match(file, /^PROCESSING\.\.\. HISTORY FILE LOADED\. I AM COBOL\. MY NAME MEANS COMMON BUSINESS-ORIENTED LANGUAGE\./);
    assert.match(file, /FILE 0: HOW TO WORK THIS TERMINAL\. MY MAIN MENU HAS THREE OPTIONS: 1 CHAT, 2 THIS HISTORY FILE, AND 3 THE TEST\./);
    assert.match(file, /PF1 HISTORY ?OPENS THIS HISTORY FILE\. ?PF3 EXIT ?GOES BACK ONE STEP\. ON THE MAIN MENU, IT TAKES YOU BACK TO EXPLORE\. ?PF5 SOUND ?TURNS MY BEEPS ON OR OFF\./);
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) assert.match(file, new RegExp('FILE ' + n + ': '));
    assert.match(file, /DISPLAY "HELLO, HUMAN\."\./);
    assert.match(file, /END OF FILE\.$/);
    assert.match((await txt(p, V + ' .t-actions')), /TEST AVAILABLE: 10 QUESTIONS\. PASS WITH 8 OF 10 \(80%\) TO EARN 2 POINTS\./);
    assert.ok(await p.$(V + ' .grownup-btn'), 'the grown-up button is on every COBOL screen');
    await key(3);
    assert.equal(await screenName(), 'MAIN MENU');
    await option(1);
    assert.equal((await lines()).length, 4, 'the conversation is still there');

    // The test, from the history file: 80% called out, the math-exam note, 10 questions, the last about PF3.
    await key(1);
    await p.click(V + ' [data-act="cobol-test"]'); await sleep(200);
    assert.equal(await screenName(), 'HISTORY TEST');
    const intro = (await txt(p, V + ' .t-test'));
    assert.match(intro, /PASSING SCORE: 80%\. Pass with 8 of 10 \(80%\) or better to earn 2 points\. Points count just like AR points, and you can earn them once\. You can retake the test\./);
    assert.match(intro, /More exams are coming\. Math exams will need 90% or higher, and they earn more points\./);
    assert.equal((await p.$$(V + ' .t-q')).length, 10);
    assert.match((await txt(p, V + ' .t-q:last-of-type legend')), /^10\. On COBOL’s screen, what does PF3 do\?$/);
    // Every question needs an answer.
    await p.$eval('form[data-form="cobol-test"] button[type="submit"]', e => e.click()); await sleep(200);
    assert.equal((await txt(p, V + ' .t-error')), 'ANSWER EVERY QUESTION FIRST. STILL BLANK: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.');
    // 7 right is not a pass: her score and what to reread, never the right answers, and no points.
    const answer = async rightOnes => {
      for (let i = 0; i < 10; i++) await p.check(V + ' input[name="q' + i + '"][value="' + (rightOnes.includes(i) ? 0 : 1) + '"]');
    };
    await answer([0, 1, 2, 3, 4, 5, 6]);
    // PF5 on the test leaves her answers picked.
    await key(5);
    assert.equal(await p.isChecked(V + ' input[name="q0"][value="0"]'), true);
    await key(5);
    assert.deepEqual(await pfKeys(), ['PF1 HISTORY', 'PF3 EXIT', 'PF5 SOUND OFF']);
    await p.$eval('form[data-form="cobol-test"] button[type="submit"]', e => e.click()); await sleep(300);
    let res = (await txt(p, V + ' .t-result'));
    assert.match(res, /^SCORE: 7 OF 10 \(70%\) RESULT: NOT YET\. You need 8 of 10 \(80%\) to pass\. REREAD THESE, THEN TRY AGAIN:/);
    assert.match(res, /08\. How long was her “nanosecond” wire\? \(FILE 7\)/);
    assert.match(res, /10\. On COBOL’s screen, what does PF3 do\? \(FILE 0\)/);
    assert.doesNotMatch(res, /11\.8 inches|Goes back one step/, 'no right answers shown');
    assert.equal(await records(), null, 'no points for 70%');
    // 9 right passes: 2 points, once, counted like AR points (and the weekly numbers hear about it).
    await p.click(V + ' .t-result + .t-actions [data-act="cobol-test"]'); await sleep(200);
    await answer([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    await p.$eval('form[data-form="cobol-test"] button[type="submit"]', e => e.click()); await sleep(400);
    res = (await txt(p, V + ' .t-result'));
    assert.match(res, /^SCORE: 9 OF 10 \(90%\) RESULT: PASSED\. \+2 POINTS\. They count just like AR points\. FOR A PERFECT SCORE, REREAD:/);
    assert.match((await txt(p, '#toast')), /You passed COBOL’s history test: \+2 points!/);
    const rec = await records();
    assert.equal(rec.earnedPoints, 2);
    assert.equal(rec.quizScore, 90);
    await sleep(300);
    const report = posts.filter(x => x.body.action === 'report');
    assert.equal(report.length, 2);
    assert.equal(report[1].body.points, 9);
    assert.equal(report[1].body.exams.length, 1);
    assert.deepEqual([report[1].body.exams[0].title, report[1].body.exams[0].score, report[1].body.exams[0].points], ['COBOL history test', 90, 2]);
    // Again, all right: no more points.
    await p.click(V + ' .t-result + .t-actions [data-act="cobol-test"]'); await sleep(200);
    assert.match((await txt(p, V + ' .t-test')), /You already passed and earned your 2 points\. This try is for fun\./);
    await answer([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await p.$eval('form[data-form="cobol-test"] button[type="submit"]', e => e.click()); await sleep(300);
    assert.match((await txt(p, V + ' .t-result')), /SCORE: 10 OF 10 \(100%\) RESULT: PASSED\. You already earned these 2 points, so none were added this time\./);
    assert.equal((await records()).earnedPoints, 2);
    // PF3 steps back: the result to the history (where the test started), the history to the menu.
    await key(3);
    assert.equal(await screenName(), 'HISTORY FILE');
    assert.match((await txt(p, V + ' .t-actions')), /TEST PASSED\. 2 POINTS EARNED\./);
    await key(3);
    assert.equal(await screenName(), 'MAIN MENU');
    assert.match((await options())[2], /PASSED: 2 POINTS EARNED$/);
    // From the menu, option 3 is the test, and PF3 comes straight back to the menu.
    await option(3);
    assert.equal(await screenName(), 'HISTORY TEST');
    await key(3);
    assert.equal(await screenName(), 'MAIN MENU');

    // The day's limit: her message goes back in the box... and the box goes away, with no "come back tomorrow".
    await option(1);
    script.chatAnswer = { error: 'limit', left: 0 };
    await p.fill('#chat-input', 'one more');
    await p.$eval('form[data-form="cobol-chat"] button[type="submit"]', e => e.click()); await sleep(800);
    assert.match((await txt(p, V)), /DAILY LIMIT REACHED\. COBOL IS DONE FOR TODAY\./);
    assert.doesNotMatch((await txt(p, V)), /come back|tomorrow/i);
    assert.equal(await p.$('#chat-input'), null);
    assert.equal((await txt(p, V + ' .t-status')), AI_LINE);
    assert.ok(await p.$(V + ' .grownup-btn'), 'still there at the limit');
    assert.equal(posts.filter(x => x.body.action === 'chat')[1].body.messages.length, 3, 'the history goes with it');
    await key(3);
    assert.match((await options())[0], /DONE FOR TODAY$/);
    // PF3 on the main menu goes back to Explore.
    await key(3); await sleep(300);
    assert.equal(await p.evaluate(() => location.hash), '#explore');

    // The Progress tab counts the test's points with her AR points.
    await tab('progress');
    assert.equal(await p.evaluate(async () => (await import('/Book-Dude/app/money.js')).rewardPoints()), 9);

    // The grown-up switch turns the chat off on this device; the tab, the history and the picks stay.
    await tab('more');
    assert.match((await txt(p, '.panel:has(#school-link)')), /Let her chat with COBOL/);
    await p.$eval('#dude-chat-on', e => e.click()); await sleep(400);
    await tab('explore');
    assert.deepEqual(await p.$$eval('.dude-asks button', b => b.map(x => x.textContent)), ['What should I read next?']);
    await tab('cobol');
    assert.match((await options())[0], /SWITCHED OFF$/);
    await tab('more');
    await p.$eval('#dude-chat-on', e => e.click()); await sleep(400);

    // Opening the app again soon after doesn't send the weekly numbers again.
    await p.reload(); await p.waitForSelector('.view-head'); await sleep(1500);
    assert.equal(posts.filter(x => x.body.action === 'report').length, 2, 'reopening doesn’t send the numbers again so soon');

    // After hours: the menu and the chat say when it runs, and the grown-up button still works, even with no internet.
    script.chat = { on: true, open: false, hours: '7-20', left: 40 };
    await p.clock.setFixedTime(new Date('2026-10-23T22:30:00-06:00'));
    await p.reload(); await p.waitForSelector('.view-head'); await tab('cobol');
    await p.waitForFunction(() => /CLOSED UNTIL 7 A\.M\./.test(document.querySelector('#main .cobol-view').innerText), null, { timeout: 10000 });
    await option(1);
    assert.match((await txt(p, V)), /COBOL IS OFF RIGHT NOW\. IT RUNS FROM 7 A\.M\. TO 8 P\.M\./);
    assert.equal(await p.$('#chat-input'), null);
    assert.equal((await txt(p, V + ' .t-status')), AI_LINE);
    assert.deepEqual(await pfKeys(), ['PF1 HISTORY', 'PF3 EXIT', 'PF5 SOUND OFF'], 'the sound choice was remembered');
    await ctx.setOffline(true);
    await p.click(V + ' .grownup-btn');
    assert.match((await txt(p, V + ' .grownup-panel')), /Go talk to Mom or Dad right now/);
    await p.waitForFunction(() => /didn’t go through, so go find them yourself/.test(document.querySelector('#main .grownup-sent').textContent), null, { timeout: 10000 });
    await ctx.setOffline(false);
    assert.equal(posts.filter(x => x.body.action === 'report').length, 3, 'ten hours later, the numbers go again');

    // The soft break timer: after 15 minutes at the terminal it suggests a break, without stopping anything. Then,
    // after a few minutes away, the app asks the script again, and COBOL shows what changed without a restart.
    script.chat = { on: true, open: true, hours: '7-20', left: 40 };
    const p2 = await ctx.newPage();
    p2.on('pageerror', e => errors.push(e.message));
    await p2.clock.install({ time: new Date('2026-10-23T12:00:00-06:00') });
    await p2.goto(BASE + '#cobol');
    await p2.waitForFunction(() => /OPEN UNTIL 8 P\.M\./.test((document.querySelector('#main .cobol-view') || {}).innerText || ''), null, { timeout: 10000 });
    await p2.click('#main .t-opt[data-option="1"]'); await sleep(300);
    assert.equal(await p2.$('#main .t-break'), null);
    await p2.clock.fastForward('15:30');
    await p2.waitForSelector('#main .t-break', { timeout: 5000 });
    assert.match((await txt(p2, '#main .t-break')), /SYSTEM NOTICE: 15 MINUTES AT THE TERMINAL\. RECOMMENDED: A BREAK\./);
    assert.ok(await p2.$('#chat-input'), 'she can still type');
    await p2.click('#main .t-break .t-key'); await sleep(300);
    assert.equal(await p2.evaluate(() => location.hash), '#explore', 'OK, BREAK goes to Explore');
    const before = script.gets;
    await p2.$eval('.tab[data-tab="cobol"]', e => e.click()); await sleep(500);
    assert.ok(await p2.$('#chat-input'), 'back on the chat');
    assert.equal(script.gets, before + 1, 'opening COBOL asks the script again');
    const seen = script.gets;
    script.chat = { on: false, open: true, hours: '7-20', left: 40 };
    const visible = v => p2.evaluate(v => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
      document.dispatchEvent(new Event('visibilitychange'));
    }, v);
    await visible('hidden'); await p2.clock.fastForward('01:00'); await visible('visible'); await sleep(500);
    assert.equal(script.gets, seen, 'not after only a minute away');
    await visible('hidden'); await p2.clock.fastForward('04:00'); await visible('visible');
    await p2.waitForFunction(() => /COBOL IS SWITCHED OFF RIGHT NOW/.test(document.querySelector('#main .cobol-view').innerText), null, { timeout: 5000 });
    assert.equal(script.gets, seen + 1);
    await p2.close();

    // When the app can't reach the script, option 1 says so (not "switched off"), and opening the chat tries again,
    // saying it's connecting until the script answers.
    script.chat = { on: true, open: true, hours: '7-20', left: 40 };
    script.getMode = 'fail';
    await p.clock.setFixedTime(new Date('2026-10-23T12:00:00-06:00'));
    await p.reload(); await p.waitForSelector('.view-head'); await tab('cobol');
    await p.waitForFunction(() => /NO CONNECTION$/.test(document.querySelector('#main .t-opt[data-option="1"]').innerText.trim()), null, { timeout: 10000 });
    script.getMode = 'hold';
    await option(1);
    assert.match(await txt(p, V), /CONNECTING TO THE MAINFRAME\.\.\./);
    assert.equal(await p.$('#chat-input'), null);
    script.releaseGet();
    await p.waitForSelector('#chat-input', { timeout: 10000 });
    await key(3);
    assert.match((await options())[0], /OPEN UNTIL 8 P\.M\.$/);

    // With Claude off in the script: no picks, and the chat says it's off, but the history file and the test work,
    // from the tab and from About the Dude (which opens the history on the COBOL tab).
    script.ai = false;
    await p.reload(); await p.waitForSelector('.view-head'); await tab('explore'); await sleep(2500);
    assert.equal(await p.$('.dude-asks'), null);
    await p.click('.dude-avatar'); await p.waitForSelector('#sheet .story');
    assert.match((await txt(p, '.story .cobol-intro')), /TEST PASSED\. 2 POINTS EARNED\. FIND ME ANY TIME ON THE COBOL TAB\./);
    await p.click('.story [data-act="cobol-history"]'); await sleep(400);
    assert.equal(await p.$('#sheet[open]'), null, 'About the Dude closes');
    assert.equal(await p.evaluate(() => location.hash), '#cobol');
    assert.equal(await screenName(), 'HISTORY FILE');
    await key(3);
    assert.match((await options())[0], /SWITCHED OFF$/);
    await option(1);
    assert.match((await txt(p, V)), /COBOL IS SWITCHED OFF RIGHT NOW\./);
    await key(3); await option(3);
    assert.equal((await p.$$(V + ' .t-q')).length, 10);
    assert.deepEqual(errors, []);
    console.log('The Dude jokes about new quizzes and picks real books; COBOL has its own tab with a main menu, a safe chat, its history and a 2-point test; the app re-checks the script after time away.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED', e.message.split('\n').slice(0, 4).join(' ')); process.exit(1); });
