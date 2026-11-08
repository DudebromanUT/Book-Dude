/* COBOL: its own tab, an IBM 3270 mainframe terminal with a main menu: 1 the chat with Claude (through the Google
 * script, scripts/school-email), 2 the Library of knowledge articles (library.js), and 3 the tests on them.
 *
 * The chat is built to feel like a machine, not a person: answers appear whole (no "typing" bubble, no pauses), there
 * is no voice, and nothing rewards coming back or chatting longer. A line that never scrolls away says it's an AI and
 * that Mom and Dad can read the chats, a soft timer suggests a break, and a small yellow "Talk to a grown-up" button is
 * always there, so asking for help never depends on typing the right words. Her lines say HUMAN>, and her name never
 * goes to the script. The conversation stays on screen until the app closes; the script keeps the log.
 *
 * Each test is multiple choice (80% to pass, points once), then one think-about-it question with no right answer: she
 * types a short answer, COBOL responds to it through the script (or later, when COBOL is closed), and answering earns
 * 1 bonus point once.
 *
 * The function keys along the bottom work like a real mainframe's: PF1 LIBRARY opens the Library, PF3 EXIT goes back
 * one step (to the main menu, and from the menu to Explore), and PF5 SOUND turns the beeps on or off. The tab is always
 * there: the Library and the tests work without the script, and when the chat can't take messages (not switched on,
 * after hours, or done for the day), it says why. */

import { UI_KEY, $, esc, today } from './util.js';
import { state, save, saveSetting } from './state.js';
import { main, closeSheet, toast, celebrate } from './page.js';
import { greeting } from './cards.js';
import { goTab } from './tabs.js';
import { rewardPoints, pointsNews } from './money.js';
import { post, chatOn, mine, sendReport } from './dude-ai.js';
import { linkOk, syncSchool } from './school.js';
import { ARTICLES, RETIRED } from './library.js';

// ---------------------------------------------------------------------------------------------------------------------
// The Library and its tests (the articles are in library.js).

const BY_ARTICLE = new Map(ARTICLES.map(a => [a.id, a]));
const TESTED = ARTICLES.filter(a => a.test);
const examId = a => 'exam:' + a.id;
const thinkId = a => 'exam:' + a.id + ':think';
const earned = id => !!(state.records[id] && state.records[id].earnedPoints !== null);
const lines = v => (Array.isArray(v) ? v : v ? [v] : []);
const MIN_THINK = 20;                    // Letters for a think-about-it answer to earn its bonus point.
const THINK_KEY = 'thinkReplies';        // Setting: COBOL's reply to each think-about-it answer, by article id.
const reply = a => (state.settings[THINK_KEY] || {})[a.id] || '';

// ---------------------------------------------------------------------------------------------------------------------
// The terminal: which screen is up. It starts on the main menu and keeps its place while she visits other tabs.

let screen = 'menu';                     // menu, chat, library, article, tests, test, result or grownup
let current = null;                      // The article being read or tested.
let testFrom = 'tests';                  // Where PF3 goes from a test and its result: the Tests list or the article.
let thinking = false;                    // Waiting for COBOL's reply to a think-about-it answer.
let menuError = '';                      // Shown under the menu after an option that isn't 1, 2 or 3.
let sending = false;
let breakTimer = 0;
let order = [];                          // This try's shuffled choices: for each question, its choices' indexes.
let result = null;                       // The last test: { right, missed: [question indexes], earned, already }
let before = 'menu';                     // The screen under the grown-up panel.

const BREAKS = [15, 30, 45];             // Minutes at the terminal before it suggests a break.
const SOUND_KEY = UI_KEY + ':terminal-sound';
const CHAT_TROUBLE = {
  off: 'COBOL IS SWITCHED OFF RIGHT NOW.',
  limit: 'DAILY LIMIT REACHED. COBOL IS DONE FOR TODAY. A REAL BOOK IS STILL OPEN FOR BUSINESS.',
  long: 'INPUT TOO LONG. 400 LETTERS AT MOST. TRY IT SHORTER.',
  net: 'NO CONNECTION TO THE MAINFRAME. CHECK THE INTERNET AND TRY AGAIN.',
  busy: 'SYSTEM ERROR (ABEND S0C7). COBOL TRIPPED OVER ITS OWN DATA. TRY AGAIN IN A MINUTE.'
};
export const hoursText = h => {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(h || '') || [0, 7, 21];
  const t = n => { n = Number(n) % 24; return (n % 12 || 12) + (n < 12 ? ' a.m.' : ' p.m.'); };
  return t(m[1]) + ' to ' + t(m[2]);
};

// Retro beeps, made on the spot (no sound files): a key click when she sends, a two-note chirp when the answer lands.
// PF5 turns them off; the choice is remembered on this device.
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

const pf5Label = () => 'PF5 SOUND ' + (soundOn() ? 'ON' : 'OFF');
const NAMES = { menu: 'MAIN MENU', chat: 'CHAT', library: 'LIBRARY', article: 'LIBRARY', tests: 'TESTS', test: 'TEST', result: 'TEST RESULT' };
const AI_LINE = '<p class="t-status">This is an AI. Mom and Dad can read these chats.</p>';

// Whether the chat is open by the clock. The script sends its hours with everything else, and checks them again on
// every message; the clock here keeps the screen right when the app has been open a long time.
function openNow(c) {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(c.hours || '');
  if (!m) return c.open !== false;
  const hour = new Date().getHours();
  return hour >= Number(m[1]) && hour < Number(m[2]);
}
const chatInfo = () => (state.ai && state.ai.chat) || {};
const hourName = n => { n = Number(n) % 24; return (n % 12 || 12) + (n < 12 ? ' A.M.' : ' P.M.'); };

// Whether this device can reach the script: 'setup' (no school link on this device), 'checking' (no answer yet),
// 'net' (the last try failed and there's no earlier answer), or '' (it has an answer).
function reach() {
  if (!linkOk(state.settings.schoolLink)) return 'setup';
  if (state.ai) return '';
  return state.schoolError && !state.schoolChecking ? 'net' : 'checking';
}

// Opening COBOL asks the script again: always when there's no good answer yet, otherwise at most once a minute.
function recheck() {
  if (reach() === 'setup' || state.schoolChecking) return;
  if (state.ai && !state.schoolError && Date.now() - (state.schoolCheckedAt || 0) < 60000) return;
  syncSchool(true);
}

// Why the chat can't take a message right now, or '' when it can.
function chatClosed() {
  const c = chatInfo();
  const r = reach();
  if (r === 'setup') return 'COBOL IS NOT SET UP ON THIS DEVICE YET. A GROWN-UP ADDS THE SCHOOL QUIZ LINK IN FARTY PANTS CENTRAL.';
  if (r === 'checking') return 'CONNECTING TO THE MAINFRAME...';
  if (r === 'net') return CHAT_TROUBLE.net;
  if (!chatOn()) return CHAT_TROUBLE.off;
  if (!openNow(c)) return 'COBOL IS OFF RIGHT NOW. IT RUNS FROM ' + hoursText(c.hours).toUpperCase() + '.';
  if (c.left === 0) return CHAT_TROUBLE.limit;
  return '';
}

// The chat's line on the menu: not set up here, connecting, no connection, switched off, closed until when, done
// for today, or open until when.
function chatStatus() {
  const c = chatInfo();
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(c.hours || '') || [0, 7, 21];
  const r = reach();
  if (r) return { setup: 'NOT SET UP ON THIS DEVICE', checking: 'CONNECTING...', net: 'NO CONNECTION' }[r];
  if (!chatOn()) return 'SWITCHED OFF';
  if (!openNow(c)) return 'CLOSED UNTIL ' + hourName(m[1]);
  if (c.left === 0) return 'DONE FOR TODAY';
  return 'OPEN UNTIL ' + hourName(m[2]);
}

// The 3270 frame around every screen: the title line, the screen itself, the function keys, and the status line.
function frame(body) {
  return '<button type="button" class="grownup-btn" data-act="grownup">Talk to a grown-up</button>' +
    '<div class="crt"><div class="crt-screen">' +
      '<p class="t-head"><span>COBOL</span><span>BOOK DUDE MAINFRAME</span><span>' + NAMES[screen] + '</span></p>' +
      body +
      '<nav class="t-pf" aria-label="Function keys">' +
        '<button type="button" data-act="cobol-pf1">PF1 LIBRARY</button>' +
        '<button type="button" data-act="cobol-pf3">PF3 EXIT</button>' +
        '<button type="button" data-act="cobol-pf5" aria-pressed="' + soundOn() + '">' + pf5Label() + '</button></nav>' +
      '<p class="t-oia" aria-hidden="true"><span>' + (sending ? 'X SYSTEM' : 'READY') + '</span><span>COBOL 1959</span></p>' +
    '</div></div>';
}

function menuBody() {
  const option = (n, name, desc) => '<li><button type="button" class="t-opt" data-act="cobol-option" data-option="' + n + '">' +
    '<span class="t-num">' + n + '</span><span class="t-name">' + name + '</span><span class="t-desc">' + desc + '</span></button></li>';
  return AI_LINE + '<p class="t-menu-title">SELECT AN OPTION, HUMAN.</p>' +
    '<ol class="t-menu">' + option(1, 'CHAT WITH COBOL', chatStatus()) + option(2, 'LIBRARY', ARTICLES.length + ' ARTICLES TO READ') +
      option(3, 'TESTS', testsStatus()) + '</ol>' +
    (menuError ? '<p class="t-line t-note" role="alert">' + menuError + '</p>' : '') +
    '<form data-form="cobol-option" class="t-prompt" autocomplete="off"><label for="cobol-option" class="t-who">OPTION ===&gt;</label>' +
    '<input id="cobol-option" type="text" inputmode="numeric" maxlength="2" enterkeyhint="go" aria-label="Option number">' +
    '<button type="submit" class="t-key">ENTER</button></form>';
}

function chatBody() {
  const lines = [{ role: 'note', text: 'BOOK DUDE MAINFRAME. COBOL ONLINE SINCE 1959.' },
    { role: 'assistant', text: 'GREETINGS, HUMAN. COBOL IS READY. Ask me about books, words, science, history, or anything you are curious about.' }].concat(state.chat);
  const who = { user: 'HUMAN', assistant: 'COBOL' };
  const log = lines.map(m => '<p class="t-line ' + (m.role === 'user' ? 't-me' : m.role === 'note' ? 't-note' : 't-cobol') + '">' +
    (who[m.role] ? '<span class="t-who">' + who[m.role] + '&gt;</span> ' : '') + esc(m.text) + '</p>').join('');
  const minutes = state.chatSince ? Math.floor((Date.now() - state.chatSince) / 60000) : 0;
  const pause = state.breakShown ? '<div class="t-break" role="status"><p>*** SYSTEM NOTICE: ' + minutes + ' MINUTES AT THE TERMINAL. RECOMMENDED: A BREAK. ' +
    'YOUR EYES, MAPLE AND A GOOD BOOK WOULD ALL LIKE A TURN. ***</p><button type="button" class="t-key" data-act="cobol-break">OK, BREAK</button></div>' : '';
  const closed = chatClosed();
  const prompt = closed ? '<p class="t-line t-note">' + esc(closed) + '</p>' :
    '<form data-form="cobol-chat" class="t-prompt" autocomplete="off"><label for="chat-input" class="t-who">HUMAN&gt;</label>' +
    '<input id="chat-input" type="text" maxlength="400" enterkeyhint="send" spellcheck="true" aria-label="Message to COBOL"' + (sending ? ' disabled' : '') + '>' +
    '<button type="submit" class="t-key"' + (sending ? ' disabled' : '') + '>ENTER</button></form>';
  return AI_LINE +
    '<div class="t-log" role="log" aria-live="polite">' + log + (sending ? '<p class="t-line t-note t-wait">WORKING<span class="t-cursor"></span></p>' : '') + '</div>' +
    pause + prompt;
}

// Points still up for grabs across the tests, for the menu.
function testsStatus() {
  const left = TESTED.reduce((n, a) => n + (earned(examId(a)) ? 0 : a.test.points) + (earned(thinkId(a)) ? 0 : 1), 0);
  return left ? left + ' POINTS UP FOR GRABS' : 'ALL POINTS EARNED';
}
const testLine = a => 'PASS ' + a.test.pass + ' OF ' + a.test.outOf + ' (80%): ' + a.test.points + ' POINTS, +1 BONUS';
const testState = a => [earned(examId(a)) ? 'PASSED' : '', earned(thinkId(a)) ? 'BONUS EARNED' : ''].filter(Boolean).join(' · ');

function libraryBody() {
  return '<p class="t-menu-title">THE LIBRARY. SELECT AN ARTICLE, HUMAN.</p><ol class="t-menu">' + ARTICLES.map((a, i) =>
    '<li><button type="button" class="t-opt" data-act="cobol-read" data-id="' + esc(a.id) + '"><span class="t-num">' + (i + 1) + '</span>' +
    '<span class="t-name">' + esc(a.title.toUpperCase()) + '</span><span class="t-desc">' + (a.test ? 'HAS A TEST' + (testState(a) ? ' · ' + testState(a) : '') : 'READING ONLY') + '</span></button></li>').join('') + '</ol>';
}

function articleBody() {
  const a = current;
  const cobol = a.voice === 'cobol';
  const p = t => '<p>' + esc(t) + '</p>';
  const secs = a.sections.map((f, n) => '<section class="t-filesec"><h3>' + (cobol ? 'FILE ' + n + ': ' : '') + esc(f.title) + '</h3>' +
    (f.code ? '<pre class="t-code">' + esc(f.code.join('\n')) + '</pre>' : '') + f.text.map(p).join('') +
    (f.keys ? '<dl class="t-keys">' + f.keys.map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>').join('') + '</dl>' : '') +
    (f.more || []).map(p).join('') + '</section>').join('');
  const test = a.test ? '<div class="t-actions"><p>' + (earned(examId(a)) ? 'TEST PASSED. ' + a.test.points + ' POINTS EARNED. YOU CAN TAKE IT AGAIN FOR FUN.' :
      'TEST AVAILABLE: ' + a.test.outOf + ' QUESTIONS. ' + testLine(a) + '.') + '</p>' +
    '<button type="button" class="t-key" data-act="cobol-test" data-id="' + esc(a.id) + '">' + (earned(examId(a)) ? 'TAKE THE TEST AGAIN' : 'TAKE THE TEST') + '</button></div>' : '';
  return '<div class="t-body t-file' + (cobol ? '' : ' t-plain') + '" tabindex="0" aria-label="' + esc(a.title) + '">' +
    (cobol ? '' : '<h2 class="t-title">' + esc(a.title) + '</h2>') + lines(a.intro).map(p).join('') + secs + lines(a.closing).map(p).join('') + '</div>' + test;
}

function testsBody() {
  return '<p class="t-menu-title">TESTS. EACH ONE EARNS ITS POINTS ONCE.</p><ol class="t-menu">' + TESTED.map((a, i) =>
    '<li><button type="button" class="t-opt" data-act="cobol-test" data-id="' + esc(a.id) + '"><span class="t-num">' + (i + 1) + '</span>' +
    '<span class="t-name">' + esc(a.title.toUpperCase()) + '</span><span class="t-desc">' + (testState(a) || testLine(a)) + '</span></button></li>').join('') + '</ol>' +
    '<p class="t-note">Read the article in the Library first. More tests are coming, and math tests will need 90% or higher for more points.</p>';
}

function shuffled(n) {
  const out = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function testBody() {
  const a = current, t = a.test;
  if (order.length !== t.questions.length) order = t.questions.map(q => shuffled(q.choices.length));
  return '<div class="t-body t-test"><h2 class="t-title">' + esc(a.title) + '</h2>' +
    '<p class="t-callout"><b>PASSING SCORE: 80%.</b> Pass with ' + t.pass + ' of ' + t.outOf + ' (80%) or better to earn ' + t.points + ' points. Points count just like AR points, and you can earn them once. You can retake the test.</p>' +
    '<p class="t-note">After the questions there is one think-about-it question with no wrong answer. Answering it earns 1 bonus point.</p>' +
    (earned(examId(a)) ? '<p class="t-ok">You already passed and earned your ' + t.points + ' points. This try is for fun.</p>' : '') +
    (earned(thinkId(a)) ? thinkHtml(a) : '') +
    '<form data-form="cobol-test" class="t-quiz">' + t.questions.map((q, i) => '<fieldset class="t-q"><legend>' + String(i + 1).padStart(2, '0') + '. ' + esc(q.q) + '</legend>' +
      order[i].map(c => '<label><input type="radio" name="q' + i + '" value="' + c + '"> ' + esc(q.choices[c]) + '</label>').join('') + '</fieldset>').join('') +
      '<p class="error t-error" role="alert" hidden></p>' +
      '<button type="submit" class="t-key">SUBMIT ANSWERS</button></form></div>';
}

// The think-about-it question at the end of a result: a box to answer, or her answer and COBOL's reply (or a note that
// the reply comes when COBOL opens).
function thinkHtml(a) {
  const id = thinkId(a);
  const head = '<h3>THINK ABOUT IT</h3><p class="t-think-q">' + esc(a.test.think) + '</p>';
  if (!earned(id)) {
    return '<div class="t-think">' + head + '<form data-form="cobol-think" class="t-think-form" autocomplete="off">' +
      '<label for="think-input" class="t-who">HUMAN&gt;</label><textarea id="think-input" maxlength="400" rows="4" spellcheck="true" aria-label="Your answer"></textarea>' +
      '<p class="error t-error" role="alert" hidden></p>' +
      '<button type="submit" class="t-key">SEND: +1 BONUS POINT</button></form><p class="t-note">No wrong answers. A sentence or two is plenty.</p></div>';
  }
  const said = state.records[id].note || '';
  const r = reply(a);
  return '<div class="t-think">' + head + '<p class="t-line t-me"><span class="t-who">HUMAN&gt;</span> ' + esc(said) + '</p>' +
    (r ? '<p class="t-line t-cobol"><span class="t-who">COBOL&gt;</span> ' + esc(r) + '</p>'
      : thinking ? '<p class="t-line t-note t-wait">WORKING<span class="t-cursor"></span></p>'
        : '<p class="t-line t-note">COBOL WILL REPLY WHEN IT IS OPEN (' + hoursText(chatInfo().hours).toUpperCase() + '). YOUR BONUS POINT IS ALREADY SAVED.</p>') + '</div>';
}

function resultBody() {
  const a = current, t = a.test, r = result;
  const pct = Math.round(r.right / t.outOf * 100);
  const passed = r.right >= t.pass;
  const reread = r.missed.length ? '<p>' + (passed ? 'FOR A PERFECT SCORE, REREAD:' : 'REREAD THESE, THEN TRY AGAIN:') + '</p><ul class="t-missed">' +
    r.missed.map(i => '<li>' + String(i + 1).padStart(2, '0') + '. ' + esc(t.questions[i].q) + ' <span>(' + esc(t.questions[i].ref) + ')</span></li>').join('') + '</ul>' : '';
  const verdict = passed
    ? '<p class="t-ok">RESULT: PASSED.</p>' + (r.earned ? '<p class="t-callout">+' + t.points + ' POINTS. They count just like AR points.</p>'
      : r.already ? '<p>You already earned these ' + t.points + ' points, so none were added this time.</p>' : '')
    : '<p class="t-warn">RESULT: NOT YET. You need ' + t.pass + ' of ' + t.outOf + ' (80%) to pass.</p>';
  return '<div class="t-body t-result" role="status"><p class="t-score">SCORE: ' + r.right + ' OF ' + t.outOf + ' (' + pct + '%)</p>' + verdict + reread +
    (passed && !r.missed.length ? '<p>ALL ANSWERS CORRECT. FASCINATING DATA.</p>' : '') + thinkHtml(a) + '</div>' +
    '<div class="t-actions"><button type="button" class="t-key" data-act="cobol-read" data-id="' + esc(a.id) + '">REREAD THE ARTICLE</button>' +
    '<button type="button" class="t-key" data-act="cobol-test" data-id="' + esc(a.id) + '">TAKE IT AGAIN</button></div>';
}

// Talk to a grown-up: plain words, no robot voice. Works whatever the terminal is doing (off, after hours, at the day's
// limit, even offline). It tells her what to do right now, and asks the script to email her parents with the last
// few messages.
function grownupBody() {
  return '<div class="grownup-panel" role="alertdialog" aria-labelledby="grownup-title">' +
    '<h2 id="grownup-title">Good call.</h2>' +
    '<p class="big">Go talk to Mom or Dad right now.</p>' +
    '<p>Tell them you want to talk. You are not in trouble.</p>' +
    '<p class="hint grownup-sent" role="status">Sending Mom and Dad a message…</p>' +
    '<button type="button" class="btn" data-act="grownup-back">Back</button></div>';
}

const BODIES = { menu: menuBody, chat: chatBody, library: libraryBody, article: articleBody, tests: testsBody, test: testBody, result: resultBody };

function draw(focus) {
  const box = $('.cobol-view', main);
  if (state.tab !== 'cobol' || !box) return;
  if (screen === 'grownup') { box.innerHTML = grownupBody(); return; }
  box.innerHTML = frame(BODIES[screen]());
  const log = $('.t-log', box);
  if (log) log.scrollTop = log.scrollHeight;
  if (focus && screen === 'chat' && $('#chat-input', box)) $('#chat-input', box).focus();
}

function go(next) {
  if (next === 'test') order = [];
  if (next === 'test' && (screen === 'tests' || screen === 'article')) testFrom = screen;
  if (next === 'chat') { enterChat(); recheck(); }
  if (next === 'test') setTimeout(() => askThink(), 0);
  menuError = '';
  screen = next;
  draw(true);
  const body = $('.t-body', main);
  if (body) body.scrollTop = 0;
  // Back to the top, where the grown-up button is (the chat's box scrolls itself into view when it gets focus).
  if (next !== 'chat') window.scrollTo(0, 0);
}

// The COBOL tab. `refresh` is a redraw after something changed elsewhere (new quizzes, the script's answer): the
// screen stays as it is, and only redraws where nothing she's typed or picked would be lost.
export function renderCobol(refresh) {
  if (refresh && $('.cobol-view', main)) { refreshCobol(); return; }
  main.innerHTML = '<header class="view-head"><div><p class="kicker">' + esc(greeting()) + '</p><h1>COBOL</h1></div></header>' +
    '<div class="cobol-view"></div>';
  if (screen === 'chat') enterChat();
  recheck();
  draw(false);
}

export function refreshCobol() {
  const input = $('#chat-input', main);
  const busy = screen === 'chat' && (sending || (input && (input.value || document.activeElement === input)));
  if (['menu', 'chat', 'library', 'article', 'tests'].includes(screen) && !busy) draw(false);
  if (screen === 'result' || screen === 'test') askThink();
}

// ---------------------------------------------------------------------------------------------------------------------
// The chat.

// The break suggestion: soft, never blocking, at 15, 30 and 45 minutes at the terminal (counted from when she
// opened the chat, and starting over after an hour away). On another COBOL screen it waits for the chat; on
// another tab the timer stops until she comes back.
function checkBreak() {
  if (state.tab !== 'cobol' || !$('.cobol-view', main)) { clearInterval(breakTimer); breakTimer = 0; return; }
  const minutes = (Date.now() - state.chatSince) / 60000;
  const due = BREAKS.filter(m => minutes >= m).length;
  if (due > (state.breaksSeen || 0)) {
    state.breaksSeen = due;
    state.breakShown = true;
    beep([[523, 90], [392, 140]]);
    if (screen === 'chat') draw();
  }
}

function enterChat() {
  state.chat = state.chat || [];
  if (!state.chatSince || Date.now() - (state.chatLast || 0) > 3600e3) Object.assign(state, { chatSince: Date.now(), breaksSeen: 0, breakShown: false });
  state.chatLast = Date.now();
  if (!breakTimer) breakTimer = setInterval(checkBreak, 20000);
  setTimeout(checkBreak, 0);
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
  draw();
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
    if (out.error === 'hours') {
      Object.assign(state.ai.chat, { open: false, hours: out.hours || state.ai.chat.hours });
      state.chat.push({ role: 'note', text: 'COBOL IS OFF RIGHT NOW. IT RUNS FROM ' + hoursText(state.ai.chat.hours).toUpperCase() + '.' });
    }
    if (out.error === 'off') state.ai.chat.on = false;
    if (out.error === 'limit') state.ai.chat.left = 0;
    if (!['hours', 'off', 'limit'].includes(out.error)) state.chat.push({ role: 'note', text: CHAT_TROUBLE[out.error] || CHAT_TROUBLE.busy });
    beep([[180, 160]]);
  }
  if (screen !== 'chat' || state.tab !== 'cobol') return;
  draw(true);
  if (!out.reply && $('#chat-input', main)) $('#chat-input', main).value = text;
  checkBreak();
}

// ---------------------------------------------------------------------------------------------------------------------
// The test. Every question needs an answer; then her score, and which questions to reread (never the right answers,
// so a retake still makes her think). The first pass saves the points as a record, so they count like AR points and
// go in backups.

async function grade(form) {
  const a = current, t = a.test;
  const picked = t.questions.map((q, i) => { const c = form.querySelector('input[name="q' + i + '"]:checked'); return c ? Number(c.value) : null; });
  const blank = picked.map((p, i) => (p === null ? i + 1 : 0)).filter(Boolean);
  if (blank.length) {
    const err = $('.t-error', form);
    err.textContent = 'ANSWER EVERY QUESTION FIRST. STILL BLANK: ' + blank.join(', ') + '.';
    err.hidden = false;
    beep([[180, 160]]);
    return;
  }
  const missed = picked.map((p, i) => (p === 0 ? -1 : i)).filter(i => i >= 0);
  const right = t.questions.length - missed.length;
  const already = earned(examId(a));
  const won = right >= t.pass && !already;
  result = { right, missed, earned: won, already };
  if (won) {
    await award(examId(a), { earnedPoints: t.points, quizScore: Math.round(right / t.outOf * 100), quizDate: today() },
      'You passed the test on ' + a.title + ': +' + t.points + ' points!');
    beep([[523, 80], [659, 80], [784, 80], [1047, 160]]);
  } else beep(right >= t.pass ? [[660, 60], [990, 90]] : [[392, 120], [262, 200]]);
  go('result');
}

// Saves points as a record (so they count like AR points and go in backups), celebrates, and lets the weekly email
// hear about it the next time the app is online.
async function award(id, patch, message) {
  const was = rewardPoints();
  await save(id, patch);
  const news = pointsNews(was, rewardPoints());
  celebrate();
  toast(message + (news ? ' ' + news : ''));
  await saveSetting('reportAt', '');
  sendReport();
}

// Her think-about-it answer: the bonus point is saved right away; COBOL's reply comes from the script now, or the next
// time she opens the result while COBOL is open.
async function sendThink(form) {
  const a = current;
  const text = $('#think-input', form).value.trim();
  if (text.length < MIN_THINK) {
    const err = $('.t-error', form);
    err.textContent = 'TELL COBOL A LITTLE MORE: A SENTENCE OR TWO.';
    err.hidden = false;
    beep([[180, 160]]);
    return;
  }
  beep([[1200, 25]]);
  await award(thinkId(a), { earnedPoints: 1, quizDate: today(), note: text }, 'Thanks for thinking about it: +1 bonus point!');
  draw(false);
  askThink(true);
}

// Asks the script for COBOL's reply to a saved answer that doesn't have one yet. `first` is the answer's first trip, so
// the script logs it even when COBOL is closed.
async function askThink(first) {
  const a = current;
  if (!a || !a.test || thinking || !earned(thinkId(a)) || reply(a) || reach() || !chatOn()) return;
  if (!first && !openNow(chatInfo())) return;
  thinking = true;
  redrawThink(a);
  const out = await post({ action: 'think', title: a.title, question: a.test.think, answer: state.records[thinkId(a)].note,
    article: articleText(a), again: !first });
  thinking = false;
  if (out && out.reply) await saveSetting(THINK_KEY, Object.assign({}, state.settings[THINK_KEY], { [a.id]: out.reply }));
  if (out && out.reply) beep([[660, 60], [990, 90]]);
  redrawThink(a);
}

// Only the think-about-it box changes, so answers she's picked on a test stay picked.
function redrawThink(a) {
  const box = $('.cobol-view .t-think', main);
  if (box && current === a && state.tab === 'cobol') box.outerHTML = thinkHtml(a);
}

// The article as plain text, so COBOL's reply can build on what she read.
const articleText = a => [].concat(lines(a.intro), ...a.sections.map(f => [f.title].concat(f.text)), lines(a.closing)).join('\n');

// Her passed tests and bonus points, for the weekly email's numbers.
export function examReport() {
  const name = id => {
    if (RETIRED[id]) return RETIRED[id];
    const m = /^exam:(.+?)(:think)?$/.exec(id);
    const a = m && BY_ARTICLE.get(m[1]);
    return a ? (m[2] ? 'think-about-it question on ' : 'test on ') + a.title : id.slice(5);
  };
  return Object.keys(state.records).filter(id => id.startsWith('exam:') && earned(id))
    .map(id => ({ title: name(id), date: state.records[id].quizDate, score: state.records[id].quizScore || 0, points: state.records[id].earnedPoints }));
}

// About the Dude's way in: a small green screen with the start of COBOL's history file.
export function storySectionHtml() {
  const h = BY_ARTICLE.get('cobol-history');
  return '<section class="cobol-intro"><h2>COBOL’s history file</h2><div class="crt"><div class="crt-screen">' +
    '<p>' + esc(h.intro[0]) + '</p><p>' + esc(h.intro[1]) + ' GRACE HOPPER’S IDEAS HELPED BUILD ME.</p>' +
    '<p>MY FILE IS IN THE LIBRARY ON THE COBOL TAB, WITH MORE ARTICLES AND TESTS FOR POINTS.</p>' +
    '<button type="button" class="t-key" data-act="cobol-history">READ THE HISTORY FILE</button></div></div></section>';
}

// PF3 EXIT: back one step. A test and its result go back to wherever she started the test, an article to the
// Library, the chat, Library and Tests to the main menu, and the main menu to Explore.
function exit() {
  if (screen === 'test' || screen === 'result') return go(testFrom);
  if (screen === 'article') return go('library');
  if (screen !== 'menu') return go('menu');
  goTab('explore');
}

function pick(option) {
  const next = { 1: 'chat', 2: 'library', 3: 'tests' }[String(option).trim()];
  if (next) return go(next);
  menuError = 'INVALID OPTION. TYPE 1, 2 OR 3.';
  beep([[180, 160]]);
  draw(false);
}

function open(id, next) {
  const a = BY_ARTICLE.get(id);
  if (!a) return;
  current = a;
  go(next);
}

export const actions = {
  'cobol-option': el => pick(el.dataset.option),
  'cobol-read': el => open(el.dataset.id, 'article'),
  // From About the Dude: COBOL's history file, in the Library on the COBOL tab.
  'cobol-history': () => {
    closeSheet();
    current = BY_ARTICLE.get('cobol-history');
    screen = 'article';
    if (state.tab === 'cobol') go('article');
    else goTab('cobol');
  },
  'cobol-pf1': () => {
    if (screen !== 'library') return go('library');
    window.scrollTo(0, 0);
  },
  'cobol-pf3': () => exit(),
  // PF5 changes only its own key, so answers already picked on the test stay picked.
  'cobol-pf5': el => {
    try { localStorage.setItem(SOUND_KEY, soundOn() ? 'off' : 'on'); } catch (e) { /* storage blocked: stays as it was */ }
    el.textContent = pf5Label();
    el.setAttribute('aria-pressed', String(soundOn()));
    beep([[880, 40]]);
  },
  'cobol-test': el => open(el.dataset.id, 'test'),
  'cobol-break': () => { state.breakShown = false; goTab('explore'); },
  grownup: () => {
    if (screen !== 'grownup') before = screen;
    screen = 'grownup';
    draw();
    window.scrollTo(0, 0);
    post({ action: 'grownup', messages: (state.chat || []).filter(m => m.role !== 'note').slice(-6) }).then(out => {
      const sent = $('.grownup-sent', main);
      if (sent) sent.textContent = out && out.ok ? 'We sent Mom and Dad a message too.' : 'The message didn’t go through, so go find them yourself. You’re doing the right thing.';
    });
  },
  'grownup-back': () => { screen = before; draw(screen === 'chat'); }
};

export const submits = {
  'cobol-option': form => pick($('#cobol-option', form).value),
  'cobol-chat': form => send(form),
  'cobol-test': form => grade(form),
  'cobol-think': form => sendThink(form)
};
