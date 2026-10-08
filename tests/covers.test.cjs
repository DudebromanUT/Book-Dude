const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const DOCS = path.join(__dirname, '..', 'docs');

function catalog() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(DOCS, 'catalog.js'), 'utf8'), { window });
  return window.READING_CATALOG;
}

function worker({ online = true } = {}) {
  const scope = 'https://example.github.io/Book-Dude/', handlers = {}, stores = new Map(), messages = [], fetched = [];
  const key = r => (typeof r === 'string' ? r : r.url);
  const caches = {
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        addAll: async requests => requests.forEach(r => store.set(r.url, { cached: r.url })),
        match: async r => store.get(key(r)),
        put: async (r, response) => { store.set(key(r), response); },
        keys: async () => [...store.keys()].map(url => ({ url })),
        delete: async r => store.delete(key(r))
      };
    },
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name)
  };
  const fetch = async request => {
    const url = key(request);
    fetched.push(url);
    if (!online) throw new TypeError('offline');
    return { ok: true, network: url, clone() { return this; } };
  };
  const self = {
    registration: { scope },
    clients: { claim: async () => {}, matchAll: async () => [{ postMessage: m => messages.push(m) }] },
    skipWaiting: () => {},
    addEventListener: (n, f) => { handlers[n] = f; }
  };
  const source = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');
  vm.runInNewContext(source, { self, caches, URL, Request, fetch, Set });
  const covers = JSON.parse(source.match(/const COVERS = (\[.*\]);/)[1]);
  const lifecycle = async (name, data) => { let pending; handlers[name]({ data, waitUntil: p => { pending = p; } }); await pending; };
  const request = async (p, mode = 'no-cors') => {
    let promise;
    handlers.fetch({ request: { url: new URL(p, scope).href, method: 'GET', mode }, respondWith: p2 => { promise = p2; } });
    return promise;
  };
  const coverStore = () => stores.get('reading-room-covers:' + scope) || new Map();
  return { scope, stores, messages, fetched, covers, lifecycle, request, coverStore };
}

test('every cover in the catalog is a small file that ships with the site and is in the offline list', () => {
  const books = catalog().filter(b => b.cover);
  assert.ok(books.length > 0, 'catalog has covers');
  const { covers } = worker();
  assert.deepEqual(covers, [...new Set(books.map(b => 'covers/' + b.cover))].sort());
  for (const b of books) {
    assert.match(b.cover, /^[0-9a-f]{12}\.webp$/);
    const size = fs.statSync(path.join(DOCS, 'covers', b.cover)).size;
    assert.ok(size > 500 && size < 80000, b.title + ' cover is ' + size + ' bytes');
    if (b.cover_ol) assert.match(b.cover_ol, /^OL\d+[MW]$/);
  }
  // Picture books keep their shape; every shape the catalog uses has a style.
  const css = fs.readFileSync(path.join(DOCS, 'styles.css'), 'utf8');
  for (const shape of new Set(books.map(b => b.cover_shape).filter(Boolean))) {
    assert.ok(['short', 'square', 'wide'].includes(shape), shape);
    assert.ok(css.includes('.cover.shape-' + shape + ' {'), 'styles.css has .cover.shape-' + shape);
  }
});

test('covers are saved in the background, a few at a time, and progress is reported', async () => {
  const s = worker();
  await s.lifecycle('install');
  await s.lifecycle('activate');
  assert.equal(s.fetched.filter(u => u.includes('/covers/')).length, 0, 'install does not wait for covers');
  await s.lifecycle('message', 'COVERS');
  assert.equal(s.coverStore().size, s.covers.length);
  const last = s.messages[s.messages.length - 1];
  assert.deepEqual({ ...last }, { type: 'covers', saved: s.covers.length, total: s.covers.length, done: true });
  // Asking again downloads nothing new.
  const before = s.fetched.length;
  await s.lifecycle('message', 'COVERS');
  assert.equal(s.fetched.length, before);
});

test('a saved cover loads with no network; an unsaved one is fetched and kept; unknown files are left alone', async () => {
  const s = worker();
  await s.lifecycle('install');
  const first = s.covers[0];
  const fresh = await s.request(first);
  assert.equal(fresh.network, s.scope + first);
  assert.ok(s.coverStore().has(s.scope + first));
  const count = s.fetched.length;
  assert.equal((await s.request(first)).network, s.scope + first);
  assert.equal(s.fetched.length, count, 'second request came from the cover cache');
  assert.equal(await s.request('covers/000000000000.webp'), undefined);
});

test('offline, unsaved covers fail quietly so the page can show its own cover', async () => {
  const s = worker({ online: false });
  await s.lifecycle('install').catch(() => {});
  await s.lifecycle('message', 'COVERS');
  assert.equal(s.coverStore().size, 0);
  assert.equal(s.messages[s.messages.length - 1].done, true);
  await assert.rejects(s.request(s.covers[0]));
});

test('app updates keep saved covers, and covers no longer used are cleared out', async () => {
  const s = worker();
  await s.lifecycle('install');
  await s.lifecycle('message', 'COVERS');
  const stale = s.scope + 'covers/ffffffffffff.webp';
  s.coverStore().set(stale, { ok: true });
  s.stores.set('reading-room:' + s.scope + ':old', new Map());
  await s.lifecycle('activate');
  assert.ok(s.stores.has('reading-room-covers:' + s.scope), 'cover cache survives the update');
  assert.ok(!s.stores.has('reading-room:' + s.scope + ':old'));
  await s.lifecycle('message', 'COVERS');
  assert.ok(!s.coverStore().has(stale));
  assert.equal(s.coverStore().size, s.covers.length);
});
