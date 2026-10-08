/* The Reading Room: screens, on-device storage, backups, and offline updates. */
(function () {
  'use strict';

  const C = window.ReadingCore;
  const CATALOG = Array.isArray(window.READING_CATALOG) ? window.READING_CATALOG : [];
  const BASE = new URL('.', location.href).pathname;
  const DB_NAME = 'reading-room:' + BASE;
  const UI_KEY = 'reading-room:ui:' + BASE;
  const TABS = ['explore', 'shelves', 'progress', 'more'];
  const PAGE = 60;

  const main = document.getElementById('main');
  const sheet = document.getElementById('sheet');
  const confirmBox = document.getElementById('confirm');
  const toastEl = document.getElementById('toast');
  const confettiEl = document.getElementById('confetti');

  // ---------- Small helpers ----------

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const thisYear = () => String(new Date().getFullYear());
  const fmtNum = n => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const plural = (n, one, many) => fmtNum(n) + ' ' + (n === 1 ? one : (many || one + 's'));
  const fold = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  const dayFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const fmtDay = d => (d ? dayFmt.format(new Date(d + 'T00:00:00Z')) : '');
  const localDay = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const safeUrl = u => (/^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : '');
  const coarse = () => window.matchMedia('(pointer: coarse)').matches;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hash(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }

  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="3"/>',
    shuffle: '<path d="M3 7h3.5c2.5 0 4 1.5 5.5 5s3 5 5.5 5H21M3 17h3.5c1.4 0 2.5-.5 3.4-1.5M14.1 8.5c.9-1 2-1.5 3.4-1.5H21M18 4l3 3-3 3M18 14l3 3-3 3"/>',
    heart: '<path d="M12 20.5s-7.4-4.5-9.5-9.2C1.1 8 3.1 4.5 6.9 4.5c2.2 0 3.7 1.2 5.1 3 1.4-1.8 2.9-3 5.1-3 3.8 0 5.8 3.5 4.4 6.8-2.1 4.7-9.5 9.2-9.5 9.2z"/>',
    bookmark: '<path d="M6.5 3.5h11v17L12 16.3l-5.5 4.2z"/>',
    book: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>',
    pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    star: '<path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/>',
    alert: '<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
    upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19.5h14"/>',
    ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.3"/>',
    share: '<path d="M12 3.5v11M8 7.5l4-4 4 4M6 11H5v9.5h14V11h-1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pencil: '<path d="M15.5 5.5l3 3L8 19H5v-3z"/><path d="M13.5 7.5l3 3"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 10.5v6M14 10.5v6"/>'
  };
  // The Dude's crew and words live in dude.js so they are easy to edit.
  const DUDE = Object.assign({ dog: 'Dewey', cat: 'Footnote', sayings: [], story: [], signoff: 'The Dude' }, window.BOOK_DUDE || {});
  const fill = s => String(s || '').replace(/\{dog\}/g, DUDE.dog).replace(/\{cat\}/g, DUDE.cat);
  const ACCENTS = { leather: 'Leather', rug: 'Rug red', brass: 'Brass', ivy: 'Ivy', teal: 'Teal', navy: 'Navy', plum: 'Plum', berry: 'Berry' };

  const icon = (name, cls) => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"' + (cls ? ' class="' + cls + '"' : '') + '>' + ICONS[name] + '</svg>';

  // ---------- Catalog ----------

  const STATUS = {
    want: { label: 'Want to read', flag: 'Want', icon: 'bookmark' },
    reading: { label: 'Reading', flag: 'Reading', icon: 'book' },
    finished: { label: 'Finished', flag: 'Finished', icon: 'check' },
    paused: { label: 'Paused', flag: 'Paused', icon: 'pause' }
  };
  const COLLECTION_ORDER = ['Newbery Medal', 'Newbery Honor', 'Beehive', 'Classics', 'Pulitzer', 'Printz', 'Carnegie', 'National Book Award'];
  const COLLECTION_LABEL = { Beehive: 'Beehive (Utah)' };
  const INTEREST = {
    LG: 'Lower grades (K–3)',
    MG: 'Middle grades (4–8)',
    'MG+': 'Middle grades plus (6 and up)',
    UG: 'Upper grades (9–12)'
  };
  const LEVELS = [
    ['lt3', 'Below 3.0', l => l < 3], ['3', '3.0 – 3.9', l => l >= 3 && l < 4], ['4', '4.0 – 4.9', l => l >= 4 && l < 5],
    ['5', '5.0 – 5.9', l => l >= 5 && l < 6], ['6', '6.0 – 6.9', l => l >= 6 && l < 7], ['7', '7.0 and up', l => l >= 7]
  ];
  const POINTS = [
    ['known', 'Any listed points', () => true], ['lt3', 'Under 3', p => p < 3], ['3', '3 – 5.9', p => p >= 3 && p < 6],
    ['6', '6 – 9.9', p => p >= 6 && p < 10], ['10', '10 – 14.9', p => p >= 10 && p < 15], ['15', '15 and up', p => p >= 15]
  ];
  const SORTS = {
    'award-new': 'Newest first',
    'award-old': 'Oldest first',
    title: 'Title A–Z',
    author: 'Author A–Z',
    'level-up': 'Easiest first (AR level)',
    'level-down': 'Hardest first (AR level)',
    'points-down': 'Most AR points',
    'points-up': 'Fewest AR points',
    score: 'Highest community score'
  };

  function parseAwards(b) {
    const list = String(b.award_history || '').split(';').map(s => s.trim()).filter(Boolean).map(s => {
      const [year, award, category] = s.split(/\s+—\s+/);
      return { year: year || '', award: award || '', category: category || '' };
    }).filter(a => a.award);
    return list.length ? list : [{ year: b.year, award: b.award, category: b.category }];
  }
  const collectionOf = a => (a.award === 'Newbery' ? 'Newbery ' + a.category : a.award);
  const collLabel = c => COLLECTION_LABEL[c] || c;

  function sealFor(b) {
    const cat = b.category;
    switch (b.award) {
      case 'Newbery': return cat === 'Medal' ? ['', 'Newbery<br>Medal'] : ['silver', 'Newbery<br>Honor'];
      case 'Beehive': return ['honey', '<span>Bee&shy;hive</span>'];
      case 'Classics': return ['classic', 'Classic'];
      case 'Pulitzer': return ['bronze', 'Pulitzer'];
      case 'Printz': return ['ruby', 'Printz<br>' + (cat === 'Honor' ? 'Honor' : 'Award')];
      case 'Carnegie': return ['', 'Carnegie<br>Medal'];
      case 'National Book Award': return ['bronze', 'National<br>Book<br>Award'];
      default: return null;
    }
  }

  function surname(author) {
    const first = String(author || '').split(/,|;| and | with /)[0].trim().replace(/\s+(Jr\.?|Sr\.?|II|III)$/, '');
    const parts = first.split(/\s+/);
    return parts[parts.length - 1] || '';
  }
  const sortTitle = t => String(t).replace(/^(the|a|an)\s+/i, '');
  const number = v => (v !== '' && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : null);

  const MY_BOOKS = 'My books';

  function prepare(raw, custom) {
    const h = hash(raw.book_id);
    const awards = custom ? [] : parseAwards(raw);
    return Object.assign({}, raw, {
      _custom: custom,
      _awards: awards,
      _colls: custom ? [MY_BOOKS] : Array.from(new Set(awards.map(collectionOf))),
      _level: number(raw.ar_level),
      _points: C.knownPoints(raw),
      _score: number(raw.score),
      // Added books sort by the year they were added.
      _year: custom ? (parseInt(String(raw.createdAt).slice(0, 4), 10) || 0) : (parseInt(raw.year, 10) || 0),
      _pal: h % 12,
      _motif: (h >>> 8) % 6,
      _seal: custom ? ['mine', 'My<br>book'] : sealFor(raw),
      _sortTitle: sortTitle(raw.title),
      _surname: surname(raw.author),
      _titleText: ' ' + fold(raw.title).replace(/[^a-z0-9]+/g, ' ').trim() + ' ',
      _authorText: ' ' + fold(raw.author).replace(/[^a-z0-9]+/g, ' ').trim() + ' ',
      _text: fold([raw.title, raw.author, raw.description, raw.award_history, raw.genre, raw.ar_record_title].join(' '))
    });
  }

  const CATALOG_BOOKS = CATALOG.map(raw => prepare(raw, false));
  const AGES = Array.from(new Set(CATALOG_BOOKS.map(b => b.ages).filter(Boolean))).sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || collator.compare(a, b));
  const GENRES = Array.from(new Set(CATALOG_BOOKS.map(b => b.genre).filter(Boolean))).sort(collator.compare);
  // The catalog plus books the reader added; rebuilt whenever she adds, edits, or deletes one.
  let BOOKS = CATALOG_BOOKS;
  let BY_ID = new Map();
  let COLLECTIONS = [];

  function rebuildBooks() {
    const mine = Object.keys(state.custom).map(id => {
      const c = state.custom[id];
      return prepare({ book_id: id, title: c.title, author: c.author, description: c.description, ar_level: c.ar_level, ar_points: c.ar_points, year: '', award: '', category: '', createdAt: c.createdAt }, true);
    });
    BOOKS = CATALOG_BOOKS.concat(mine);
    BY_ID = new Map(BOOKS.map(b => [b.book_id, b]));
    COLLECTIONS = COLLECTION_ORDER.filter(c => BOOKS.some(b => b._colls.includes(c)))
      .concat(Array.from(new Set(CATALOG_BOOKS.flatMap(b => b._colls))).filter(c => !COLLECTION_ORDER.includes(c)).sort())
      .concat(mine.length ? [MY_BOOKS] : []);
  }

  // ---------- State ----------

  const DEFAULT_FILTERS = { collection: '', level: '', points: '', interest: '', ages: '', genre: '', hideFinished: false };
  const state = {
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
    settings: { goals: {}, readerName: '', accent: 'leather', lastExportAt: '', storySeen: false },
    sayingOffset: 0,
    offline: 'checking',
    persisted: null,
    storage: 'loading',
    installTipDismissed: false,
    openId: null,
    scroll: {},
    dirty: false
  };

  function loadUi() {
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
  function saveUi() {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify({
        filters: state.filters, sort: state.sort, layout: state.layout, shelf: state.shelf, period: state.period, installTipDismissed: state.installTipDismissed
      }));
    } catch (e) { /* ignore */ }
  }

  // ---------- On-device storage (IndexedDB) ----------

  const db = (() => {
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

  function rec(id) {
    return state.records[id] || C.entry({ id });
  }

  let persistAsked = false;
  function requestPersistence() {
    if (persistAsked || !navigator.storage || !navigator.storage.persist) return;
    persistAsked = true;
    navigator.storage.persisted()
      .then(p => p || navigator.storage.persist())
      .then(p => { state.persisted = p; })
      .catch(() => {});
  }

  async function save(id, patch) {
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

  async function saveSetting(key, value) {
    state.settings[key] = value;
    try { await db.setSetting(key, value); } catch (e) { toast('Could not save that setting.'); }
  }

  // ---------- Feedback ----------

  const topLayer = () => (confirmBox.open ? confirmBox : sheet.open ? sheet : document.body);
  let toastTimer = 0;
  function toast(message) {
    topLayer().appendChild(toastEl);
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }

  function celebrate() {
    if (reducedMotion()) return;
    topLayer().appendChild(confettiEl);
    const colors = ['#E8654A', '#F2B441', '#2E8380', '#7A58A8', '#4F8FC0', '#E58B9C', '#9DB88E'];
    for (let i = 0; i < 44; i++) {
      const bit = document.createElement('i');
      bit.style.left = (Math.random() * 100) + 'vw';
      bit.style.background = colors[i % colors.length];
      bit.style.setProperty('--x', (Math.random() * 180 - 90) + 'px');
      bit.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
      bit.style.setProperty('--d', (1.2 + Math.random()) + 's');
      bit.style.animationDelay = (Math.random() * 0.3) + 's';
      confettiEl.appendChild(bit);
    }
    setTimeout(() => confettiEl.replaceChildren(), 2800);
  }

  // ---------- The Dude ----------

  function dayOfYear() {
    const d = new Date();
    return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  }

  // A nudge about her own books first; otherwise the saying of the day. Tapping the bubble cycles sayings.
  function dudeLine() {
    const name = state.settings.readerName;
    const hey = name ? 'Hey, ' + name + '. ' : '';
    if (!state.sayingOffset) {
      const mine = Object.keys(state.records).filter(id => BY_ID.has(id)).map(id => [BY_ID.get(id), state.records[id]]);
      const newest = (x, y) => (y[1].updatedAt || '').localeCompare(x[1].updatedAt || '');
      const quiz = mine.filter(([, r]) => r.status === 'finished' && r.earnedPoints === null && r.finishedDate && Date.now() - Date.parse(r.finishedDate) < 21 * 864e5).sort(newest)[0];
      if (quiz) return hey + 'You finished ' + quiz[0].title + '. Took the AR quiz yet? Add your points on its page.';
      const reading = mine.filter(([, r]) => r.status === 'reading').sort(newest)[0];
      if (reading) {
        const p = reading[1].progress || 0;
        if (!p) return hey + 'How’s ' + reading[0].title + ' going?';
        return hey + 'You’re ' + p + '% through ' + reading[0].title + '. ' + (p < 30 ? 'Good start.' : p < 75 ? 'Keep going.' : 'Almost there!');
      }
    }
    const list = DUDE.sayings.length ? DUDE.sayings : ['Shoes off. Socks on. What are we reading?'];
    const line = fill(list[(dayOfYear() + state.sayingOffset) % list.length]);
    return state.sayingOffset ? line : hey + line;
  }

  function dudeHtml() {
    return '<section class="dude" aria-label="The Dude">' +
      '<button type="button" class="dude-avatar" data-act="story" aria-label="Meet the Dude"><img src="img/dude-face.jpg" alt="" width="60" height="60"></button>' +
      '<button type="button" class="bubble" data-act="next-saying" aria-live="polite"><span class="who">The Dude says</span><span class="line">' + esc(dudeLine()) + '</span></button>' +
      '</section>';
  }

  function storyHtml() {
    const sections = DUDE.story.map(sec => {
      let html = sec.heading ? '<h2>' + esc(fill(sec.heading)) + '</h2>' : '';
      if (sec.paragraphs) html += sec.paragraphs.map(p => '<p>' + esc(fill(p)) + '</p>').join('');
      if (sec.crew) {
        html += '<ul class="crew">' + sec.crew.map(c => '<li><span class="face"><img src="' + esc(c.img) + '" alt="" width="64" height="64" loading="lazy"></span>' +
          '<div><b>' + esc(fill(c.name)) + '</b><span class="txt">' + esc(fill(c.text)) + '</span></div></li>').join('') + '</ul>';
      }
      if (sec.list) {
        const tag = sec.ordered ? 'ol' : 'ul';
        html += '<' + tag + ' class="rules">' + sec.list.map(li => '<li>' + esc(fill(li)) + '</li>').join('') + '</' + tag + '>';
      }
      return '<section>' + html + '</section>';
    }).join('');
    return sheetBar('Meet the Dude') + '<div class="sheet-body story">' +
      '<figure class="story-figure"><img src="img/dude.jpg" width="960" height="955" alt="The Dude in a worn leather armchair, surrounded by bookshelves, with a Welsh terrier and a tabby cat asleep on the rug"></figure>' +
      '<div class="story-title"><h1>Meet the Dude</h1><p>Keeper of the Reading Room</p></div>' +
      '<div class="story-body">' + sections + '<p class="signoff">' + esc(fill(DUDE.signoff)) + '</p></div>' +
      '<div class="row-actions"><button type="button" class="btn primary" data-act="close-sheet">Let’s read</button></div></div>';
  }

  function openStory() {
    state.openId = null;
    sheet.innerHTML = storyHtml();
    if (!sheet.open) sheet.showModal();
    sheet.scrollTop = 0;
    if (!state.settings.storySeen) saveSetting('storySeen', true);
  }

  function greeting() {
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    return state.settings.readerName ? part + ', ' + state.settings.readerName : part;
  }

  // Horizontal chip rows can hide the selected chip off-screen on a phone.
  function revealChip(row) {
    const sel = row && $('[aria-pressed="true"]', row);
    if (!sel || row.scrollWidth <= row.clientWidth) return;
    const left = sel.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + sel.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollLeft = Math.max(0, left - 16);
  }

  // Sizes and bar lengths are applied after rendering because the page's security policy blocks inline styles.
  function applySizes(root) {
    $$('[data-w]', root).forEach(el => { el.style.width = Math.max(0, Math.min(100, Number(el.dataset.w))) + '%'; });
    $$('[data-h]', root).forEach(el => { el.style.height = Math.max(0, Math.min(100, Number(el.dataset.h))) + '%'; });
  }

  // ---------- Pieces ----------

  function cover(b, size) {
    const seal = b._seal && size !== 'thumb' ? '<span class="seal ' + b._seal[0] + '">' + b._seal[1] + '</span>' : '';
    const initial = esc(b._sortTitle.charAt(0).toUpperCase());
    return '<span class="cover p' + b._pal + ' m' + b._motif + (size ? ' ' + size : '') + '" aria-hidden="true">' +
      '<span class="cover-title">' + esc(b.title) + '</span><span class="cover-initial">' + initial + '</span>' +
      '<span class="cover-author">' + esc(b.author) + '</span>' + seal + '</span>';
  }

  function levelTag(b) {
    return b._level !== null ? '<span class="tag" title="AR book level">Lvl ' + esc(b.ar_level) + '</span>' : '';
  }
  function pointsTag(b) {
    if (b._points !== null) return '<span class="tag pts">' + fmtNum(b._points) + (b._points === 1 ? ' pt' : ' pts') + '</span>';
    return '<span class="tag unknown">' + (b._custom ? 'pts not added' : 'pts unverified') + '</span>';
  }
  const mineTag = b => (b._custom ? '<span class="tag mine">Added by you</span>' : '');

  function flagText(r) {
    if (!r || !r.status) return '';
    if (r.status === 'reading' && r.progress) return 'Reading ' + r.progress + '%';
    return STATUS[r.status].flag;
  }

  function bookLabel(b, r) {
    const bits = [b.title + (b.author ? ' by ' + b.author : '')];
    const a = b._awards[0];
    if (a) bits.push([a.award, a.category, a.year].filter(Boolean).join(' '));
    if (b._custom) bits.push('added by you');
    if (b._level !== null) bits.push('book level ' + b.ar_level);
    bits.push(b._points !== null ? plural(b._points, 'AR point') : b._custom ? 'no AR points added' : 'AR points not verified');
    if (r && r.status) bits.push(flagText(r));
    if (r && r.favorite) bits.push('favorite');
    return bits.join('. ');
  }

  function card(b) {
    const r = state.records[b.book_id];
    const flag = r && r.status ? '<span class="flag ' + r.status + '">' + esc(flagText(r)) + '</span>' : '';
    const heart = r && r.favorite ? '<span class="heart">' + icon('heart') + '</span>' : '';
    return '<button type="button" class="card" data-act="open" data-id="' + esc(b.book_id) + '" aria-label="' + esc(bookLabel(b, r)) + '">' +
      '<span class="cover-wrap">' + cover(b) + flag + heart + '</span>' +
      '<span class="card-meta" aria-hidden="true"><span class="t">' + esc(b.title) + '</span><span class="a">' + esc(b.author) + '</span>' +
      '<span class="tags">' + levelTag(b) + pointsTag(b) + '</span></span></button>';
  }

  function row(b, sub) {
    const r = state.records[b.book_id];
    return '<button type="button" class="row" data-act="open" data-id="' + esc(b.book_id) + '" aria-label="' + esc(bookLabel(b, r)) + '">' +
      cover(b, 'thumb') +
      '<span aria-hidden="true"><span class="t">' + esc(b.title) + '</span><span class="a">' + esc(b.author) + '</span>' +
      (sub ? '<span class="sub">' + sub + '</span>' : '') + '</span>' + icon('chev', 'chev') + '</button>';
  }

  function emptyState(title, text, action) {
    return '<div class="empty">' + icon('book') + '<h2>' + title + '</h2><p>' + text + '</p>' + (action || '') + '</div>';
  }

  function offlinePill() {
    if (state.offline === 'saving') return '<span class="pill"><span class="dot"></span>Saving for offline…</span>';
    if (state.offline === 'ready' && state.justReady) return '<span class="pill ok"><span class="dot"></span>Ready offline</span>';
    return '';
  }

  // ---------- Explore ----------

  function matches(b, words) {
    const f = state.filters;
    if (f.collection && !b._colls.includes(f.collection)) return false;
    if (f.level) {
      if (f.level === 'unknown') { if (b._level !== null) return false; }
      else { const band = LEVELS.find(l => l[0] === f.level); if (b._level === null || !band || !band[2](b._level)) return false; }
    }
    if (f.points) {
      if (f.points === 'unknown') { if (b._points !== null) return false; }
      else { const band = POINTS.find(p => p[0] === f.points); if (b._points === null || !band || !band[2](b._points)) return false; }
    }
    if (f.interest && (f.interest === 'unknown' ? b.ar_interest : b.ar_interest !== f.interest)) return false;
    if (f.ages && (f.ages === 'unknown' ? b.ages : b.ages !== f.ages)) return false;
    if (f.genre && (f.genre === 'unknown' ? b.genre : b.genre !== f.genre)) return false;
    if (f.hideFinished) { const r = state.records[b.book_id]; if (r && r.status === 'finished') return false; }
    for (const w of words) if (!b._text.includes(w)) return false;
    return true;
  }

  function compareBy(sort) {
    const byTitle = (a, b) => collator.compare(a._sortTitle, b._sortTitle);
    const nullsLast = (key, dir) => (a, b) => {
      if (a[key] === null && b[key] === null) return byTitle(a, b);
      if (a[key] === null) return 1;
      if (b[key] === null) return -1;
      return (a[key] - b[key]) * dir || byTitle(a, b);
    };
    switch (sort) {
      case 'award-old': return (a, b) => a._year - b._year || byTitle(a, b);
      case 'title': return byTitle;
      case 'author': return (a, b) => collator.compare(a._surname, b._surname) || collator.compare(a.author, b.author) || byTitle(a, b);
      case 'level-up': return nullsLast('_level', 1);
      case 'level-down': return nullsLast('_level', -1);
      case 'points-down': return nullsLast('_points', -1);
      case 'points-up': return nullsLast('_points', 1);
      case 'score': return nullsLast('_score', -1);
      default: return (a, b) => b._year - a._year || byTitle(a, b);
    }
  }

  let lastResults = [];
  // Title matches first, then author matches, then everything else (descriptions, awards).
  function relevance(b, words, phrase) {
    if (b._titleText.startsWith(' ' + phrase)) return 0;
    if (words.every(w => b._titleText.includes(' ' + w))) return 1;
    if (words.every(w => b._titleText.includes(' ' + w) || b._authorText.includes(' ' + w))) return 2;
    return 3;
  }

  function filtered() {
    const words = fold(state.query).replace(/'/g, '').split(/[^a-z0-9]+/).filter(Boolean);
    const list = BOOKS.filter(b => matches(b, words));
    const compare = compareBy(state.sort);
    if (!words.length) return list.sort(compare);
    const phrase = words.join(' ');
    const tier = new Map(list.map(b => [b, relevance(b, words, phrase)]));
    return list.sort((a, b) => tier.get(a) - tier.get(b) || compare(a, b));
  }

  function activeFilterCount() {
    const f = state.filters;
    return ['level', 'points', 'interest', 'ages', 'genre'].filter(k => f[k]).length + (f.hideFinished ? 1 : 0);
  }

  function options(list, current, blank) {
    return '<option value="">' + blank + '</option>' + list.map(([v, label]) =>
      '<option value="' + esc(v) + '"' + (v === current ? ' selected' : '') + '>' + esc(label) + '</option>').join('');
  }

  function select(key, label, list, blank) {
    const value = key === 'sort' ? state.sort : state.filters[key];
    return '<label class="field"><span>' + label + '</span><select class="input" data-filter="' + key + '">' +
      (key === 'sort' ? Object.keys(SORTS).map(k => '<option value="' + k + '"' + (k === value ? ' selected' : '') + '>' + SORTS[k] + '</option>').join('') : options(list, value, blank)) +
      '</select></label>';
  }

  function installTip() {
    const iosBrowser = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!iosBrowser || navigator.standalone !== false || state.installTipDismissed) return '';
    return '<div class="notice accent" id="install-tip"><strong>Put Book Dude on your Home Screen</strong>' +
      'In Safari, tap ' + '<b>Share</b>, then <b>Add to Home Screen</b>. Open it from that icon so your notes stay in one place.' +
      '<div class="row-actions"><button type="button" class="btn small" data-act="dismiss-tip">Got it</button></div></div>';
  }

  function renderExplore() {
    state.sayingOffset = 0;
    const f = state.filters;
    main.innerHTML =
      '<header class="view-head"><div><p class="kicker">The Reading Room</p><h1>Find your next book</h1></div><span id="offline-pill">' + offlinePill() + '</span></header>' +
      dudeHtml() +
      installTip() +
      '<div class="search" role="search">' +
        '<label class="search-box"><span class="visually-hidden">Search books</span>' + icon('search') +
          '<input id="q" class="input" type="search" placeholder="Title, author, or topic" value="' + esc(state.query) + '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></label>' +
        '<button type="button" class="btn filter-btn" data-act="toggle-filters" aria-expanded="' + state.filtersOpen + '" aria-controls="filters">' + icon('sliders') + '<span>Filters</span><span class="count" id="filter-count"></span></button>' +
      '</div>' +
      '<div class="chips" id="coll-chips" role="group" aria-label="Collections"></div>' +
      '<section id="filters" class="filters" aria-label="Filters"' + (state.filtersOpen ? '' : ' hidden') + '>' +
        '<div class="filters-grid">' +
          select('level', 'AR book level', LEVELS.map(l => [l[0], l[1]]).concat([['unknown', 'Not listed']]), 'Any level') +
          select('points', 'AR points', POINTS.map(p => [p[0], p[1]]).concat([['unknown', 'Not verified yet']]), 'Any points') +
          select('interest', 'Interest level', Object.keys(INTEREST).map(k => [k, INTEREST[k]]).concat([['unknown', 'Not listed']]), 'Any interest level') +
          select('ages', 'Age guidance', AGES.map(a => [a, a]).concat([['unknown', 'Not listed']]), 'Any ages') +
          select('genre', 'Genre', GENRES.map(g => [g, g]).concat([['unknown', 'Not listed']]), 'Any genre') +
          select('sort', 'Sort by') +
        '</div>' +
        '<div class="filters-foot"><label class="switch"><input type="checkbox" id="hide-finished"' + (f.hideFinished ? ' checked' : '') + '> Hide books I finished</label>' +
        '<button type="button" class="btn small ghost" data-act="reset-filters">Reset filters</button></div>' +
        '<p class="hint">Age and genre are only listed for some books, and are not verified.</p>' +
      '</section>' +
      '<div class="chips" id="active-filters" aria-label="Active filters"></div>' +
      '<div class="toolbar"><span class="count" id="result-count" aria-live="polite"></span><div class="actions">' +
        '<button type="button" class="btn small ghost" data-act="surprise" aria-label="' + esc(fill('Ask {cat} to pick a book')) + '"><img class="face" src="img/cat.jpg" alt="" width="26" height="26">' + esc(fill('Ask {cat}')) + '</button>' +
        '<div class="seg" role="group" aria-label="Layout">' +
          '<button type="button" data-act="layout" data-layout="grid" aria-label="Covers" aria-pressed="' + (state.layout === 'grid') + '">' + icon('grid') + '</button>' +
          '<button type="button" data-act="layout" data-layout="list" aria-label="List" aria-pressed="' + (state.layout === 'list') + '">' + icon('list') + '</button>' +
        '</div></div></div>' +
      '<div id="results"></div>';
    updateResults();
  }

  function listSub(b) {
    const r = state.records[b.book_id];
    const a = b._awards[0];
    return levelTag(b) + pointsTag(b) + (a ? '<span>' + esc([a.award, a.category].filter(Boolean).join(' ') + ' · ' + b.year) + '</span>' : mineTag(b)) +
      (r && r.status ? '<span class="tag">' + esc(flagText(r)) + '</span>' : '');
  }

  function addBookCta() {
    const q = state.query.trim();
    return '<div class="add-cta"><div><b>Can’t find ' + (q ? '“' + esc(q) + '”' : 'a book') + '?</b><p>Add it yourself. It works just like the other books.</p></div>' +
      '<button type="button" class="btn small primary" data-act="add-book" data-title="' + esc(q) + '">' + icon('plus') + 'Add a book</button></div>';
  }

  function itemsHtml(list) {
    return list.map(b => (state.layout === 'grid' ? card(b) : row(b, listSub(b)))).join('');
  }

  function updateResults() {
    const results = $('#results');
    if (!results) return;
    lastResults = filtered();
    const f = state.filters;
    if (f.collection && !COLLECTIONS.includes(f.collection)) { f.collection = ''; lastResults = filtered(); }
    const total = lastResults.length;

    const counts = {};
    for (const b of BOOKS) for (const c of b._colls) counts[c] = (counts[c] || 0) + 1;
    $('#coll-chips').innerHTML = '<button type="button" class="chip" data-act="collection" data-key="" aria-pressed="' + !f.collection + '">All <span class="n">' + BOOKS.length + '</span></button>' +
      COLLECTIONS.map(c => '<button type="button" class="chip" data-act="collection" data-key="' + esc(c) + '" aria-pressed="' + (f.collection === c) + '">' + esc(collLabel(c)) + ' <span class="n">' + counts[c] + '</span></button>').join('');
    revealChip($('#coll-chips'));

    const n = activeFilterCount();
    const countEl = $('#filter-count');
    countEl.textContent = n ? String(n) : '';
    countEl.hidden = !n;

    const chips = [];
    const label = (key, list) => { const hit = list.find(x => x[0] === f[key]); return hit ? hit[1] : f[key]; };
    if (f.level) chips.push(['level', 'Level: ' + (f.level === 'unknown' ? 'not listed' : label('level', LEVELS))]);
    if (f.points) chips.push(['points', 'Points: ' + (f.points === 'unknown' ? 'not verified' : label('points', POINTS))]);
    if (f.interest) chips.push(['interest', f.interest === 'unknown' ? 'Interest: not listed' : INTEREST[f.interest]]);
    if (f.ages) chips.push(['ages', 'Ages: ' + (f.ages === 'unknown' ? 'not listed' : f.ages)]);
    if (f.genre) chips.push(['genre', f.genre === 'unknown' ? 'Genre: not listed' : f.genre]);
    if (f.hideFinished) chips.push(['hideFinished', 'Hiding finished']);
    if (state.query.trim()) chips.push(['query', '“' + state.query.trim() + '”']);
    const active = $('#active-filters');
    active.innerHTML = chips.map(([k, text]) => '<button type="button" class="chip removable" data-act="clear-filter" data-key="' + k + '" aria-label="Remove filter ' + esc(text) + '">' + esc(text) + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button>').join('');
    active.hidden = !chips.length;

    $('#result-count').textContent = total === BOOKS.length ? plural(total, 'book') : plural(total, 'book') + ' found';

    if (!total) {
      const q = state.query.trim();
      results.innerHTML = q
        ? '<div class="empty compact"><span class="pet"><img class="face" src="img/dog.jpg" alt="" width="84" height="84"></span>' +
            '<h2>' + esc(DUDE.dog) + ' looked everywhere for “' + esc(q) + '”</h2><p>No luck. Is it a book that isn’t in the Reading Room? Add it yourself and track it like any other book.</p>' +
            '<div class="row-actions"><button type="button" class="btn primary" data-act="add-book" data-title="' + esc(q) + '">' + icon('plus') + 'Add it as my book</button>' +
            '<button type="button" class="btn" data-act="reset-all">Show all books</button></div></div>'
        : emptyState('No books match', 'Try loosening a filter.', '<button type="button" class="btn" data-act="reset-all">Show all books</button>') + addBookCta();
      return;
    }
    const shown = Math.min(state.limit, total);
    results.innerHTML = '<div class="' + (state.layout === 'grid' ? 'grid' : 'list') + '" id="items">' + itemsHtml(lastResults.slice(0, shown)) + '</div>' +
      (shown < total ? '<div class="more-row"><button type="button" class="btn" data-act="more" id="more-btn">Show more books</button></div>' : '') +
      addBookCta();
    watchMore();
  }

  let moreObserver = null;
  function watchMore() {
    if (moreObserver) moreObserver.disconnect();
    const btn = $('#more-btn');
    if (!btn || !('IntersectionObserver' in window)) return;
    moreObserver = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) showMore(); }, { rootMargin: '600px 0px' });
    moreObserver.observe(btn);
  }

  function showMore() {
    const items = $('#items');
    if (!items) return;
    const from = Math.min(state.limit, lastResults.length);
    state.limit += PAGE;
    const to = Math.min(state.limit, lastResults.length);
    items.insertAdjacentHTML('beforeend', itemsHtml(lastResults.slice(from, to)));
    if (to >= lastResults.length) {
      const moreRow = $('#more-btn') && $('#more-btn').parentElement;
      if (moreRow) moreRow.remove();
      if (moreObserver) moreObserver.disconnect();
    }
  }

  function resetResults() {
    state.limit = PAGE;
    saveUi();
    updateResults();
  }

  // ---------- Shelves ----------

  const SHELVES = [
    ['reading', 'Reading'], ['want', 'Want to read'], ['finished', 'Finished'], ['paused', 'Paused'], ['favorites', 'Favorites'], ['mine', 'My books']
  ];

  function shelfBooks(key) {
    const out = [];
    if (key === 'mine') {
      for (const id of Object.keys(state.custom)) if (BY_ID.has(id)) out.push([BY_ID.get(id), rec(id)]);
      return out.sort((x, y) => String(state.custom[y[0].book_id].createdAt).localeCompare(String(state.custom[x[0].book_id].createdAt)));
    }
    for (const id of Object.keys(state.records)) {
      const r = state.records[id];
      const b = BY_ID.get(id);
      if (!b) continue;
      if (key === 'favorites' ? r.favorite : r.status === key) out.push([b, r]);
    }
    const time = r => r.updatedAt || '';
    if (key === 'finished') out.sort((x, y) => (y[1].finishedDate || '').localeCompare(x[1].finishedDate || '') || time(y[1]).localeCompare(time(x[1])));
    else if (key === 'favorites') out.sort((x, y) => collator.compare(x[0]._sortTitle, y[0]._sortTitle));
    else out.sort((x, y) => time(y[1]).localeCompare(time(x[1])));
    return out;
  }

  function quizLine(b, r) {
    if (r.earnedPoints !== null) return '<span class="tag pts">' + plural(r.earnedPoints, 'pt') + ' earned</span>';
    return '<span class="tag unknown">Quiz not entered' + (b._points !== null ? ' · worth up to ' + fmtNum(b._points) : '') + '</span>';
  }

  function shelfSub(b, r, key) {
    if (key === 'reading' || (key === 'favorites' && r.status === 'reading')) {
      const p = r.progress || 0;
      return '<span class="bar"><i data-w="' + p + '"></i></span><span>' + p + '%</span>';
    }
    if (r.status === 'finished') return '<span>' + (r.finishedDate ? 'Finished ' + esc(fmtDay(r.finishedDate)) : 'Finished (no date)') + '</span>' + quizLine(b, r);
    if (r.status === 'paused') return '<span>Paused' + (r.progress ? ' at ' + r.progress + '%' : '') + '</span>';
    if ((key === 'favorites' || key === 'mine') && r.status) return '<span class="tag">' + STATUS[r.status].label + '</span>' + levelTag(b) + pointsTag(b);
    return levelTag(b) + pointsTag(b);
  }

  function renderShelves() {
    const counts = {};
    for (const [key] of SHELVES) counts[key] = shelfBooks(key).length;
    const key = state.shelf;
    const list = shelfBooks(key);
    const missing = Object.keys(state.records).filter(id => !BY_ID.has(id) && !C.isBlank(state.records[id])).length;
    const empties = {
      reading: ['Nothing on the go', 'Open any book and tap <b>Reading</b> to keep your place here.'],
      want: ['Your wish list is empty', 'Tap <b>Want to read</b> on any book to save it for later.'],
      finished: ['No finished books yet', 'When you finish a book, tap <b>Finished</b>. It will show up here.'],
      paused: ['Nothing paused', 'Books you set aside for now will wait for you here.'],
      favorites: ['No favorites yet', 'Tap the heart on a book you love.'],
      mine: ['Add your own books', 'Reading something that isn’t in the Reading Room? Add it here and track it like any other book: shelves, notes, and quiz points.']
    };
    const addBtn = '<button type="button" class="btn primary" data-act="add-book">' + icon('plus') + 'Add a book</button>';
    main.innerHTML =
      '<header class="view-head"><div><p class="kicker">' + esc(greeting()) + '</p><h1>My shelves</h1></div>' +
        '<button type="button" class="btn small" data-act="add-book">' + icon('plus') + 'Add a book</button></header>' +
      '<div class="chips" role="group" aria-label="Shelves">' + SHELVES.map(([k, label]) =>
        '<button type="button" class="chip" data-act="shelf" data-shelf="' + k + '" aria-pressed="' + (k === key) + '">' + label + ' <span class="n">' + counts[k] + '</span></button>').join('') + '</div>' +
      '<div class="list">' + (list.length ? list.map(([b, r]) => row(b, shelfSub(b, r, key))).join('') :
        emptyState(empties[key][0], empties[key][1], key === 'mine' ? addBtn : '<button type="button" class="btn primary" data-act="tab" data-tab="explore">Explore books</button>')) + '</div>' +
      (missing ? '<p class="notice soft" role="note">' + plural(missing, 'saved record is', 'saved records are') + ' for books no longer in the catalog. They stay in your totals and backups.</p>' : '');
    applySizes(main);
    revealChip($('.chips', main));
  }

  // ---------- Progress ----------

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

  function renderProgress() {
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

    main.innerHTML =
      '<header class="view-head"><div><p class="kicker">' + esc(greeting()) + '</p><h1>My progress</h1></div></header>' +
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
        chartHtml(m, year) +
        (awaitingList.length ? '<section><h2 class="section-title">Ready for a quiz <small>' + awaitingList.length + '</small></h2><div class="list">' +
          awaitingList.map(([b, r]) => row(b, '<span>' + (r.finishedDate ? 'Finished ' + esc(fmtDay(r.finishedDate)) : 'Finished') + '</span>' + quizLine(b, r))).join('') + '</div></section>' : '') +
        '<section class="panel"><h2 class="section-title">Collections <small>books finished, all time</small></h2><div class="collections">' + colls + '</div></section>' +
      '</div>';
    applySizes(main);
    revealChip($('.chips', main));
    const chart = $('.chart', main);
    if (chart) chart.style.setProperty('--cols', chart.dataset.cols);
  }

  // ---------- More ----------

  function renderMore() {
    const total = Object.keys(state.records).filter(id => !C.isBlank(state.records[id])).length;
    const withPoints = CATALOG_BOOKS.filter(b => b._points !== null).length;
    const added = Object.keys(state.custom).length;
    const standalone = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const offline = {
      ready: ['ok', 'Ready offline', 'The app and book list are saved on this device.'],
      saving: ['', 'Saving for offline…', 'Keep the app open on Wi-Fi for a moment.'],
      checking: ['', 'Checking offline support…', ''],
      unsupported: ['warn', 'Offline mode is off here', 'Open the published website over https to use the app offline.'],
      failed: ['warn', 'Could not save for offline', 'Open the app again while online.']
    }[state.offline];
    const item = (kind, title, text) => '<li><span class="ico ' + kind + '">' + icon(kind === 'ok' ? 'ok' : kind === 'warn' ? 'alert' : 'info') + '</span><span><b>' + title + '</b>' + (text ? '<br><span class="hint">' + text + '</span>' : '') + '</span></li>';

    main.innerHTML =
      '<header class="view-head"><div><p class="kicker">' + esc(greeting()) + '</p><h1>More</h1></div></header>' +
      '<div class="settings-grid">' +
      '<div>' +
        '<section class="panel meet"><span class="face"><img src="img/dude-face.jpg" alt="" width="96" height="96"></span><div><h2>Meet the Dude</h2>' +
          '<p class="lead">Keeper of the Reading Room, Head of Cardigans, and world champion at losing glasses.</p>' +
          '<div class="row-actions"><button type="button" class="btn small primary" data-act="story">Read the Dude’s story</button></div></div></section>' +
        '<section class="panel"><h2>Make it yours</h2><div class="stack">' +
          '<label class="field"><span>Your name</span><input id="reader-name" class="input" type="text" maxlength="40" autocomplete="given-name" placeholder="What should the app call you?" value="' + esc(state.settings.readerName) + '"></label>' +
          '<div class="field"><span class="label" id="accent-label">Color</span><div class="accents" role="group" aria-labelledby="accent-label">' + Object.keys(ACCENTS).map(a =>
            '<button type="button" data-act="accent" data-accent="' + a + '" aria-label="' + ACCENTS[a] + '" aria-pressed="' + (state.settings.accent === a) + '"></button>').join('') + '</div></div>' +
        '</div></section>' +
        '<section class="panel"><h2>Backups</h2><p class="lead">Your shelves, notes, quiz points, and the books you added are saved only on this device. A backup file lets you move them to a new device or get them back if something goes wrong.</p>' +
          '<p class="hint">' + (state.settings.lastExportAt ? 'Last backup: ' + esc(fmtDay(localDay(state.settings.lastExportAt))) : 'No backup saved yet.') + ' · ' + plural(total, 'book record') + (added ? ' and ' + plural(added, 'added book') : '') + ' on this device.</p>' +
          '<div class="row-actions"><button type="button" class="btn primary" data-act="export">' + icon('download') + 'Save a backup</button>' +
          '<button type="button" class="btn" data-act="restore">' + icon('upload') + 'Restore from backup</button></div>' +
          '<input type="file" id="restore-file" accept=".json,application/json" hidden>' +
          '<p class="hint">Restoring adds books from the file and keeps whichever copy of each book was changed most recently. Nothing is deleted. Backup files contain your notes in plain text, so keep them somewhere private.</p>' +
        '</section>' +
      '</div><div>' +
        '<section class="panel"><h2>This device</h2><ul class="status-list">' +
          item(offline[0], offline[1], offline[2]) +
          (state.storage === 'memory' ? item('warn', 'Not saving', 'This browser is blocking storage (Private Browsing can do this). Changes will be lost when the app closes.') :
            state.persisted === true ? item('ok', 'Storage protected', 'This device has agreed to keep your journal.') :
            item('', 'Saved on this device', 'Clearing website data or deleting the app removes your journal. Save backups now and then.')) +
          (standalone ? item('ok', 'Installed', 'Running from the Home Screen.') : item('', 'Running in the browser', 'For the best experience, add the app to your Home Screen: tap Share, then Add to Home Screen. The Home Screen app keeps its own separate journal.')) +
        '</ul></section>' +
        '<section class="panel"><h2>About the books</h2><p class="lead">' + plural(CATALOG_BOOKS.length, 'book') + ' from Newbery, Beehive, Printz, Pulitzer, Carnegie, National Book Award, and classics lists. ' +
          withPoints + ' have AR details from a checked source; the other ' + (CATALOG_BOOKS.length - withPoints) + ' are not verified yet, and a blank never means zero.' +
          (added ? ' You added ' + plural(added, 'more book') + ' yourself.' : '') + '</p>' +
          '<p class="hint">Always confirm the quiz and edition with your school before counting points. Community scores were supplied with the list and are believed to be from Goodreads, but are not verified. Each book shows where its information came from.</p></section>' +
        '<section class="panel"><h2>Privacy</h2><p class="lead">No accounts, no ads, no tracking. Nothing you write leaves this device unless you save a backup file. Links to book sources open other websites.</p></section>' +
      '</div></div>';
  }

  // ---------- Book sheet ----------

  function levelMeaning(level) {
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
      extra += '<div class="box"><label class="field"><span>Finished on</span><input id="finished-date" class="input" type="date" value="' + esc(r.finishedDate) + '" max="' + today() + '"></label>' +
        '<div class="field"><span class="label" id="rating-label">My rating</span><div class="stars" role="group" aria-labelledby="rating-label">' +
        [1, 2, 3, 4, 5].map(n => '<button type="button" data-act="rate" data-n="' + n + '" aria-label="' + n + ' star' + (n > 1 ? 's' : '') + '" aria-pressed="' + (r.rating !== null && n <= r.rating) + '">' + icon('star') + '</button>').join('') + '</div></div></div>';
    }
    if (r.status === 'finished' || r.earnedPoints !== null) extra += quizBox(b, r);
    return '<div class="shelf-head"><h3 class="label">My shelf</h3><button type="button" class="fav-btn" data-act="fav" aria-pressed="' + r.favorite + '">' + icon('heart') + '<span>Favorite</span></button></div>' +
      '<div class="status-grid" role="group" aria-label="Shelf">' + statusButtons(r) + '</div>' + (extra ? '<div class="stack">' + extra + '</div>' : '');
  }

  function sheetBar(title) {
    return '<div class="sheet-bar"><span class="grab" aria-hidden="true"></span><p class="visually-hidden" id="sheet-title">' + esc(title) + '</p>' +
      '<span></span><button type="button" class="icon-btn" data-act="close-sheet" aria-label="Close">' + icon('x') + '</button></div>';
  }

  const dl = rows => '<dl class="facts">' + rows.map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('') + '</dl>';

  // Details for a book the reader added: everything here came from her.
  function customDetailsHtml(b) {
    const c = state.custom[b.book_id] || {};
    const notAdded = '<span class="hint">Not added</span>';
    return '<section class="box"><h3>About this book</h3>' +
        (b.description ? '<p class="desc">' + esc(b.description) + '</p>' : '<p class="hint">No description yet.</p>') +
        dl([
          ['AR book level', b.ar_level ? esc(b.ar_level) + ' <span class="hint">(' + levelMeaning(b.ar_level) + ')</span>' : notAdded],
          ['AR points', b._points !== null ? '<b>' + fmtNum(b._points) + '</b>' : notAdded],
          ['Added', c.createdAt ? esc(fmtDay(localDay(c.createdAt))) : notAdded]
        ]) +
        '<p class="small-print">You added this book, so these details came from you. Check AR numbers with your teacher or AR BookFinder.</p>' +
        '<div class="row-actions"><button type="button" class="btn" data-act="edit-book">' + icon('pencil') + 'Edit book</button>' +
        '<button type="button" class="btn ghost danger" data-act="delete-book">' + icon('trash') + 'Delete book</button></div></section>';
  }

  function sheetHtml(b) {
    const r = rec(b.book_id);
    const hero = '<section class="book-hero">' + cover(b) + '<div><h1>' + esc(b.title) + '</h1>' + (b.author ? '<p class="by">' + esc(b.author) + '</p>' : '') +
      '<div class="tags">' + levelTag(b) + pointsTag(b) + mineTag(b) + (b.ar_interest ? '<span class="tag">' + esc(b.ar_interest) + '</span>' : '') + (b.ages ? '<span class="tag">Ages ' + esc(b.ages) + '</span>' : '') + '</div></div></section>';
    const personal = '<section id="shelf-box" class="box" aria-label="My shelf">' + shelfHtml(b) + '</section>' +
      '<section class="box"><h3><label for="note">My notes</label></h3><textarea id="note" class="input" placeholder="Favorite parts, characters, words to remember, what you thought…">' + esc(r.note) + '</textarea>' +
      '<p class="hint" id="note-status">Private to this device. Saves as you type.</p></section>';
    if (b._custom) return sheetBar(b.title) + '<div class="sheet-body">' + hero + personal + customDetailsHtml(b) + '</div>';

    const facts = [];
    facts.push(['Year', esc(b.year) + (b.year_type === 'Publication' ? ' (published)' : ' (award year)')]);
    facts.push(['Ages', b.ages ? esc(b.ages) : '<span class="hint">Not listed</span>']);
    facts.push(['Genre', b.genre ? esc(b.genre) : '<span class="hint">Not listed</span>']);
    if (b.score) facts.push(['Community score', esc(b.score) + ' out of 5 <span class="hint">(supplied, believed Goodreads, not verified)</span>']);
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

  function openBook(id) {
    const b = BY_ID.get(id);
    if (!b) return;
    state.openId = id;
    sheet.innerHTML = sheetHtml(b);
    if (!sheet.open) sheet.showModal();
    sheet.scrollTop = 0;
  }

  // ---------- Books she adds ----------

  function newCustomId() {
    let id;
    do { id = C.CUSTOM_PREFIX + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); } while (state.custom[id] || BY_ID.has(id));
    return id;
  }

  function bookFormHtml(id, prefill) {
    const editing = !!id;
    const c = editing ? state.custom[id] : C.customBook({ title: prefill || '' });
    const shelfPick = editing ? '' : '<div class="field"><span class="label" id="bk-shelf-label">Put it on a shelf</span>' +
      '<div class="status-grid" role="group" aria-labelledby="bk-shelf-label">' + Object.keys(STATUS).map(k =>
        '<button type="button" class="status-btn" data-act="pick-status" data-status="' + k + '" aria-pressed="' + (k === 'want') + '">' + icon(STATUS[k].icon) + STATUS[k].label + '</button>').join('') + '</div></div>';
    return sheetBar(editing ? 'Edit ' + c.title : 'Add a book') +
      '<div class="sheet-body"><form class="stack" data-form="book" data-status="want" novalidate' + (editing ? ' data-id="' + esc(id) + '"' : '') + '>' +
        '<div><h1 class="form-title">' + (editing ? 'Edit your book' : 'Add your own book') + '</h1>' +
        (editing ? '' : '<p class="lead">For a book that isn’t in the Reading Room. It is saved on this device and in your backups.</p>') + '</div>' +
        '<label class="field"><span>Title</span><input id="bk-title" class="input" type="text" maxlength="200" autocomplete="off" autocapitalize="words" value="' + esc(c.title) + '"></label>' +
        '<label class="field"><span>Author <span class="hint">(optional)</span></span><input id="bk-author" class="input" type="text" maxlength="200" autocomplete="off" autocapitalize="words" value="' + esc(c.author) + '"></label>' +
        '<div class="two"><label class="field"><span>AR book level</span><input id="bk-level" class="input" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 4.5" value="' + esc(c.ar_level) + '"></label>' +
        '<label class="field"><span>AR points</span><input id="bk-points" class="input" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 6" value="' + esc(c.ar_points) + '"></label></div>' +
        '<p class="hint">Not sure? Leave these blank and add them later. You can look them up on <a href="https://www.arbookfind.com/" target="_blank" rel="noopener noreferrer">AR BookFinder</a> or ask your teacher.</p>' +
        '<label class="field"><span>What’s it about? <span class="hint">(optional)</span></span><textarea id="bk-desc" class="input" maxlength="2000" placeholder="A sentence or two, in your own words">' + esc(c.description) + '</textarea></label>' +
        shelfPick +
        '<div class="error" id="bk-error" role="alert" hidden></div>' +
        '<div class="row-actions"><button type="submit" class="btn primary">' + (editing ? 'Save changes' : icon('plus') + 'Add book') + '</button>' +
        '<button type="button" class="btn" data-act="' + (editing ? 'cancel-edit' : 'close-sheet') + '">Cancel</button></div>' +
      '</form></div>';
  }

  function openBookForm(id, prefill) {
    state.openId = id || null;
    sheet.innerHTML = bookFormHtml(id, prefill);
    if (!sheet.open) sheet.showModal();
    sheet.scrollTop = 0;
  }

  async function saveBookForm(form) {
    const err = $('#bk-error', form);
    const fail = html => { err.innerHTML = html; err.hidden = false; };
    const value = sel => $(sel, form).value.trim();
    const title = value('#bk-title');
    const author = value('#bk-author');
    const level = value('#bk-level').replace(',', '.');
    const points = value('#bk-points').replace(',', '.');
    const description = value('#bk-desc');
    if (!title) return fail('Give your book a title.');
    if (level && (!/^\d+(\.\d+)?$/.test(level) || Number(level) > 20)) return fail('AR book level must be a number, like 4.5.');
    if (points && (!/^\d+(\.\d+)?$/.test(points) || Number(points) > 999)) return fail('AR points must be a number, like 6.');
    const editingId = form.dataset.id || '';
    if (!editingId && !form.dataset.allowDupe) {
      const dupe = BOOKS.find(b => C.fold(b.title) === C.fold(title));
      if (dupe) {
        return fail('<b>' + esc(dupe.title) + '</b>' + (dupe.author ? ' by ' + esc(dupe.author) : '') + (dupe._custom ? ' is already in your books.' : ' is already in the Reading Room.') +
          '<div class="row-actions"><button type="button" class="btn small primary" data-act="open" data-id="' + esc(dupe.book_id) + '">Open it</button>' +
          '<button type="button" class="btn small" data-act="allow-dupe">Add mine anyway</button></div>');
      }
    }
    const now = new Date().toISOString();
    const id = editingId || newCustomId();
    const prev = state.custom[id];
    const book = C.customBook({ id, title, author, ar_level: level, ar_points: points, description, createdAt: prev ? prev.createdAt : now, updatedAt: now });
    try {
      await db.putBooks([book]);
    } catch (e) {
      return fail('This device would not save the book. Try again.');
    }
    state.custom[id] = book;
    rebuildBooks();
    state.dirty = true;
    requestPersistence();
    const status = editingId ? '' : form.dataset.status;
    if (status) {
      const patch = { status };
      if (status === 'reading') patch.startedDate = today();
      if (status === 'finished') { patch.finishedDate = today(); patch.progress = 100; }
      await save(id, patch);
    }
    openBook(id);
    toast(editingId ? 'Book updated.' : 'Added “' + book.title + '” to your books!');
  }

  function refreshShelf() {
    const b = BY_ID.get(state.openId);
    const box = $('#shelf-box', sheet);
    if (b && box) box.innerHTML = shelfHtml(b);
  }

  let noteTimer = 0;
  let notePending = null;
  function flushNote() {
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

  function closeSheet() {
    if (sheet.open) sheet.close();
  }

  sheet.addEventListener('close', () => {
    flushNote();
    state.openId = null;
    // Her books changed, so let the Dude talk about them again.
    if (state.dirty) { state.dirty = false; state.sayingOffset = 0; render(true); }
  });
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
  confirmBox.addEventListener('click', e => { if (e.target === confirmBox) confirmBox.close(); });

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
    await save(id, { earnedPoints: pts, quizDate: date || r.quizDate || today() });
    refreshShelf();
    if (pts > 0 && wasBlank) celebrate();
    const over = b && b._points !== null && pts > b._points;
    toast(over ? 'Saved. That is more than this book’s listed ' + fmtNum(b._points) + ' points, so double-check it.' : wasBlank ? 'Quiz result saved: ' + plural(pts, 'point') + '!' + (pts > 0 ? ' ' + DUDE.dog + ' wants a high five.' : '') : 'Quiz result updated.');
  }

  // ---------- Backups ----------

  function download(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function markExported() {
    saveSetting('lastExportAt', new Date().toISOString()).then(() => { if (!sheet.open) render(true); });
    toast('Backup saved. Keep the file somewhere private.');
  }

  function exportBackup() {
    flushNote();
    const data = C.exportBackup(state.records, state.settings, undefined, state.custom);
    const text = JSON.stringify(data, null, 2);
    const name = 'book-dude-backup-' + today() + '.json';
    let file = null;
    try { file = new File([text], name, { type: 'application/json' }); } catch (e) { file = null; }
    if (file && coarse() && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Reading Room backup' }).then(markExported, err => {
        if (!err || err.name !== 'AbortError') { download(name, text); markExported(); }
      });
      return;
    }
    download(name, text);
    markExported();
  }

  function showConfirm(title, bodyHtml, okLabel, onOk) {
    confirmBox.innerHTML = '<div class="sheet-bar"><span class="grab" aria-hidden="true"></span><h2 id="confirm-title">' + esc(title) + '</h2>' +
      '<button type="button" class="icon-btn" data-act="close-confirm" aria-label="Close">' + icon('x') + '</button></div>' +
      '<div class="confirm-body">' + bodyHtml + '<div class="row-actions">' +
      (okLabel ? '<button type="button" class="btn primary" data-act="confirm-ok">' + esc(okLabel) + '</button><button type="button" class="btn" data-act="close-confirm">Cancel</button>' : '<button type="button" class="btn primary" data-act="close-confirm">OK</button>') +
      '</div></div>';
    confirmBox.onOk = onOk || null;
    confirmBox.showModal();
  }

  async function restoreFile(file) {
    if (!file) return;
    if (file.size > 20e6) { showConfirm('Could not restore', '<p>That file is too large to be a Reading Room backup.</p>'); return; }
    let parsed;
    try {
      parsed = C.parseBackup(await file.text(), BOOKS);
    } catch (e) {
      showConfirm('Could not restore', '<p>' + esc(e instanceof C.BackupError ? e.message : 'That file could not be read.') + '</p><p class="hint">Nothing on this device was changed.</p>');
      return;
    }
    await flushNote();
    const plan = C.mergeBackup(state.records, state.settings.goals, parsed, state.custom);
    const newGoals = Object.keys(parsed.goals).filter(y => !Object.prototype.hasOwnProperty.call(state.settings.goals, y));
    const takeName = !state.settings.readerName && parsed.readerName;
    if (!plan.added && !plan.updated && !plan.changedBooks.length && !newGoals.length && !takeName) {
      showConfirm('Already up to date', '<p>Everything in this backup is already on this device (or this device has newer changes).</p>');
      return;
    }
    const lines = ['<li>' + plural(parsed.total, 'book record') + ' in the file' + (parsed.legacy ? ' (from the older reading-list app; checkmarks become Finished, with no quiz points)' : '') + '</li>'];
    if (plan.added) lines.push('<li>' + plan.added + ' new to this device</li>');
    if (plan.updated) lines.push('<li>' + plan.updated + ' newer than the copy on this device</li>');
    if (plan.kept) lines.push('<li>' + plan.kept + ' left as they are (this device has the same or newer)</li>');
    if (parsed.unknown) lines.push('<li>' + parsed.unknown + ' for books not in the current catalog (kept anyway)</li>');
    if (plan.booksAdded) lines.push('<li>' + plural(plan.booksAdded, 'book you added', 'books you added') + ', new to this device</li>');
    if (plan.booksUpdated) lines.push('<li>' + plural(plan.booksUpdated, 'added book', 'added books') + ' with newer details</li>');
    if (newGoals.length) lines.push('<li>' + plural(newGoals.length, 'yearly goal') + ' added</li>');
    showConfirm('Restore this backup?', '<ul>' + lines.join('') + '</ul><p class="hint">Nothing on this device is deleted.' + (parsed.exportedAt ? ' Backup made ' + esc(fmtDay(localDay(parsed.exportedAt))) + '.' : '') + '</p>', 'Restore', async () => {
      const changed = plan.changed.map(id => plan.records[id]);
      try {
        await db.putBooks(plan.changedBooks.map(id => plan.customBooks[id]));
        await db.putRecords(changed);
      } catch (e) {
        showConfirm('Could not restore', '<p>The device would not save everything from the backup. Try restoring again.</p>');
        return;
      }
      state.custom = plan.customBooks;
      rebuildBooks();
      state.records = plan.records;
      if (newGoals.length) await saveSetting('goals', plan.goals);
      if (takeName) await saveSetting('readerName', parsed.readerName);
      render(true);
      toast('Restored ' + plural(new Set(plan.changed.concat(plan.changedBooks)).size, 'book') + '.');
    });
  }

  // ---------- Offline and updates ----------

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

  function registerWorker() {
    const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!('serviceWorker' in navigator) || !secure) { setOffline('unsupported'); return; }
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (updating) location.reload();
    });
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
      navigator.serviceWorker.ready.then(() => setOffline('ready'));
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine !== false) reg.update().catch(() => {});
      });
    }).catch(() => setOffline('failed'));
  }

  // ---------- Rendering & routing ----------

  function setTabs() {
    $$('.tab').forEach(t => {
      if (t.dataset.tab === state.tab) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
  }

  function render(keepScroll) {
    const y = window.scrollY;
    setTabs();
    if (state.tab === 'explore') {
      if (keepScroll && $('#results')) {
        updateResults();
        const line = $('.bubble .line');
        if (line) line.textContent = dudeLine();
      } else renderExplore();
    } else if (state.tab === 'shelves') renderShelves();
    else if (state.tab === 'progress') renderProgress();
    else renderMore();
    if (keepScroll) window.scrollTo(0, y);
  }

  function route() {
    const next = location.hash.slice(1);
    const tab = TABS.includes(next) ? next : 'explore';
    if (tab === state.tab && $('#main > :not(.loading)')) return;
    state.scroll[state.tab] = window.scrollY;
    state.tab = tab;
    state.editingGoal = null;
    render();
    window.scrollTo(0, state.scroll[tab] || 0);
  }

  function goTab(tab) {
    if (tab === state.tab) { window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }); return; }
    if (location.hash !== '#' + tab) location.hash = tab;
    else route();
  }

  function applyAccent() {
    document.documentElement.dataset.accent = state.settings.accent || 'leather';
  }

  // ---------- Events ----------

  const actions = {
    tab: el => { closeSheet(); goTab(el.dataset.tab); },
    open: el => openBook(el.dataset.id),
    'close-sheet': closeSheet,
    'close-confirm': () => confirmBox.close(),
    'confirm-ok': () => { const fn = confirmBox.onOk; confirmBox.close(); if (fn) fn(); },
    'toggle-filters': el => {
      state.filtersOpen = !state.filtersOpen;
      el.setAttribute('aria-expanded', String(state.filtersOpen));
      $('#filters').hidden = !state.filtersOpen;
    },
    collection: el => { state.filters.collection = el.dataset.key; resetResults(); },
    'clear-filter': el => {
      const k = el.dataset.key;
      if (k === 'query') { state.query = ''; $('#q').value = ''; }
      else state.filters[k] = DEFAULT_FILTERS[k];
      const control = $('[data-filter="' + k + '"]');
      if (control) control.value = '';
      if (k === 'hideFinished') $('#hide-finished').checked = false;
      resetResults();
    },
    'reset-filters': () => {
      state.filters = Object.assign({}, DEFAULT_FILTERS, { collection: state.filters.collection });
      $$('[data-filter]').forEach(s => { if (s.dataset.filter !== 'sort') s.value = ''; });
      $('#hide-finished').checked = false;
      resetResults();
    },
    'reset-all': () => { state.filters = Object.assign({}, DEFAULT_FILTERS); state.query = ''; state.limit = PAGE; saveUi(); renderExplore(); },
    layout: el => {
      state.layout = el.dataset.layout;
      $$('[data-act="layout"]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
      saveUi();
      updateResults();
    },
    more: showMore,
    // The cat naps on a random unfinished book from the current results.
    surprise: () => {
      const pool = lastResults.filter(b => { const r = state.records[b.book_id]; return !r || r.status !== 'finished'; });
      const list = pool.length ? pool : lastResults;
      if (!list.length) { toast(DUDE.cat + ' couldn’t find a book to nap on. Try fewer filters.'); return; }
      openBook(list[Math.floor(Math.random() * list.length)].book_id);
      toast(DUDE.cat + ' fell asleep on this one. That means it’s good.');
    },
    story: () => openStory(),
    'next-saying': el => {
      state.sayingOffset += 1;
      $('.line', el).textContent = dudeLine();
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    },
    'dismiss-tip': () => { state.installTipDismissed = true; saveUi(); const tip = $('#install-tip'); if (tip) tip.remove(); },
    shelf: el => { state.shelf = el.dataset.shelf; saveUi(); renderShelves(); },
    'shelf-go': el => { state.shelf = el.dataset.shelf; saveUi(); goTab('shelves'); },
    period: el => { state.period = el.dataset.period; state.editingGoal = null; saveUi(); renderProgress(); },
    'edit-goal': () => { state.editingGoal = state.period; renderProgress(); const input = $('#goal-input'); if (input) input.focus(); },
    'remove-goal': async () => {
      const goals = Object.assign({}, state.settings.goals);
      delete goals[state.period];
      state.editingGoal = null;
      await saveSetting('goals', goals);
      renderProgress();
    },
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
    },
    'clear-quiz': () => {
      showConfirm('Clear this quiz result?', '<p>The book stays Finished. It will show as awaiting a quiz entry again.</p>', 'Clear result', async () => {
        await save(state.openId, { earnedPoints: null, quizDate: '' });
        refreshShelf();
        toast('Quiz result cleared.');
      });
    },
    export: exportBackup,
    'add-book': el => openBookForm(null, el.dataset.title || ''),
    'edit-book': () => { flushNote(); openBookForm(state.openId); },
    'cancel-edit': () => openBook(state.openId),
    'pick-status': el => {
      const form = el.closest('form');
      const next = form.dataset.status === el.dataset.status ? '' : el.dataset.status;
      form.dataset.status = next;
      $$('[data-act="pick-status"]', form).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.status === next)));
    },
    'allow-dupe': el => {
      const form = el.closest('form');
      form.dataset.allowDupe = '1';
      saveBookForm(form);
    },
    'delete-book': () => {
      const id = state.openId;
      const c = state.custom[id];
      if (!c) return;
      showConfirm('Delete this book?', '<p><b>' + esc(c.title) + '</b> will be removed from this device, along with its shelf, notes, and quiz result.</p><p class="hint">Backups you already saved still include it.</p>', 'Delete book', async () => {
        try {
          await db.deleteBook(id);
        } catch (e) {
          toast('Could not delete the book. Try again.');
          return;
        }
        delete state.custom[id];
        delete state.records[id];
        rebuildBooks();
        state.dirty = true;
        closeSheet();
        toast('Book deleted.');
      });
    },
    restore: () => { const input = $('#restore-file'); input.value = ''; input.click(); },
    accent: async el => {
      await saveSetting('accent', el.dataset.accent);
      applyAccent();
      $$('[data-act="accent"]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
    },
    'update-app': () => {
      if (!waitingWorker) { location.reload(); return; }
      updating = true;
      flushNote().then(() => {
        waitingWorker.postMessage('ACTIVATE');
        setTimeout(() => location.reload(), 4000);
      });
    }
  };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || !actions[el.dataset.act]) return;
    if (el.tagName === 'A') e.preventDefault();
    actions[el.dataset.act](el, e);
  });
  $('.brand').addEventListener('click', e => { e.preventDefault(); goTab('explore'); });

  let searchTimer = 0;
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'q') {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.query = t.value; resetResults(); }, 140);
    } else if (t.id === 'note') {
      notePending = { id: state.openId, text: t.value };
      const status = $('#note-status', sheet);
      if (status) status.textContent = 'Saving…';
      clearTimeout(noteTimer);
      noteTimer = setTimeout(flushNote, 600);
    } else if (t.id === 'progress') {
      $('#progress-out', sheet).textContent = t.value + '%';
    }
    const form = t.closest && t.closest('form[data-form]');
    const error = form && $('.error', form);
    if (error && !error.hidden) error.hidden = true;
  });

  document.addEventListener('change', async e => {
    const t = e.target;
    if (t.dataset.filter) {
      if (t.dataset.filter === 'sort') state.sort = t.value;
      else state.filters[t.dataset.filter] = t.value;
      resetResults();
    } else if (t.id === 'hide-finished') {
      state.filters.hideFinished = t.checked;
      resetResults();
    } else if (t.id === 'progress') {
      await save(state.openId, { progress: Number(t.value) });
    } else if (t.id === 'started-date' || t.id === 'finished-date') {
      const value = C.day(t.value);
      await save(state.openId, t.id === 'started-date' ? { startedDate: value } : { finishedDate: value });
    } else if (t.id === 'reader-name') {
      await saveSetting('readerName', t.value.trim().slice(0, 40));
      toast(state.settings.readerName ? 'Hi, ' + state.settings.readerName + '!' : 'Name removed.');
    } else if (t.id === 'restore-file') {
      restoreFile(t.files && t.files[0]);
    }
  });

  document.addEventListener('submit', async e => {
    const form = e.target;
    if (form.dataset.form === 'quiz') { e.preventDefault(); saveQuiz(form); }
    else if (form.dataset.form === 'book') { e.preventDefault(); saveBookForm(form); }
    else if (form.dataset.form === 'goal') {
      e.preventDefault();
      const raw = $('#goal-input').value.trim().replace(',', '.');
      if (raw && (!/^\d+(\.\d+)?$/.test(raw) || Number(raw) > 100000)) { toast('A goal must be a number, like 50.'); return; }
      const goals = Object.assign({}, state.settings.goals);
      if (Number(raw) > 0) goals[state.period] = Number(raw); else delete goals[state.period];
      state.editingGoal = null;
      await saveSetting('goals', goals);
      renderProgress();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'q') e.target.blur();
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('pagehide', flushNote);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushNote(); });

  // ---------- Start ----------

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
    rebuildBooks();
    const s = loaded.settings;
    if (s.goals && typeof s.goals === 'object') state.settings.goals = s.goals;
    if (typeof s.readerName === 'string') state.settings.readerName = s.readerName;
    if (typeof s.accent === 'string') state.settings.accent = s.accent;
    if (typeof s.lastExportAt === 'string') state.settings.lastExportAt = s.lastExportAt;
    state.settings.storySeen = s.storySeen === true;
    applyAccent();
    if (!loaded.ok) {
      const warn = $('#storage-warning');
      warn.textContent = 'This browser is not letting the app save (Private Browsing can do this). Changes will be lost when you close it.';
      warn.hidden = false;
    }
    if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(p => { state.persisted = p; }).catch(() => {});
    const initial = location.hash.slice(1);
    state.tab = TABS.includes(initial) ? initial : 'explore';
    render();
    // A brand-new reader meets the Dude first.
    const isNew = !Object.keys(state.records).length && !Object.keys(state.custom).length;
    if (!state.settings.storySeen && isNew) openStory();
    registerWorker();
  }

  start();
})();
