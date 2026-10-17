/* Book Dude starts here: load what is saved on this device, draw the first screen, and get ready to work offline.
 * The README's "Where the code lives" lists what each file in docs/app does.
 *
 * Files import from each other freely, even in a circle (a tab redraws after a change, and the change
 * lives in another file). That works because, while the files load, they only define things; the work
 * starts below. A value computed while a file loads (outside any function) may only use util.js,
 * icons.js, and books.js, which never import the others. */

import { C, $, today } from './util.js';
import { BOOKS, BY_ID, rebuildBooks } from './books.js';
import { state, db, loadUi, saveSetting } from './state.js';
import { main, toast } from './page.js';
import { emptyState } from './cards.js';
import { newDudeLine, openStory } from './dude-talk.js';
import { applyAccent, startPets } from './more.js';
import { openBook } from './book.js';
import { registerWorker } from './offline.js';
import { rewardPoints } from './money.js';
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
  // The first start with screen time on this device: extra minutes count for books finished from today on, and the
  // points she already earned stay in the jar, where every point went before she could choose screen time.
  const first = {};
  if (!state.settings.reward.since) first.since = today();
  if (!s.reward || s.reward.toJar === undefined) first.toJar = Math.floor(rewardPoints() / 10);
  // Book money moved from $100 Barnes & Noble payouts to $10 Greenlight payouts in October 2026. A jar still on the
  // old settings switches once, with payouts already made counted again in tens; a grown-up's own settings stay.
  if (s.jarDefaults !== 'greenlight-10') {
    const r = state.settings.reward;
    if (r.every === 100 && r.where === 'your Barnes & Noble account') Object.assign(first, { every: 10, where: 'your Greenlight account', paid: r.paid * 10 });
    saveSetting('jarDefaults', 'greenlight-10');
  }
  if (Object.keys(first).length) saveSetting('reward', C.reward(Object.assign({}, state.settings.reward, first)));
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
  // A shared book (?book=...) opens right away, instead of the welcome story; the address then goes back to normal.
  const shared = new URLSearchParams(location.search).get('book');
  if (shared !== null) history.replaceState(null, '', location.pathname + location.hash);
  if (shared && BY_ID.has(shared)) openBook(shared);
  else {
    if (shared) toast('That book isn’t in the Reading Room.');
    // A brand-new reader meets the Dude first.
    const isNew = !Object.keys(state.records).length && !Object.keys(state.custom).length;
    if (!state.settings.storySeen && isNew) openStory();
  }
  startPets();
  registerWorker();
}

listen();
start();
