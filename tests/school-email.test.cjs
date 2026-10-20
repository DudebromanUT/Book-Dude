/* The school quiz emails: the Google script reads a Renaissance email, and the app checks and places each result. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const C = require('../docs/core.js');

// The Google script, loaded on its own (parseQuiz needs nothing from Google).
const script = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'scripts', 'school-email', 'Code.gs'), 'utf8'), script);

// Her first quiz email (October 19, 2026), as Gmail gives its plain text.
const EMAIL = `Renaissance

Accelerated Reader Reading Practice Quiz Result

Dear Adam,

Madeleine took an Accelerated Reader Reading Practice Quiz today. The results are below.

Title: Adventure in Grand Canyon National Park
Author: Aaron Johnson
Score: 100%
Points: 7 earned of 7
Book / Article level: 4.7

Visit http://www.arbookfind.com to help Madeleine discover the next great thing to read!

To learn more about your child's progress, log in to Renaissance Home Connect and enter your child's user name and password.`;

test('the script reads her quiz email', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(script.parseQuiz(EMAIL, '2026-10-19'))), {
    date: '2026-10-19', title: 'Adventure in Grand Canyon National Park', author: 'Aaron Johnson', points: 7, possible: 7, score: 100, level: 4.7
  });
});

test('the script also reads it with bold labels and each value on the next line', () => {
  const html = EMAIL.replace(/^(Title|Author|Score|Points|Book \/ Article level):\s*/gm, '*$1:*\n');
  const q = script.parseQuiz(html, '2026-10-19');
  assert.equal(q.title, 'Adventure in Grand Canyon National Park');
  assert.equal(q.points, 7);
  assert.equal(q.level, 4.7);
});

test('the script reads it when Gmail breaks a sentence across lines or uses no-break spaces', () => {
  const wrapped = EMAIL.replace('Madeleine took an Accelerated Reader Reading Practice Quiz', 'Madeleine took an Accelerated Reader Reading\nPractice Quiz')
    .replace('Accelerated Reader Reading Practice Quiz Result', 'Accelerated\u00a0Reader Reading Practice Quiz Result').replace(/\n/g, '\r\n');
  const q = script.parseQuiz(wrapped, '2026-10-19');
  assert.equal(q && q.title, 'Adventure in Grand Canyon National Park');
  assert.equal(q.points, 7);
});

test('the script takes only Reading Practice Quiz results, not other Renaissance emails', () => {
  const vocab = EMAIL.replace(/Reading Practice Quiz/g, 'Vocabulary Practice Quiz');
  assert.equal(script.parseQuiz(vocab, '2026-10-19'), null);
  const star = EMAIL.replace('Accelerated Reader Reading Practice Quiz Result', 'Star Reading Test Result')
    .replace('took an Accelerated Reader Reading Practice Quiz', 'took a Star Reading test');
  assert.equal(script.parseQuiz(star, '2026-10-19'), null);
  const noHeader = EMAIL.replace('Accelerated Reader Reading Practice Quiz Result', 'Renaissance update');
  assert.ok(script.parseQuiz(noHeader, '2026-10-19'), 'the sentence about her quiz carries the header words too');
});

test('the script skips anyone else, and emails that are not quiz results', () => {
  assert.equal(script.parseQuiz(EMAIL.replace(/Madeleine took/, 'Henry took'), '2026-10-19'), null);
  assert.equal(script.parseQuiz('Madeleine took an Accelerated Reader Reading Practice Quiz today.', '2026-10-19'), null);
  assert.equal(script.parseQuiz('', '2026-10-19'), null);
});

test('the app keeps only results that make sense, oldest first', () => {
  const good = { id: '19a2b', date: '2026-10-19', title: ' Adventure in Grand Canyon National Park ', author: 'Aaron Johnson', points: 7, possible: 7, score: 100, level: 4.7 };
  const list = C.schoolQuizzes({ quizzes: [
    good,
    { id: 'early', date: '2026-10-18', title: 'Frindle', points: 2, score: 90 },
    { id: 'bad id!', date: '2026-10-19', title: 'X', points: 1 },
    { id: 'nodate', title: 'X', points: 1 },
    { id: 'nopts', date: '2026-10-19', title: 'X' },
    { id: 'toomany', date: '2026-10-19', title: 'X', points: 5000 },
    'junk'
  ] });
  assert.deepEqual(list.map(q => q.id), ['early', '19a2b']);
  assert.deepEqual(list[1], { id: '19a2b', date: '2026-10-19', title: 'Adventure in Grand Canyon National Park', author: 'Aaron Johnson', points: 7, possible: 7, score: 100, level: 4.7 });
  assert.deepEqual(list[0], { id: 'early', date: '2026-10-18', title: 'Frindle', author: '', points: 2, possible: null, score: 90, level: null });
  assert.deepEqual(C.schoolQuizzes({ error: 'That link is not right.' }), []);
  assert.deepEqual(C.schoolQuizzes(null), []);
});

test('a quiz finds its book by title, then author, then the title before a subtitle', () => {
  const books = [
    { book_id: 'a', title: 'Holes', author: 'Louis Sachar' },
    { book_id: 'b', title: 'Holes', author: 'Someone Else' },
    { book_id: 'c', title: 'Adventure in Grand Canyon National Park', author: 'Aaron Johnson, Anne Zimanski' },
    { book_id: 'd', title: 'Kristy’s Great Idea: A Graphic Novel', author: 'Raina Telgemeier' }
  ];
  assert.equal(C.findBook(books, 'Adventure in Grand Canyon National Park', 'Aaron Johnson'), 'c');
  assert.equal(C.findBook(books, 'holes', 'Someone Else'), 'b');
  assert.equal(C.findBook(books, 'Holes', ''), 'a');
  assert.equal(C.findBook(books, "Kristy's Great Idea", 'Ann M. Martin'), 'd');
  assert.equal(C.findBook(books, 'A Book Not Here', 'Nobody'), '');
});

test('an added book keeps its title and author on one line with single spaces', () => {
  const b = C.customBook({ id: 'mine:x', title: ' The Last Kids on Earth  and the\nMidnight Blade ', author: 'Max  Brallier' });
  assert.equal(b.title, 'The Last Kids on Earth and the Midnight Blade');
  assert.equal(b.author, 'Max Brallier');
});
