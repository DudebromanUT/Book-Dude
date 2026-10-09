/* The book catalog: everything known about each book, ready for searching, sorting, and drawing,
 * plus the books she added herself. */

import { C, fold, collator, hash } from './util.js';

const CATALOG = Array.isArray(window.READING_CATALOG) ? window.READING_CATALOG : [];

export const STATUS = {
  want: { label: 'Want to read', flag: 'Want', icon: 'bookmark' },
  reading: { label: 'Reading', flag: 'Reading', icon: 'book' },
  finished: { label: 'Finished', flag: 'Finished', icon: 'check' },
  paused: { label: 'Paused', flag: 'Paused', icon: 'pause' }
};
const COLLECTION_ORDER = ['Newbery Medal', 'Newbery Honor', 'Beehive', 'Classics', 'Pulitzer', 'Printz', 'Carnegie', 'National Book Award'];
const COLLECTION_LABEL = { Beehive: 'Beehive (Utah)' };
export const INTEREST = {
  LG: 'Lower grades (K–3)',
  MG: 'Middle grades (4–8)',
  'MG+': 'Middle grades plus (6 and up)',
  UG: 'Upper grades (9–12)'
};
export const LEVELS = [
  ['lt3', 'Below 3.0', l => l < 3], ['3', '3.0 – 3.9', l => l >= 3 && l < 4], ['4', '4.0 – 4.9', l => l >= 4 && l < 5],
  ['5', '5.0 – 5.9', l => l >= 5 && l < 6], ['6', '6.0 – 6.9', l => l >= 6 && l < 7], ['7', '7.0 and up', l => l >= 7]
];
export const POINTS = [
  ['known', 'Any listed points', () => true], ['lt3', 'Under 3', p => p < 3], ['3', '3 – 5.9', p => p >= 3 && p < 6],
  ['6', '6 – 9.9', p => p >= 6 && p < 10], ['10', '10 – 14.9', p => p >= 10 && p < 15], ['15', '15 and up', p => p >= 15]
];
export const SORTS = {
  'award-new': 'Newest first',
  'award-old': 'Oldest first',
  title: 'Title A–Z',
  author: 'Author A–Z',
  'level-up': 'Easiest first (AR level)',
  'level-down': 'Hardest first (AR level)',
  'points-down': 'Most AR points',
  'points-up': 'Fewest AR points',
  'amz-rating': 'Highest Amazon rating',
  'ol-rating': 'Highest Open Library rating',
  score: 'Highest original list score',
  'my-rating': 'My ratings (best first)'
};

function parseAwards(b) {
  const list = String(b.award_history || '').split(';').map(s => s.trim()).filter(Boolean).map(s => {
    const [year, award, category] = s.split(/\s+—\s+/);
    return { year: year || '', award: award || '', category: category || '' };
  }).filter(a => a.award);
  return list.length ? list : [{ year: b.year, award: b.award, category: b.category }];
}
const collectionOf = a => (a.award === 'Newbery' ? 'Newbery ' + a.category : a.award);
export const collLabel = c => COLLECTION_LABEL[c] || c;

function sealFor(b) {
  const cat = b.category;
  switch (b.award) {
    case 'Newbery': return cat === 'Medal' ? ['', 'Newbery<br>Medal'] : ['silver', 'Newbery<br>Honor'];
    case 'Beehive': return ['honey', '<span>Bee&shy;hive</span>'];
    case 'Classics': return ['classic', 'Classic'];
    case 'Pulitzer': return ['bronze', 'Pulitzer'];
    case 'Printz': return ['ruby', 'Printz<br>' + (cat === 'Honor' ? 'Honor' : 'Award')];
    case 'Carnegie': return ['', 'Carnegie<br>Medal'];
    case 'National Book Award': return ['bronze', 'National<br>Book<br>Award'];
    default: return null;
  }
}

function surname(author) {
  const first = String(author || '').split(/,|;| and | with /)[0].trim().replace(/\s+(Jr\.?|Sr\.?|II|III)$/, '');
  const parts = first.split(/\s+/);
  return parts[parts.length - 1] || '';
}
const sortTitle = t => String(t).replace(/^(the|a|an)\s+/i, '');
const number = v => (v !== '' && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : null);

const MY_BOOKS = 'My books';

function prepare(raw, custom) {
  const h = hash(raw.book_id);
  const awards = custom ? [] : parseAwards(raw);
  return Object.assign({}, raw, {
    _custom: custom,
    _awards: awards,
    _colls: custom ? [MY_BOOKS] : Array.from(new Set(awards.map(collectionOf))),
    _level: number(raw.ar_level),
    _points: C.knownPoints(raw),
    _score: number(raw.score),
    _ol: number(raw.ol_rating),
    _olCount: parseInt(raw.ol_ratings, 10) || 0,
    _amz: number(raw.amz_rating),
    _amzCount: parseInt(raw.amz_ratings, 10) || 0,
    // Added books sort by the year they were added.
    _year: custom ? (parseInt(String(raw.createdAt).slice(0, 4), 10) || 0) : (parseInt(raw.year, 10) || 0),
    _pal: h % 12,
    _motif: (h >>> 8) % 6,
    _seal: custom ? ['mine', 'My<br>book'] : sealFor(raw),
    _sortTitle: sortTitle(raw.title),
    _surname: surname(raw.author),
    _titleText: ' ' + fold(raw.title).replace(/[^a-z0-9]+/g, ' ').trim() + ' ',
    _authorText: ' ' + fold(raw.author).replace(/[^a-z0-9]+/g, ' ').trim() + ' ',
    _text: fold([raw.title, raw.author, raw.description, raw.award_history, raw.genre, raw.ar_record_title].join(' '))
  });
}

export const CATALOG_BOOKS = CATALOG.map(raw => prepare(raw, false));
export const AGES = Array.from(new Set(CATALOG_BOOKS.map(b => b.ages).filter(Boolean))).sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || collator.compare(a, b));
export const GENRES = Array.from(new Set(CATALOG_BOOKS.map(b => b.genre).filter(Boolean))).sort(collator.compare);
// The catalog plus books the reader added; rebuilt whenever she adds, edits, or deletes one.
export let BOOKS = CATALOG_BOOKS;
export let BY_ID = new Map();
export let COLLECTIONS = [];

export function rebuildBooks(custom) {
  const mine = Object.keys(custom).map(id => {
    const c = custom[id];
    return prepare({ book_id: id, title: c.title, author: c.author, description: c.description, ar_level: c.ar_level, ar_points: c.ar_points, photo: c.photo || '', year: '', award: '', category: '', createdAt: c.createdAt }, true);
  });
  BOOKS = CATALOG_BOOKS.concat(mine);
  BY_ID = new Map(BOOKS.map(b => [b.book_id, b]));
  COLLECTIONS = COLLECTION_ORDER.filter(c => BOOKS.some(b => b._colls.includes(c)))
    .concat(Array.from(new Set(CATALOG_BOOKS.flatMap(b => b._colls))).filter(c => !COLLECTION_ORDER.includes(c)).sort())
    .concat(mine.length ? [MY_BOOKS] : []);
}
