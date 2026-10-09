/* What the Dude says on screen: his speech bubble, the P.S. under it, and the About the Dude story.
 * The words themselves are in docs/dude.js. */

import { C, UI_KEY, $, esc, fmtNum, DUDE, fill, pick } from './util.js';
import { icon } from './icons.js';
import { BOOKS, BY_ID } from './books.js';
import { state, saveSetting } from './state.js';
import { main, sheet, sheetBar } from './page.js';
import { rewardLabel, allTimePoints } from './money.js';

// Every line the Dude can say: his one-liners plus jokes tied to books in the catalog.
const DUDE_KEY = UI_KEY + ':dude';
const DUDE_LINES = (() => {
  const out = DUDE.sayings.map(text => ({ text, title: '' }));
  for (const title of Object.keys(DUDE.bookJokes || {})) for (const text of DUDE.bookJokes[title]) out.push({ text, title });
  return out.length ? out : [{ text: 'Shoes off. Socks on. What are we reading?', title: '' }];
})();

function bookByTitle(title) {
  if (!title) return null;
  const t = C.fold(title);
  return BOOKS.find(b => !b._custom && C.fold(b.title) === t) || null;
}

// A shuffled deck, saved between launches, so she hears every line before any repeats.
// `recent` remembers the last few lines shown so a shelf joke can't come right back.
function loadDeck() {
  let deck = null;
  try { deck = JSON.parse(localStorage.getItem(DUDE_KEY) || 'null'); } catch (e) { deck = null; }
  const valid = deck && Array.isArray(deck.order) && deck.n === DUDE_LINES.length && deck.order.length === DUDE_LINES.length;
  if (!valid) deck = { n: DUDE_LINES.length, order: [], pos: 0, recent: [] };
  if (!Array.isArray(deck.recent)) deck.recent = [];
  if (deck.pos >= deck.order.length) {
    const last = deck.order[deck.order.length - 1];
    const order = DUDE_LINES.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.length > 1 && order[0] === last) [order[0], order[1]] = [order[1], order[0]];
    deck.order = order;
    deck.pos = 0;
  }
  return deck;
}

function showLine(deck, index) {
  deck.recent = deck.recent.filter(i => i !== index).concat(index).slice(-8);
  try { localStorage.setItem(DUDE_KEY, JSON.stringify(deck)); } catch (e) { /* storage blocked: the next launch reshuffles */ }
  return DUDE_LINES[index] || DUDE_LINES[0];
}

function nextDeckLine() {
  const deck = loadDeck();
  const index = deck.order[deck.pos];
  deck.pos += 1;
  return showLine(deck, index);
}

// Now and then the Dude jokes about a book already on one of her shelves (never one he just told).
function shelfJoke() {
  const deck = loadDeck();
  const mine = new Set(Object.keys(state.records).filter(id => state.records[id].status || state.records[id].favorite));
  const pool = DUDE_LINES.map((l, i) => i).filter(i => {
    const b = bookByTitle(DUDE_LINES[i].title);
    return b && mine.has(b.book_id) && !deck.recent.includes(i);
  });
  return pool.length ? showLine(deck, pick(pool)) : null;
}

// The P.S. under his line: book money waiting, a quiz to enter, nearly there, or the book she's reading.
export function psLine() {
  const ps = DUDE.ps || {};
  const has = key => Array.isArray(ps[key]) && ps[key].length;
  const cfg = C.reward(state.settings.reward);
  const total = allTimePoints();
  const money = C.rewardStatus(total, cfg);
  if (cfg.on && money.owed && has('owed')) return fill(pick(ps.owed), { prize: rewardLabel(cfg) });
  const mine = Object.keys(state.records).filter(id => BY_ID.has(id)).map(id => [BY_ID.get(id), state.records[id]]);
  const newest = (x, y) => (y[1].updatedAt || '').localeCompare(x[1].updatedAt || '');
  const quiz = mine.filter(([, r]) => r.status === 'finished' && r.earnedPoints === null && r.finishedDate && Date.now() - Date.parse(r.finishedDate) < 21 * 864e5).sort(newest)[0];
  if (quiz && has('quiz')) return fill(pick(ps.quiz), { title: quiz[0].title });
  if (cfg.on && total > 0 && money.toGo <= Math.max(5, cfg.every * 0.15) && has('close')) return fill(pick(ps.close), { toGo: fmtNum(money.toGo) });
  const reading = mine.filter(([, r]) => r.status === 'reading').sort(newest)[0];
  if (reading) {
    const p = reading[1].progress || 0;
    const key = p ? 'reading' : 'readingStart';
    if (has(key)) return fill(pick(ps[key]), { title: reading[0].title, p });
  }
  return '';
}

// A fresh line every time the app opens or comes back after a while.
export function newDudeLine() {
  state.dudeLine = (Math.random() < 0.3 && shelfJoke()) || nextDeckLine();
  state.dudePs = psLine();
}

export function dudeHtml() {
  if (!state.dudeLine) newDudeLine();
  const line = state.dudeLine;
  const text = fill(line.text);
  const b = bookByTitle(line.title);
  return '<section class="dude" aria-label="The Dude">' +
    '<button type="button" class="dude-avatar" data-act="story" aria-label="About the Dude"><img src="img/dude-face.jpg" alt="" width="60" height="60"></button>' +
    '<div class="bubble" aria-live="polite"><span class="who">The Dude says</span>' +
      '<button type="button" class="line" data-act="next-saying" title="Tap for another">' + esc(text) + '</button>' +
      (b ? '<button type="button" class="bubble-link" data-act="open" data-id="' + esc(b.book_id) + '">' + icon('book') + esc(b.title) + '</button>' : '') +
      (state.dudePs ? '<p class="ps">' + esc(state.dudePs) + '</p>' : '') +
    '</div></section>';
}

export function refreshBubble(pop) {
  const old = $('.dude', main);
  if (!old) return;
  old.outerHTML = dudeHtml();
  if (pop) { const line = $('.dude .line', main); if (line) line.classList.add('pop'); }
}

// Story text is escaped first; **double asterisks** then mark the Dude's vocabulary words in bold.
const rich = t => esc(fill(t)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
function crewFace(c) {
  const art = c.art && window.BookPets && window.BookPets.art[c.art];
  if (art) return '<span class="face art critter-' + esc(c.art) + '">' + art + '</span>';
  return '<span class="face' + (/\.webp$/.test(c.img) ? ' contain' : '') + '"><img src="' + esc(c.img) + '" alt="" width="64" height="64" loading="lazy"></span>';
}
function storyHtml() {
  const sections = DUDE.story.map(sec => {
    let html = sec.heading ? '<h2>' + esc(fill(sec.heading)) + '</h2>' : '';
    if (sec.paragraphs) html += sec.paragraphs.map(p => '<p>' + rich(p) + '</p>').join('');
    if (sec.chips) html += '<ul class="careers">' + sec.chips.map(c => '<li>' + esc(fill(c)) + '</li>').join('') + '</ul>';
    if (sec.words) html += '<ul class="careers words">' + sec.words.map(w => '<li>' + esc(fill(w)) + '</li>').join('') + '</ul>';
    if (sec.more) html += sec.more.map(p => '<p>' + rich(p) + '</p>').join('');
    if (sec.crew) {
      html += '<ul class="crew">' + sec.crew.map(c => '<li>' + crewFace(c) +
        '<div><b>' + esc(fill(c.name)) + '</b><span class="txt">' + rich(c.text) + '</span></div></li>').join('') + '</ul>';
    }
    if (sec.list) {
      const tag = sec.ordered ? 'ol' : 'ul';
      html += '<' + tag + ' class="rules">' + sec.list.map(li => '<li>' + rich(li) + '</li>').join('') + '</' + tag + '>';
    }
    return '<section>' + html + '</section>';
  }).join('');
  return sheetBar('About the Dude') + '<div class="sheet-body story">' +
    '<figure class="story-figure"><img src="img/dude.jpg" width="960" height="955" alt="The Dude in a worn leather armchair, surrounded by bookshelves, with a Welsh terrier and a tabby cat asleep on the rug"></figure>' +
    '<div class="story-title"><h1>About the Dude</h1><p>Scientist, explorer, war hero, jazz fanatic, former fairy</p></div>' +
    '<div class="story-body">' + sections + '<p class="signoff">' + esc(fill(DUDE.signoff)) + '</p></div>' +
    '<div class="row-actions"><button type="button" class="btn primary" data-act="close-sheet">Let’s read</button></div></div>';
}

export function openStory() {
  state.openId = null;
  sheet.innerHTML = storyHtml();
  if (!sheet.open) sheet.showModal();
  sheet.scrollTop = 0;
  if (!state.settings.storySeen) saveSetting('storySeen', true);
}

export const actions = {
  story: () => openStory(),
  'next-saying': () => {
    state.dudeLine = nextDeckLine();
    refreshBubble(true);
  }
};
