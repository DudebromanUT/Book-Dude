/* Books she adds herself: the add and edit form, cover photos, the details on their page, and deleting. */

import { C, $, $$, esc, today, fmtNum, fmtDay, localDay } from './util.js';
import { icon } from './icons.js';
import { STATUS, BOOKS, BY_ID, rebuildBooks } from './books.js';
import { state, db, requestPersistence, save } from './state.js';
import { sheet, toast, sheetBar, closeSheet, showConfirm } from './page.js';
import { dl } from './cards.js';
import { levelMeaning, openBook, flushNote } from './book.js';

// Details for a book the reader added: everything here came from her.
export function customDetailsHtml(b) {
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
      '<div class="row-actions"><button type="button" class="btn" data-act="quick-photo">' + icon('camera') + (b.photo ? 'New cover photo' : 'Take a cover photo') + '</button>' +
      '<button type="button" class="btn" data-act="edit-book">' + icon('pencil') + 'Edit book</button>' +
      '<button type="button" class="btn ghost danger" data-act="delete-book">' + icon('trash') + 'Delete book</button></div></section>';
}

function newCustomId() {
  let id;
  do { id = C.CUSTOM_PREFIX + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); } while (state.custom[id] || BY_ID.has(id));
  return id;
}

// Cover photos: the picture is cropped to a book shape and shrunk right here (about 40 KB), so it stays small in the
// journal and backups. formPhoto holds the one picked in the add/edit form until the form is saved.
let formPhoto = '';

function pickPhoto(done) {
  $$('input.photo-input').forEach(old => old.remove());
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.className = 'photo-input';
  input.hidden = true;
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    input.remove();
    if (file) shrinkPhoto(file).then(done, () => toast('That picture didn’t work. Try another one.'));
  });
  // Inside the open sheet, so the picker isn't blocked behind it.
  (sheet.open ? sheet : document.body).appendChild(input);
  input.click();
}

function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const W = 360, H = 540;
        let sw = img.naturalWidth, sh = img.naturalHeight;
        if (!sw || !sh) return reject(new Error('empty picture'));
        if (sh / sw > H / W) sh = sw * H / W; else sw = sh * W / H;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        canvas.getContext('2d').drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, W, H);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function photoPickHtml() {
  return (formPhoto ? '<img class="photo-preview" src="' + esc(formPhoto) + '" alt="Your cover photo" width="72" height="108">' : '<span class="photo-empty" aria-hidden="true">' + icon('camera') + '</span>') +
    '<div class="row-actions"><button type="button" class="btn small" data-act="form-photo">' + icon('camera') + (formPhoto ? 'Take a new one' : 'Take a photo of the cover') + '</button>' +
    (formPhoto ? '<button type="button" class="btn small ghost" data-act="form-photo-remove">Remove</button>' : '') + '</div>';
}

function refreshPhotoPick() {
  const box = $('#bk-photo', sheet);
  if (box) box.innerHTML = photoPickHtml();
}

async function setPhoto(id, photo) {
  const prev = state.custom[id];
  if (!prev) return;
  const book = C.customBook(Object.assign({}, prev, { photo, updatedAt: new Date().toISOString() }));
  try {
    await db.putBooks([book]);
  } catch (e) {
    toast('This device would not save the photo. Try again.');
    return;
  }
  state.custom[id] = book;
  rebuildBooks(state.custom);
  state.dirty = true;
  if (state.openId === id && sheet.open) openBook(id);
  toast(book.photo ? 'Cover photo saved.' : 'Cover photo removed.');
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
      '<div class="field"><span class="label">Cover photo <span class="hint">(optional)</span></span><div class="photo-pick" id="bk-photo">' + photoPickHtml() + '</div></div>' +
      shelfPick +
      '<div class="error" id="bk-error" role="alert" hidden></div>' +
      '<div class="row-actions"><button type="submit" class="btn primary">' + (editing ? 'Save changes' : icon('plus') + 'Add book') + '</button>' +
      '<button type="button" class="btn" data-act="' + (editing ? 'cancel-edit' : 'close-sheet') + '">Cancel</button></div>' +
    '</form></div>';
}

function openBookForm(id, prefill) {
  state.openId = id || null;
  formPhoto = id && state.custom[id] ? state.custom[id].photo || '' : '';
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
  const book = C.customBook({ id, title, author, ar_level: level, ar_points: points, description, photo: formPhoto, createdAt: prev ? prev.createdAt : now, updatedAt: now });
  try {
    await db.putBooks([book]);
  } catch (e) {
    return fail('This device would not save the book. Try again.');
  }
  state.custom[id] = book;
  rebuildBooks(state.custom);
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

export const actions = {
  'add-book': el => openBookForm(null, el.dataset.title || ''),
  'edit-book': () => { flushNote(); openBookForm(state.openId); },
  'quick-photo': () => { flushNote(); const id = state.openId; pickPhoto(photo => setPhoto(id, photo)); },
  'form-photo': () => pickPhoto(photo => { formPhoto = photo; refreshPhotoPick(); }),
  'form-photo-remove': () => { formPhoto = ''; refreshPhotoPick(); },
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
      rebuildBooks(state.custom);
      state.dirty = true;
      closeSheet();
      toast('Book deleted.');
    });
  }
};

export const submits = { book: saveBookForm };
