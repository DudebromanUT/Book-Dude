/* The Progress tab: points and goals, the book money jar, Secret Files, the chart, and collections finished. */

import { C, $, esc, today, thisYear, fmtNum, plural, fmtDay, localDay } from './util.js';
import { icon } from './icons.js';
import { collLabel, BOOKS, BY_ID, COLLECTIONS } from './books.js';
import { state, saveUi, saveSetting } from './state.js';
import { main, toast } from './page.js';
import { greeting, revealChip, applySizes, row } from './cards.js';
import { allTimePoints, jarHtml, filesHtml } from './money.js';
import { quizLine } from './shelves.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ring(earned, goal) {
  const r = 50, c = 2 * Math.PI * r;
  const frac = goal ? Math.min(1, earned / goal) : 0;
  return '<div class="ring" role="img" aria-label="' + esc(fmtNum(earned) + ' of ' + fmtNum(goal) + ' point goal') + '"><svg viewBox="0 0 120 120" aria-hidden="true">' +
    '<circle class="track" cx="60" cy="60" r="' + r + '"/>' +
    '<circle class="fill" cx="60" cy="60" r="' + r + '" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + (c * (1 - frac)).toFixed(2) + '"/></svg>' +
    '<div class="center" aria-hidden="true"><span class="big">' + fmtNum(earned) + '</span><small>of ' + fmtNum(goal) + ' pts</small></div></div>';
}

function heroHtml(m, year) {
  const goal = year ? state.settings.goals[year] : 0;
  const editing = state.editingGoal === year;
  const form = '<form class="goal-form" data-form="goal"><label class="visually-hidden" for="goal-input">Points goal for ' + year + '</label>' +
    '<input id="goal-input" class="input" type="text" inputmode="decimal" value="' + (goal || '') + '" placeholder="e.g. 50" autocomplete="off">' +
    '<button type="submit" class="btn small">Save goal</button>' + (goal ? '<button type="button" class="btn small" data-act="remove-goal">Remove</button>' : '') + '</form>';
  if (!year) {
    return '<section class="hero hero-plain"><div><h2>Points earned, all time</h2><div class="big">' + fmtNum(m.earned) + '</div>' +
      '<p class="goal-line">From ' + plural(m.quizzes, 'quiz', 'quizzes') + ' recorded</p></div></section>';
  }
  if (!goal) {
    return '<section class="hero hero-plain"><div><h2>Points earned in ' + year + '</h2><div class="big">' + fmtNum(m.earned) + '</div>' +
      '<p class="goal-line">From ' + plural(m.quizzes, 'quiz', 'quizzes') + ' this year</p>' +
      (editing ? form : '<button type="button" class="btn small" data-act="edit-goal">Set a points goal</button>') + '</div></section>';
  }
  const left = Math.max(0, goal - m.earned);
  return '<section class="hero">' + ring(m.earned, goal) + '<div><h2>Points earned in ' + year + '</h2>' +
    '<p class="goal-line">' + (left ? fmtNum(Math.round(left * 100) / 100) + ' to go to reach your goal of ' + fmtNum(goal) + '.' : 'Goal reached! You earned ' + fmtNum(m.earned) + ' of ' + fmtNum(goal) + ' points.') + '</p>' +
    (editing ? form : '<button type="button" class="btn small" data-act="edit-goal">Change goal</button>') + '</div></section>';
}

function chartHtml(m, year) {
  let cols;
  if (year) cols = MONTHS.map((label, i) => ({ label, value: m.months[i], books: m.monthsFinished[i] }));
  else {
    const ys = Object.keys(m.years).sort().slice(-8);
    if (!ys.length) return '';
    cols = ys.map(y => ({ label: y, value: m.years[y].earned, books: m.years[y].finished }));
  }
  const max = Math.max(1, ...cols.map(c => c.value));
  const summary = cols.filter(c => c.value || c.books).map(c => c.label + ': ' + fmtNum(c.value) + ' points, ' + plural(c.books, 'book') + ' finished').join('; ') || 'No points or finished books yet.';
  return '<section class="panel"><h2 class="section-title">' + (year ? 'Month by month' : 'Year by year') + '</h2>' +
    '<div class="chart" role="img" aria-label="' + esc(summary) + '" data-cols="' + cols.length + '">' + cols.map(c =>
      '<div class="col" aria-hidden="true"><div class="barv' + (c.value ? '' : ' zero') + '" data-h="' + (c.value / max * 100).toFixed(1) + '">' + (c.value ? '<b>' + fmtNum(c.value) + '</b>' : '') + '</div>' +
      '<div class="m">' + c.label + '<em>' + (c.books || '') + '</em></div></div>').join('') + '</div>' +
    '<div class="legend"><span><i></i>AR points earned (by quiz date)</span><span><i class="gold"></i>Gold number: books finished</span></div></section>';
}

export function renderProgress() {
  const years = C.periods(state.records, today());
  if (state.period !== 'all' && !years.includes(state.period)) state.period = thisYear();
  const year = state.period === 'all' ? '' : state.period;
  const m = C.metrics(BOOKS, state.records, year);
  const when = year ? 'in ' + year : 'all time';

  const awaitingList = Object.keys(state.records).map(id => [BY_ID.get(id), state.records[id]])
    .filter(([b, r]) => b && r.status === 'finished' && r.earnedPoints === null && (!year || (r.finishedDate || '').slice(0, 4) === year))
    .sort((x, y) => (y[1].finishedDate || '').localeCompare(x[1].finishedDate || ''));

  const finishedAll = new Set(Object.keys(state.records).filter(id => state.records[id].status === 'finished'));
  const colls = COLLECTIONS.map(c => {
    const books = BOOKS.filter(b => b._colls.includes(c));
    const done = books.filter(b => finishedAll.has(b.book_id)).length;
    return '<div class="coll"><div class="coll-top"><span>' + esc(collLabel(c)) + '</span><span>' + done + ' / ' + books.length + '</span></div>' +
      '<span class="bar gold"><i data-w="' + (done / books.length * 100).toFixed(1) + '"></i></span></div>';
  }).join('');

  const hasRecords = Object.keys(state.custom).length > 0 || Object.keys(state.records).some(id => !C.isBlank(state.records[id]));
  const lastExport = state.settings.lastExportAt ? Date.parse(state.settings.lastExportAt) : 0;
  const backupNudge = hasRecords && (!lastExport || Date.now() - lastExport > 30 * 864e5)
    ? '<div class="notice" role="note"><strong>Time for a backup</strong>Your journal lives only on this device. ' + (lastExport ? 'Your last backup was ' + esc(fmtDay(localDay(state.settings.lastExportAt))) + '.' : 'You have not saved a backup yet.') +
      '<div class="row-actions"><button type="button" class="btn small primary" data-act="export">' + icon('download') + 'Save a backup</button></div></div>'
    : '';

  const total = allTimePoints();
  main.innerHTML =
    '<header class="view-head"><div><p class="kicker">' + esc(greeting()) + '</p><h1>My progress</h1></div></header>' +
    jarHtml(total) +
    '<div class="chips" role="group" aria-label="Time period">' + years.map(y =>
      '<button type="button" class="chip" data-act="period" data-period="' + y + '" aria-pressed="' + (state.period === y) + '">' + y + '</button>').join('') +
      '<button type="button" class="chip" data-act="period" data-period="all" aria-pressed="' + (state.period === 'all') + '">All time</button></div>' +
    '<div class="stack">' +
      heroHtml(m, year) +
      '<div class="tiles">' +
        '<div class="tile gold"><span class="num">' + m.finished + '</span><span class="lbl">' + (m.finished === 1 ? 'Book' : 'Books') + ' finished</span><span class="sub">' + esc(when) + '</span></div>' +
        '<button type="button" class="tile accent" data-act="shelf-go" data-shelf="reading"><span class="num">' + m.reading + '</span><span class="lbl">Reading now</span><span class="sub">Right now</span></button>' +
        '<div class="tile coral"><span class="num">' + m.awaiting + '</span><span class="lbl">Awaiting quiz entry</span><span class="sub">' +
          (m.awaiting ? (m.potential ? 'Up to ' + fmtNum(m.potential) + ' pts available' : 'No listed points') + (m.unknown ? ' · ' + m.unknown + ' unknown' : '') : 'All caught up') + '</span></div>' +
        '<div class="tile plum"><span class="num">' + m.quizzes + '</span><span class="lbl">' + (m.quizzes === 1 ? 'Quiz' : 'Quizzes') + ' recorded</span><span class="sub">' + esc(when) + '</span></div>' +
      '</div>' +
      (year && m.undated ? '<p class="notice soft" role="note">' + plural(m.undated, 'finished book has', 'finished books have') + ' no finish date, so ' + (m.undated === 1 ? 'it counts' : 'they count') + ' only in All time.</p>' : '') +
      backupNudge +
      filesHtml(total) +
      chartHtml(m, year) +
      (awaitingList.length ? '<section><h2 class="section-title">Ready for a quiz <small>' + awaitingList.length + '</small></h2><div class="list">' +
        awaitingList.map(([b, r]) => row(b, '<span>' + (r.finishedDate ? 'Finished ' + esc(fmtDay(r.finishedDate)) : 'Finished') + '</span>' + quizLine(b, r))).join('') + '</div></section>' : '') +
      '<section class="panel"><h2 class="section-title">Collections <small>books finished, all time</small></h2><div class="collections">' + colls + '</div></section>' +
    '</div>';
  applySizes(main);
  revealChip($('.chips', main));
  // Fill the jar after it is on screen so it pours in.
  const fillEl = $('.jar-fill', main);
  if (fillEl) requestAnimationFrame(() => requestAnimationFrame(() => { fillEl.style.transform = 'translateY(' + ((1 - Number(fillEl.dataset.fill)) * 104).toFixed(1) + 'px)'; }));
  const chart = $('.chart', main);
  if (chart) chart.style.setProperty('--cols', chart.dataset.cols);
}

export const actions = {
  period: el => { state.period = el.dataset.period; state.editingGoal = null; saveUi(); renderProgress(); },
  'edit-goal': () => { state.editingGoal = state.period; renderProgress(); const input = $('#goal-input'); if (input) input.focus(); },
  'remove-goal': async () => {
    const goals = Object.assign({}, state.settings.goals);
    delete goals[state.period];
    state.editingGoal = null;
    await saveSetting('goals', goals);
    renderProgress();
  }
};

export const submits = {
  goal: async () => {
    const raw = $('#goal-input').value.trim().replace(',', '.');
    if (raw && (!/^\d+(\.\d+)?$/.test(raw) || Number(raw) > 100000)) { toast('A goal must be a number, like 50.'); return; }
    const goals = Object.assign({}, state.settings.goals);
    if (Number(raw) > 0) goals[state.period] = Number(raw); else delete goals[state.period];
    state.editingGoal = null;
    await saveSetting('goals', goals);
    renderProgress();
  }
};
