/* Book Dude starts here: load what is saved on this device, draw the first screen, and get ready to work offline.
 * The README's "Where the code lives" lists what each file in docs/app does.
 *
 * Files import from each other freely, even in a circle (a tab redraws after a change, and the change
 * lives in another file). That works because, while the files load, they only define things; the work
 * starts below. A value computed while a file loads (outside any function) may only use util.js,
 * icons.js, and books.js, which never import the others. */

import { C, $ } from './util.js';
import { BOOKS, rebuildBooks } from './books.js';
import { state, db, loadUi } from './state.js';
import { main } from './page.js';
import { emptyState } from './cards.js';
import { newDudeLine, openStory } from './dude-talk.js';
import { applyAccent, startPets } from './more.js';
import { registerWorker } from './offline.js';
import { TABS, render } from './tabs.js';
import { listen } from './events.js';

async function start() {
  if (!C || !BOOKS.length) {
    main.innerHTML = emptyState('The book list did not load', 'Close Book Dude and open it again while online.');
    return;
  }
  loadUi();
  const loaded = await db.load();
  state.storage = loaded.ok ? 'ok' : 'memory';
  for (const r of loaded.records) if (r && C.safeId(r.id)) state.records[r.id] = C.entry(r);
  for (const b of loaded.books) if (b && C.isCustomId(b.id) && b.title) state.custom[b.id] = C.customBook(b);
  rebuildBooks(state.custom);
  const s = loaded.settings;
  if (s.goals && typeof s.goals === 'object') state.settings.goals = s.goals;
  if (typeof s.readerName === 'string') state.settings.readerName = s.readerName;
  if (typeof s.accent === 'string') state.settings.accent = s.accent;
  if (typeof s.lastExportAt === 'string') state.settings.lastExportAt = s.lastExportAt;
  state.settings.storySeen = s.storySeen === true;
  state.settings.pets = s.pets !== false;
  if (s.reward && typeof s.reward === 'object') state.settings.reward = C.reward(s.reward);
  applyAccent();
  if (!loaded.ok) {
    const warn = $('#storage-warning');
    warn.textContent = 'This browser is not letting the app save (Private Browsing can do this). Changes will be lost when you close it.';
    warn.hidden = false;
  }
  if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(p => { state.persisted = p; }).catch(() => {});
  const initial = location.hash.slice(1);
  state.tab = TABS.includes(initial) ? initial : 'explore';
  newDudeLine();
  render();
  // A brand-new reader meets the Dude first.
  const isNew = !Object.keys(state.records).length && !Object.keys(state.custom).length;
  if (!state.settings.storySeen && isNew) openStory();
  startPets();
  registerWorker();
}

listen();
start();
