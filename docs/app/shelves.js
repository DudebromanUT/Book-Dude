/* The My Shelves tab: Reading, Want to read, Finished, Paused, Favorites, and Read Books. Finished and Read Books
 * can be sorted by AR points (newest or most) or title. */

import { C, $, esc, fmtNum, plural, collator, fmtDay } from './util.js';
import { icon } from './icons.js';
import { STATUS, BY_ID } from './books.js';
import { state, saveUi, rec } from './state.js';
import { main } from './page.js';
import { greeting, revealChip, applySizes, browseTag, pointsTag, extraTag, ratingTag, row, emptyState } from './cards.js';
import { goTab } from './tabs.js';

const SHELVES = [
  ['reading', 'Reading'], ['want', 'Want to read'], ['finished', 'Finished'], ['paused', 'Paused'], ['favorites', 'Favorites'], ['mine', 'Read Books']
];

// Finished and Read Books can be sorted: AR points newest first (by quiz date), most points, or title. Books without
// points follow, newest finished (or added) first.
const SORTS = [['points-new', 'AR points, newest first'], ['points-most', 'Most points'], ['title', 'Title A to Z']];
const SORTED = ['finished', 'mine'];
const hasPoints = r => r.earnedPoints !== null && r.earnedPoints !== undefined;
function sortShelf(out, fallback) {
  const by = state.shelfSort;
  if (by === 'title') return out.sort((x, y) => collator.compare(x[0]._sortTitle, y[0]._sortTitle));
  return out.sort((x, y) => {
    const px = hasPoints(x[1]), py = hasPoints(y[1]);
    if (px !== py) return px ? -1 : 1;
    if (px && by === 'points-most' && y[1].earnedPoints !== x[1].earnedPoints) return y[1].earnedPoints - x[1].earnedPoints;
    if (px) { const d = (y[1].quizDate || '').localeCompare(x[1].quizDate || ''); if (d) return d; }
    return fallback(x, y);
  });
}

export function shelfBooks(key) {
  const out = [];
  if (key === 'mine') {
    for (const id of Object.keys(state.custom)) if (BY_ID.has(id)) out.push([BY_ID.get(id), rec(id)]);
    return sortShelf(out, (x, y) => String(state.custom[y[0].book_id].createdAt).localeCompare(String(state.custom[x[0].book_id].createdAt)));
  }
  for (const id of Object.keys(state.records)) {
    const r = state.records[id];
    const b = BY_ID.get(id);
    if (!b) continue;
    if (key === 'favorites' ? r.favorite : r.status === key) out.push([b, r]);
  }
  const time = r => r.updatedAt || '';
  if (key === 'finished') sortShelf(out, (x, y) => (y[1].finishedDate || '').localeCompare(x[1].finishedDate || '') || time(y[1]).localeCompare(time(x[1])));
  else if (key === 'favorites') out.sort((x, y) => collator.compare(x[0]._sortTitle, y[0]._sortTitle));
  else out.sort((x, y) => time(y[1]).localeCompare(time(x[1])));
  return out;
}

// Her reading history only knows the month, saved as the 1st, so it shows as "Finished Oct 2026".
const MONTH = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
export function finishedWhen(r) {
  if (!r.finishedDate) return 'Finished (no date)';
  return 'Finished ' + esc(r.quizScore !== null && r.earnedPoints === null && r.finishedDate.endsWith('-01') ? MONTH.format(new Date(r.finishedDate + 'T00:00:00Z')) : fmtDay(r.finishedDate));
}

export function quizLine(b, r) {
  if (r.earnedPoints === null && r.quizScore !== null) return '<span class="tag pts">Quiz ' + fmtNum(r.quizScore) + '%</span>';
  if (r.earnedPoints !== null) return '<span class="tag pts">' + plural(r.earnedPoints, 'pt') + ' earned</span>';
  return '<span class="tag unknown">Quiz not entered' + (b._points !== null ? ' · worth up to ' + fmtNum(b._points) : '') + '</span>';
}

function shelfSub(b, r, key) {
  if (key === 'reading' || (key === 'favorites' && r.status === 'reading')) {
    const p = r.progress || 0;
    return '<span class="bar"><i data-w="' + p + '"></i></span><span>' + p + '%</span>';
  }
  if (r.status === 'finished') return '<span>' + finishedWhen(r) + '</span>' + ratingTag(r) + quizLine(b, r);
  if (r.status === 'paused') return '<span>Paused' + (r.progress ? ' at ' + r.progress + '%' : '') + '</span>';
  if ((key === 'favorites' || key === 'mine') && r.status) return '<span class="tag">' + STATUS[r.status].label + '</span>' + browseTag(b) + pointsTag(b);
  return browseTag(b) + pointsTag(b) + extraTag(b);
}

export function renderShelves() {
  const counts = {};
  for (const [key] of SHELVES) counts[key] = shelfBooks(key).length;
  const key = state.shelf;
  const list = shelfBooks(key);
  const missing = Object.keys(state.records).filter(id => !BY_ID.has(id) && !C.isExam(id) && !C.isBlank(state.records[id])).length;
  const empties = {
    reading: ['Nothing on the go', 'Open any book and tap <b>Reading</b> to keep your place here.'],
    want: ['Your wish list is empty', 'Tap <b>Want to read</b> on any book to save it for later.'],
    finished: ['No finished books yet', 'When you finish a book, tap <b>Finished</b>. It will show up here.'],
    paused: ['Nothing paused', 'Books you set aside for now will wait for you here.'],
    favorites: ['No favorites yet', 'Tap the heart on a book you love.'],
    mine: ['Add your own books', 'Reading something that isn’t in the Reading Room? Add it here and track it like any other book: shelves, notes, and quiz points.']
  };
  const addBtn = '<button type="button" class="btn primary" data-act="add-book">' + icon('plus') + 'Add a book</button>';
  main.innerHTML =
    '<header class="view-head"><div><p class="kicker">' + esc(greeting()) + '</p><h1>My shelves</h1></div>' +
      '<button type="button" class="btn small" data-act="add-book">' + icon('plus') + 'Add a book</button></header>' +
    '<div class="chips" role="group" aria-label="Shelves">' + SHELVES.map(([k, label]) =>
      '<button type="button" class="chip" data-act="shelf" data-shelf="' + k + '" aria-pressed="' + (k === key) + '">' + label + ' <span class="n">' + counts[k] + '</span></button>').join('') + '</div>' +
    (SORTED.includes(key) && list.length > 1 ? '<label class="field shelf-sort"><span>Sort</span><select id="shelf-sort" class="input">' +
      SORTS.map(([v, l]) => '<option value="' + v + '"' + (v === state.shelfSort ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' : '') +
    '<div class="list">' + (list.length ? list.map(([b, r]) => row(b, shelfSub(b, r, key))).join('') :
      emptyState(empties[key][0], empties[key][1], key === 'mine' ? addBtn : '<button type="button" class="btn primary" data-act="tab" data-tab="explore">Explore books</button>')) + '</div>' +
    (list.length ? '<div class="row-actions share-list"><button type="button" class="btn small" data-act="share-shelf">' + icon('share') + 'Share this list</button></div>' : '') +
    (missing ? '<p class="notice soft" role="note">' + plural(missing, 'saved record is', 'saved records are') + ' for books no longer in the catalog. They stay in your totals and backups.</p>' : '');
  applySizes(main);
  revealChip($('.chips', main));
}

export const changes = {
  'shelf-sort': t => { state.shelfSort = t.value; saveUi(); renderShelves(); }
};

export const actions = {
  shelf: el => { state.shelf = el.dataset.shelf; saveUi(); renderShelves(); },
  'shelf-go': el => { state.shelf = el.dataset.shelf; saveUi(); goTab('shelves'); }
};
