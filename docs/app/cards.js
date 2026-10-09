/* Pieces every screen uses to show books: covers, tags, cards, list rows, and empty states. */

import { $, $$, esc, fmtNum, plural, DUDE, fill } from './util.js';
import { icon } from './icons.js';
import { STATUS } from './books.js';
import { state } from './state.js';

export function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return state.settings.readerName ? part + ', ' + state.settings.readerName : part;
}

// Horizontal chip rows can hide the selected chip off-screen on a phone.
export function revealChip(row) {
  const sel = row && $('[aria-pressed="true"]', row);
  if (!sel || row.scrollWidth <= row.clientWidth) return;
  const left = sel.offsetLeft - row.offsetLeft;
  if (left < row.scrollLeft || left + sel.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollLeft = Math.max(0, left - 16);
}

// Sizes and bar lengths are applied after rendering because the page's security policy blocks inline styles.
export function applySizes(root) {
  $$('[data-w]', root).forEach(el => { el.style.width = Math.max(0, Math.min(100, Number(el.dataset.w))) + '%'; });
  $$('[data-h]', root).forEach(el => { el.style.height = Math.max(0, Math.min(100, Number(el.dataset.h))) + '%'; });
}

// Real cover art sits on top of the homemade cover, which shows through if the picture can't load.
// Picture books keep their real shape (height of the 280-wide picture for each).
const COVER_SHAPES = { tall: 420, short: 350, square: 280, wide: 210 };
export function cover(b, size) {
  const seal = b._seal && size !== 'thumb' ? '<span class="seal ' + b._seal[0] + '">' + b._seal[1] + '</span>' : '';
  const initial = esc(b._sortTitle.charAt(0).toUpperCase());
  // Catalog books use the covers that ship with the app; books she added can have her own photo.
  const src = b._custom ? (b.photo || '') : (b.cover ? 'covers/' + b.cover : '');
  const shape = !b._custom && COVER_SHAPES[b.cover_shape] ? b.cover_shape : 'tall';
  const art = src ? '<img class="cover-art" src="' + esc(src) + '" alt="" width="280" height="' + COVER_SHAPES[shape] + '" loading="lazy" decoding="async">' : '';
  return '<span class="cover p' + b._pal + ' m' + b._motif + (size ? ' ' + size : '') + (art ? ' has-art' + (shape !== 'tall' ? ' shape-' + shape : '') : '') + '" aria-hidden="true">' +
    '<span class="cover-title">' + esc(b.title) + '</span><span class="cover-initial">' + initial + '</span>' +
    '<span class="cover-author">' + esc(b.author) + '</span>' + art + seal + '</span>';
}

export function levelTag(b) {
  return b._level !== null ? '<span class="tag" title="AR book level">Lvl ' + esc(b.ar_level) + '</span>' : '';
}
// The score that came with the original book list (source never confirmed). Cards show it only while sorting by it.
function scoreTag(b) {
  return b._score !== null ? '<span class="tag score" title="Score from the original book list, out of 5">List ' + esc(b.score) + '</span>' : '';
}
// Sorting by Open Library rating shows that rating on the cards instead.
export const OL_MIN_RATINGS = 5;
function olTag(b) {
  return b._ol !== null ? '<span class="tag score" title="Open Library rating, out of 5, from ' + plural(b._olCount, 'reader') + '">OL ' + b._ol.toFixed(1) + ' (' + fmtNum(b._olCount) + ')</span>' : '';
}
export const AMZ_MIN_RATINGS = 20;
const compact = n => (n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));
function amzTag(b) {
  return b._amz !== null ? '<span class="tag score" title="Amazon rating, out of 5, from ' + plural(b._amzCount, 'rating') + '">Amazon ' + b._amz.toFixed(1) + ' (' + compact(b._amzCount) + ')</span>' : '';
}
// Book cards and lists show the Amazon rating (the most ratings by far); sorting by another score shows that score instead.
// The AR level is on the book's page. Books she added have no ratings, so they keep the level she entered.
export const browseTag = b => (b._custom ? levelTag(b) : state.sort === 'ol-rating' ? olTag(b) : state.sort === 'score' ? scoreTag(b) : amzTag(b));
export function pointsTag(b) {
  if (b._points !== null) return '<span class="tag pts">' + fmtNum(b._points) + (b._points === 1 ? ' pt' : ' pts') + '</span>';
  return '<span class="tag unknown">' + (b._custom ? 'pts not added' : 'pts unverified') + '</span>';
}
export const mineTag = b => (b._custom ? '<span class="tag mine">Added by you</span>' : '');
const RATING_SAYS = ['Fig wouldn’t even nap on it.', 'Meh. Maple would chew it.', 'Pretty good.', 'Loved it!', 'Dude-level amazing!'];
export const ratingSays = n => fill((DUDE.ratings && DUDE.ratings[n - 1]) || RATING_SAYS[n - 1] || '');
export const ratingTag = r => (r && r.rating ? '<span class="tag my-rating" title="My rating">★ ' + r.rating + '</span>' : '');

export function flagText(r) {
  if (!r || !r.status) return '';
  if (r.status === 'reading' && r.progress) return 'Reading ' + r.progress + '%';
  return STATUS[r.status].flag;
}

function bookLabel(b, r) {
  const bits = [b.title + (b.author ? ' by ' + b.author : '')];
  const a = b._awards[0];
  if (a) bits.push([a.award, a.category, a.year].filter(Boolean).join(' '));
  if (b._custom) bits.push('added by you');
  if (b._amz !== null) bits.push('Amazon rating ' + b._amz.toFixed(1) + ' out of 5 from ' + plural(b._amzCount, 'rating'));
  if (b._level !== null) bits.push('book level ' + b.ar_level);
  bits.push(b._points !== null ? plural(b._points, 'AR point') : b._custom ? 'no AR points added' : 'AR points not verified');
  if (r && r.status) bits.push(flagText(r));
  if (r && r.favorite) bits.push('favorite');
  if (r && r.rating) bits.push('you rated it ' + r.rating + ' out of 5');
  return bits.join('. ');
}

export function card(b) {
  const r = state.records[b.book_id];
  const flag = r && r.status ? '<span class="flag ' + r.status + '">' + esc(flagText(r)) + '</span>' : '';
  const heart = r && r.favorite ? '<span class="heart">' + icon('heart') + '</span>' : '';
  return '<button type="button" class="card" data-act="open" data-id="' + esc(b.book_id) + '" aria-label="' + esc(bookLabel(b, r)) + '">' +
    '<span class="cover-slot"><span class="cover-wrap">' + cover(b) + flag + heart + '</span></span>' +
    '<span class="card-meta" aria-hidden="true"><span class="t">' + esc(b.title) + '</span><span class="a">' + esc(b.author) + '</span>' +
    '<span class="tags">' + ratingTag(r) + browseTag(b) + pointsTag(b) + '</span></span></button>';
}

export function row(b, sub) {
  const r = state.records[b.book_id];
  return '<button type="button" class="row" data-act="open" data-id="' + esc(b.book_id) + '" aria-label="' + esc(bookLabel(b, r)) + '">' +
    cover(b, 'thumb') +
    '<span aria-hidden="true"><span class="t">' + esc(b.title) + '</span><span class="a">' + esc(b.author) + '</span>' +
    (sub ? '<span class="sub">' + sub + '</span>' : '') + '</span>' + icon('chev', 'chev') + '</button>';
}

export function emptyState(title, text, action) {
  return '<div class="empty">' + icon('book') + '<h2>' + title + '</h2><p>' + text + '</p>' + (action || '') + '</div>';
}

export const dl = rows => '<dl class="facts">' + rows.map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('') + '</dl>';
