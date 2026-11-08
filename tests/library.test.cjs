/* Every Library article and test follows library/GUIDE.md: safe ids, the right size for its points, refs that name a
 * real section, four different choices, and one open think-about-it question. */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), { pathToFileURL } = require('node:url');
const load = () => import(pathToFileURL(path.join(__dirname, '..', 'docs', 'app', 'library.js')).href);

const words = a => [a.intro, a.closing, ...a.sections.flatMap(s => [...(s.text || []), ...(s.more || [])])].flat()
  .filter(Boolean).join(' ').split(/\s+/).filter(Boolean).length;

test('every article has a unique id, a voice, and 4 to 12 sections of 1 to 3 paragraphs', async () => {
  const { ARTICLES } = await load();
  const ids = ARTICLES.map(a => a.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const a of ARTICLES) {
    assert.match(a.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, a.id);
    assert.ok(['plain', 'cobol'].includes(a.voice), a.id);
    assert.ok(a.title && a.intro && a.closing, a.id);
    assert.ok(a.sections.length >= 4 && a.sections.length <= 12, a.id + ': ' + a.sections.length + ' sections');
    for (const s of a.sections) assert.ok(s.title && s.text.length >= 1 && s.text.length <= 3, a.id + ': ' + s.title);
    assert.doesNotMatch(JSON.stringify(a), /Maddy|Madeleine|https?:\/\//, a.id);
    const n = words(a);
    assert.ok(n >= 300 && n <= 1500, a.id + ': ' + n + ' words');
  }
});

test('every test matches its length, and every question is well formed', async () => {
  const { ARTICLES, RETIRED } = await load();
  for (const a of ARTICLES.filter(x => x.test)) {
    const t = a.test, long = words(a) > 700;
    assert.deepEqual([t.outOf, t.pass, t.points], long ? [15, 12, 4] : [10, 8, 2], a.id);
    assert.equal(t.questions.length, t.outOf, a.id);
    assert.ok(!RETIRED['exam:' + a.id], a.id + ' reuses a retired test id');
    const titles = new Set(a.sections.map(s => s.title));
    const qs = new Set();
    for (const q of t.questions) {
      assert.ok(titles.has(q.ref), a.id + ': no section "' + q.ref + '"');
      assert.equal(q.choices.length, 4, q.q);
      assert.equal(new Set(q.choices).size, 4, q.q);
      assert.doesNotMatch(q.choices.join('|'), /all of the above|none of the above/i, q.q);
      assert.ok(!qs.has(q.q), 'repeated: ' + q.q);
      qs.add(q.q);
    }
    assert.ok(typeof t.think === 'string' && t.think.length > 20 && t.think.endsWith('?'), a.id + ': think question');
  }
});

test('the COBOL history file stays in the Library with no test, and its old test is retired', async () => {
  const { ARTICLES, RETIRED } = await load();
  const h = ARTICLES.find(a => a.id === 'cobol-history');
  assert.ok(h && !h.test);
  assert.equal(RETIRED['exam:cobol'], 'COBOL history test');
  const g = ARTICLES.find(a => a.id === 'guard-dog-wise-owl-dopamine');
  assert.equal(g.test.points, 4);
});
