/* Everything the page listens for: taps, typing, changes, form submits, the sheet closing, and the app going to the background.
 * Each tab and feature keeps its handlers next to the HTML it draws, in four lists it exports:
 *   actions  taps on anything with data-act="name"
 *   inputs   typing in a field, by the field's id
 *   changes  a changed field, checkbox, or file picker, by its id (the filter and sort menus use "filter")
 *   submits  a form sent with Enter or its button, by its data-form name
 * This file gathers those lists and sends each event to the right handler. */

import { $ } from './util.js';
import { state } from './state.js';
import { sheet, confirmBox, closeSheet } from './page.js';
import { newDudeLine, refreshBubble } from './dude-talk.js';
import { flushNote } from './book.js';
import { render, route, goTab } from './tabs.js';
import * as page from './page.js';
import * as tabs from './tabs.js';
import * as explore from './explore.js';
import * as shelves from './shelves.js';
import * as progress from './progress.js';
import * as more from './more.js';
import * as book from './book.js';
import * as myBooks from './my-books.js';
import * as dudeTalk from './dude-talk.js';
import * as money from './money.js';
import * as backup from './backup.js';
import * as offline from './offline.js';

const FEATURES = [page, tabs, explore, shelves, progress, more, book, myBooks, dudeTalk, money, backup, offline];

// One list per kind of event. A name used twice would quietly lose one handler, so that is reported.
function gather(kind) {
  const out = Object.create(null);
  for (const feature of FEATURES) {
    for (const [name, handler] of Object.entries(feature[kind] || {})) {
      if (out[name]) console.error('Book Dude: two handlers for ' + kind + ' "' + name + '"');
      out[name] = handler;
    }
  }
  return out;
}

// Coming back to the app after a while counts as opening it: the Dude has something new to say.
let hiddenAt = 0;

export function listen() {
  const actions = gather('actions');
  const inputs = gather('inputs');
  const changes = gather('changes');
  const submits = gather('submits');

  // A cover picture that can't load (offline before it was saved) steps aside for the homemade cover.
  document.addEventListener('error', e => {
    const img = e.target;
    if (!img || !img.classList || !img.classList.contains('cover-art')) return;
    if (img.parentNode) img.parentNode.classList.remove('has-art', 'shape-short', 'shape-square', 'shape-wide');
    img.remove();
  }, true);

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || !actions[el.dataset.act]) return;
    if (el.tagName === 'A') e.preventDefault();
    actions[el.dataset.act](el, e);
  });
  $('.brand').addEventListener('click', e => { e.preventDefault(); goTab('explore'); });

  document.addEventListener('input', e => {
    const t = e.target;
    if (inputs[t.id]) inputs[t.id](t);
    const form = t.closest && t.closest('form[data-form]');
    const error = form && $('.error', form);
    if (error && !error.hidden) error.hidden = true;
  });

  document.addEventListener('change', e => {
    const t = e.target;
    const key = t.dataset.filter ? 'filter' : t.id;
    if (changes[key]) changes[key](t);
  });

  document.addEventListener('submit', e => {
    const form = e.target;
    if (!submits[form.dataset.form]) return;
    e.preventDefault();
    submits[form.dataset.form](form);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'q') e.target.blur();
  });

  sheet.addEventListener('close', () => {
    flushNote();
    state.openId = null;
    if (state.dirty) { state.dirty = false; render(true); }
  });
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
  confirmBox.addEventListener('click', e => { if (e.target === confirmBox) confirmBox.close(); });

  window.addEventListener('hashchange', route);
  window.addEventListener('pagehide', flushNote);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { flushNote(); hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 30000) {
      newDudeLine();
      if (state.tab === 'explore' && !sheet.open) refreshBubble(true);
    }
    hiddenAt = 0;
  });
}
