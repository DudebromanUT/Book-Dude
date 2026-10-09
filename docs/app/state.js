/* What the app holds while it runs, the screen choices remembered between visits,
 * and saving her journal on this device (IndexedDB). */

import { C, BASE, UI_KEY, thisYear } from './util.js';
import { SORTS } from './books.js';
import { toast } from './page.js';

const DB_NAME = 'reading-room:' + BASE;
export const PAGE = 60;

export const DEFAULT_FILTERS = { collection: '', level: '', points: '', interest: '', ages: '', genre: '', hideFinished: false };
export const state = {
  tab: 'explore',
  query: '',
  filters: Object.assign({}, DEFAULT_FILTERS),
  filtersOpen: false,
  sort: 'award-new',
  layout: 'grid',
  shelf: 'reading',
  period: thisYear(),
  limit: PAGE,
  records: {},
  custom: {},
  settings: { goals: {}, readerName: '', accent: 'leather', lastExportAt: '', storySeen: false, reward: C.reward({}), pets: true },
  dudeLine: null,
  dudePs: '',
  offline: 'checking',
  covers: null,
  persisted: null,
  storage: 'loading',
  installTipDismissed: false,
  openId: null,
  scroll: {},
  dirty: false
};

export function loadUi() {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY) || '{}');
    if (saved.filters && typeof saved.filters === 'object') {
      for (const k of Object.keys(DEFAULT_FILTERS)) if (typeof saved.filters[k] === typeof DEFAULT_FILTERS[k]) state.filters[k] = saved.filters[k];
    }
    if (SORTS[saved.sort]) state.sort = saved.sort;
    if (saved.layout === 'list' || saved.layout === 'grid') state.layout = saved.layout;
    if (['reading', 'want', 'finished', 'paused', 'favorites', 'mine'].includes(saved.shelf)) state.shelf = saved.shelf;
    if (saved.period === 'all' || /^\d{4}$/.test(saved.period || '')) state.period = saved.period;
    state.installTipDismissed = saved.installTipDismissed === true;
  } catch (e) { /* storage unavailable: defaults are fine */ }
}
export function saveUi() {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify({
      filters: state.filters, sort: state.sort, layout: state.layout, shelf: state.shelf, period: state.period, installTipDismissed: state.installTipDismissed
    }));
  } catch (e) { /* ignore */ }
}

export const db = (() => {
  let opening = null;
  let useMemory = false;
  function open() {
    if (!opening) {
      opening = new Promise((resolve, reject) => {
        if (!window.indexedDB) { reject(new Error('IndexedDB is not available')); return; }
        // Version 2 added the "books" store for books the reader adds herself.
        const req = indexedDB.open(DB_NAME, 2);
        req.onupgradeneeded = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains('records')) d.createObjectStore('records', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings');
          if (!d.objectStoreNames.contains('books')) d.createObjectStore('books', { keyPath: 'id' });
        };
        req.onsuccess = () => {
          const d = req.result;
          // Let a newer version of the app upgrade the database after an update.
          d.onversionchange = () => d.close();
          resolve(d);
        };
        req.onerror = () => reject(req.error);
      });
    }
    return opening;
  }
  function run(store, mode, fn) {
    if (useMemory) return Promise.resolve(fn(null));
    return open().then(d => new Promise((resolve, reject) => {
      const t = d.transaction(store, mode);
      const result = fn(t.objectStore(store));
      t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('Save was cancelled'));
    }));
  }
  return {
    async load() {
      try {
        const [records, books, keys, values] = await Promise.all([
          run('records', 'readonly', s => s.getAll()),
          run('books', 'readonly', s => s.getAll()),
          run('settings', 'readonly', s => s.getAllKeys()),
          run('settings', 'readonly', s => s.getAll())
        ]);
        const settings = {};
        keys.forEach((k, i) => { settings[k] = values[i]; });
        return { records, books, settings, ok: true };
      } catch (e) {
        useMemory = true;
        return { records: [], books: [], settings: {}, ok: false };
      }
    },
    // In memory mode (storage blocked) state already holds everything, so writes are no-ops.
    putRecords(list) {
      if (useMemory) return Promise.resolve();
      return run('records', 'readwrite', s => { list.forEach(r => s.put(r)); });
    },
    putBooks(list) {
      if (useMemory) return Promise.resolve();
      return run('books', 'readwrite', s => { list.forEach(b => s.put(b)); });
    },
    deleteBook(id) {
      if (useMemory) return Promise.resolve();
      return run('books', 'readwrite', s => { s.delete(id); }).then(() => run('records', 'readwrite', s => { s.delete(id); }));
    },
    setSetting(key, value) {
      if (useMemory) return Promise.resolve();
      return run('settings', 'readwrite', s => { s.put(value, key); });
    }
  };
})();

export function rec(id) {
  return state.records[id] || C.entry({ id });
}

let persistAsked = false;
export function requestPersistence() {
  if (persistAsked || !navigator.storage || !navigator.storage.persist) return;
  persistAsked = true;
  navigator.storage.persisted()
    .then(p => p || navigator.storage.persist())
    .then(p => { state.persisted = p; })
    .catch(() => {});
}

export async function save(id, patch) {
  const next = C.entry(Object.assign({}, rec(id), patch, { id, updatedAt: new Date().toISOString() }));
  state.records[id] = next;
  state.dirty = true;
  requestPersistence();
  try {
    await db.putRecords([next]);
  } catch (e) {
    toast('Could not save on this device. Try again, or export a backup.');
  }
  return next;
}

export async function saveSetting(key, value) {
  state.settings[key] = value;
  try { await db.setSetting(key, value); } catch (e) { toast('Could not save that setting.'); }
}
