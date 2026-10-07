const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../docs/core.js');
const books = [{ book_id: 'b1', title: 'One', author: 'A', year: '2020', ar_points: '10' }];
const mine = (o = {}) => C.customBook({ id: 'mine:abc', title: 'Dog Man', author: 'Dav Pilkey', ar_level: '2.6', ar_points: '1', description: 'Part dog, part man.', createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z', ...o });

test('added books keep blank AR values blank and trim to safe lengths', () => {
  const b = C.customBook({ id: 'mine:x', title: '  Wings of Fire  ', ar_points: '', ar_level: ' 5.5 ', description: 'x'.repeat(5000) });
  assert.equal(b.title, 'Wings of Fire'); assert.equal(b.ar_points, ''); assert.equal(b.ar_level, '5.5'); assert.equal(b.description.length, 2000);
  assert.equal(C.knownPoints({ ar_points: b.ar_points }), null);
  assert.deepEqual(C.customBook(JSON.parse(JSON.stringify(b))), b);
  assert.ok(C.isCustomId('mine:x')); assert.ok(!C.isCustomId('mine:')); assert.ok(!C.isCustomId('my-side-of-the-mountain--jean-craighead-george'));
});

test('a finished added book counts like any other: its entered points show as available, never as earned', () => {
  const all = books.concat([{ book_id: 'mine:abc', ...mine() }]);
  const records = { 'mine:abc': C.entry({ id: 'mine:abc', status: 'finished', finishedDate: '2026-10-05' }) };
  const m = C.metrics(all, records, '2026');
  assert.equal(m.finished, 1); assert.equal(m.earned, 0); assert.equal(m.awaiting, 1); assert.equal(m.potential, 1); assert.equal(m.unknown, 0);
});

test('backups round-trip added books and do not count their records as unknown', () => {
  const records = { 'mine:abc': C.entry({ id: 'mine:abc', status: 'reading', note: 'Funny', updatedAt: '2026-10-02T00:00:00Z' }) };
  const file = JSON.parse(JSON.stringify(C.exportBackup(records, { goals: {} }, '2026-10-07T00:00:00Z', { 'mine:abc': mine() })));
  const out = C.parseBackup(file, books);
  assert.deepEqual(out.customBooks['mine:abc'], mine()); assert.equal(out.customCount, 1); assert.equal(out.unknown, 0);
  assert.equal(out.records['mine:abc'].note, 'Funny');
});

test('restoring keeps the newer copy of an added book and never removes local ones', () => {
  const incoming = C.parseBackup({ app: 'reading-room', version: 1, records: {}, customBooks: { 'mine:abc': mine({ title: 'Old title', updatedAt: '2026-09-01T00:00:00Z' }), 'mine:new': mine({ id: 'mine:new', title: 'New one' }) } }, books);
  const local = { 'mine:abc': mine({ title: 'Current title', updatedAt: '2026-10-03T00:00:00Z' }), 'mine:keep': mine({ id: 'mine:keep' }) };
  const plan = C.mergeBackup({}, {}, incoming, local);
  assert.equal(plan.customBooks['mine:abc'].title, 'Current title'); assert.equal(plan.customBooks['mine:new'].title, 'New one'); assert.ok(plan.customBooks['mine:keep']);
  assert.deepEqual(plan.changedBooks, ['mine:new']); assert.equal(plan.booksAdded, 1); assert.equal(plan.booksUpdated, 0);
});

test('backup validation rejects bad added books', () => {
  const payload = (id, b) => ({ app: 'reading-room', version: 1, records: {}, customBooks: { [id]: b } });
  assert.throws(() => C.parseBackup(payload('b1', { title: 'Not mine' }), books));
  assert.throws(() => C.parseBackup(payload('mine:a', { title: '   ' }), books));
  assert.throws(() => C.parseBackup(payload('mine:a', { title: 'T', ar_points: 'lots' }), books));
  assert.throws(() => C.parseBackup(payload('mine:a', { title: 'T', ar_level: -2 }), books));
  assert.throws(() => C.parseBackup(payload('mine:a', { title: 'T', author: 7 }), books));
  assert.throws(() => C.parseBackup({ app: 'reading-room', version: 1, records: {}, customBooks: [] }, books));
  assert.equal(C.parseBackup({ app: 'reading-room', version: 1, records: {} }, books).customCount, 0);
});
