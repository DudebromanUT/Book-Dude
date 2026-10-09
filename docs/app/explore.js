/* The Explore tab: search, filters, sorting, and the wall of books. */

import { $, $$, esc, plural, fold, collator, DUDE, fill } from './util.js';
import { icon } from './icons.js';
import { INTEREST, LEVELS, POINTS, SORTS, collLabel, AGES, GENRES, BOOKS, COLLECTIONS } from './books.js';
import { PAGE, DEFAULT_FILTERS, state, saveUi } from './state.js';
import { main, toast } from './page.js';
import { greeting, revealChip, OL_MIN_RATINGS, AMZ_MIN_RATINGS, browseTag, pointsTag, mineTag, ratingTag, flagText, card, row, emptyState } from './cards.js';
import { dudeHtml } from './dude-talk.js';
import { openBook } from './book.js';
import { offlinePill } from './offline.js';

function matches(b, words) {
  const f = state.filters;
  if (f.collection && !b._colls.includes(f.collection)) return false;
  if (f.level) {
    if (f.level === 'unknown') { if (b._level !== null) return false; }
    else { const band = LEVELS.find(l => l[0] === f.level); if (b._level === null || !band || !band[2](b._level)) return false; }
  }
  if (f.points) {
    if (f.points === 'unknown') { if (b._points !== null) return false; }
    else { const band = POINTS.find(p => p[0] === f.points); if (b._points === null || !band || !band[2](b._points)) return false; }
  }
  if (f.interest && (f.interest === 'unknown' ? b.ar_interest : b.ar_interest !== f.interest)) return false;
  if (f.ages && (f.ages === 'unknown' ? b.ages : b.ages !== f.ages)) return false;
  if (f.genre && (f.genre === 'unknown' ? b.genre : b.genre !== f.genre)) return false;
  if (f.hideFinished) { const r = state.records[b.book_id]; if (r && r.status === 'finished') return false; }
  for (const w of words) if (!b._text.includes(w)) return false;
  return true;
}

function compareBy(sort) {
  const byTitle = (a, b) => collator.compare(a._sortTitle, b._sortTitle);
  const nullsLast = (key, dir) => (a, b) => {
    if (a[key] === null && b[key] === null) return byTitle(a, b);
    if (a[key] === null) return 1;
    if (b[key] === null) return -1;
    return (a[key] - b[key]) * dir || byTitle(a, b);
  };
  switch (sort) {
    case 'award-old': return (a, b) => a._year - b._year || byTitle(a, b);
    case 'title': return byTitle;
    case 'author': return (a, b) => collator.compare(a._surname, b._surname) || collator.compare(a.author, b.author) || byTitle(a, b);
    case 'level-up': return nullsLast('_level', 1);
    case 'level-down': return nullsLast('_level', -1);
    case 'points-down': return nullsLast('_points', -1);
    case 'points-up': return nullsLast('_points', 1);
    case 'score': return nullsLast('_score', -1);
    case 'ol-rating': {
      // A book needs a few ratings to rank by its average; books with fewer come next, then books nobody rated.
      const tier = b => (b._ol === null ? 2 : b._olCount < OL_MIN_RATINGS ? 1 : 0);
      return (a, b) => tier(a) - tier(b) || (b._ol || 0) - (a._ol || 0) || b._olCount - a._olCount || byTitle(a, b);
    }
    case 'amz-rating': {
      // Amazon ratings come in tenths, so ties are common; the book more people rated goes first.
      const tier = b => (b._amz === null ? 2 : b._amzCount < AMZ_MIN_RATINGS ? 1 : 0);
      return (a, b) => tier(a) - tier(b) || (b._amz || 0) - (a._amz || 0) || b._amzCount - a._amzCount || byTitle(a, b);
    }
    case 'my-rating': {
      const mine = b => { const r = state.records[b.book_id]; return r && r.rating ? r.rating : 0; };
      return (a, b) => mine(b) - mine(a) || byTitle(a, b);
    }
    default: return (a, b) => b._year - a._year || byTitle(a, b);
  }
}

let lastResults = [];
// Title matches first, then author matches, then everything else (descriptions, awards).
function relevance(b, words, phrase) {
  if (b._titleText.startsWith(' ' + phrase)) return 0;
  if (words.every(w => b._titleText.includes(' ' + w))) return 1;
  if (words.every(w => b._titleText.includes(' ' + w) || b._authorText.includes(' ' + w))) return 2;
  return 3;
}

function filtered() {
  const words = fold(state.query).replace(/'/g, '').split(/[^a-z0-9]+/).filter(Boolean);
  const list = BOOKS.filter(b => matches(b, words));
  const compare = compareBy(state.sort);
  if (!words.length) return list.sort(compare);
  const phrase = words.join(' ');
  const tier = new Map(list.map(b => [b, relevance(b, words, phrase)]));
  return list.sort((a, b) => tier.get(a) - tier.get(b) || compare(a, b));
}

function activeFilterCount() {
  const f = state.filters;
  return ['level', 'points', 'interest', 'ages', 'genre'].filter(k => f[k]).length + (f.hideFinished ? 1 : 0);
}

function options(list, current, blank) {
  return '<option value="">' + blank + '</option>' + list.map(([v, label]) =>
    '<option value="' + esc(v) + '"' + (v === current ? ' selected' : '') + '>' + esc(label) + '</option>').join('');
}

function select(key, label, list, blank) {
  const value = key === 'sort' ? state.sort : state.filters[key];
  return '<label class="field"><span>' + label + '</span><select class="input" data-filter="' + key + '">' +
    (key === 'sort' ? Object.keys(SORTS).map(k => '<option value="' + k + '"' + (k === value ? ' selected' : '') + '>' + SORTS[k] + '</option>').join('') : options(list, value, blank)) +
    '</select></label>';
}

function installTip() {
  const iosBrowser = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!iosBrowser || navigator.standalone !== false || state.installTipDismissed) return '';
  return '<div class="notice accent" id="install-tip"><strong>Put Book Dude on your Home Screen</strong>' +
    'In Safari, tap ' + '<b>Share</b>, then <b>Add to Home Screen</b>. Open it from that icon so your notes stay in one place.' +
    '<div class="row-actions"><button type="button" class="btn small" data-act="dismiss-tip">Got it</button></div></div>';
}

export function renderExplore() {
  const f = state.filters;
  main.innerHTML =
    '<header class="view-head"><div><p class="kicker">' + esc(greeting()) + '</p><h1>Find your next book</h1></div><span id="offline-pill">' + offlinePill() + '</span></header>' +
    dudeHtml() +
    installTip() +
    '<div class="search" role="search">' +
      '<label class="search-box"><span class="visually-hidden">Search books</span>' + icon('search') +
        '<input id="q" class="input" type="search" placeholder="Title, author, or topic" value="' + esc(state.query) + '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></label>' +
      '<button type="button" class="btn filter-btn" data-act="toggle-filters" aria-expanded="' + state.filtersOpen + '" aria-controls="filters">' + icon('sliders') + '<span>Filters</span><span class="count" id="filter-count"></span></button>' +
    '</div>' +
    '<div class="chips" id="coll-chips" role="group" aria-label="Collections"></div>' +
    '<section id="filters" class="filters" aria-label="Filters"' + (state.filtersOpen ? '' : ' hidden') + '>' +
      '<div class="filters-grid">' +
        select('level', 'AR book level', LEVELS.map(l => [l[0], l[1]]).concat([['unknown', 'Not listed']]), 'Any level') +
        select('points', 'AR points', POINTS.map(p => [p[0], p[1]]).concat([['unknown', 'Not verified yet']]), 'Any points') +
        select('interest', 'Interest level', Object.keys(INTEREST).map(k => [k, INTEREST[k]]).concat([['unknown', 'Not listed']]), 'Any interest level') +
        select('ages', 'Age guidance', AGES.map(a => [a, a]).concat([['unknown', 'Not listed']]), 'Any ages') +
        select('genre', 'Genre', GENRES.map(g => [g, g]).concat([['unknown', 'Not listed']]), 'Any genre') +
        select('sort', 'Sort by') +
      '</div>' +
      '<div class="filters-foot"><label class="switch"><input type="checkbox" id="hide-finished"' + (f.hideFinished ? ' checked' : '') + '> Hide books I finished</label>' +
      '<button type="button" class="btn small ghost" data-act="reset-filters">Reset filters</button></div>' +
      '<p class="hint">Age and genre are only listed for some books, and are not verified.</p>' +
    '</section>' +
    '<div class="chips" id="active-filters" aria-label="Active filters"></div>' +
    '<div class="toolbar"><span class="count" id="result-count" aria-live="polite"></span><div class="actions">' +
      '<button type="button" class="btn small ghost" data-act="surprise" aria-label="' + esc(fill('Ask {cat} to pick a book')) + '"><img class="face" src="img/cat.jpg" alt="" width="26" height="26">' + esc(fill('Ask {cat}')) + '</button>' +
      '<div class="seg" role="group" aria-label="Layout">' +
        '<button type="button" data-act="layout" data-layout="grid" aria-label="Covers" aria-pressed="' + (state.layout === 'grid') + '">' + icon('grid') + '</button>' +
        '<button type="button" data-act="layout" data-layout="list" aria-label="List" aria-pressed="' + (state.layout === 'list') + '">' + icon('list') + '</button>' +
      '</div></div></div>' +
    '<div id="results"></div>';
  updateResults();
}

function listSub(b) {
  const r = state.records[b.book_id];
  const a = b._awards[0];
  return ratingTag(r) + browseTag(b) + pointsTag(b) + (a ? '<span>' + esc([a.award, a.category].filter(Boolean).join(' ') + ' · ' + b.year) + '</span>' : mineTag(b)) +
    (r && r.status ? '<span class="tag">' + esc(flagText(r)) + '</span>' : '');
}

function addBookCta() {
  const q = state.query.trim();
  return '<div class="add-cta"><div><b>Can’t find ' + (q ? '“' + esc(q) + '”' : 'a book') + '?</b><p>Add it yourself. It works just like the other books.</p></div>' +
    '<button type="button" class="btn small primary" data-act="add-book" data-title="' + esc(q) + '">' + icon('plus') + 'Add a book</button></div>';
}

function itemsHtml(list) {
  return list.map(b => (state.layout === 'grid' ? card(b) : row(b, listSub(b)))).join('');
}

export function updateResults() {
  const results = $('#results');
  if (!results) return;
  lastResults = filtered();
  const f = state.filters;
  if (f.collection && !COLLECTIONS.includes(f.collection)) { f.collection = ''; lastResults = filtered(); }
  const total = lastResults.length;

  const counts = {};
  for (const b of BOOKS) for (const c of b._colls) counts[c] = (counts[c] || 0) + 1;
  $('#coll-chips').innerHTML = '<button type="button" class="chip" data-act="collection" data-key="" aria-pressed="' + !f.collection + '">All <span class="n">' + BOOKS.length + '</span></button>' +
    COLLECTIONS.map(c => '<button type="button" class="chip" data-act="collection" data-key="' + esc(c) + '" aria-pressed="' + (f.collection === c) + '">' + esc(collLabel(c)) + ' <span class="n">' + counts[c] + '</span></button>').join('');
  revealChip($('#coll-chips'));

  const n = activeFilterCount();
  const countEl = $('#filter-count');
  countEl.textContent = n ? String(n) : '';
  countEl.hidden = !n;

  const chips = [];
  const label = (key, list) => { const hit = list.find(x => x[0] === f[key]); return hit ? hit[1] : f[key]; };
  if (f.level) chips.push(['level', 'Level: ' + (f.level === 'unknown' ? 'not listed' : label('level', LEVELS))]);
  if (f.points) chips.push(['points', 'Points: ' + (f.points === 'unknown' ? 'not verified' : label('points', POINTS))]);
  if (f.interest) chips.push(['interest', f.interest === 'unknown' ? 'Interest: not listed' : INTEREST[f.interest]]);
  if (f.ages) chips.push(['ages', 'Ages: ' + (f.ages === 'unknown' ? 'not listed' : f.ages)]);
  if (f.genre) chips.push(['genre', f.genre === 'unknown' ? 'Genre: not listed' : f.genre]);
  if (f.hideFinished) chips.push(['hideFinished', 'Hiding finished']);
  if (state.query.trim()) chips.push(['query', '“' + state.query.trim() + '”']);
  const active = $('#active-filters');
  active.innerHTML = chips.map(([k, text]) => '<button type="button" class="chip removable" data-act="clear-filter" data-key="' + k + '" aria-label="Remove filter ' + esc(text) + '">' + esc(text) + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button>').join('');
  active.hidden = !chips.length;

  $('#result-count').textContent = total === BOOKS.length ? plural(total, 'book') : plural(total, 'book') + ' found';

  if (!total) {
    const q = state.query.trim();
    results.innerHTML = q
      ? '<div class="empty compact"><span class="pet"><img class="face" src="img/dog.jpg" alt="" width="84" height="84"></span>' +
          '<h2>' + esc(DUDE.dog) + ' looked everywhere for “' + esc(q) + '”</h2><p>No luck. Is it a book that isn’t in the Reading Room? Add it yourself and track it like any other book.</p>' +
          '<div class="row-actions"><button type="button" class="btn primary" data-act="add-book" data-title="' + esc(q) + '">' + icon('plus') + 'Add it as my book</button>' +
          '<button type="button" class="btn" data-act="reset-all">Show all books</button></div></div>'
      : emptyState('No books match', 'Try loosening a filter.', '<button type="button" class="btn" data-act="reset-all">Show all books</button>') + addBookCta();
    return;
  }
  const shown = Math.min(state.limit, total);
  results.innerHTML = '<div class="' + (state.layout === 'grid' ? 'grid' : 'list') + '" id="items">' + itemsHtml(lastResults.slice(0, shown)) + '</div>' +
    (shown < total ? '<div class="more-row"><button type="button" class="btn" data-act="more" id="more-btn">Show more books</button></div>' : '') +
    addBookCta();
  watchMore();
}

let moreObserver = null;
function watchMore() {
  if (moreObserver) moreObserver.disconnect();
  const btn = $('#more-btn');
  if (!btn || !('IntersectionObserver' in window)) return;
  moreObserver = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) showMore(); }, { rootMargin: '600px 0px' });
  moreObserver.observe(btn);
}

function showMore() {
  const items = $('#items');
  if (!items) return;
  const from = Math.min(state.limit, lastResults.length);
  state.limit += PAGE;
  const to = Math.min(state.limit, lastResults.length);
  items.insertAdjacentHTML('beforeend', itemsHtml(lastResults.slice(from, to)));
  if (to >= lastResults.length) {
    const moreRow = $('#more-btn') && $('#more-btn').parentElement;
    if (moreRow) moreRow.remove();
    if (moreObserver) moreObserver.disconnect();
  }
}

function resetResults() {
  state.limit = PAGE;
  saveUi();
  updateResults();
}

let searchTimer = 0;

export const actions = {
  'toggle-filters': el => {
    state.filtersOpen = !state.filtersOpen;
    el.setAttribute('aria-expanded', String(state.filtersOpen));
    $('#filters').hidden = !state.filtersOpen;
  },
  collection: el => { state.filters.collection = el.dataset.key; resetResults(); },
  'clear-filter': el => {
    const k = el.dataset.key;
    if (k === 'query') { state.query = ''; $('#q').value = ''; }
    else state.filters[k] = DEFAULT_FILTERS[k];
    const control = $('[data-filter="' + k + '"]');
    if (control) control.value = '';
    if (k === 'hideFinished') $('#hide-finished').checked = false;
    resetResults();
  },
  'reset-filters': () => {
    state.filters = Object.assign({}, DEFAULT_FILTERS, { collection: state.filters.collection });
    $$('[data-filter]').forEach(s => { if (s.dataset.filter !== 'sort') s.value = ''; });
    $('#hide-finished').checked = false;
    resetResults();
  },
  'reset-all': () => { state.filters = Object.assign({}, DEFAULT_FILTERS); state.query = ''; state.limit = PAGE; saveUi(); renderExplore(); },
  layout: el => {
    state.layout = el.dataset.layout;
    $$('[data-act="layout"]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
    saveUi();
    updateResults();
  },
  more: showMore,
  // The cat naps on a random unfinished book from the current results.
  surprise: () => {
    const pool = lastResults.filter(b => { const r = state.records[b.book_id]; return !r || r.status !== 'finished'; });
    const list = pool.length ? pool : lastResults;
    if (!list.length) { toast(DUDE.cat + ' couldn’t find a book to nap on. Try fewer filters.'); return; }
    openBook(list[Math.floor(Math.random() * list.length)].book_id);
    toast(DUDE.cat + ' fell asleep on this one. That means it’s good.');
  },
  'dismiss-tip': () => { state.installTipDismissed = true; saveUi(); const tip = $('#install-tip'); if (tip) tip.remove(); }
};

export const inputs = {
  // Search waits for a short pause in typing.
  q: t => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = t.value; resetResults(); }, 140);
  }
};

export const changes = {
  // The filter and sort menus.
  filter: t => {
    if (t.dataset.filter === 'sort') state.sort = t.value;
    else state.filters[t.dataset.filter] = t.value;
    resetResults();
  },
  'hide-finished': t => {
    state.filters.hideFinished = t.checked;
    resetResults();
  }
};
