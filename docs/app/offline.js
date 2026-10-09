/* Working offline: the service worker, saving book covers for offline, and the "new version" banner. */

import { $, fmtNum, plural } from './util.js';
import { CATALOG_BOOKS } from './books.js';
import { state } from './state.js';
import { main, sheet, toast } from './page.js';
import { renderMore } from './more.js';
import { flushNote } from './book.js';

export function offlinePill() {
  if (state.offline === 'saving') return '<span class="pill"><span class="dot"></span>Saving for offline…</span>';
  if (state.offline === 'ready' && state.justReady) return '<span class="pill ok"><span class="dot"></span>Ready offline</span>';
  return '';
}

function setOffline(value) {
  if (state.offline === value) return;
  const wasSaving = state.offline === 'saving';
  state.offline = value;
  if (value === 'ready' && wasSaving) { state.justReady = true; toast('Ready offline. The app now works without internet.'); }
  const pill = $('#offline-pill');
  if (pill) pill.innerHTML = offlinePill();
  const typing = document.activeElement && main.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (state.tab === 'more' && !sheet.open && !typing) renderMore();
}

let waitingWorker = null;
let updating = false;
function showUpdate(worker) {
  waitingWorker = worker;
  $('#update').hidden = false;
}

const COVER_TOTAL = new Set(CATALOG_BOOKS.filter(b => b.cover).map(b => b.cover)).size;
export function coversItem(item) {
  const c = state.covers;
  if (!COVER_TOTAL || !c) return '';
  if (c.saved >= c.total) return item('ok', 'Book covers saved', plural(c.total, 'cover') + ' work without internet.');
  return item('', 'Saving book covers… ' + fmtNum(c.saved) + ' of ' + fmtNum(c.total), c.done ? 'The rest will save next time the app opens on Wi-Fi. Until then, the Dude’s homemade covers fill in.' : 'Keep the app open on Wi-Fi for a minute.');
}

function askForCovers() {
  if (COVER_TOTAL && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage('COVERS');
}

export function registerWorker() {
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!('serviceWorker' in navigator) || !secure) { setOffline('unsupported'); return; }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updating) location.reload();
    else askForCovers();
  });
  navigator.serviceWorker.addEventListener('message', e => {
    const d = e.data;
    if (!d || d.type !== 'covers') return;
    state.covers = { saved: Number(d.saved) || 0, total: Number(d.total) || 0, done: !!d.done };
    const typing = document.activeElement && main.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (state.tab === 'more' && !sheet.open && !typing) renderMore();
  });
  window.addEventListener('online', askForCovers);
  navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).then(reg => {
    const watch = w => {
      if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate(w);
        if (w.state === 'activated') setOffline('ready');
        if (w.state === 'redundant' && !reg.active) setOffline('failed');
      });
    };
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    if (reg.active) setOffline('ready');
    else { setOffline('saving'); watch(reg.installing || reg.waiting); }
    reg.addEventListener('updatefound', () => watch(reg.installing));
    navigator.serviceWorker.ready.then(() => { setOffline('ready'); askForCovers(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine !== false) reg.update().catch(() => {});
    });
  }).catch(() => setOffline('failed'));
}

export const actions = {
  'update-app': () => {
    if (!waitingWorker) { location.reload(); return; }
    updating = true;
    flushNote().then(() => {
      waitingWorker.postMessage('ACTIVATE');
      setTimeout(() => location.reload(), 4000);
    });
  }
};
