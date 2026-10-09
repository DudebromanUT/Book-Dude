/* Small helpers every part of the app uses: finding elements, escaping text, dates and numbers,
 * plus the shared core (docs/core.js) and the Dude's words (docs/dude.js). */

export const C = window.ReadingCore;
export const BASE = new URL('.', location.href).pathname;
export const UI_KEY = 'reading-room:ui:' + BASE;

export const $ = (sel, root) => (root || document).querySelector(sel);
export const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
const pad = n => String(n).padStart(2, '0');
export const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
export const thisYear = () => String(new Date().getFullYear());
export const fmtNum = n => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
export const plural = (n, one, many) => fmtNum(n) + ' ' + (n === 1 ? one : (many || one + 's'));
export const fold = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
const dayFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export const fmtDay = d => (d ? dayFmt.format(new Date(d + 'T00:00:00Z')) : '');
export const localDay = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
export const safeUrl = u => (/^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : '');
export const coarse = () => window.matchMedia('(pointer: coarse)').matches;
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

// The Dude's crew and words live in dude.js so they are easy to edit.
export const DUDE = Object.assign({ dog: 'Maple', cat: 'Fig', sayings: [], story: [], signoff: 'The Dude', files: [], jar: [], jarFull: '', facts: [], pets: {} }, window.BOOK_DUDE || {});
export const fill = (s, vars) => String(s || '').replace(/\{(\w+)\}/g, (m, k) =>
  k === 'dog' ? DUDE.dog : k === 'cat' ? DUDE.cat : vars && Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m);

export function dayOfYear() {
  const d = new Date();
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
}

export const pick = list => list[Math.floor(Math.random() * list.length)];
