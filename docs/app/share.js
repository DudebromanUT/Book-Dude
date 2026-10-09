/* Sharing a book or a whole shelf through the iPad's share sheet (Messages, Mail, AirDrop, Copy).
 * Nothing is sent from here: the message opens in the app she picks, where she sees it again and sends it.
 * Her stars go along unless she switches them off, and her note only if she switches it on.
 * A book's link names only the book. */

import { $, esc, plural } from './util.js';
import { icon } from './icons.js';
import { BY_ID } from './books.js';
import { state, rec } from './state.js';
import { confirmBox, toast, showBox } from './page.js';
import { libraryUrl, flushNote } from './book.js';
import { shelfBooks } from './shelves.js';

// What the open preview shares ({ book } or { shelf }), which extras are switched on, and whether to offer Copy and Email.
let sharing = null;

const SHELF_TITLES = {
  reading: 'Books I’m reading', want: 'Books I want to read', finished: 'Books I’ve finished',
  paused: 'Books I’ve put down for now', favorites: 'My favorite books', mine: 'Books I added myself'
};
const starText = n => n + (n === 1 ? ' star' : ' stars');
const byLine = b => b.title + (b.author ? ' by ' + b.author : '');

// Opens the book in Book Dude for whoever gets it. Books she added live only on her device, so theirs is a library search.
function bookLink(b) {
  return b._custom ? libraryUrl(b) : new URL('.', location.href).href + '?book=' + encodeURIComponent(b.book_id);
}

function awardText(b) {
  const a = b._awards[0];
  if (!a || !a.award) return '';
  return a.award === 'Classics' ? 'A classic' : [a.award, a.category].filter(Boolean).join(' ') + (a.year ? ' (' + a.year + ')' : '');
}

// In her words: where the book is on her shelves and what she gave it, then the facts a grown-up might want.
function bookMessage(b, opts) {
  const r = rec(b.book_id);
  const stars = opts.stars && r.rating ? r.rating : 0;
  let line;
  if (r.status === 'finished') {
    const recent = !r.finishedDate || Date.now() - Date.parse(r.finishedDate) < 30 * 864e5;
    line = (recent ? 'I just finished ' : 'I read ') + byLine(b) + (stars ? ' and gave it ' + starText(stars) + '!' : '!');
  } else if (r.status === 'reading' || r.status === 'paused') {
    line = (r.status === 'reading' ? 'I’m reading ' : 'I started ') + byLine(b) + '.' + (stars ? ' So far I give it ' + starText(stars) + '.' : '');
  } else {
    line = (r.status === 'want' ? 'I want to read ' + byLine(b) + '.' : 'Check out ' + byLine(b) + '!') + (stars ? ' I gave it ' + starText(stars) + '.' : '');
  }
  const note = opts.note && r.note.trim() ? '“' + r.note.trim() + '”' : '';
  const facts = [awardText(b), b._level !== null ? 'AR level ' + b.ar_level : '', b._points !== null ? plural(b._points, 'AR point') : ''];
  return [line, note, facts.filter(Boolean).join(' · ')].filter(Boolean).join('\n\n');
}

function shelfMessage(key, opts) {
  return SHELF_TITLES[key] + ':\n\n' + shelfBooks(key).map(([b, r], i) =>
    (i + 1) + '. ' + byLine(b) + (opts.stars && r.rating ? ' (' + starText(r.rating) + ')' : '')).join('\n');
}

function payload() {
  if (sharing.book) {
    const b = BY_ID.get(sharing.book);
    return { title: byLine(b), text: bookMessage(b, sharing), url: bookLink(b) };
  }
  return { title: SHELF_TITLES[sharing.shelf], text: shelfMessage(sharing.shelf, sharing) };
}

const fullText = p => p.text + (p.url ? '\n\n' + p.url : '');
const mailto = () => { const p = payload(); return 'mailto:?subject=' + encodeURIComponent(p.title) + '&body=' + encodeURIComponent(fullText(p)); };

function previewHtml() {
  const b = sharing.book && BY_ID.get(sharing.book);
  const link = !b ? '' : b._custom ? 'Plus a link that searches the Salt Lake County Library for it.' : 'Plus a link that opens this book in Book Dude.';
  return '<div class="share-text">' + esc(payload().text) + '</div>' + (link ? '<p class="hint">' + link + '</p>' : '');
}

function openPreview(what) {
  sharing = what;
  const r = what.book ? rec(what.book) : null;
  const rated = r ? !!r.rating : shelfBooks(what.shelf).some(([, x]) => x.rating);
  const toggles = (rated ? '<label class="switch"><input type="checkbox" id="share-stars"' + (what.stars ? ' checked' : '') + '> Include my stars</label>' : '') +
    (r && r.note.trim() ? '<label class="switch"><input type="checkbox" id="share-note"' + (what.note ? ' checked' : '') + '> Include my note</label>' : '');
  // Where there is no share sheet (some computers), copying or emailing the message works instead.
  const buttons = navigator.share && !what.noShareSheet
    ? '<button type="button" class="btn primary" data-act="share-send">' + icon('share') + 'Share</button>'
    : '<button type="button" class="btn primary" data-act="share-copy">Copy message</button><a class="btn" id="share-email" href="' + esc(mailto()) + '">Email</a>';
  showBox(what.book ? 'Share this book' : 'Share this list',
    '<p class="hint">Here’s your message. You’ll see it again before it sends.</p>' +
    '<div class="share-preview" id="share-preview">' + previewHtml() + '</div>' +
    (toggles ? '<div class="share-switches">' + toggles + '</div>' : '') +
    '<div class="row-actions">' + buttons + '<button type="button" class="btn" data-act="close-confirm">Cancel</button></div>');
}

function refresh() {
  const box = $('#share-preview', confirmBox);
  if (box) box.innerHTML = previewHtml();
  const mail = $('#share-email', confirmBox);
  if (mail) mail.href = mailto();
}

function send() {
  navigator.share(payload()).then(() => { if (confirmBox.open) confirmBox.close(); }, err => {
    if (err && err.name === 'AbortError') return; // She closed the share sheet; the preview stays open.
    openPreview(Object.assign({}, sharing, { noShareSheet: true }));
    toast('Sharing didn’t work here. You can copy the message instead.');
  });
}

function copy() {
  const done = () => { if (confirmBox.open) confirmBox.close(); toast('Message copied. Paste it into a text or an email.'); };
  const failed = () => toast('Copying didn’t work. Press and hold the message to copy it.');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(fullText(payload())).then(done, failed);
  else failed();
}

export const actions = {
  'share-book': () => {
    flushNote();
    if (BY_ID.has(state.openId)) openPreview({ book: state.openId, stars: true, note: false });
  },
  'share-shelf': () => openPreview({ shelf: state.shelf, stars: true, note: false }),
  'share-send': send,
  'share-copy': copy
};

export const changes = {
  'share-stars': t => { sharing.stars = t.checked; refresh(); },
  'share-note': t => { sharing.note = t.checked; refresh(); }
};
