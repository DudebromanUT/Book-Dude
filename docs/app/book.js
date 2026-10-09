/* A book's page (the sheet that slides up): details, shelf buttons, rating, notes, the AR quiz result,
 * and the library link. Its Share button is handled in share.js. */

import { C, $, $$, esc, today, fmtNum, plural, fold, fmtDay, safeUrl, DUDE, fill } from './util.js';
import { icon } from './icons.js';
import { STATUS, INTEREST, BY_ID } from './books.js';
import { state, rec, save } from './state.js';
import { sheet, toast, celebrate, sheetBar, showConfirm } from './page.js';
import { cover, levelTag, pointsTag, mineTag, ratingSays, dl } from './cards.js';
import { rewardLabel, allTimePoints } from './money.js';
import { customDetailsHtml } from './my-books.js';

export function levelMeaning(level) {
  const n = Number(level);
  if (!Number.isFinite(n)) return '';
  const grade = Math.floor(n), month = Math.round((n - grade) * 10);
  return 'reads like grade ' + grade + (month ? ', month ' + month : '');
}

function links(field, label) {
  return String(field || '').split(';').map(s => safeUrl(s.trim())).filter(Boolean).map((u, i, all) => {
    let host = '';
    try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (e) { host = 'source'; }
    const text = (label || host) + (all.length > 1 ? ' ' + (i + 1) : '');
    return '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + '</a>';
  }).join(', ');
}

// Salt Lake County Library catalog search for the book: the title (without a subtitle) and the
// author's last name, books and e-books only. She places the hold and logs in on the library's site.
const LIBRARY = 'https://catalog.slcolibrary.org/polaris/search/searchresults.aspx?ctx=1.1033.0.0.1&type=Keyword&by=KW&sort=RELEVANCE&limit=TOM=bks&query=&page=0&term=';
export function libraryUrl(b) {
  const names = String(b.author || '').split(/;| and | with |illustrated by|,/i)[0].trim().split(/\s+/).filter(w => !/^(jr|sr|ii|iii|iv)\.?$/i.test(w));
  return LIBRARY + encodeURIComponent((String(b.title).split(':')[0].trim() + ' ' + (names[names.length - 1] || '')).trim());
}

function statusButtons(r) {
  return Object.keys(STATUS).map(k => '<button type="button" class="status-btn" data-act="status" data-status="' + k + '" aria-pressed="' + (r.status === k) + '">' + icon(STATUS[k].icon) + STATUS[k].label + '</button>').join('');
}

function quizBox(b, r) {
  const worth = b._points !== null
    ? 'This book’s quiz is worth up to <b>' + fmtNum(b._points) + '</b> points' + (b._custom ? ' (the number you entered).' : '.')
    : b._custom ? 'You haven’t added this book’s AR points. Use <b>Edit book</b> below if you find them.' : 'This book’s AR points are not verified yet. Check with your school.';
  return '<div class="box quiz"><h3>AR quiz result</h3><p class="worth">' + worth + '</p>' +
    (r.earnedPoints !== null ? '<div class="earned"><span class="big">' + fmtNum(r.earnedPoints) + '</span><span><b>points earned</b><br><span class="hint">' + (r.quizDate ? 'Quiz taken ' + esc(fmtDay(r.quizDate)) : 'No quiz date, so this counts only in All time') + '</span></span></div>' : '') +
    '<form class="stack" data-form="quiz" novalidate><div class="two">' +
      '<label class="field"><span>Points earned</span><input id="earned-input" class="input" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 4.5" value="' + (r.earnedPoints !== null ? esc(r.earnedPoints) : '') + '"></label>' +
      '<label class="field"><span>Quiz date</span><input id="quiz-date" class="input" type="date" value="' + esc(r.quizDate) + '" max="' + today() + '"></label></div>' +
      '<p class="error" id="quiz-error" role="alert" hidden></p>' +
      '<div class="row-actions"><button type="submit" class="btn primary">' + (r.earnedPoints !== null ? 'Update result' : 'Save quiz result') + '</button>' +
      (r.earnedPoints !== null ? '<button type="button" class="btn ghost" data-act="clear-quiz">Clear result</button>' : '') + '</div></form>' +
    '<p class="hint">Copy the points from the quiz results screen. Leave this blank until the quiz is taken. A 0 still counts as a quiz result.</p></div>';
}

function shelfHtml(b) {
  const r = rec(b.book_id);
  let extra = '';
  if (r.status === 'reading' || r.status === 'paused') {
    const p = r.progress || 0;
    extra += '<div class="box"><h3>How far along?</h3><div class="range-row"><input type="range" id="progress" min="0" max="100" step="5" value="' + p + '" aria-label="Percent read"><output id="progress-out" for="progress">' + p + '%</output></div>' +
      '<label class="field"><span>Started on</span><input id="started-date" class="input" type="date" value="' + esc(r.startedDate) + '" max="' + today() + '"></label></div>';
  }
  if (r.status === 'finished') {
    extra += '<div class="box"><label class="field"><span>Finished on</span><input id="finished-date" class="input" type="date" value="' + esc(r.finishedDate) + '" max="' + today() + '"></label></div>';
  }
  if (r.status === 'finished' || r.earnedPoints !== null) extra += quizBox(b, r);
  return '<div class="shelf-head"><h3 class="label">My shelf</h3><button type="button" class="fav-btn" data-act="fav" aria-pressed="' + r.favorite + '">' + icon('heart') + '<span>Favorite</span></button></div>' +
    '<div class="status-grid" role="group" aria-label="Shelf">' + statusButtons(r) + '</div>' +
    '<div class="rating-row"><span class="label" id="rating-label">My rating</span>' +
      '<div class="stars" role="group" aria-labelledby="rating-label">' +
      [1, 2, 3, 4, 5].map(n => '<button type="button" data-act="rate" data-n="' + n + '" aria-label="' + n + ' star' + (n > 1 ? 's' : '') + '" aria-pressed="' + (r.rating !== null && n <= r.rating) + '">' + icon('star') + '</button>').join('') + '</div>' +
      '<span class="rating-says" id="rating-says" aria-live="polite">' + esc(r.rating ? ratingSays(r.rating) : 'Tap a star to rate it. Tap it again to clear.') + '</span></div>' +
    (extra ? '<div class="stack">' + extra + '</div>' : '');
}

function sheetHtml(b) {
  const r = rec(b.book_id);
  const hero = '<section class="book-hero">' + cover(b) + '<div><h1>' + esc(b.title) + '</h1>' + (b.author ? '<p class="by">' + esc(b.author) + '</p>' : '') +
    '<div class="tags">' + levelTag(b) + pointsTag(b) + mineTag(b) + (b.ar_interest ? '<span class="tag">' + esc(b.ar_interest) + '</span>' : '') + (b.ages ? '<span class="tag">Ages ' + esc(b.ages) + '</span>' : '') + '</div>' +
    '<div class="hero-actions"><button type="button" class="btn small" data-act="share-book">' + icon('share') + 'Share</button>' +
      '<a class="btn small library-btn" href="' + esc(libraryUrl(b)) + '" target="_blank" rel="noopener noreferrer">' + icon('book') + 'Find it at the library</a></div>' +
    '<p class="hint library-hint">Salt Lake County Library. Tap Place hold, then log in with your library card.</p></div></section>';
  const personal = '<section id="shelf-box" class="box" aria-label="My shelf">' + shelfHtml(b) + '</section>' +
    '<section class="box"><h3><label for="note">My notes</label></h3><textarea id="note" class="input" placeholder="Favorite parts, characters, words to remember, what you thought…">' + esc(r.note) + '</textarea>' +
    '<p class="hint" id="note-status">Private to this device. Saves as you type.</p></section>';
  if (b._custom) return sheetBar(b.title) + '<div class="sheet-body">' + hero + personal + customDetailsHtml(b) + '</div>';

  const facts = [];
  facts.push(['Year', esc(b.year) + (b.year_type === 'Publication' ? ' (published)' : ' (award year)')]);
  facts.push(['Ages', b.ages ? esc(b.ages) : '<span class="hint">Not listed</span>']);
  facts.push(['Genre', b.genre ? esc(b.genre) : '<span class="hint">Not listed</span>']);
  if (b.amz_asin) facts.push(['Amazon rating', (b._amz !== null ? '<b>' + esc(b._amz.toFixed(1)) + '</b> out of 5 <span class="hint">(' + plural(b._amzCount, 'rating') + ')</span>' : '<span class="hint">No ratings yet</span>') + ' · ' + links('https://www.amazon.com/dp/' + b.amz_asin, 'See it')]);
  if (b.ol_work) facts.push(['Open Library rating', (b._ol !== null ? '<b>' + esc(b._ol.toFixed(2)) + '</b> out of 5 <span class="hint">(' + plural(b._olCount, 'reader rating') + ')</span>' : '<span class="hint">No ratings yet</span>') + ' · ' + links('https://openlibrary.org/works/' + b.ol_work, 'See it')]);
  if (b.score) facts.push(['Original list score', esc(b.score) + ' out of 5 <span class="hint">(came with the book list; source not confirmed)</span>']);
  if (b.isbn13) facts.push(['ISBN', esc(b.isbn13) + (b.isbn10 ? ' <span class="hint">(' + esc(b.isbn10) + ')</span>' : '')]);
  if (b.cover) facts.push(['Cover', /^OL\d+[MW]$/.test(b.cover_ol || '') ? links('https://openlibrary.org/' + (b.cover_ol.endsWith('W') ? 'works/' : 'books/') + b.cover_ol, 'Open Library') : 'Open Library']);
  const descSource = b.description_source ? ' · ' + links(b.description_source) : '';

  const ar = [];
  if (b.ar_level) ar.push(['Book level', esc(b.ar_level) + ' <span class="hint">(' + levelMeaning(b.ar_level) + ')</span>']);
  ar.push(['AR points', b._points !== null ? '<b>' + fmtNum(b._points) + '</b>' : 'Not verified yet <span class="hint">(blank does not mean zero)</span>']);
  if (b.ar_interest) ar.push(['Interest level', esc(INTEREST[b.ar_interest] || b.ar_interest)]);
  if (b.ar_quiz) ar.push(['Quiz number', esc(b.ar_quiz)]);
  if (b.ar_record_title && fold(b.ar_record_title) !== fold(b.title)) ar.push(['Listed as', esc(b.ar_record_title)]);
  if (b.ar_source) ar.push(['Source', links(b.ar_source, b.ar_source_type) + (b.ar_checked ? ' <span class="hint">· checked ' + esc(fmtDay(b.ar_checked)) + '</span>' : '')]);
  if (b.ar_research_source) ar.push(['Research', links(b.ar_research_source, 'AR BookFinder')]);
  ar.push(['Status', esc(b.ar_status || 'Not yet verified')]);

  return sheetBar(b.title) +
    '<div class="sheet-body">' + hero + personal +
      '<section class="box"><h3>About this book</h3><p class="desc">' + esc(b.description) + '</p>' +
        '<p class="small-print">' + esc(b.description_kind || 'Summary') + descSource + (b.description_status ? ' · ' + esc(b.description_status) : '') + '</p>' +
        (b.heads_up ? '<div class="heads-up">' + icon('alert') + '<div><b>Heads up:</b> ' + esc(b.heads_up) + '</div></div>' : '') +
        dl(facts) + '</section>' +
      '<section class="box"><h3>Accelerated Reader</h3>' + dl(ar) + (b.ar_notes ? '<p class="small-print">' + esc(b.ar_notes) + '</p>' : '') +
        (b.ar_edition && fold(b.ar_edition) !== fold(b.title) && b.ar_edition !== b.ar_record_title && !/^Matched title variant/.test(b.ar_edition) ? '<p class="small-print">Edition: ' + esc(b.ar_edition) + '</p>' : '') + '</section>' +
      '<section class="box"><h3>Awards</h3><div class="awards">' + b._awards.map(a => '<span class="tag">' + esc([a.year, a.award, a.category].filter(Boolean).join(' · ')) + '</span>').join('') + '</div>' +
        (b.selection_source ? '<p class="small-print">Award source: ' + links(b.selection_source) + '</p>' : '') +
        (b.catalog_notes ? '<p class="small-print">' + esc(b.catalog_notes) + '</p>' : '') + '</section>' +
    '</div>';
}

export function openBook(id) {
  const b = BY_ID.get(id);
  if (!b) return;
  state.openId = id;
  sheet.innerHTML = sheetHtml(b);
  if (!sheet.open) sheet.showModal();
  sheet.scrollTop = 0;
}

function refreshShelf() {
  const b = BY_ID.get(state.openId);
  const box = $('#shelf-box', sheet);
  if (b && box) box.innerHTML = shelfHtml(b);
}

let noteTimer = 0;
let notePending = null;
export function flushNote() {
  clearTimeout(noteTimer);
  if (!notePending) return Promise.resolve();
  const { id, text } = notePending;
  notePending = null;
  if (rec(id).note === text) return Promise.resolve();
  return save(id, { note: text }).then(() => {
    const status = $('#note-status', sheet);
    if (status && state.openId === id) status.textContent = 'Saved.';
  });
}

async function setStatus(status) {
  const id = state.openId;
  const r = rec(id);
  const next = r.status === status ? '' : status;
  const patch = { status: next };
  if (next === 'reading' && !r.startedDate) patch.startedDate = today();
  if (next === 'finished') {
    if (!r.finishedDate) patch.finishedDate = today();
    patch.progress = 100;
  }
  await save(id, patch);
  refreshShelf();
  if (next === 'finished') {
    celebrate();
    toast(r.earnedPoints === null ? 'You finished it! (The Dude is doing a happy sock dance.) After the AR quiz, add your points below.' : 'You finished it! (Happy sock dance.)');
  }
}

async function saveQuiz(form) {
  const id = state.openId;
  const b = BY_ID.get(id);
  const err = $('#quiz-error', form);
  const rawPts = $('#earned-input', form).value.trim().replace(',', '.');
  const date = $('#quiz-date', form).value;
  if (rawPts === '') {
    err.textContent = 'Type the points from the quiz, like 4 or 3.5. To remove a result, use Clear result.';
    err.hidden = false;
    return;
  }
  if (!/^\d+(\.\d+)?$/.test(rawPts) || Number(rawPts) > 999) {
    err.textContent = 'Points must be a number, like 4 or 3.5.';
    err.hidden = false;
    return;
  }
  if (date && !C.day(date)) {
    err.textContent = 'That quiz date is not a real date.';
    err.hidden = false;
    return;
  }
  const pts = Number(rawPts);
  const r = rec(id);
  const wasBlank = r.earnedPoints === null;
  const before = allTimePoints();
  await save(id, { earnedPoints: pts, quizDate: date || r.quizDate || today() });
  refreshShelf();
  const after = allTimePoints();
  const cfg = C.reward(state.settings.reward);
  const money = cfg.on && C.rewardStatus(after, cfg).earned > C.rewardStatus(before, cfg).earned;
  const unlocked = DUDE.files.filter(f => before < f.at && after >= f.at);
  const over = b && b._points !== null && pts > b._points;
  let message = over ? 'Saved. That is more than this book’s listed ' + fmtNum(b._points) + ' points, so double-check it.'
    : wasBlank ? 'Quiz result saved: ' + plural(pts, 'point') + '!' + (pts > 0 ? ' ' + DUDE.dog + ' wants a high five.' : '') : 'Quiz result updated.';
  if (money) message = fill(DUDE.jarFull || 'Book money! You earned {prize}.', { prize: rewardLabel(cfg) }) + (unlocked.length ? ' Plus a new Secret File!' : '');
  else if (unlocked.length) message = 'Secret File unlocked: ' + fill(unlocked[unlocked.length - 1].title) + '! Find it on the Progress tab.';
  if ((pts > 0 && wasBlank) || money || unlocked.length) celebrate();
  toast(message);
}

export const actions = {
  open: el => openBook(el.dataset.id),
  status: el => setStatus(el.dataset.status),
  fav: async el => {
    const r = await save(state.openId, { favorite: !rec(state.openId).favorite });
    el.setAttribute('aria-pressed', String(r.favorite));
    if (r.favorite) toast('Added to your favorites.');
  },
  rate: async el => {
    const n = Number(el.dataset.n);
    const r = await save(state.openId, { rating: rec(state.openId).rating === n ? null : n });
    $$('[data-act="rate"]', sheet).forEach(s => s.setAttribute('aria-pressed', String(r.rating !== null && Number(s.dataset.n) <= r.rating)));
    const says = $('#rating-says', sheet);
    if (says) says.textContent = r.rating ? ratingSays(r.rating) : 'Rating cleared.';
    if (r.rating === 5) celebrate();
  },
  'clear-quiz': () => {
    showConfirm('Clear this quiz result?', '<p>The book stays Finished. It will show as awaiting a quiz entry again.</p>', 'Clear result', async () => {
      await save(state.openId, { earnedPoints: null, quizDate: '' });
      refreshShelf();
      toast('Quiz result cleared.');
    });
  }
};

export const inputs = {
  note: t => {
    notePending = { id: state.openId, text: t.value };
    const status = $('#note-status', sheet);
    if (status) status.textContent = 'Saving…';
    clearTimeout(noteTimer);
    noteTimer = setTimeout(flushNote, 600);
  },
  progress: t => { $('#progress-out', sheet).textContent = t.value + '%'; }
};

export const changes = {
  progress: t => save(state.openId, { progress: Number(t.value) }),
  'started-date': t => save(state.openId, { startedDate: C.day(t.value) }),
  'finished-date': t => save(state.openId, { finishedDate: C.day(t.value) })
};

export const submits = { quiz: saveQuiz };
