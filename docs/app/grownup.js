/* The grown-up passcode: four digits a grown-up types before entering AR quiz results, updating school points,
 * marking rewards as given, changing the book money and screen time settings, or restoring a backup.
 * It keeps things honest rather than truly locked: anyone can reset it with "Forgot the passcode?", but then the old
 * passcode stops working and the grown-up settings say when it was reset. With no passcode set, nothing asks. */

import { C, $, esc, today, fmtDay, UI_KEY } from './util.js';
import { state } from './state.js';
import { confirmBox, toast, showBox, showConfirm } from './page.js';
import { saveReward } from './money.js';
import { renderMore } from './more.js';

// Once typed, the passcode stays open for 5 minutes after the last grown-up change, so a grown-up can do several in a row.
const OPEN_FOR = 5 * 60 * 1000;
// Five wrong tries in a row and it waits 5 minutes (remembered across restarts).
const TRIES_KEY = UI_KEY + ':passcode-tries';
const MAX_TRIES = 5;
let openUntil = 0;
let pending = null;

export const hasCode = () => !!C.reward(state.settings.reward).code;
export const isOpen = () => !hasCode() || Date.now() < openUntil;
export function keepOpen() { if (hasCode()) openUntil = Date.now() + OPEN_FOR; }

// Runs fn now if there's no passcode or it was typed in the last 5 minutes; otherwise asks for it first.
export function asGrownup(fn) {
  if (isOpen()) { keepOpen(); fn(); return; }
  pending = fn;
  showBox('Grown-up passcode',
    '<form class="stack" data-form="passcode" novalidate>' +
      codeField('passcode', 'Type the 4-digit passcode') +
      '<p class="error" id="passcode-error" role="alert" hidden></p>' +
      '<div class="row-actions"><button type="submit" class="btn primary">OK</button><button type="button" class="btn" data-act="close-confirm">Cancel</button>' +
        '<button type="button" class="btn ghost small" data-act="forgot-code">Forgot the passcode?</button></div>' +
    '</form>');
  const input = $('#passcode', confirmBox);
  if (input) input.focus();
}

const codeField = (id, label) => '<label class="field"><span>' + label + '</span><input id="' + id + '" class="input code-input" type="password" ' +
  'inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off"></label>';

function tries() {
  try { const t = JSON.parse(localStorage.getItem(TRIES_KEY) || '{}'); return t && typeof t === 'object' ? t : {}; } catch (e) { return {}; }
}
function setTries(t) {
  try { localStorage.setItem(TRIES_KEY, JSON.stringify(t)); } catch (e) { /* storage blocked: the count starts over */ }
}

// The passcode part of the grown-up settings on the More tab.
export function codePanelHtml() {
  const cfg = C.reward(state.settings.reward);
  return '<h3 class="panel-sub">Grown-up passcode</h3>' +
    (cfg.code
      ? '<p class="hint">On. Entering AR quiz results, updating school points, marking rewards as given, these settings, and restoring a backup ask for it. ' +
          'After you type it, it stays open for 5 minutes.</p>' +
        '<div class="row-actions"><button type="button" class="btn small" data-act="lock-now">Lock now</button>' +
          '<button type="button" class="btn small" data-act="change-code">Change passcode</button>' +
          '<button type="button" class="btn small" data-act="remove-code">Turn off passcode</button></div>'
      : '<p class="hint">Off. Set a 4-digit passcode so only a grown-up can enter AR quiz results, update school points, mark rewards as given, ' +
          'change these settings, or restore a backup.</p>' +
        '<div class="row-actions"><button type="button" class="btn small primary" data-act="set-code">Set a passcode</button></div>') +
    (cfg.codeReset ? '<p class="hint">The passcode was reset with “Forgot the passcode?” on ' + esc(fmtDay(cfg.codeReset)) + '.</p>' : '');
}

function newCodeBox(title) {
  showBox(title,
    '<form class="stack" data-form="new-code" novalidate>' +
      codeField('new-code', 'New 4-digit passcode') + codeField('new-code-again', 'Type it again') +
      '<p class="error" id="new-code-error" role="alert" hidden></p>' +
      '<div class="row-actions"><button type="submit" class="btn primary">Save passcode</button><button type="button" class="btn" data-act="close-confirm">Cancel</button></div>' +
    '</form>');
  const input = $('#new-code', confirmBox);
  if (input) input.focus();
}

export const actions = {
  'set-code': () => newCodeBox('Set a grown-up passcode'),
  'change-code': () => asGrownup(() => newCodeBox('Change the passcode')),
  'remove-code': () => asGrownup(() => showConfirm('Turn off the passcode?',
    '<p>Anyone using this device will be able to enter AR quiz results and change the book money and screen time settings.</p>', 'Turn off', async () => {
      await saveReward({ code: '' });
      renderMore();
      toast('The passcode is off.');
    })),
  'lock-now': () => { openUntil = 0; renderMore(); toast('Locked.'); },
  'forgot-code': () => showConfirm('Reset the passcode?',
    '<p>This turns the passcode off so a new one can be set. Nothing else changes. The grown-up settings will show the day it was reset.</p>', 'Reset passcode', async () => {
      openUntil = 0;
      pending = null;
      await saveReward({ code: '', codeReset: today() });
      if (state.tab === 'more') renderMore();
      toast('Passcode reset. Set a new one under More.');
    })
};

export const submits = {
  passcode: form => {
    const input = $('#passcode', form);
    const err = $('#passcode-error', form);
    const t = tries();
    const fail = message => { input.value = ''; err.textContent = message; err.hidden = false; input.focus(); };
    if (t.until && Date.now() < t.until) { fail('Too many tries. Wait a few minutes, then try again.'); return; }
    if (C.codeHash(input.value.trim()) !== C.reward(state.settings.reward).code) {
      const n = (t.n || 0) + 1;
      setTries(n >= MAX_TRIES ? { n: 0, until: Date.now() + OPEN_FOR } : { n });
      fail(n >= MAX_TRIES ? 'Too many tries. Wait a few minutes, then try again.' : 'That isn’t the passcode.');
      return;
    }
    setTries({});
    keepOpen();
    confirmBox.close();
    const fn = pending;
    pending = null;
    if (fn) fn();
  },
  'new-code': async form => {
    const code = $('#new-code', form).value.trim();
    const err = $('#new-code-error', form);
    const fail = message => { err.textContent = message; err.hidden = false; };
    if (!/^\d{4}$/.test(code)) { fail('The passcode is 4 digits, like 2468.'); return; }
    if ($('#new-code-again', form).value.trim() !== code) { fail('The two passcodes don’t match. Type them again.'); return; }
    await saveReward({ code: C.codeHash(code) });
    keepOpen();
    confirmBox.close();
    renderMore();
    toast('Passcode saved. Grown-up things now ask for it.');
  }
};
