const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../docs/core.js');
const books = [{ book_id: 'b1', title: 'One', author: 'A', year: '2020', ar_points: '10' }];

test('book money counts whole payouts from all-time points and never goes negative', () => {
  const r = { every: 100, perPoint: 1, paid: 0 };
  const zero = C.rewardStatus(0, r);
  assert.equal(zero.earned, 0); assert.equal(zero.owed, 0); assert.equal(zero.toGo, 100); assert.equal(zero.payout, 100);
  const s = C.rewardStatus(237.5, r);
  assert.equal(s.earned, 2); assert.equal(s.owed, 2); assert.equal(s.into, 37.5); assert.equal(s.toGo, 62.5);
  assert.equal(s.jarMoney, 37.5); assert.equal(s.owedMoney, 200); assert.equal(s.totalMoney, 237.5); assert.equal(s.money, true);
  assert.equal(C.rewardStatus(237.5, { ...r, perPoint: 0.5 }).owedMoney, 100);
  assert.equal(C.rewardStatus(237.5, { ...r, perPoint: 0 }).money, false);
  assert.equal(C.rewardStatus(100, r).earned, 1); assert.equal(C.rewardStatus(99.99, r).earned, 0);
  // A corrected (lower) quiz result after a prize was handed over never shows money owed back.
  assert.equal(C.rewardStatus(80, { ...r, paid: 1 }).owed, 0);
  assert.equal(C.rewardStatus(250, { ...r, paid: 1 }).owed, 1);
});

test('book-money settings fall back to sensible defaults', () => {
  const d = C.reward({});
  assert.equal(d.on, true); assert.equal(d.every, 100); assert.equal(d.perPoint, 1); assert.equal(d.paid, 0);
  assert.match(d.where, /Barnes & Noble account/); assert.match(d.prize, /Barnes & Noble/);
  assert.equal(C.reward({ perPoint: 0 }).perPoint, 0); assert.equal(C.reward({ perPoint: 'lots' }).perPoint, 1);
  const bad = C.reward({ every: 0, paid: -2, prize: '   ', on: 'yes' });
  assert.equal(bad.every, 100); assert.equal(bad.paid, 0); assert.match(bad.prize, /Barnes/); assert.equal(bad.on, false);
  assert.equal(C.reward({ every: '50', paid: '3' }).every, 50); assert.equal(C.reward({ every: 2.5 }).every, 100);
});

test('backups carry book-money settings, and the newer copy wins on restore', () => {
  const mine = C.reward({ every: 50, prize: 'A trip to the bookstore', paid: 2, updatedAt: '2026-10-01T00:00:00Z' });
  const file = JSON.parse(JSON.stringify(C.exportBackup({}, { goals: {}, reward: mine }, '2026-10-08T00:00:00Z', {})));
  const parsed = C.parseBackup(file, books);
  assert.deepEqual(parsed.reward, mine);
  const older = C.reward({ every: 100, paid: 0, updatedAt: '2026-09-01T00:00:00Z' });
  assert.equal(C.mergeBackup({}, {}, parsed, {}, older).reward.every, 50);
  const newer = C.reward({ every: 25, paid: 5, updatedAt: '2026-10-05T00:00:00Z' });
  const plan = C.mergeBackup({}, {}, parsed, {}, newer);
  assert.equal(plan.reward.every, 25); assert.equal(plan.rewardChanged, false);
  assert.equal(C.parseBackup({ app: 'reading-room', version: 1, records: {} }, books).reward, null);
  assert.throws(() => C.parseBackup({ app: 'reading-room', version: 1, records: {}, settings: { reward: 'lots' } }, books));
});

test('school points: once a grown-up types her school total, the points above the starting line count', () => {
  assert.equal(C.reward({}).school, null); assert.equal(C.reward({}).schoolStart, 0); assert.equal(C.reward({}).schoolDate, '');
  assert.equal(C.rewardPoints(12.5, {}), 12.5);
  assert.equal(C.rewardPoints(12.5, { school: 47.3, schoolStart: 40 }), 7.3);
  assert.equal(C.rewardPoints(12.5, { school: '47.3', schoolStart: '0' }), 47.3);
  // A starting line above the total never makes points negative, and junk falls back to the app's own points.
  assert.equal(C.rewardPoints(12.5, { school: 30, schoolStart: 40 }), 0);
  assert.equal(C.rewardPoints(12.5, { school: 'lots' }), 12.5);
  assert.equal(C.reward({ schoolDate: '2026-02-30' }).schoolDate, '');
});

test('screen time: 60 minutes for each 10 points she spends on it, plus extras for books from the list finished since it started', () => {
  const list = [
    { book_id: 'bridge-to-terabithia--katherine-paterson', title: 'Bridge to Terabithia' },
    { book_id: 'hatchet--gary-paulsen', title: 'Hatchet' },
    { book_id: 'holes--louis-sachar', title: 'Holes' },
    { book_id: 'mine:abc', title: 'Dog Man', _custom: true }
  ];
  const done = (finishedDate, extra) => Object.assign(C.entry({ status: 'finished', finishedDate }), extra);
  const records = {
    'bridge-to-terabithia--katherine-paterson': done('2026-10-20'),
    'hatchet--gary-paulsen': done('2026-10-18'),
    'holes--louis-sachar': done('2026-10-01'), // finished before screen time started
    'mine:abc': done('2026-10-21'), // a book she added herself
    'not-in-the-catalog': done('2026-10-21'),
    'wonder--r-j-palacio': C.entry({ status: 'reading' })
  };
  const d = C.reward({});
  assert.equal(d.screen, true); assert.equal(d.minutes, 60); assert.equal(d.bonus, 30); assert.equal(d.given, 0); assert.equal(d.since, '');
  assert.deepEqual(d.special, { 'bridge-to-terabithia--katherine-paterson': 60 });
  const cfg = { since: '2026-10-17', toMinutes: 2 };
  const s = C.screenTime(27.5, records, list, cfg);
  assert.equal(s.fromPoints, 120); assert.equal(s.into, 7.5); assert.equal(s.toGo, 2.5);
  // Bridge to Terabithia earns its own 60 instead of the usual 30; newest first.
  assert.deepEqual(s.books.map(x => [x.id, x.minutes]), [['bridge-to-terabithia--katherine-paterson', 60], ['hatchet--gary-paulsen', 30]]);
  assert.equal(s.fromBooks, 90); assert.equal(s.earned, 210); assert.equal(s.owed, 210);
  assert.equal(C.screenTime(27.5, records, list, { ...cfg, given: 150 }).owed, 60);
  assert.equal(C.screenTime(27.5, records, list, { ...cfg, given: 500 }).owed, 0);
  // No start date yet: no book earns an extra, so books finished before screen time existed never count.
  assert.equal(C.screenTime(27.5, records, list, {}).fromBooks, 0);
  assert.equal(C.screenTime(9.99, {}, list, cfg).earned, 0);
  assert.equal(C.screenTime(10, {}, list, cfg).earned, 60);
  assert.equal(C.screenTime(10, {}, list, { ...cfg, minutes: 0 }).earned, 0);
  assert.equal(C.screenTime(0, records, list, { ...cfg, bonus: 0, special: {} }).fromBooks, 0);
});

test('screen-time settings fall back to sensible defaults', () => {
  const bad = C.reward({ minutes: -5, bonus: 2.5, given: 'some', since: 'yesterday', screen: 'yes', special: { 'ok-id': 45, 'bad id!': 10, 'also-ok': 'x' } });
  assert.equal(bad.minutes, 60); assert.equal(bad.bonus, 30); assert.equal(bad.given, 0); assert.equal(bad.since, ''); assert.equal(bad.screen, false);
  assert.deepEqual(bad.special, { 'ok-id': 45 });
  assert.deepEqual(C.reward({ special: 'none' }).special, { 'bridge-to-terabithia--katherine-paterson': 60 });
  assert.deepEqual(C.reward({ special: {} }).special, {});
  assert.equal(C.reward({ minutes: '0' }).minutes, 0);
});

test('backups carry school points and screen time', () => {
  const mine = C.reward({ school: 47.5, schoolStart: 40, schoolDate: '2026-10-17', minutes: 45, bonus: 20, toJar: 3, toMinutes: 2, given: 90, since: '2026-10-17', updatedAt: '2026-10-17T00:00:00Z' });
  const file = JSON.parse(JSON.stringify(C.exportBackup({}, { goals: {}, reward: mine }, '2026-10-18T00:00:00Z', {})));
  assert.deepEqual(C.parseBackup(file, books).reward, mine);
  // A backup from before screen time existed gets the defaults.
  const old = C.parseBackup({ app: 'reading-room', version: 1, records: {}, settings: { reward: { every: 100, paid: 1 } } }, books).reward;
  assert.equal(old.school, null); assert.equal(old.minutes, 60); assert.equal(old.given, 0); assert.equal(old.since, ''); assert.equal(old.toJar, 0);
});

test('the grown-up passcode is saved as a fingerprint, never as the four digits', () => {
  const h = C.codeHash('2468');
  assert.match(h, /^[0-9a-f]{8}$/);
  assert.equal(C.codeHash('2468'), h); assert.notEqual(C.codeHash('2469'), h); assert.notEqual(h, '2468');
  // Every 4-digit passcode gets its own fingerprint, so a wrong one never opens it.
  const all = new Set(); for (let i = 0; i < 10000; i++) all.add(C.codeHash(String(i).padStart(4, '0')));
  assert.equal(all.size, 10000);
  assert.equal(C.reward({}).code, ''); assert.equal(C.reward({ code: h }).code, h);
  assert.equal(C.reward({ code: '2468' }).code, ''); assert.equal(C.reward({ code: 12345678 }).code, '');
  assert.equal(C.reward({ codeReset: '2026-10-20' }).codeReset, '2026-10-20'); assert.equal(C.reward({ codeReset: 'today' }).codeReset, '');
  const mine = C.reward({ code: h, codeReset: '2026-10-20', updatedAt: '2026-10-20T00:00:00Z' });
  const file = JSON.parse(JSON.stringify(C.exportBackup({}, { goals: {}, reward: mine }, '2026-10-21T00:00:00Z', {})));
  assert.equal(C.parseBackup(file, books).reward.code, h);
  assert.equal(JSON.stringify(file).includes('2468'), false);
});

test('her choices: every 10 points goes into the jar or becomes screen time, mixed however she likes', () => {
  assert.equal(C.reward({}).toJar, 0); assert.equal(C.reward({}).toMinutes, 0); assert.equal(C.reward({ toJar: -1 }).toJar, 0);
  const none = C.choices(27.5, {});
  assert.deepEqual([none.batches, none.open, none.toJar, none.toMinutes, none.into, none.toGo, none.jarPoints], [2, 2, 0, 0, 7.5, 2.5, 0]);
  const mixed = C.choices(35, { toJar: 1, toMinutes: 1 });
  assert.deepEqual([mixed.open, mixed.jarPoints], [1, 10]);
  // The jar counts only the points she put in it.
  assert.equal(C.rewardStatus(mixed.jarPoints, {}).jarMoney, 10);
  // Choices beyond her points (after a quiz result is corrected down) don't count until she earns them again.
  const over = C.choices(15, { toJar: 1, toMinutes: 2 });
  assert.deepEqual([over.toJar, over.toMinutes, over.open], [1, 0, 0]);
  // With only one of the two switched on, every point goes straight to it, as before.
  const jarOnly = C.choices(27.5, { screen: false });
  assert.deepEqual([jarOnly.open, jarOnly.jarPoints], [0, 27.5]);
  const minutesOnly = C.choices(27.5, { on: false });
  assert.deepEqual([minutesOnly.open, minutesOnly.toMinutes, minutesOnly.jarPoints], [0, 2, 0]);
  assert.equal(C.screenTime(27.5, {}, [], { on: false }).fromPoints, 120);
  assert.equal(C.screenTime(27.5, {}, [], {}).fromPoints, 0);
});
