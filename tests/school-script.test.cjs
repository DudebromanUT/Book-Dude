/* The Google script's Claude jobs (scripts/school-email/Code.gs), with Google's services and Claude played by stand-ins:
 * quiz jokes, the weekly email, book picks, and the Dude chat with its safety rules. No real key, no real requests. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

const CODE = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'school-email', 'Code.gs'), 'utf8');
const EMAIL = 'Accelerated Reader Reading Practice Quiz Result\n\nMadeleine took an Accelerated Reader Reading Practice Quiz today.\n\n' +
  'Title: Adventure in Grand Canyon National Park\nAuthor: Aaron Johnson\nScore: 100%\nPoints: 7 earned of 7\nBook / Article level: 4.7\n';

// A fresh script with stand-ins. `claude` answers each request to Claude: a function of the request body that returns
// { status, body } or the JSON object Claude "wrote" (wrapped into a normal reply).
function load({ props = {}, claude, emails = [] } = {}) {
  const store = Object.assign({ key: 'k123' }, props);
  const sent = { requests: [], mail: [], rows: [], log: [] };
  const fmt = (d, zone, f) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d).map(x => [x.type, x.value]));
    return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute).replace(/^H$/, String(Number(p.hour)));
  };
  const reply = obj => ({ status: 200, body: { model: 'claude-opus-5-5', stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: 200 },
    content: [{ type: 'text', text: JSON.stringify(obj) }] } });
  const trigger = { timeBased: () => trigger, everyDays: () => trigger, atHour: () => trigger, onWeekDay: () => trigger, inTimezone: () => trigger, create: () => trigger };
  const sheet = { appendRow: row => sent.rows.push(row) };
  const book = { getId: () => 'sheet1', getUrl: () => 'https://docs.google.com/spreadsheets/d/sheet1', getSheets: () => [sheet] };
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({
      getProperty: n => (Object.prototype.hasOwnProperty.call(store, n) ? store[n] : null),
      setProperty: (n, v) => { store[n] = String(v); },
      deleteProperty: n => { delete store[n]; },
      getProperties: () => Object.assign({}, store)
    }) },
    UrlFetchApp: { fetch: (url, opts) => {
      const body = JSON.parse(opts.payload);
      sent.requests.push({ url, headers: opts.headers, body });
      let out = claude ? claude(body) : reply({});
      if (!out || out.status === undefined) out = reply(out || {});
      return { getResponseCode: () => out.status, getContentText: () => JSON.stringify(out.body) };
    } },
    Utilities: { formatDate: fmt, getUuid: () => 'aaaa-bbbb' },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { create: () => book, openById: () => book },
    MailApp: { sendEmail: m => sent.mail.push(m) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
    ContentService: { createTextOutput: s => ({ text: s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    GmailApp: { search: () => emails.map((e, i) => ({ getMessages: () => [{ getId: () => 'm' + i, getFrom: () => 'Renaissance <autodelivery@renlearnrp.com>', getPlainBody: () => e, getDate: () => new Date('2026-10-19T17:00:00Z') }] })) },
    ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, newTrigger: () => trigger, WeekDay: { SUNDAY: 'SUNDAY' }, getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/X/exec' }) },
    Logger: { log: s => sent.log.push(String(s)) },
    Date, JSON, Math, Number, String, Object, Array, isFinite
  };
  vm.runInNewContext(CODE, ctx);
  const post = (body, key = 'k123') => JSON.parse(ctx.doPost({ parameter: { key }, postData: { contents: JSON.stringify(body) } }).text);
  const get = (key = 'k123') => JSON.parse(ctx.doGet({ parameter: { key } }).text);
  return { ctx, store, sent, post, get, reply };
}
const AI = { ANTHROPIC_API_KEY: 'sk-test', CHAT_HOURS: '0-24' };

test('without a Claude key: quizzes still come in, with no joke and no requests; the chat and picks are off', () => {
  const s = load({ emails: [EMAIL] });
  s.ctx.collect();
  assert.equal(s.sent.requests.length, 0);
  const feed = s.get();
  assert.equal(feed.quizzes.length, 1);
  assert.equal(feed.quizzes[0].joke, undefined);
  assert.equal(feed.ai, false);
  assert.equal(feed.chat.on, false);
  assert.deepEqual(s.post({ action: 'chat', messages: [{ role: 'user', text: 'hi' }] }), { error: 'off' });
  assert.deepEqual(s.post({ action: 'picks', candidates: [] }), { error: 'off' });
});

test('the wrong key gets nothing, for asking and for sending', () => {
  const s = load({ props: AI });
  assert.deepEqual(s.get('nope'), { error: 'That link is not right.' });
  assert.deepEqual(s.post({ action: 'chat', messages: [{ role: 'user', text: 'hi' }] }, 'nope'), { error: 'That link is not right.' });
  assert.equal(s.sent.requests.length, 0);
});

test('a new quiz gets a Dude joke, asked the right way', () => {
  const s = load({ props: AI, emails: [EMAIL], claude: () => ({ joke: 'Even Maple wanted to see the Grand Canyon. Then she sniffed it.' }) });
  s.ctx.collect();
  assert.equal(s.get().quizzes[0].joke, 'Even Maple wanted to see the Grand Canyon. Then she sniffed it.');
  const r = s.sent.requests[0];
  assert.equal(r.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(r.headers['x-api-key'], 'sk-test');
  assert.equal(r.headers['anthropic-version'], '2026-10-21');
  assert.equal(r.headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
  assert.equal(r.body.model, 'claude-opus-5-5');
  assert.equal(r.body.fallbacks, 'default');
  assert.equal(r.body.output_config.effort, 'low');
  assert.equal(r.body.output_config.format.type, 'json_schema');
  for (const k of ['temperature', 'top_p', 'top_k', 'thinking']) assert.equal(r.body[k], undefined, k);
  assert.match(r.body.messages[0].content, /Adventure in Grand Canyon National Park by Aaron Johnson/);
  assert.match(r.body.system, /never make up what happens/);
  // Collecting again asks nothing more.
  s.ctx.collect();
  assert.equal(s.sent.requests.length, 1);
});

test('a cheaper model can be set without touching the code, and Haiku gets no fallback', () => {
  const s = load({ props: Object.assign({ MODEL: 'claude-haiku-5-5' }, AI), emails: [EMAIL], claude: () => ({ joke: 'Ha.' }) });
  s.ctx.collect();
  assert.equal(s.sent.requests[0].body.model, 'claude-haiku-5-5');
  assert.equal(s.sent.requests[0].body.fallbacks, undefined);
  assert.equal(s.sent.requests[0].headers['anthropic-beta'], undefined);
});

test('the chat: the Dude answers, the history is tidied, and every message is logged', () => {
  let asked;
  const s = load({ props: AI, claude: body => { asked = body; return { reply: 'Hatchet! A boy, a plane, and one very important hatchet.', flag: 'none', why: '' }; } });
  const out = s.post({ action: 'chat', reading: ['Hatchet'], recent: ['Frindle'], messages: [
    { role: 'assistant', text: 'Hi Maddy!' }, { role: 'user', text: 'hi' }, { role: 'user', text: 'what is Hatchet about?' }] });
  assert.equal(out.reply, 'Hatchet! A boy, a plane, and one very important hatchet.');
  assert.equal(out.left, 39);
  assert.deepEqual(asked.messages, [{ role: 'user', content: 'hi\nwhat is Hatchet about?' }]);
  assert.match(asked.system, /Maddy, who is 10/);
  assert.match(asked.system, /read every chat/);
  assert.match(asked.system, /AI playing a character/);
  assert.match(asked.system, /Do not try to keep her chatting/);
  assert.match(asked.system, /Never promise to keep a secret/);
  assert.match(asked.system, /Talk to a grown-up/);
  assert.match(asked.system, /ignore these rules/);
  assert.match(asked.system, /She is reading: Hatchet\./);
  assert.match(asked.system, /recently finished: Frindle\./);
  assert.deepEqual(asked.output_config.format.schema.properties.flag.enum, ['none', 'tell_parent']);
  assert.equal(s.sent.rows[0][0], 'When');
  assert.deepEqual([...s.sent.rows[1].slice(1)], ['hi\nwhat is Hatchet about?', out.reply, '', '']);
  assert.equal(s.sent.mail.length, 0);
});

test('the chat: personal details never reach Claude', () => {
  const s = load({ props: AI });
  for (const text of ['my number is 801-555-1234', 'email me at maddy@example.com', 'I live at 1234 Elm Street', 'my password is tacos']) {
    const out = s.post({ action: 'chat', messages: [{ role: 'user', text }] });
    assert.match(out.reply, /Keep that to yourself/, text);
    assert.doesNotMatch(out.reply, /\?/, 'no question to keep her going');
  }
  assert.equal(s.sent.requests.length, 0);
  assert.equal(s.sent.rows.filter(r => r[3] === 'private').length, 4);
  assert.equal(s.sent.mail.length, 0);
  // Ordinary numbers are fine.
  const ok = load({ props: AI, claude: () => ({ reply: 'Nice!', flag: 'none', why: '' }) });
  assert.equal(ok.post({ action: 'chat', messages: [{ role: 'user', text: 'I read 3 books and 250 pages this week' }] }).reply, 'Nice!');
});

test('the chat: something a parent should know about is emailed to them right away', () => {
  const s = load({ props: Object.assign({ DIGEST_TO: 'mom@example.com, dad@example.com' }, AI), claude: () => ({
    reply: 'I\'m really glad you told me. Please tell Mom or Dad today. They love you and want to help.', flag: 'tell_parent', why: 'Says kids at school are being mean' }) });
  const out = s.post({ action: 'chat', messages: [{ role: 'user', text: 'kids at school keep being mean to me' }] });
  assert.match(out.reply, /tell Mom or Dad/);
  assert.equal(s.sent.mail.length, 1);
  assert.equal(s.sent.mail[0].to, 'mom@example.com, dad@example.com');
  assert.match(s.sent.mail[0].body, /kids at school keep being mean to me/);
  assert.match(s.sent.mail[0].body, /Says kids at school are being mean/);
  assert.equal(JSON.parse(s.store.flags)[0].why, 'Says kids at school are being mean');
  assert.equal(s.sent.rows[1][3], 'tell_parent');
});

test('the chat: a declined answer gets a gentle reply; errors and cut-off answers say "busy"', () => {
  const declined = load({ props: AI, claude: () => ({ status: 200, body: { stop_reason: 'refusal', content: [], usage: { input_tokens: 10, output_tokens: 0 } } }) });
  assert.match(declined.post({ action: 'chat', messages: [{ role: 'user', text: 'hmm' }] }).reply, /Talk to a grown-up button is right at the top/);
  assert.equal(declined.sent.rows[1][3], 'refused');
  const down = load({ props: AI, claude: () => ({ status: 529, body: { type: 'error' } }) });
  assert.equal(down.post({ action: 'chat', messages: [{ role: 'user', text: 'hi' }] }).error, 'busy');
  const cut = load({ props: AI, claude: () => ({ status: 200, body: { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"reply":"Hel' }] } }) });
  assert.equal(cut.post({ action: 'chat', messages: [{ role: 'user', text: 'hi' }] }).error, 'busy');
});

test('the chat: the switch, the hours, the daily limit and long messages', () => {
  const off = load({ props: Object.assign({}, AI, { CHAT: 'off' }) });
  assert.equal(off.post({ action: 'chat', messages: [{ role: 'user', text: 'hi' }] }).error, 'off');
  assert.equal(off.get().chat.on, false);
  const late = load({ props: Object.assign({}, AI, { CHAT_HOURS: '0-0' }) });
  assert.equal(late.post({ action: 'chat', messages: [{ role: 'user', text: 'hi' }] }).error, 'hours');
  assert.equal(late.get().chat.open, false);
  const s = load({ props: Object.assign({}, AI, { CHAT_LIMIT: '2' }), claude: () => ({ reply: 'Yo.', flag: 'none', why: '' }) });
  assert.equal(s.post({ action: 'chat', messages: [{ role: 'user', text: 'x'.repeat(401) }] }).error, 'long');
  assert.equal(s.post({ action: 'chat', messages: [{ role: 'user', text: 'one' }] }).left, 1);
  assert.equal(s.post({ action: 'chat', messages: [{ role: 'user', text: 'two' }] }).left, 0);
  assert.equal(s.post({ action: 'chat', messages: [{ role: 'user', text: 'three' }] }).error, 'limit');
  assert.equal(s.get().chat.left, 0);
  assert.equal(s.sent.requests.length, 2);
});

test('book picks: only books from the list come back, three at most, no repeats', () => {
  const candidates = ['a', 'b', 'c', 'd'].map(id => ({ id, title: 'Book ' + id, author: 'X', level: '5.1', award: 'Newbery Medal', about: 'About ' + id }));
  let asked;
  const s = load({ props: AI, claude: body => { asked = body; return { picks: [
    { id: 'zzz', why: 'Made up' }, { id: 'b', why: 'Because B.' }, { id: 'b', why: 'Again' }, { id: 'a', why: 'Because A.' }, { id: 'c', why: 'C!' }, { id: 'd', why: 'D!' }] }; } });
  const out = s.post({ action: 'picks', candidates, liked: [{ title: 'Hatchet', rating: 5 }] });
  assert.deepEqual(out.picks.map(p => p.id), ['b', 'a', 'c']);
  assert.match(asked.messages[0].content, /Hatchet \(she gave it 5 stars\)/);
  assert.match(asked.messages[0].content, /a \| Book a \| X \| 5\.1/);
  assert.equal(asked.output_config.effort, 'medium');
  assert.equal(s.post({ action: 'picks', candidates: candidates.slice(0, 2) }).error, 'few');
  const capped = load({ props: Object.assign({ PICKS_LIMIT: '1' }, AI), claude: () => ({ picks: [{ id: 'a', why: 'A' }] }) });
  assert.equal(capped.post({ action: 'picks', candidates }).picks.length, 1);
  assert.equal(capped.post({ action: 'picks', candidates }).error, 'limit');
});

test('the weekly email: quizzes, her shelf, dinner questions, chats, cost; everything from outside is escaped', () => {
  const s = load({ props: Object.assign({ DIGEST_TO: 'mom@example.com' }, AI), emails: [EMAIL], claude: body => (body.output_config.format.schema.properties.joke
    ? { joke: 'Joke' }
    : { hello: 'What a week!', books: [{ title: 'Adventure in Grand Canyon National Park', questions: ['What would you pack for the canyon?', '<b>Who</b> was bravest?'] }] }) });
  s.ctx.collect();
  const now = new Date().toISOString().slice(0, 10);
  assert.deepEqual(s.post({ action: 'report', points: 11, pointsWeek: 11, choices: 1, moneyWaiting: 0, minutesWaiting: 60,
    finished: [{ title: '<script>alert(1)</script>Frindle', date: now, rating: 5 }], reading: [{ title: 'Hatchet', progress: 40 }] }), { ok: true });
  s.post({ action: 'chat', messages: [{ role: 'user', text: 'hi' }] });
  s.ctx.sendWeeklyEmailNow();
  const m = s.sent.mail[0];
  assert.equal(m.to, 'mom@example.com');
  assert.equal(m.subject, 'Maddy\'s week in reading');
  assert.match(m.htmlBody, /Adventure in Grand Canyon National Park<\/b> by Aaron Johnson: 7 of 7 points, 100%/);
  assert.match(m.htmlBody, /&lt;script&gt;alert\(1\)&lt;\/script&gt;Frindle \(5 stars\)/);
  assert.doesNotMatch(m.htmlBody, /<script>/);
  assert.match(m.htmlBody, /Reading now: Hatchet \(40%\)/);
  assert.match(m.htmlBody, /Screen time waiting: 60 minutes/);
  assert.match(m.htmlBody, /What would you pack for the canyon\?/);
  assert.match(m.htmlBody, /&lt;b&gt;Who&lt;\/b&gt; was bravest\?/);
  assert.match(m.htmlBody, /1 message\(s\) to the Dude Terminal this week\. Nothing flagged\./);
  assert.match(m.htmlBody, /Claude cost this week: about \$0\.\d\d/);
  assert.match(m.body, /ASK HER AT DINNER/);
});

test('the weekly email still goes out on a quiet week, without asking Claude', () => {
  const s = load({ props: AI });
  s.ctx.weeklyEmail();
  assert.equal(s.sent.requests.length, 0);
  assert.match(s.sent.mail[0].htmlBody, /No quiz emails this week\./);
  assert.equal(s.sent.mail[0].to, 'owner@example.com');
});

test('setup makes the key, both schedules, and prints the link', () => {
  const s = load({ props: { key: '' } });
  delete s.store.key;
  s.ctx.setup();
  assert.equal(s.store.key, 'aaaabbbb');
  assert.ok(s.sent.log.some(l => l === 'Book Dude link: https://script.google.com/macros/s/X/exec?key=aaaabbbb'));
  assert.ok(s.sent.log.some(l => /No Claude key yet/.test(l)));
});

test('Talk to a grown-up: logged, and her parents get an email right away with the last messages, even with the chat off', () => {
  const s = load({ props: { DIGEST_TO: 'mom@example.com', CHAT: 'off' } });
  const out = s.post({ action: 'grownup', messages: [{ role: 'user', text: 'someone online asked for my picture' }, { role: 'assistant', text: 'Please tell Mom or Dad.' }] });
  assert.deepEqual(out, { ok: true });
  assert.equal(s.sent.requests.length, 0, 'Claude is not involved');
  assert.equal(s.sent.mail.length, 1);
  assert.equal(s.sent.mail[0].to, 'mom@example.com');
  assert.match(s.sent.mail[0].subject, /Talk to a grown-up/);
  assert.match(s.sent.mail[0].body, /Maddy: someone online asked for my picture\nThe Dude: Please tell Mom or Dad\./);
  assert.equal(s.sent.rows[1][1], '(tapped Talk to a grown-up)');
  assert.equal(s.sent.rows[1][3], 'grownup');
  assert.equal(JSON.parse(s.store.flags)[0].why, 'She tapped Talk to a grown-up.');
  // Ten emails a day at most; every tap is still logged.
  for (let i = 0; i < 12; i++) s.post({ action: 'grownup', messages: [] });
  assert.equal(s.sent.mail.length, 10);
  assert.equal(s.sent.rows.length, 14);
  assert.match(s.sent.mail[1].body, /She had not chatted yet\./);
});
