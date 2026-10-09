/* Backups: saving a backup file and restoring one. */

import { C, $, esc, today, plural, fmtDay, localDay, coarse } from './util.js';
import { BOOKS, rebuildBooks } from './books.js';
import { state, db, saveSetting } from './state.js';
import { sheet, toast, showConfirm } from './page.js';
import { flushNote } from './book.js';
import { render } from './tabs.js';

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
  const plan = C.mergeBackup(state.records, state.settings.goals, parsed, state.custom, state.settings.reward);
  const newGoals = Object.keys(parsed.goals).filter(y => !Object.prototype.hasOwnProperty.call(state.settings.goals, y));
  const takeName = !state.settings.readerName && parsed.readerName;
  if (!plan.added && !plan.updated && !plan.changedBooks.length && !newGoals.length && !takeName && !plan.rewardChanged) {
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
  if (plan.rewardChanged) lines.push('<li>Book-money settings from the backup (' + plan.reward.paid + ' already given)</li>');
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
    rebuildBooks(state.custom);
    state.records = plan.records;
    if (newGoals.length) await saveSetting('goals', plan.goals);
    if (takeName) await saveSetting('readerName', parsed.readerName);
    if (plan.rewardChanged) await saveSetting('reward', plan.reward);
    render(true);
    toast('Restored ' + plural(new Set(plan.changed.concat(plan.changedBooks)).size, 'book') + '.');
  });
}

export const actions = {
  export: exportBackup,
  restore: () => { const input = $('#restore-file'); input.value = ''; input.click(); }
};

export const changes = {
  'restore-file': t => restoreFile(t.files && t.files[0])
};
