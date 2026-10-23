/* The Claude features in the app, with the Google script played by this test: a quiz arrives with a Dude joke, the
 * weekly numbers go to the script, "What should I read next?" shows only real books, and COBOL answers like a machine
 * (no typing bubble, no name), always shows the AI line and the small yellow Talk to a grown-up button, works its PF
 * keys, suggests breaks, and keeps to its limits; its history file and test give 2 points once, and the grown-up switch
 * turns the chat off. With Claude off in the script the chat and picks don't show, but the history file and test still
 * open from About the Dude.
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
    assert.match((await txt(p, '.story .cobol-intro')), /TEST AVAILABLE: PASS WITH 8 OF 10 \(80%\) TO EARN 2 POINTS\./);
    await p.click('.story .btn[data-act="close-sheet"]'); await sleep(500);
    assert.equal(await p.$('.dude-asks'), null, 'nothing before the link is in');

    // The link goes in: the quiz lands, and the Dude's line is his joke about it, linked to the book.
    await tab('more');
    await p.fill('#school-link', LINK); await p.dispatchEvent('#school-link', 'change');
    await p.waitForFunction(() => /from school/.test(document.querySelector('#toast').textContent), null, { timeout: 10000 });
    assert.match((await txt(p, '.panel:has(#school-link)')), /Let her use COBOL/);
    await tab('explore');
    assert.equal((await txt(p, '.dude .line')), JOKE);
    assert.equal((await txt(p, '.dude .bubble-link')), 'Hatchet');
    assert.deepEqual(await p.$$eval('.dude-asks button', b => b.map(x => x.textContent)), ['COBOL', 'What should I read next?']);

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

    // COBOL: the line that never scrolls away, the small yellow grown-up button, her message, the answer.
    const AI_LINE = 'This is an AI. Mom and Dad can read these chats.';
    const lines = () => p.$$eval('#sheet .t-line', l => l.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    const pfKeys = () => p.$$eval('#sheet .t-pf button', b => b.map(x => x.textContent));
    const screenName = async () => (await txt(p, '#sheet .t-head span:last-child'));
    const records = () => p.evaluate(async () => (await import('/Book-Dude/app/state.js')).state.records['exam:cobol'] || null);
    await p.click('[data-act="cobol"]'); await sleep(400);
    assert.equal((await txt(p, '#sheet .t-status')), AI_LINE);
    assert.equal((await txt(p, '#sheet .grownup-btn')), 'Talk to a grown-up');
    const btn = await p.$eval('#sheet .grownup-btn', e => ({ bg: getComputedStyle(e).backgroundColor, h: e.getBoundingClientRect().height }));
    assert.equal(btn.bg, 'rgb(242, 181, 58)', 'yellow');
    assert.ok(btn.h <= 44, 'small: ' + btn.h);
    assert.deepEqual(await lines(), ['BOOK DUDE MAINFRAME. COBOL ONLINE SINCE 1959.',
      'COBOL> GREETINGS, HUMAN. COBOL IS READY. Ask me about books, words, science, history, or anything you are curious about.']);
    assert.deepEqual(await pfKeys(), ['PF1 HISTORY', 'PF3 EXIT', 'PF5 SOUND ON']);
    assert.equal(await screenName(), 'CHAT');
    script.slow = true;
    await p.fill('#chat-input', 'what is Hatchet about?');
    await p.$eval('form[data-form="cobol-chat"] button[type="submit"]', e => e.click());
    await sleep(300);
    // While it waits: a machine "WORKING" line and the mainframe's "X SYSTEM", never a human-style typing bubble.
    assert.equal(await p.$('#sheet .typing'), null);
    assert.match((await txt(p, '#sheet .t-wait')), /^WORKING/);
    assert.match((await txt(p, '#sheet .t-oia')), /^X SYSTEM/);
    script.release();
    await p.waitForFunction(() => document.querySelectorAll('#sheet .t-line.t-cobol').length >= 2, null, { timeout: 10000 });
    assert.deepEqual((await lines()).slice(2), ['HUMAN> what is Hatchet about?', 'COBOL> Hatchet is about Brian, a plane, and one very useful hatchet.']);
    assert.equal(await p.$('#sheet .t-wait'), null);
    const chat = posts.filter(x => x.body.action === 'chat')[0].body;
    assert.deepEqual(chat.messages, [{ role: 'user', text: 'what is Hatchet about?' }]);
    assert.deepEqual(chat.recent, ['Hatchet']);
    assert.doesNotMatch(JSON.stringify(chat), /Maddy|Madeleine/, 'her name never goes to the script');
    assert.doesNotMatch((await txt(p, '#sheet .ai-sheet')), /Maddy|left today|streak/i, 'no name, nothing counting down or adding up');

    // PF5 flips the beeps, and the choice is remembered.
    await p.click('#sheet [data-act="cobol-pf5"]');
    assert.deepEqual(await pfKeys(), ['PF1 HISTORY', 'PF3 EXIT', 'PF5 SOUND OFF']);

    // Talk to a grown-up: a calm, plain screen that says to go talk to Mom or Dad (no phone numbers), and her parents
    // get the last messages.
    await p.click('#sheet .grownup-btn');
    const panel = (await txt(p, '#sheet .grownup-panel'));
    assert.match(panel, /Go talk to Mom or Dad right now\. ?Tell them you want to talk\. You are not in trouble\./);
    assert.doesNotMatch(panel, /911|988|\bcall (911|988)|hotline|\d{3}[ -]\d{4}/i, "no phone numbers");
    await p.waitForFunction(() => /We sent Mom and Dad a message too/.test(document.querySelector('#sheet .grownup-sent').textContent), null, { timeout: 10000 });
    const help = posts.filter(x => x.body.action === 'grownup')[0].body;
    assert.deepEqual(help.messages.map(m => m.role), ['user', 'assistant']);
    await p.click('[data-act="grownup-back"]'); await sleep(200);
    assert.equal((await txt(p, '#sheet .t-status')), AI_LINE);
    assert.deepEqual(await pfKeys(), ['PF1 HISTORY', 'PF3 EXIT', 'PF5 SOUND OFF']);

    // PF1: the history file, in COBOL's voice, starting with how the PF keys work. PF3 goes back to the chat.
    await p.click('#sheet [data-act="cobol-pf1"]'); await sleep(200);
    assert.equal(await screenName(), 'HISTORY FILE');
    const file = (await txt(p, '#sheet .t-file'));
    assert.match(file, /^PROCESSING\.\.\. HISTORY FILE LOADED\. I AM COBOL\. MY NAME MEANS COMMON BUSINESS-ORIENTED LANGUAGE\./);
    assert.match(file, /FILE 0: HOW TO WORK THIS TERMINAL\. .*PF1 HISTORY ?OPENS THIS HISTORY FILE\. ?PF3 EXIT ?LEAVES THE SCREEN YOU ARE ON\..*PF5 SOUND ?TURNS MY BEEPS ON OR OFF\./);
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) assert.match(file, new RegExp('FILE ' + n + ': '));
    assert.match(file, /DISPLAY "HELLO, HUMAN\."\./);
    assert.match(file, /END OF FILE\.$/);
    assert.match((await txt(p, '#sheet .t-actions')), /TEST AVAILABLE: 10 QUESTIONS\. PASS WITH 8 OF 10 \(80%\) TO EARN 2 POINTS\./);
    assert.ok(await p.$('#sheet .grownup-btn'), 'the grown-up button is on every COBOL screen');
    await p.click('#sheet [data-act="cobol-pf3"]'); await sleep(200);
    assert.equal(await screenName(), 'CHAT');
    assert.equal((await lines()).length, 4, 'the conversation is still there');

    // The test: 80% called out, the math-exam note, 10 questions, the last about PF3.
    await p.click('#sheet [data-act="cobol-pf1"]'); await sleep(200);
    await p.click('#sheet [data-act="cobol-test"]'); await sleep(200);
    assert.equal(await screenName(), 'HISTORY TEST');
    const intro = (await txt(p, '#sheet .t-test'));
    assert.match(intro, /PASSING SCORE: 80%\. Pass with 8 of 10 \(80%\) or better to earn 2 points\. Points count just like AR points, and you can earn them once\. You can retake the test\./);
    assert.match(intro, /More exams are coming\. Math exams will need 90% or higher, and they earn more points\./);
    assert.equal((await p.$$('#sheet .t-q')).length, 10);
    assert.match((await txt(p, '#sheet .t-q:last-of-type legend')), /^10\. On COBOL’s screen, what does PF3 do\?$/);
    // Every question needs an answer.
    await p.$eval('#sheet form[data-form="cobol-test"] button[type="submit"]', e => e.click()); await sleep(200);
    assert.equal((await txt(p, '#sheet .t-error')), 'ANSWER EVERY QUESTION FIRST. STILL BLANK: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.');
    // 7 right is not a pass: her score and what to reread, never the right answers, and no points.
    const answer = async rightOnes => {
      for (let i = 0; i < 10; i++) await p.check('#sheet input[name="q' + i + '"][value="' + (rightOnes.includes(i) ? 0 : 1) + '"]');
    };
    await answer([0, 1, 2, 3, 4, 5, 6]);
    // PF5 on the test leaves her answers picked.
    await p.click('#sheet [data-act="cobol-pf5"]');
    assert.equal(await p.isChecked('#sheet input[name="q0"][value="0"]'), true);
    await p.click('#sheet [data-act="cobol-pf5"]');
    assert.deepEqual(await pfKeys(), ['PF1 HISTORY', 'PF3 EXIT', 'PF5 SOUND OFF']);
    await p.$eval('#sheet form[data-form="cobol-test"] button[type="submit"]', e => e.click()); await sleep(300);
    let res = (await txt(p, '#sheet .t-result'));
    assert.match(res, /^SCORE: 7 OF 10 \(70%\) RESULT: NOT YET\. You need 8 of 10 \(80%\) to pass\. REREAD THESE, THEN TRY AGAIN:/);
    assert.match(res, /08\. How long was her “nanosecond” wire\? \(FILE 7\)/);
    assert.match(res, /10\. On COBOL’s screen, what does PF3 do\? \(FILE 0\)/);
    assert.doesNotMatch(res, /11\.8 inches|Leaves the screen/, 'no right answers shown');
    assert.equal(await records(), null, 'no points for 70%');
    // 9 right passes: 2 points, once, counted like AR points (and the weekly numbers hear about it).
    await p.click('#sheet .t-result + .t-actions [data-act="cobol-test"]'); await sleep(200);
    await answer([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    await p.$eval('#sheet form[data-form="cobol-test"] button[type="submit"]', e => e.click()); await sleep(400);
    res = (await txt(p, '#sheet .t-result'));
    assert.match(res, /^SCORE: 9 OF 10 \(90%\) RESULT: PASSED\. \+2 POINTS\. They count just like AR points\. FOR A PERFECT SCORE, REREAD:/);
    assert.match((await txt(p, '#toast')), /You passed COBOL’s history test: \+2 points!/);
    const rec = await records();
    assert.equal(rec.earnedPoints, 2);
    assert.equal(rec.quizScore, 90);
    await p.waitForFunction(() => true);
    await sleep(300);
    const report = posts.filter(x => x.body.action === 'report');
    assert.equal(report.length, 2);
    assert.equal(report[1].body.points, 9);
    assert.equal(report[1].body.exams.length, 1);
    assert.deepEqual([report[1].body.exams[0].title, report[1].body.exams[0].score, report[1].body.exams[0].points], ['COBOL history test', 90, 2]);
    // Again, all right: no more points.
    await p.click('#sheet .t-result + .t-actions [data-act="cobol-test"]'); await sleep(200);
    assert.match((await txt(p, '#sheet .t-test')), /You already passed and earned your 2 points\. This try is for fun\./);
    await answer([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await p.$eval('#sheet form[data-form="cobol-test"] button[type="submit"]', e => e.click()); await sleep(300);
    assert.match((await txt(p, '#sheet .t-result')), /SCORE: 10 OF 10 \(100%\) RESULT: PASSED\. You already earned these 2 points, so none were added this time\./);
    assert.equal((await records()).earnedPoints, 2);
    // PF3 steps back: result to history, history to chat, chat closes.
    await p.click('#sheet [data-act="cobol-pf3"]'); await sleep(200);
    assert.equal(await screenName(), 'HISTORY FILE');
    assert.match((await txt(p, '#sheet .t-actions')), /TEST PASSED\. 2 POINTS EARNED\./);
    await p.click('#sheet [data-act="cobol-pf3"]'); await sleep(200);
    assert.equal(await screenName(), 'CHAT');

    // The day's limit: her message goes back in the box... and the box goes away, with no "come back tomorrow".
    script.chatAnswer = { error: 'limit', left: 0 };
    await p.fill('#chat-input', 'one more');
    await p.$eval('form[data-form="cobol-chat"] button[type="submit"]', e => e.click()); await sleep(800);
    assert.match((await txt(p, '#sheet .ai-sheet')), /DAILY LIMIT REACHED\. COBOL IS DONE FOR TODAY\./);
    assert.doesNotMatch((await txt(p, '#sheet .ai-sheet')), /come back|tomorrow/i);
    assert.equal(await p.$('#chat-input'), null);
    assert.equal((await txt(p, '#sheet .t-status')), AI_LINE);
    assert.ok(await p.$('#sheet .grownup-btn'), 'still there at the limit');
    assert.equal(posts.filter(x => x.body.action === 'chat')[1].body.messages.length, 3, 'the history goes with it');
    await p.click('#sheet [data-act="cobol-pf3"]'); await sleep(300);
    assert.equal(await p.$('#sheet[open]'), null, 'PF3 on the chat closes COBOL');

    // The Progress tab counts the test's points with her AR points.
    await tab('progress');
    assert.equal(await p.evaluate(async () => (await import('/Book-Dude/app/money.js')).rewardPoints()), 9);

    // The grown-up switch turns COBOL off on this device; the picks stay.
    await tab('more');
    assert.match((await txt(p, '.panel:has(#school-link)')), /Let her use COBOL/);
    await p.$eval('#dude-chat-on', e => e.click()); await sleep(400);
    await tab('explore');
    assert.deepEqual(await p.$$eval('.dude-asks button', b => b.map(x => x.textContent)), ['What should I read next?']);
    await tab('more');
    await p.$eval('#dude-chat-on', e => e.click()); await sleep(400);

    // After hours: it says when it runs, and the grown-up button still works, even with no internet.
    script.chat = { on: true, open: false, hours: '7-21', left: 40 };
    await p.reload(); await p.waitForSelector('.view-head'); await tab('explore'); await p.waitForSelector('.dude-asks', { timeout: 10000 });
    await p.click('[data-act="cobol"]'); await sleep(400);
    assert.match((await txt(p, '#sheet .ai-sheet')), /COBOL IS OFF RIGHT NOW\. IT RUNS FROM 7 A\.M\. TO 9 P\.M\./);
    assert.equal(await p.$('#chat-input'), null);
    assert.equal((await txt(p, '#sheet .t-status')), AI_LINE);
    assert.deepEqual(await pfKeys(), ['PF1 HISTORY', 'PF3 EXIT', 'PF5 SOUND OFF'], 'the sound choice was remembered');
    await ctx.setOffline(true);
    await p.click('#sheet .grownup-btn');
    assert.match((await txt(p, '#sheet .grownup-panel')), /Go talk to Mom or Dad right now/);
    await p.waitForFunction(() => /didn’t go through, so go find them yourself/.test(document.querySelector('#sheet .grownup-sent').textContent), null, { timeout: 10000 });
    await ctx.setOffline(false);
    assert.equal(posts.filter(x => x.body.action === 'report').length, 2, 'reopening doesn’t send the numbers again so soon');
    await p.$eval('#sheet .sheet-bar [data-act="close-sheet"]', e => e.click()); await sleep(300);

    // The soft break timer: after 15 minutes at the terminal it suggests a break, without stopping anything.
    script.chat = { on: true, open: true, hours: '7-21', left: 40 };
    const p2 = await ctx.newPage();
    p2.on('pageerror', e => errors.push(e.message));
    await p2.clock.install();
    await p2.goto(BASE + '#explore'); await p2.waitForSelector('.dude-asks', { timeout: 10000 });
    await p2.click('[data-act="cobol"]'); await sleep(300);
    assert.equal(await p2.$('#sheet .t-break'), null);
    await p2.clock.fastForward('15:30');
    await p2.waitForSelector('#sheet .t-break', { timeout: 5000 });
    assert.match((await txt(p2, '#sheet .t-break')), /SYSTEM NOTICE: 15 MINUTES AT THE TERMINAL\. RECOMMENDED: A BREAK\./);
    assert.ok(await p2.$('#chat-input'), 'she can still type');
    await p2.click('#sheet .t-break .t-key'); await sleep(300);
    assert.equal(await p2.$('#sheet[open]'), null, 'OK, BREAK closes COBOL');
    await p2.close();

    // With Claude off in the script, none of it shows.
    script.ai = false;
    await p.reload(); await p.waitForSelector('.view-head'); await tab('explore'); await sleep(2500);
    assert.equal(await p.$('.dude-asks'), null);
    await p.click('.dude-avatar'); await p.waitForSelector('#sheet .story');
    assert.match((await txt(p, '.story .cobol-intro')), /TEST PASSED\. 2 POINTS EARNED\./);
    await p.click('.story [data-act="cobol-history"]'); await sleep(300);
    assert.equal(await screenName(), 'HISTORY FILE');
    assert.match((await txt(p, '#sheet .t-oia')), /ABOUT THE DUDE/);
    await p.click('#sheet [data-act="cobol-pf3"]'); await sleep(300);
    assert.ok(await p.$('#sheet .story'), 'PF3 goes back to About the Dude');
    assert.deepEqual(errors, []);
    console.log('The Dude jokes about new quizzes and picks real books; COBOL runs a safe terminal with its history and a 2-point test; the chat hides when Claude is off.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('FAILED', e.message.split('\n').slice(0, 4).join(' ')); process.exit(1); });
