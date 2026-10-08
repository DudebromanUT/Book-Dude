const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../docs/core.js');
const books = [{ book_id: 'b1', title: 'One', author: 'A', year: '2020', ar_points: '10' }];

test('book money counts whole prizes from all-time points and never goes negative', () => {
  const r = { every: 100, prize: '$10 of Barnes & Noble book money', paid: 0 };
  assert.deepEqual(C.rewardStatus(0, r), { earned: 0, owed: 0, into: 0, toGo: 100, frac: 0, every: 100, prize: r.prize });
  const s = C.rewardStatus(237.5, r);
  assert.equal(s.earned, 2); assert.equal(s.owed, 2); assert.equal(s.into, 37.5); assert.equal(s.toGo, 62.5);
  assert.equal(C.rewardStatus(100, r).earned, 1); assert.equal(C.rewardStatus(99.99, r).earned, 0);
  // A corrected (lower) quiz result after a prize was handed over never shows money owed back.
  assert.equal(C.rewardStatus(80, { ...r, paid: 1 }).owed, 0);
  assert.equal(C.rewardStatus(250, { ...r, paid: 1 }).owed, 1);
});

test('book-money settings fall back to sensible defaults', () => {
  const d = C.reward({});
  assert.equal(d.on, true); assert.equal(d.every, 100); assert.equal(d.paid, 0); assert.match(d.prize, /Barnes & Noble/);
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
