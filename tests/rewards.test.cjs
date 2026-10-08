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
