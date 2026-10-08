/* Reading Room core: records, dashboard math, and backups. No DOM access, so tests run it in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ReadingCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STATUSES = ['want', 'reading', 'finished', 'paused'];
  const BACKUP_VERSION = 1;
  const UNSAFE_IDS = ['__proto__', 'constructor', 'prototype'];
  const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
  const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const NUMBER_RE = /^\s*\d+(\.\d+)?\s*$/;
  const LIMITS = { earnedPoints: 999, progress: 100, rating: 5 };
  const DATE_FIELDS = ['startedDate', 'finishedDate', 'quizDate'];
  // Books the reader adds herself get IDs with this prefix; the catalog never uses it.
  const CUSTOM_PREFIX = 'mine:';
  const CUSTOM_TEXT = { title: 200, author: 200, description: 2000 };
  const CUSTOM_NUMBERS = { ar_level: 20, ar_points: 999 };

  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const round = n => Math.round(n * 100) / 100;

  class BackupError extends Error {}

  /** A real calendar date as YYYY-MM-DD, or '' (2026-02-29 is not a date). */
  function day(value) {
    if (typeof value !== 'string') return '';
    const m = DAY_RE.exec(value.trim());
    if (!m) return '';
    const y = +m[1], mo = +m[2], d = +m[3];
    const date = new Date(Date.UTC(y, mo - 1, d));
    return y >= 1000 && date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? m[0] : '';
  }

  /** null when blank, a number when valid, NaN when present but invalid. */
  function amount(value, max) {
    if (value === null || value === undefined || value === '') return null;
    let n = NaN;
    if (typeof value === 'number') n = value;
    else if (typeof value === 'string' && NUMBER_RE.test(value)) n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= max ? n : NaN;
  }

  function stamp(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
    return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : '';
  }

  /** A complete, JSON-safe personal record. Blank stays blank: null points are "no quiz result yet". */
  function entry(o) {
    o = isPlain(o) ? o : {};
    const num = field => { const n = amount(o[field], LIMITS[field]); return Number.isNaN(n) ? null : n; };
    return {
      id: typeof o.id === 'string' ? o.id : '',
      status: STATUSES.includes(o.status) ? o.status : '',
      favorite: o.favorite === true,
      note: typeof o.note === 'string' ? o.note : '',
      progress: num('progress'),
      rating: num('rating'),
      startedDate: day(o.startedDate),
      finishedDate: day(o.finishedDate),
      earnedPoints: num('earnedPoints'),
      quizDate: day(o.quizDate),
      updatedAt: stamp(o.updatedAt)
    };
  }

  /** True when a record holds nothing worth keeping. */
  function isBlank(r) {
    return !r.status && !r.favorite && !r.note.trim() && r.progress === null && r.rating === null &&
      !r.startedDate && !r.finishedDate && r.earnedPoints === null && !r.quizDate;
  }

  function safeId(id) {
    return typeof id === 'string' && ID_RE.test(id) && !UNSAFE_IDS.includes(id);
  }

  function knownPoints(book) {
    const n = book ? amount(book.ar_points, Infinity) : null;
    return typeof n === 'number' && !Number.isNaN(n) ? n : null;
  }

  const REWARD_DEFAULT = { on: true, every: 100, prize: '$10 of Barnes & Noble book money', paid: 0 };

  /** Book-money settings: every `every` AR points earns `prize`; `paid` counts prizes already handed over. */
  function reward(o) {
    o = isPlain(o) ? o : {};
    const whole = (v, min, max, fallback) => {
      const n = amount(v, max);
      return typeof n === 'number' && !Number.isNaN(n) && Number.isInteger(n) && n >= min ? n : fallback;
    };
    return {
      on: o.on === undefined ? REWARD_DEFAULT.on : o.on === true,
      every: whole(o.every, 1, 10000, REWARD_DEFAULT.every),
      prize: typeof o.prize === 'string' && o.prize.trim() ? o.prize.trim().slice(0, 80) : REWARD_DEFAULT.prize,
      paid: whole(o.paid, 0, 10000, REWARD_DEFAULT.paid),
      updatedAt: stamp(o.updatedAt)
    };
  }

  /** Prizes earned from all-time points, prizes still owed, and progress toward the next one. */
  function rewardStatus(totalPoints, settings) {
    const cfg = reward(settings);
    const total = Math.max(0, Number(totalPoints) || 0);
    const earned = Math.floor(total / cfg.every + 1e-9);
    const into = Math.max(0, round(total - earned * cfg.every));
    return { earned, owed: Math.max(0, earned - cfg.paid), into, toGo: round(cfg.every - into), frac: into / cfg.every, every: cfg.every, prize: cfg.prize };
  }

  function isCustomId(id) {
    return safeId(id) && id.indexOf(CUSTOM_PREFIX) === 0 && id.length > CUSTOM_PREFIX.length;
  }

  /**
   * A book the reader added herself, shaped like a catalog row where it matters
   * (ar_points and ar_level are text, blank when unknown).
   */
  function customBook(o) {
    o = isPlain(o) ? o : {};
    const out = { id: typeof o.id === 'string' ? o.id : '' };
    for (const field of Object.keys(CUSTOM_TEXT)) out[field] = typeof o[field] === 'string' ? o[field].trim().slice(0, CUSTOM_TEXT[field]) : '';
    for (const field of Object.keys(CUSTOM_NUMBERS)) {
      const n = amount(o[field], CUSTOM_NUMBERS[field]);
      out[field] = typeof n === 'number' && !Number.isNaN(n) ? String(n) : '';
    }
    out.createdAt = stamp(o.createdAt);
    out.updatedAt = stamp(o.updatedAt);
    return out;
  }

  function yearBucket(years, y) {
    if (!has(years, y)) years[y] = { earned: 0, finished: 0 };
    return years[y];
  }

  /**
   * Dashboard totals for a year ('2026') or all time (blank).
   * Earned points count by quiz date, finished books by completion date.
   * Reading is always today's count. Undated completions count only in all time.
   */
  function metrics(books, records, period) {
    const year = /^\d{4}$/.test(String(period || '')) ? String(period) : '';
    const byId = new Map((books || []).map(b => [b.book_id, b]));
    const m = {
      period: year || 'all', earned: 0, quizzes: 0, finished: 0, reading: 0, awaiting: 0, potential: 0, unknown: 0, undated: 0,
      months: year ? new Array(12).fill(0) : [], monthsFinished: year ? new Array(12).fill(0) : [], years: {}
    };
    for (const id of Object.keys(records || {})) {
      const r = records[id];
      if (!r) continue;
      if (r.status === 'reading') m.reading++;
      const quizDay = String(r.quizDate || '');
      if (r.earnedPoints !== null && r.earnedPoints !== undefined) {
        if (!year || quizDay.slice(0, 4) === year) { m.earned += r.earnedPoints; m.quizzes++; }
        if (year && quizDay.slice(0, 4) === year) m.months[+quizDay.slice(5, 7) - 1] += r.earnedPoints;
        if (quizDay) yearBucket(m.years, quizDay.slice(0, 4)).earned += r.earnedPoints;
      }
      if (r.status === 'finished') {
        const done = String(r.finishedDate || '');
        if (!done) m.undated++;
        else yearBucket(m.years, done.slice(0, 4)).finished++;
        if (year && done.slice(0, 4) !== year) continue;
        m.finished++;
        if (year) m.monthsFinished[+done.slice(5, 7) - 1]++;
        if (r.earnedPoints === null || r.earnedPoints === undefined) {
          m.awaiting++;
          const pts = knownPoints(byId.get(id));
          if (pts === null) m.unknown++;
          else m.potential += pts;
        }
      }
    }
    m.earned = round(m.earned);
    m.potential = round(m.potential);
    m.months = m.months.map(round);
    for (const y of Object.keys(m.years)) m.years[y].earned = round(m.years[y].earned);
    return m;
  }

  /** Years worth offering in the dashboard picker, newest first, always including this year. */
  function periods(records, today) {
    const years = new Set([String(today || new Date().toISOString()).slice(0, 4)]);
    for (const r of Object.values(records || {})) {
      for (const d of [r.finishedDate, r.quizDate]) if (d) years.add(String(d).slice(0, 4));
    }
    return [...years].sort().reverse();
  }

  // ---- Backups ----

  const fold = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  function catalogIndex(books) {
    const ids = new Set(), byName = new Map(), titleCount = new Map(), byTitle = new Map();
    for (const b of books || []) {
      ids.add(b.book_id);
      byName.set(fold(b.title) + '|' + fold(b.author), b.book_id);
      const t = fold(b.title);
      titleCount.set(t, (titleCount.get(t) || 0) + 1);
      byTitle.set(t, b.book_id);
    }
    for (const [t, n] of titleCount) if (n > 1) byTitle.delete(t);
    return { ids, byName, byTitle };
  }

  /** Older reading-list keys look like "title-slug--author-slug". */
  function legacyMatch(key, index) {
    if (index.ids.has(key)) return key;
    const cut = key.indexOf('--');
    if (cut > 0) {
      const hit = index.byName.get(fold(key.slice(0, cut)) + '|' + fold(key.slice(cut + 2)));
      if (hit) return hit;
    }
    return index.byTitle.get(fold(cut > 0 ? key.slice(0, cut) : key)) || key;
  }

  function checkId(id) {
    if (!safeId(id)) throw new BackupError('This backup contains a book ID the app cannot accept: ' + JSON.stringify(String(id).slice(0, 60)));
  }

  function strictRecord(id, raw) {
    if (!isPlain(raw)) throw new BackupError('Book record ' + id + ' is not readable.');
    const bad = field => { throw new BackupError('Book record ' + id + ' has an invalid ' + field + '.'); };
    for (const field of Object.keys(LIMITS)) if (has(raw, field) && Number.isNaN(amount(raw[field], LIMITS[field]))) bad(field);
    for (const field of DATE_FIELDS) if (has(raw, field) && raw[field] !== '' && raw[field] !== null && !day(raw[field])) bad(field);
    if (has(raw, 'status') && raw.status !== '' && raw.status !== null && !STATUSES.includes(raw.status)) bad('status');
    if (has(raw, 'note') && raw.note !== null && typeof raw.note !== 'string') bad('note');
    if (has(raw, 'favorite') && raw.favorite !== null && typeof raw.favorite !== 'boolean') bad('favorite');
    if (has(raw, 'updatedAt') && raw.updatedAt && !stamp(raw.updatedAt)) bad('updatedAt');
    return entry(Object.assign({}, raw, { id }));
  }

  function strictCustomBook(id, raw) {
    if (!isCustomId(id)) throw new BackupError('A book added in this backup has an ID the app cannot accept.');
    if (!isPlain(raw)) throw new BackupError('A book added in this backup is not readable.');
    const name = typeof raw.title === 'string' && raw.title.trim() ? '"' + raw.title.trim().slice(0, 60) + '"' : id;
    const bad = field => { throw new BackupError('The added book ' + name + ' has an invalid ' + field + '.'); };
    for (const field of Object.keys(CUSTOM_TEXT)) if (has(raw, field) && raw[field] !== null && typeof raw[field] !== 'string') bad(field);
    if (typeof raw.title !== 'string' || !raw.title.trim()) bad('title');
    for (const field of Object.keys(CUSTOM_NUMBERS)) if (has(raw, field) && Number.isNaN(amount(raw[field], CUSTOM_NUMBERS[field]))) bad(field === 'ar_level' ? 'AR level' : 'AR points');
    for (const field of ['createdAt', 'updatedAt']) if (has(raw, field) && raw[field] && !stamp(raw[field])) bad(field);
    return customBook(Object.assign({}, raw, { id }));
  }

  function parseCustomBooks(list) {
    const out = {};
    if (list === undefined || list === null) return out;
    if (!isPlain(list)) throw new BackupError('The books added in this backup are not readable.');
    for (const id of Object.keys(list)) {
      checkId(id);
      out[id] = strictCustomBook(id, list[id]);
    }
    return out;
  }

  function parseGoals(goals) {
    const out = {};
    if (goals === undefined || goals === null) return out;
    if (!isPlain(goals)) throw new BackupError('The reading goals in this backup are not readable.');
    for (const y of Object.keys(goals)) {
      const n = amount(goals[y], 100000);
      if (!/^\d{4}$/.test(y) || Number.isNaN(n)) throw new BackupError('The reading goal for ' + y.slice(0, 8) + ' is not valid.');
      if (n) out[y] = n;
    }
    return out;
  }

  function parseCurrent(data, index) {
    if (data.version !== BACKUP_VERSION) {
      throw new BackupError(typeof data.version === 'number' && data.version > BACKUP_VERSION
        ? 'This backup came from a newer version of the app. Update the app, then try again.'
        : 'This backup version is not supported.');
    }
    if (!isPlain(data.records)) throw new BackupError('This backup has no book records.');
    const records = {};
    for (const id of Object.keys(data.records)) {
      checkId(id);
      records[id] = strictRecord(id, data.records[id]);
    }
    const settings = isPlain(data.settings) ? data.settings : {};
    const readerName = typeof settings.readerName === 'string' ? settings.readerName.trim().slice(0, 40) : '';
    if (settings.reward !== undefined && settings.reward !== null && !isPlain(settings.reward)) throw new BackupError('The book-money settings in this backup are not readable.');
    const prize = isPlain(settings.reward) ? reward(settings.reward) : null;
    return finish(records, parseGoals(settings.goals), index, { legacy: false, readerName, reward: prize, exportedAt: stamp(data.exportedAt) }, parseCustomBooks(data.customBooks));
  }

  function parseLegacy(data, index) {
    if (data.version !== undefined && data.version !== 1 && data.version !== 2) throw new BackupError('This reading-list backup version is not supported.');
    const updatedAt = stamp(data.updated);
    const records = {};
    for (const key of Object.keys(data.books)) {
      checkId(key);
      const v = data.books[key];
      const old = isPlain(v) ? v : { read: v === true };
      const read = old.read === true;
      const note = typeof old.note === 'string' ? old.note : typeof old.notes === 'string' ? old.notes : '';
      const favorite = old.favorite === true;
      if (!read && !note.trim() && !favorite) continue;
      const id = legacyMatch(key, index);
      const prior = has(records, id) ? records[id] : null;
      records[id] = entry({
        id,
        status: read || (prior && prior.status === 'finished') ? 'finished' : '',
        favorite: favorite || !!(prior && prior.favorite),
        note: prior && prior.note ? prior.note + (note ? '\n\n' + note : '') : note,
        updatedAt
      });
    }
    return finish(records, {}, index, { legacy: true, readerName: '', reward: null, exportedAt: updatedAt });
  }

  function finish(records, goals, index, extra, customBooks) {
    const ids = Object.keys(records);
    const books = customBooks || {};
    return Object.assign({
      records, goals, customBooks: books, total: ids.length, customCount: Object.keys(books).length,
      unknown: ids.filter(id => !index.ids.has(id) && !has(books, id)).length
    }, extra);
  }

  /** Validates and normalizes a backup (current or older reading-list format). Throws BackupError with a readable message. */
  function parseBackup(input, books) {
    let data = input;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { throw new BackupError('This file is not a backup (it is not valid JSON).'); }
    }
    if (!isPlain(data)) throw new BackupError('This file is not a Reading Room backup.');
    const index = catalogIndex(books);
    if (data.app === 'reading-room') return parseCurrent(data, index);
    if (isPlain(data.books)) return parseLegacy(data, index);
    throw new BackupError('This file is not a Reading Room backup.');
  }

  /**
   * Restore: the newer copy of each book record (and each added book, and the book-money settings) wins;
   * goals already on this device win. Nothing on the device is removed.
   */
  function mergeBackup(localRecords, localGoals, incoming, localCustom, localReward) {
    const time = r => { const t = Date.parse(r.updatedAt); return Number.isNaN(t) ? -Infinity : t; };
    function merge(local, next) {
      const out = Object.assign({}, local);
      const changed = [];
      let added = 0, updated = 0, kept = 0;
      for (const id of Object.keys(next || {})) {
        const cur = has(out, id) ? out[id] : null;
        if (!cur) { out[id] = next[id]; changed.push(id); added++; }
        else if (time(next[id]) > time(cur)) { out[id] = next[id]; changed.push(id); updated++; }
        else kept++;
      }
      return { out, changed, added, updated, kept };
    }
    const r = merge(localRecords, incoming.records);
    const b = merge(localCustom, incoming.customBooks);
    const rewardChanged = !!incoming.reward && (!localReward || time(incoming.reward) > time(localReward));
    return {
      records: r.out, changed: r.changed, added: r.added, updated: r.updated, kept: r.kept,
      customBooks: b.out, changedBooks: b.changed, booksAdded: b.added, booksUpdated: b.updated,
      goals: Object.assign({}, incoming.goals, localGoals),
      reward: rewardChanged ? incoming.reward : localReward || null, rewardChanged
    };
  }

  function exportBackup(records, settings, now, customBooks) {
    const out = {};
    for (const id of Object.keys(records || {}).sort()) if (!isBlank(records[id])) out[id] = records[id];
    const books = {};
    for (const id of Object.keys(customBooks || {}).sort()) books[id] = customBooks[id];
    return {
      app: 'reading-room',
      version: BACKUP_VERSION,
      exportedAt: now || new Date().toISOString(),
      records: out,
      customBooks: books,
      settings: Object.assign(
        { goals: Object.assign({}, settings && settings.goals), readerName: (settings && settings.readerName) || '' },
        settings && settings.reward ? { reward: reward(settings.reward) } : {}
      )
    };
  }

  return {
    STATUSES, BACKUP_VERSION, CUSTOM_PREFIX, BackupError, day, entry, isBlank, safeId, isCustomId, customBook, knownPoints,
    reward, rewardStatus, metrics, periods, parseBackup, mergeBackup, exportBackup, fold
  };
});
