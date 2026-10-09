/* The My Shelves tab: Reading, Want to read, Finished, Paused, Favorites, and My books. */

import { C, $, esc, fmtNum, plural, collator, fmtDay } from './util.js';
import { icon } from './icons.js';
import { STATUS, BY_ID } from './books.js';
import { state, saveUi, rec } from './state.js';
import { main } from './page.js';
import { greeting, revealChip, applySizes, browseTag, pointsTag, ratingTag, row, emptyState } from './cards.js';
import { goTab } from './tabs.js';

const SHELVES = [
  ['reading', 'Reading'], ['want', 'Want to read'], ['finished', 'Finished'], ['paused', 'Paused'], ['favorites', 'Favorites'], ['mine', 'My books']
];

function shelfBooks(key) {
  const out = [];
  if (key === 'mine') {
    for (const id of Object.keys(state.custom)) if (BY_ID.has(id)) out.push([BY_ID.get(id), rec(id)]);
    return out.sort((x, y) => String(state.custom[y[0].book_id].createdAt).localeCompare(String(state.custom[x[0].book_id].createdAt)));
  }
  for (const id of Object.keys(state.records)) {
    const r = state.records[id];
    const b = BY_ID.get(id);
    if (!b) continue;
    if (key === 'favorites' ? r.favorite : r.status === key) out.push([b, r]);
  }
  const time = r => r.updatedAt || '';
  if (key === 'finished') out.sort((x, y) => (y[1].finishedDate || '').localeCompare(x[1].finishedDate || '') || time(y[1]).localeCompare(time(x[1])));
  else if (key === 'favorites') out.sort((x, y) => collator.compare(x[0]._sortTitle, y[0]._sortTitle));
  else out.sort((x, y) => time(y[1]).localeCompare(time(x[1])));
  return out;
}

export function quizLine(b, r) {
  if (r.earnedPoints !== null) return '<span class="tag pts">' + plural(r.earnedPoints, 'pt') + ' earned</span>';
  return '<span class="tag unknown">Quiz not entered' + (b._points !== null ? ' · worth up to ' + fmtNum(b._points) : '') + '</span>';
}

function shelfSub(b, r, key) {
  if (key === 'reading' || (key === 'favorites' && r.status === 'reading')) {
    const p = r.progress || 0;
    return '<span class="bar"><i data-w="' + p + '"></i></span><span>' + p + '%</span>';
  }
  if (r.status === 'finished') return '<span>' + (r.finishedDate ? 'Finished ' + esc(fmtDay(r.finishedDate)) : 'Finished (no date)') + '</span>' + ratingTag(r) + quizLine(b, r);
  if (r.status === 'paused') return '<span>Paused' + (r.progress ? ' at ' + r.progress + '%' : '') + '</span>';
  if ((key === 'favorites' || key === 'mine') && r.status) return '<span class="tag">' + STATUS[r.status].label + '</span>' + browseTag(b) + pointsTag(b);
  return browseTag(b) + pointsTag(b);
}

export function renderShelves() {
  const counts = {};
  for (const [key] of SHELVES) counts[key] = shelfBooks(key).length;
  const key = state.shelf;
  const list = shelfBooks(key);
  const missing = Object.keys(state.records).filter(id => !BY_ID.has(id) && !C.isBlank(state.records[id])).length;
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
    '<div class="list">' + (list.length ? list.map(([b, r]) => row(b, shelfSub(b, r, key))).join('') :
      emptyState(empties[key][0], empties[key][1], key === 'mine' ? addBtn : '<button type="button" class="btn primary" data-act="tab" data-tab="explore">Explore books</button>')) + '</div>' +
    (missing ? '<p class="notice soft" role="note">' + plural(missing, 'saved record is', 'saved records are') + ' for books no longer in the catalog. They stay in your totals and backups.</p>' : '');
  applySizes(main);
  revealChip($('.chips', main));
}

export const actions = {
  shelf: el => { state.shelf = el.dataset.shelf; saveUi(); renderShelves(); },
  'shelf-go': el => { state.shelf = el.dataset.shelf; saveUi(); goTab('shelves'); }
};
