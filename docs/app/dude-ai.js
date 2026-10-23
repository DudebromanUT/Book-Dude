/* The Dude's Claude features, through the Google script at the school quiz link (scripts/school-email): talking with
 * the Dude, "What should I read next?", and the numbers for the weekly email to her parents. The script holds the
 * Claude key and checks every rule (hours, daily limits, no personal details, the chat log, telling her parents);
 * this file only asks and shows. None of it works offline, and none of it shows until the script says Claude is on. */

import { C, $, esc, today } from './util.js';
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
    (chatOn() ? '<button type="button" class="btn small" data-act="dude-chat">Talk to the Dude</button>' : '') +
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
// Talking with the Dude. The conversation stays on screen until the app closes; the script keeps the log.

let sending = false;
const CHAT_TROUBLE = {
  off: 'The Dude’s chat is switched off right now.',
  limit: 'That’s all the chatting the Dude can do today. His jaw is tired. Come back tomorrow!',
  long: 'That’s a lot of words! Try saying it shorter (400 letters at most).',
  net: 'Can’t reach the Dude. Check the internet and try again.',
  busy: 'The Dude’s brain is buffering. Try again in a minute.'
};
export const hoursText = h => {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(h || '') || [0, 7, 21];
  const t = n => { n = Number(n) % 24; return (n % 12 || 12) + (n < 12 ? ' a.m.' : ' p.m.'); };
  return t(m[1]) + ' to ' + t(m[2]);
};

function chatBodyHtml() {
  const c = state.ai.chat || {};
  const name = state.settings.readerName || 'Maddy';
  const lines = [{ role: 'assistant', text: 'Hey ' + name + '! The Dude here. Ask me about a book, tell me what you’re reading, or ask for a joke.' }].concat(state.chat);
  const log = '<div class="chat-log" aria-live="polite">' + lines.map(m => '<p class="msg ' + (m.role === 'user' ? 'me' : m.role === 'note' ? 'note' : 'dude') + '">' + esc(m.text) + '</p>').join('') +
    (sending ? '<p class="msg dude typing" aria-label="The Dude is typing"><span>.</span><span>.</span><span>.</span></p>' : '') + '</div>';
  const closed = c.open === false ? '<p class="msg note">The Dude is asleep. You can chat from ' + esc(hoursText(c.hours)) + '.</p>' : '';
  const form = c.open === false || c.left === 0 ? '' :
    '<form data-form="dude-chat" class="chat-form" autocomplete="off"><input id="chat-input" class="input" type="text" maxlength="400" enterkeyhint="send" placeholder="Say something to the Dude" aria-label="Message to the Dude"' + (sending ? ' disabled' : '') + '>' +
    '<button type="submit" class="btn primary"' + (sending ? ' disabled' : '') + '>Send</button></form>' +
    (typeof c.left === 'number' && c.left <= 10 ? '<p class="hint">' + c.left + ' message' + (c.left === 1 ? '' : 's') + ' left today.</p>' : '');
  return '<h2>Talk to the Dude</h2><p class="hint">The Dude is played by an AI, so he can get things wrong. Mom and Dad can read these chats.</p>' + log + closed + form;
}

function drawChat(focus) {
  const box = $('.ai-sheet.chat', sheet);
  if (!sheet.open || !box) return;
  box.innerHTML = chatBodyHtml();
  const log = $('.chat-log', sheet);
  if (log) log.scrollTop = log.scrollHeight;
  if (focus && $('#chat-input', sheet)) $('#chat-input', sheet).focus();
}

function openChat() {
  state.openId = null;
  state.chat = state.chat || [];
  sheet.innerHTML = sheetBar('Talk to the Dude') + '<div class="sheet-body ai-sheet chat"></div>';
  if (!sheet.open) sheet.showModal();
  drawChat(true);
}

async function send(form) {
  const input = $('#chat-input', form);
  const text = input.value.trim();
  if (!text || sending) return;
  state.chat.push({ role: 'user', text });
  sending = true;
  drawChat();
  const recent = mine().filter(([, r]) => r.status === 'finished').sort((x, y) => String(y[1].finishedDate).localeCompare(String(x[1].finishedDate))).slice(0, 5).map(([b]) => b.title);
  const reading = mine().filter(([, r]) => r.status === 'reading').map(([b]) => b.title);
  const out = await post({ action: 'chat', reading, recent, messages: state.chat.filter(m => m.role !== 'note').slice(-12) });
  sending = false;
  if (typeof out.left === 'number') state.ai.chat.left = out.left;
  if (out.reply) state.chat.push({ role: 'assistant', text: out.reply });
  else {
    // Not heard: her message comes off the conversation and goes back in the box, with a note why.
    state.chat.pop();
    if (out.error === 'hours') Object.assign(state.ai.chat, { open: false, hours: out.hours || state.ai.chat.hours });
    if (out.error === 'off') state.ai.chat.on = false;
    if (out.error === 'limit') state.ai.chat.left = 0;
    state.chat.push({ role: 'note', text: CHAT_TROUBLE[out.error] || (out.error === 'hours' ? 'The Dude just fell asleep. Talk tomorrow!' : CHAT_TROUBLE.busy) });
  }
  drawChat(true);
  if (!out.reply && $('#chat-input', sheet)) $('#chat-input', sheet).value = text;
}

export const actions = {
  'dude-chat': () => openChat(),
  'dude-picks': () => openPicks()
};

export const submits = {
  'dude-chat': form => send(form)
};
