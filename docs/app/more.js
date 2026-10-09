/* The More tab: her name and color, the visiting pets, book money settings, backups, and how this device is doing. */

import { C, $$, esc, plural, fmtDay, localDay, DUDE, fill } from './util.js';
import { icon } from './icons.js';
import { CATALOG_BOOKS } from './books.js';
import { state, saveSetting } from './state.js';
import { main, toast } from './page.js';
import { greeting } from './cards.js';
import { rewardPanelHtml } from './money.js';
import { coversItem } from './offline.js';

const ACCENTS = { leather: 'Leather', rug: 'Rug red', brass: 'Brass', ivy: 'Ivy', teal: 'Teal', navy: 'Navy', plum: 'Plum', berry: 'Berry' };

// One of the Reading Room's pets wanders by each time the app opens (docs/pets.js).
export function startPets() {
  if (state.settings.pets && window.BookPets) window.BookPets.start({ dog: DUDE.dog, cat: DUDE.cat, lines: DUDE.pets });
}
function petsHint() {
  const P = window.BookPets;
  const names = (P ? P.pets : []).map(id => (DUDE.pets[id] && DUDE.pets[id].name ? fill(DUDE.pets[id].name) : 'the ' + (P.kinds[id] || 'pet')));
  const list = names.length > 1 ? names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1] : names.join('') || 'The pets';
  return list.charAt(0).toUpperCase() + list.slice(1) + ' take turns visiting, one each time the app opens. Tap one to hear from it.';
}

export function renderMore() {
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
      '<section class="panel meet"><span class="face"><img src="img/dude-face.jpg" alt="" width="96" height="96"></span><div><h2>About the Dude</h2>' +
        '<p class="lead">Scientist, explorer, war hero, jazz fanatic and former fairy. Mostly, a reader. Real name: unknown.</p>' +
        '<div class="row-actions"><button type="button" class="btn small primary" data-act="story">Read about the Dude</button></div></div></section>' +
      '<section class="panel"><h2>Make it yours</h2><div class="stack">' +
        '<label class="field"><span>Your name</span><input id="reader-name" class="input" type="text" maxlength="40" autocomplete="given-name" placeholder="What should the app call you?" value="' + esc(state.settings.readerName) + '"></label>' +
        '<div class="field"><span class="label" id="accent-label">Color</span><div class="accents" role="group" aria-labelledby="accent-label">' + Object.keys(ACCENTS).map(a =>
          '<button type="button" data-act="accent" data-accent="' + a + '" aria-label="' + ACCENTS[a] + '" aria-pressed="' + (state.settings.accent === a) + '"></button>').join('') + '</div></div>' +
        '<div class="field"><label class="switch"><input type="checkbox" id="pets-on"' + (state.settings.pets ? ' checked' : '') + '> Visiting pets</label><p class="hint">' + esc(petsHint()) + '</p></div>' +
      '</div></section>' +
      rewardPanelHtml() +
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
        coversItem(item) +
        (standalone ? item('ok', 'Installed', 'Running from the Home Screen.') : item('', 'Running in the browser', 'For the best experience, add the app to your Home Screen: tap Share, then Add to Home Screen. The Home Screen app keeps its own separate journal.')) +
      '</ul></section>' +
      '<section class="panel"><h2>About the books</h2><p class="lead">' + plural(CATALOG_BOOKS.length, 'book') + ' from Newbery, Beehive, Printz, Pulitzer, Carnegie, National Book Award, and classics lists. ' +
        withPoints + ' have AR details from a checked source; the other ' + (CATALOG_BOOKS.length - withPoints) + ' are not verified yet, and a blank never means zero.' +
        (added ? ' You added ' + plural(added, 'more book') + ' yourself.' : '') + '</p>' +
        '<p class="hint">Always confirm the quiz and edition with your school before counting points. Amazon and Open Library ratings were collected in October 2026; the original list’s scores came with the list and their source was never confirmed. Each book shows where its information came from.</p></section>' +
      '<section class="panel"><h2>Privacy</h2><p class="lead">No accounts, no ads, no tracking. Nothing you write leaves this device unless you save a backup file or share something yourself. Sharing opens Messages, Mail, or another app with the message filled in, so you see it before it sends. Links to book sources open other websites.</p></section>' +
    '</div></div>';
}

export function applyAccent() {
  document.documentElement.dataset.accent = state.settings.accent || 'leather';
}

export const actions = {
  accent: async el => {
    await saveSetting('accent', el.dataset.accent);
    applyAccent();
    $$('[data-act="accent"]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
  }
};

export const changes = {
  'pets-on': async t => {
    await saveSetting('pets', t.checked);
    if (t.checked) startPets();
    else if (window.BookPets) window.BookPets.stop();
    toast(t.checked ? 'A pet is on the way.' : 'The pets are taking a nap.');
  },
  'reader-name': async t => {
    await saveSetting('readerName', t.value.trim().slice(0, 40));
    toast(state.settings.readerName ? 'Hi, ' + state.settings.readerName + '!' : 'Name removed.');
  }
};
