/* Switching tabs (Explore, My Shelves, Progress, More) and redrawing the one on screen. */

import { $, $$, reducedMotion } from './util.js';
import { state } from './state.js';
import { closeSheet } from './page.js';
import { psLine, refreshBubble } from './dude-talk.js';
import { renderExplore, updateResults } from './explore.js';
import { renderShelves } from './shelves.js';
import { renderProgress } from './progress.js';
import { renderMore } from './more.js';

export const TABS = ['explore', 'shelves', 'progress', 'more'];

function setTabs() {
  $$('.tab').forEach(t => {
    if (t.dataset.tab === state.tab) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });
}

export function render(keepScroll) {
  const y = window.scrollY;
  setTabs();
  if (state.tab === 'explore') {
    if (keepScroll && $('#results')) {
      updateResults();
      // Her books changed, so the P.S. may have news.
      state.dudePs = psLine();
      refreshBubble();
    } else renderExplore();
  } else if (state.tab === 'shelves') renderShelves();
  else if (state.tab === 'progress') renderProgress();
  else renderMore();
  if (keepScroll) window.scrollTo(0, y);
}

export function route() {
  const next = location.hash.slice(1);
  const tab = TABS.includes(next) ? next : 'explore';
  if (tab === state.tab && $('#main > :not(.loading)')) return;
  state.scroll[state.tab] = window.scrollY;
  state.tab = tab;
  state.editingGoal = null;
  render();
  window.scrollTo(0, state.scroll[tab] || 0);
}

export function goTab(tab) {
  if (tab === state.tab) { window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }); return; }
  if (location.hash !== '#' + tab) location.hash = tab;
  else route();
}

export const actions = {
  tab: el => { closeSheet(); goTab(el.dataset.tab); }
};
