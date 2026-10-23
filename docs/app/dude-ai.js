/* The Dude's Claude features, through the Google script at the school quiz link (scripts/school-email): the Dude
 * Terminal (talking with the Dude), "What should I read next?", and the numbers for the weekly email to her parents. The script holds the
 * Claude key and checks every rule (hours, daily limits, no personal details, the chat log, telling her parents);
 * this file only asks and shows. None of it works offline, and none of it shows until the script says Claude is on. */

import { C, UI_KEY, $, esc, today } from './util.js';
import { BOOKS, BY_ID } from './books.js';
import { state, saveSetting } from './state.js';
import { sheet, sheetBar } from './page.js';
import { card } from './cards.js';
import { rewardPoints, screenStatus } from './money.js';
import { linkOk } from './school.js';

export const aiOn = () => !!(state.ai && state.ai.on && linkOk(state.settings.schoolLink));
export const chatOn = () => aiOn() && !!(state.ai.chat && state.ai.chat.on) && state.settings.dudeChat !== false;

// The script answers POSTs as JSON; plain text keeps it a simple request, so Safari doesn't check with Google first.
async function post(body) {
  if (!linkOk(state.settings.schoolLink) || navigator.onLine === false) return { error: 'net' };
  try {
    const res = await fetch(state.settings.schoolLink + '&t=' + Date.now(), { method: 'POST', body: JSON.stringify(body) });
    return await res.json();
  } catch (e) {
    return { error: 'net' };
  }
}

const daysAgo = n => { const d = new Date(Date.now() - n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const mine = () => Object.keys(state.records).filter(id => BY_ID.has(id)).map(id => [BY_ID.get(id), state.records[id]]);

// The buttons under the Dude's speech bubble on Explore.
export function aiButtonsHtml() {
  if (!aiOn()) return '';
  return '<div class="dude-asks">' +
    (chatOn() ? '<button type="button" class="btn small terminal-btn" data-act="dude-chat">Dude Terminal</button>' : '') +
    '<button type="button" class="btn small" data-act="dude-picks">What should I read next?</button></div>';
}

// ---------------------------------------------------------------------------------------------------------------------
// The weekly email's numbers: sent when the app opens, at most every 6 hours. Only numbers and book titles.

export function sendReport() {
  if (!aiOn()) return;
  if (Date.now() - (Date.parse(state.settings.reportAt || '') || 0) < 6 * 3600e3) return;
  const cfg = C.reward(state.settings.reward);
  const points = rewardPoints();
  const spent = C.choices(points, cfg);
  const week = daysAgo(7), twoWeeks = daysAgo(14);
  const all = mine();
  post({
    action: 'report',
    points,
    pointsWeek: all.reduce((sum, [, r]) => sum + (r.earnedPoints !== null && r.quizDate > week ? r.earnedPoints : 0), 0),
    choices: spent.open,
    moneyWaiting: cfg.on && cfg.perPoint > 0 ? C.rewardStatus(spent.jarPoints, cfg).owedMoney : 0,
    minutesWaiting: cfg.screen ? screenStatus(points).owed : 0,
    finished: all.filter(([, r]) => r.status === 'finished' && r.finishedDate > twoWeeks && r.finishedDate <= today())
      .sort((x, y) => y[1].finishedDate.localeCompare(x[1].finishedDate)).slice(0, 15)
      .map(([b, r]) => ({ title: b.title, date: r.finishedDate, rating: r.rating || 0 })),
    reading: all.filter(([, r]) => r.status === 'reading').slice(0, 5).map(([b, r]) => ({ title: b.title, progress: r.progress || 0 }))
  }).then(r => { if (r && r.ok) saveSetting('reportAt', new Date().toISOString()); });
}

// ---------------------------------------------------------------------------------------------------------------------
// "What should I read next?": three books from the ones right for her (C.readNextCandidates), with the Dude's reasons.

const PICK_TROUBLE = {
  limit: 'The Dude has picked a lot of books today. His picker is tired. Ask again tomorrow!',
  few: 'The Dude couldn’t find enough books you haven’t read yet. You’ve read a LOT.',
  net: 'Can’t reach the Dude right now. Check the internet and try again.'
};

async function openPicks() {
  state.openId = null;
  sheet.innerHTML = sheetBar('What should I read next?') + '<div class="sheet-body ai-sheet pick-sheet"><h2>What should I read next?</h2>' +
    '<p class="thinking" role="status">The Dude is thinking. And looking for his glasses<span>.</span><span>.</span><span>.</span></p></div>';
  if (!sheet.open) sheet.showModal();
  const candidates = C.readNextCandidates(BOOKS, state.records, 60).map(b => {
    const a = b._awards[0];
    return { id: b.book_id, title: b.title, author: b.author, level: b.ar_level || '', award: a ? [a.award, a.category].filter(Boolean).join(' ') : '',
      about: String(b.description || '').slice(0, 200) };
  });
  const liked = mine().filter(([, r]) => r.status === 'finished' && (r.rating >= 4 || r.favorite || r.quizScore >= 90))
    .sort((x, y) => (y[1].rating || 0) - (x[1].rating || 0) || String(y[1].finishedDate).localeCompare(String(x[1].finishedDate)))
    .slice(0, 15).map(([b, r]) => ({ title: b.title, rating: r.rating || 0 }));
  const out = await post({ action: 'picks', candidates, liked });
  const box = $('.ai-sheet.pick-sheet', sheet);
  if (!sheet.open || !box) return;
  const picks = (out.picks || []).filter(p => BY_ID.has(p.id));
  box.innerHTML = '<h2>What should I read next?</h2>' + (picks.length
    ? '<p class="hint">The Dude picked these from books for your age that you haven’t read yet.</p><div class="picks">' +
      picks.map(p => '<div class="pick">' + card(BY_ID.get(p.id)) + '<p class="why"><b>The Dude says:</b> ' + esc(p.why) + '</p></div>').join('') + '</div>'
    : '<p>' + esc(PICK_TROUBLE[out.error] || 'The Dude’s brain is buffering. Try again in a minute.') + '</p>');
}

// ---------------------------------------------------------------------------------------------------------------------
// The Dude Terminal: talking with the Dude on a 1986 green-screen computer. It is built to feel like a machine, not a
// person: answers appear whole (no "typing" bubble, no pauses), there is no voice, and nothing rewards coming back or
// chatting longer. A line that never scrolls away says it's an AI and that Mom and Dad can read the chats, a soft timer
// suggests a break, and a big "Talk to a grown-up" button is always there, so asking for help never depends on typing
// the right words. The conversation stays on screen until the app closes; the script keeps the log.

let sending = false;
let breakTimer = 0;
const BREAKS = [15, 30, 45];             // Minutes at the terminal before it suggests a break.
const SOUND_KEY = UI_KEY + ':terminal-sound';
const CHAT_TROUBLE = {
  off: 'THE TERMINAL IS SWITCHED OFF RIGHT NOW.',
  limit: 'THAT’S ALL THE TERMINAL TIME FOR TODAY. A REAL BOOK IS STILL OPEN FOR BUSINESS.',
  long: 'TOO MANY LETTERS. TRY IT SHORTER (400 AT MOST).',
  net: 'NO SIGNAL. CHECK THE INTERNET AND TRY AGAIN.',
  busy: 'ERROR 404: DUDE NOT FOUND. (HE’S PROBABLY LOOKING FOR HIS GLASSES.) TRY AGAIN IN A MINUTE.'
};
export const hoursText = h => {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(h || '') || [0, 7, 21];
  const t = n => { n = Number(n) % 24; return (n % 12 || 12) + (n < 12 ? ' a.m.' : ' p.m.'); };
  return t(m[1]) + ' to ' + t(m[2]);
};

// Retro beeps, made on the spot (no sound files): a key click when she sends, a two-note chirp when the answer lands.
// Off with the [SOUND] key; the choice is remembered on this device.
let audio = null;
const soundOn = () => { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) { return true; } };
function beep(notes) {
  if (!soundOn() || !window.AudioContext) return;
  try {
    audio = audio || new window.AudioContext();
    let t = audio.currentTime;
    for (const [freq, ms] of notes) {
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + ms / 1000);
      t += ms / 1000;
    }
  } catch (e) { /* no sound; nothing else changes */ }
}

function terminalHtml() {
  const c = state.ai.chat || {};
  const name = (state.settings.readerName || 'Maddy').toUpperCase();
  const lines = [{ role: 'note', text: 'DUDE-OS 1.986   READY.' }, { role: 'assistant', text: 'Hi ' + (state.settings.readerName || 'Maddy') + '. Ask me about a book or a word, or ask for a joke.' }].concat(state.chat);
  const who = m => (m.role === 'user' ? name : m.role === 'assistant' ? 'DUDE' : '');
  const log = lines.map(m => '<p class="t-line ' + (m.role === 'user' ? 't-me' : m.role === 'note' ? 't-note' : 't-dude') + '">' +
    (who(m) ? '<span class="t-who">' + esc(who(m)) + '&gt;</span> ' : '') + esc(m.text) + '</p>').join('');
  const minutes = state.chatSince ? Math.floor((Date.now() - state.chatSince) / 60000) : 0;
  const pause = state.breakShown ? '<div class="t-break" role="status"><p>*** BREAK TIME? You’ve been at the terminal ' + minutes + ' minutes. Your eyes, Maple and a good book would all like a turn. ***</p>' +
    '<button type="button" class="t-key" data-act="close-sheet">[ OK, BREAK ]</button></div>' : '';
  const closed = c.on === false ? CHAT_TROUBLE.off : c.open === false ? 'THE TERMINAL IS OFF RIGHT NOW. IT RUNS FROM ' + hoursText(c.hours).toUpperCase() : c.left === 0 ? CHAT_TROUBLE.limit : '';
  const prompt = closed ? '<p class="t-line t-note">' + esc(closed) + '</p>' :
    '<form data-form="dude-chat" class="t-prompt" autocomplete="off"><label for="chat-input" class="t-who">' + esc(name) + '&gt;</label>' +
    '<input id="chat-input" type="text" maxlength="400" enterkeyhint="send" spellcheck="true" aria-label="Message to the Dude Terminal"' + (sending ? ' disabled' : '') + '>' +
    '<button type="submit" class="t-key"' + (sending ? ' disabled' : '') + '>[ ENTER ]</button></form>';
  return '<button type="button" class="grownup-btn" data-act="grownup">Talk to a grown-up</button>' +
    '<div class="crt"><div class="crt-screen">' +
      '<p class="t-status">This is an AI. Mom and Dad can read these chats.</p>' +
      '<div class="t-log" role="log" aria-live="polite">' + log + (sending ? '<p class="t-line t-note t-wait">WORKING<span class="t-cursor"></span></p>' : '') + '</div>' +
      pause + prompt +
    '</div><div class="crt-plate"><span>DUDE-PC 1986</span><button type="button" class="t-sound" data-act="terminal-sound" aria-pressed="' + soundOn() + '">SOUND ' + (soundOn() ? 'ON' : 'OFF') + '</button><span class="led" aria-hidden="true"></span></div></div>';
}

function drawChat(focus) {
  const box = $('.ai-sheet.chat', sheet);
  if (!sheet.open || !box) return;
  box.innerHTML = terminalHtml();
  const log = $('.t-log', sheet);
  if (log) log.scrollTop = log.scrollHeight;
  if (focus && $('#chat-input', sheet)) $('#chat-input', sheet).focus();
}

// The break suggestion: soft, never blocking, at 15, 30 and 45 minutes at the terminal (counted from when she
// opened it, and starting over after an hour away).
function checkBreak() {
  if (!sheet.open || !$('.ai-sheet.chat', sheet)) { clearInterval(breakTimer); breakTimer = 0; return; }
  const minutes = (Date.now() - state.chatSince) / 60000;
  const due = BREAKS.filter(m => minutes >= m).length;
  if (due > (state.breaksSeen || 0)) {
    state.breaksSeen = due;
    state.breakShown = true;
    beep([[523, 90], [392, 140]]);
    drawChat();
  }
}

function openChat() {
  state.openId = null;
  state.chat = state.chat || [];
  if (!state.chatSince || Date.now() - (state.chatLast || 0) > 3600e3) Object.assign(state, { chatSince: Date.now(), breaksSeen: 0, breakShown: false });
  state.chatLast = Date.now();
  sheet.innerHTML = sheetBar('Dude Terminal') + '<div class="sheet-body ai-sheet chat"></div>';
  if (!sheet.open) sheet.showModal();
  drawChat(true);
  clearInterval(breakTimer);
  breakTimer = setInterval(checkBreak, 20000);
  checkBreak();
}

async function send(form) {
  const input = $('#chat-input', form);
  const text = input.value.trim();
  if (!text || sending) return;
  beep([[1200, 25]]);
  state.chat.push({ role: 'user', text });
  state.chatLast = Date.now();
  state.breakShown = false;
  sending = true;
  drawChat();
  const recent = mine().filter(([, r]) => r.status === 'finished').sort((x, y) => String(y[1].finishedDate).localeCompare(String(x[1].finishedDate))).slice(0, 5).map(([b]) => b.title);
  const reading = mine().filter(([, r]) => r.status === 'reading').map(([b]) => b.title);
  const out = await post({ action: 'chat', reading, recent, messages: state.chat.filter(m => m.role !== 'note').slice(-12) });
  sending = false;
  if (typeof out.left === 'number') state.ai.chat.left = out.left;
  if (out.reply) {
    state.chat.push({ role: 'assistant', text: out.reply });
    beep([[660, 60], [990, 90]]);
  } else {
    // Not heard: her message comes off the conversation and goes back in the box, with a note why.
    state.chat.pop();
    if (out.error === 'hours') Object.assign(state.ai.chat, { open: false, hours: out.hours || state.ai.chat.hours });
    if (out.error === 'off') state.ai.chat.on = false;
    if (out.error === 'limit') state.ai.chat.left = 0;
    if (!['hours', 'off', 'limit'].includes(out.error)) state.chat.push({ role: 'note', text: CHAT_TROUBLE[out.error] || CHAT_TROUBLE.busy });
    beep([[180, 160]]);
  }
  drawChat(true);
  if (!out.reply && $('#chat-input', sheet)) $('#chat-input', sheet).value = text;
  checkBreak();
}

// Talk to a grown-up: works whatever the terminal is doing (off, after hours, at the day's limit, even offline). It
// tells her plainly what to do right now, and asks the script to email her parents with the last few messages.
function grownup() {
  const panel = '<div class="grownup-panel" role="alertdialog" aria-labelledby="grownup-title">' +
    '<h2 id="grownup-title">Good call.</h2>' +
    '<p class="big">Go find Mom, Dad, or another grown-up you trust, right now, and tell them you want to talk.</p>' +
    '<p>If you are scared or in danger, tell any grown-up nearby, or call <b>911</b>.</p>' +
    '<p class="hint grownup-sent" role="status">Sending Mom and Dad a message…</p>' +
    '<button type="button" class="btn" data-act="grownup-back">Back</button></div>';
  const box = $('.ai-sheet.chat', sheet);
  if (!box) return;
  box.innerHTML = panel;
  post({ action: 'grownup', messages: (state.chat || []).filter(m => m.role !== 'note').slice(-6) }).then(out => {
    const sent = $('.grownup-sent', sheet);
    if (sent) sent.textContent = out && out.ok ? 'We sent Mom and Dad a message too.' : 'The message didn’t go through, so go find them yourself. You’re doing the right thing.';
  });
}

export const actions = {
  'dude-chat': () => openChat(),
  'dude-picks': () => openPicks(),
  grownup: () => grownup(),
  'grownup-back': () => drawChat(true),
  'terminal-sound': () => {
    try { localStorage.setItem(SOUND_KEY, soundOn() ? 'off' : 'on'); } catch (e) { /* storage blocked: stays as it was */ }
    drawChat();
  }
};

export const submits = {
  'dude-chat': form => send(form)
};
