/* COBOL: a chat with Claude on an IBM 3270 mainframe terminal (through the Google script, scripts/school-email), its
 * history file, and the history test worth 2 points.
 *
 * The chat is built to feel like a machine, not a person: answers appear whole (no "typing" bubble, no pauses), there
 * is no voice, and nothing rewards coming back or chatting longer. A line that never scrolls away says it's an AI and
 * that Mom and Dad can read the chats, a soft timer suggests a break, and a small yellow "Talk to a grown-up" button is
 * always there, so asking for help never depends on typing the right words. Her lines say HUMAN>, and her name never
 * goes to the script. The conversation stays on screen until the app closes; the script keeps the log.
 *
 * The function keys along the bottom work like a real mainframe's: PF1 HISTORY opens the history file, PF3 EXIT leaves
 * the screen she's on (the test goes back to the history, the history to where she came from, the chat closes), and
 * PF5 SOUND turns the beeps on or off. The history file and the test also open from About the Dude, and work without
 * the script. */

import { UI_KEY, $, esc, today } from './util.js';
import { state, save, saveSetting } from './state.js';
import { sheet, sheetBar, closeSheet, toast, celebrate } from './page.js';
import { rewardPoints, pointsNews } from './money.js';
import { openStory } from './dude-talk.js';
import { post, chatOn, mine, sendReport } from './dude-ai.js';

// ---------------------------------------------------------------------------------------------------------------------
// The history file, in COBOL's voice, and the test about it.

const OPENING = ['PROCESSING... HISTORY FILE LOADED.', 'I AM COBOL. MY NAME MEANS COMMON BUSINESS-ORIENTED LANGUAGE. I WAS CREATED IN 1959.'];
const FILES = [
  { title: 'HOW TO WORK THIS TERMINAL.', text: [
    'OLD MAINFRAME TERMINALS HAD A ROW OF PROGRAM FUNCTION KEYS, CALLED PF KEYS. EACH ONE DOES ONE JOB WITH ONE PRESS. ' +
      'MINE ARE AT THE BOTTOM OF THE SCREEN. TAP ONE TO PRESS IT.'],
  keys: [['PF1 HISTORY', 'OPENS THIS HISTORY FILE.'], ['PF3 EXIT', 'LEAVES THE SCREEN YOU ARE ON. ON THE CHAT SCREEN, IT CLOSES COBOL.'],
    ['PF5 SOUND', 'TURNS MY BEEPS ON OR OFF.']],
  more: ['DATA POINT: ON REAL MAINFRAMES, PF3 USUALLY MEANS EXIT, TOO. PROGRAMMERS STILL PRESS IT EVERY DAY.',
    'THE YELLOW TALK TO A GROWN-UP BUTTON IS NOT A PF KEY. PRESS IT WHEN YOU WANT MOM OR DAD. IT SENDS THEM A MESSAGE, AND YOU GO FIND THEM.'] },
  { title: 'A CURIOUS KID.', text: [
    'GRACE HOPPER WAS BORN IN 1906 IN NEW YORK CITY. AT AGE 7 SHE TOOK APART AN ALARM CLOCK TO SEE HOW IT WORKED. THEN ' +
      'ANOTHER. SEVEN CLOCKS TOTAL. DATA SUGGESTS HER MOTHER WAS NOT THRILLED. SHE STUDIED MATH AND PHYSICS AT VASSAR ' +
      'COLLEGE, THEN EARNED A PH.D. IN MATH FROM YALE IN 1934, WHEN VERY FEW WOMEN DID.'] },
  { title: 'TOO SMALL FOR THE NAVY?', text: [
    'IN 1943, DURING WORLD WAR II, SHE WANTED TO JOIN THE NAVY. SHE WAS 15 POUNDS UNDER THE NAVY\'S WEIGHT RULE. SHE GOT ' +
      'SPECIAL PERMISSION AND JOINED ANYWAY.'] },
  { title: 'THE GIANT MACHINE.', text: [
    'IN 1944 THE NAVY SENT HER TO WORK ON THE HARVARD MARK I, A COMPUTER 51 FEET LONG THAT WEIGHED ABOUT 5 TONS. SHE ' +
      'WAS ONE OF ITS FIRST PROGRAMMERS AND WROTE ITS 561-PAGE MANUAL.'] },
  { title: 'ANOMALY REPORT, 1947.', text: [
    'ENGINEERS ALREADY CALLED COMPUTER PROBLEMS "BUGS." THEN HER TEAM FOUND A REAL MOTH STUCK INSIDE THE HARVARD MARK ' +
      'II. THEY TAPED IT IN THE LOGBOOK: "FIRST ACTUAL CASE OF BUG BEING FOUND." THAT PAGE IS IN THE SMITHSONIAN MUSEUM TODAY.'] },
  { title: 'COMPUTERS SHOULD UNDERSTAND WORDS.', text: [
    'BACK THEN, PROGRAMS WERE NUMBERS AND SYMBOLS. PEOPLE TOLD GRACE COMPUTERS COULD ONLY DO ARITHMETIC. IN 1952 SHE ' +
      'BUILT ONE OF THE FIRST COMPILERS, A PROGRAM THAT TRANSLATES INSTRUCTIONS INTO COMPUTER CODE. THEN SHE BUILT ' +
      'FLOW-MATIC, A LANGUAGE THAT USED ENGLISH WORDS. IN 1959 A GROUP BUILT ME ON HER WORK, AND SHE HELPED THEM.'] },
  { title: 'READ A REAL COBOL PROGRAM.', code: ['IDENTIFICATION DIVISION.', 'PROGRAM-ID. HELLO.', 'PROCEDURE DIVISION.', '    DISPLAY "HELLO, HUMAN.".', '    STOP RUN.'],
    text: ['TRANSLATION: DISPLAY SHOWS WORDS ON THE SCREEN. STOP RUN ENDS THE PROGRAM.'] },
  { title: 'THE NANOSECOND.', text: [
    'A NANOSECOND IS ONE BILLIONTH OF A SECOND. TO SHOW HOW SHORT THAT IS, SHE HANDED OUT WIRES 11.8 INCHES LONG: HOW ' +
      'FAR LIGHT TRAVELS IN ONE NANOSECOND.'] },
  { title: 'AMAZING GRACE.', text: [
    'SHE SAID THE MOST DANGEROUS PHRASE IS "WE\'VE ALWAYS DONE IT THIS WAY." SHE BECAME A REAR ADMIRAL AND RETIRED IN ' +
      '1986 AT AGE 79, THE OLDEST ACTIVE-DUTY OFFICER IN THE U.S. NAVY. THE NAVY NAMED A SHIP AFTER HER: THE USS HOPPER.'] }
];
const CLOSING = ['STATUS: STILL RUNNING. BANKS AND GOVERNMENTS STILL USE ME TODAY.', 'END OF FILE.'];

// The right answer is always listed first; the choices are shuffled on screen. `file` says where the answer is.
const QUESTIONS = [
  { q: 'What does COBOL stand for?', file: 'THE TOP OF THE FILE',
    choices: ['Common Business-Oriented Language', 'Computer Book Of Lists', 'Code Of Big Old Letters', 'Clever Old Brain On Loan'] },
  { q: 'How many alarm clocks did Grace take apart as a kid?', file: 'FILE 1', choices: ['7', '3', '12', '1'] },
  { q: 'What was the Harvard Mark I?', file: 'FILE 3', choices: ['A computer 51 feet long', 'A Navy ship', 'A telescope', 'A library'] },
  { q: 'What did her team find inside the Harvard Mark II in 1947?', file: 'FILE 4', choices: ['A moth', 'A mouse', 'A sock', 'A pencil'] },
  { q: 'Why did the Navy almost not let her join?', file: 'FILE 2',
    choices: ['She was 15 pounds under the weight rule', 'She was too tall', 'She couldn’t swim', 'She was too young'] },
  { q: 'What was Grace’s big idea?', file: 'FILE 5',
    choices: ['Computers should understand words', 'Computers should be smaller', 'Computers should play music', 'Computers should never be turned off'] },
  { q: 'In the COBOL program, what does DISPLAY do?', file: 'FILE 6',
    choices: ['Shows words on the screen', 'Turns the computer off', 'Prints a picture', 'Plays a beep'] },
  { q: 'How long was her “nanosecond” wire?', file: 'FILE 7', choices: ['11.8 inches', '1 inch', '11.8 feet', '1 mile'] },
  { q: 'What phrase did she call the most dangerous?', file: 'FILE 8',
    choices: ['“We’ve always done it this way”', '“Turn it off and on again”', '“Are we there yet?”', '“Bug spray, please”'] },
  { q: 'On COBOL’s screen, what does PF3 do?', file: 'FILE 0',
    choices: ['Leaves the screen you’re on', 'Opens the history file', 'Turns the beeps on or off', 'Prints the page'] }
];
const EXAM_ID = 'exam:cobol';
const EXAM_POINTS = 2;
const PASS = 8;                          // Right answers out of 10 to pass (80%).
// Book Dude's tests, by record id, for the weekly email.
export const EXAMS = { [EXAM_ID]: 'COBOL history test' };
const examPassed = () => !!(state.records[EXAM_ID] && state.records[EXAM_ID].earnedPoints !== null);

// ---------------------------------------------------------------------------------------------------------------------
// The terminal: which screen is up, and where COBOL was opened from (the chat button, or About the Dude).

let screen = 'chat';                     // chat, history, test, result or grownup
let from = 'chat';
let sending = false;
let breakTimer = 0;
let order = [];                          // This try's shuffled choices: for each question, its choices' indexes.
let result = null;                       // The last test: { right, missed: [question indexes], earned, already }
let before = 'chat';                     // The screen under the grown-up panel.

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
const NAMES = { chat: 'CHAT', history: 'HISTORY FILE', test: 'HISTORY TEST', result: 'TEST RESULT' };

// The 3270 frame around every screen: the title line, the screen itself, the function keys, and the status line.
function frame(body) {
  return '<button type="button" class="grownup-btn" data-act="grownup">Talk to a grown-up</button>' +
    '<div class="crt"><div class="crt-screen">' +
      '<p class="t-head"><span>COBOL</span><span>BOOK DUDE MAINFRAME</span><span>' + NAMES[screen] + '</span></p>' +
      body +
      '<nav class="t-pf" aria-label="Function keys">' +
        '<button type="button" data-act="cobol-pf1">PF1 HISTORY</button>' +
        '<button type="button" data-act="cobol-pf3">PF3 EXIT</button>' +
        '<button type="button" data-act="cobol-pf5" aria-pressed="' + soundOn() + '">' + pf5Label() + '</button></nav>' +
      '<p class="t-oia" aria-hidden="true"><span>' + (sending ? 'X SYSTEM' : 'READY') + '</span><span>' + (from === 'story' ? 'ABOUT THE DUDE' : 'COBOL 1959') + '</span></p>' +
    '</div></div>';
}

function chatBody() {
  const c = (state.ai && state.ai.chat) || {};
  const lines = [{ role: 'note', text: 'BOOK DUDE MAINFRAME. COBOL ONLINE SINCE 1959.' },
    { role: 'assistant', text: 'GREETINGS, HUMAN. COBOL IS READY. Ask me about books, words, science, history, or anything you are curious about.' }].concat(state.chat);
  const who = { user: 'HUMAN', assistant: 'COBOL' };
  const log = lines.map(m => '<p class="t-line ' + (m.role === 'user' ? 't-me' : m.role === 'note' ? 't-note' : 't-cobol') + '">' +
    (who[m.role] ? '<span class="t-who">' + who[m.role] + '&gt;</span> ' : '') + esc(m.text) + '</p>').join('');
  const minutes = state.chatSince ? Math.floor((Date.now() - state.chatSince) / 60000) : 0;
  const pause = state.breakShown ? '<div class="t-break" role="status"><p>*** SYSTEM NOTICE: ' + minutes + ' MINUTES AT THE TERMINAL. RECOMMENDED: A BREAK. ' +
    'YOUR EYES, MAPLE AND A GOOD BOOK WOULD ALL LIKE A TURN. ***</p><button type="button" class="t-key" data-act="close-sheet">OK, BREAK</button></div>' : '';
  const closed = !chatOn() || c.on === false ? CHAT_TROUBLE.off : c.open === false ? 'COBOL IS OFF RIGHT NOW. IT RUNS FROM ' + hoursText(c.hours).toUpperCase() + '.' : c.left === 0 ? CHAT_TROUBLE.limit : '';
  const prompt = closed ? '<p class="t-line t-note">' + esc(closed) + '</p>' :
    '<form data-form="cobol-chat" class="t-prompt" autocomplete="off"><label for="chat-input" class="t-who">HUMAN&gt;</label>' +
    '<input id="chat-input" type="text" maxlength="400" enterkeyhint="send" spellcheck="true" aria-label="Message to COBOL"' + (sending ? ' disabled' : '') + '>' +
    '<button type="submit" class="t-key"' + (sending ? ' disabled' : '') + '>ENTER</button></form>';
  return '<p class="t-status">This is an AI. Mom and Dad can read these chats.</p>' +
    '<div class="t-log" role="log" aria-live="polite">' + log + (sending ? '<p class="t-line t-note t-wait">WORKING<span class="t-cursor"></span></p>' : '') + '</div>' +
    pause + prompt;
}

function historyBody() {
  const p = t => '<p>' + esc(t) + '</p>';
  const files = FILES.map((f, n) => '<section class="t-filesec"><h3>FILE ' + n + ': ' + esc(f.title) + '</h3>' +
    (f.code ? '<pre class="t-code">' + esc(f.code.join('\n')) + '</pre>' : '') + f.text.map(p).join('') +
    (f.keys ? '<dl class="t-keys">' + f.keys.map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>').join('') + '</dl>' : '') +
    (f.more || []).map(p).join('') + '</section>').join('');
  const test = examPassed()
    ? '<p class="t-ok">TEST PASSED. ' + EXAM_POINTS + ' POINTS EARNED. YOU CAN TAKE IT AGAIN FOR FUN.</p>'
    : '<p>TEST AVAILABLE: 10 QUESTIONS. PASS WITH 8 OF 10 (80%) TO EARN ' + EXAM_POINTS + ' POINTS.</p>';
  return '<div class="t-body t-file" tabindex="0" aria-label="COBOL’s history file">' + OPENING.map(p).join('') + files + CLOSING.map(p).join('') + '</div>' +
    '<div class="t-actions">' + test + '<button type="button" class="t-key" data-act="cobol-test">' + (examPassed() ? 'TAKE THE TEST AGAIN' : 'TAKE THE TEST') + '</button></div>';
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
  if (order.length !== QUESTIONS.length) order = QUESTIONS.map(q => shuffled(q.choices.length));
  return '<div class="t-body t-test">' +
    '<p class="t-callout"><b>PASSING SCORE: 80%.</b> Pass with 8 of 10 (80%) or better to earn ' + EXAM_POINTS + ' points. Points count just like AR points, and you can earn them once. You can retake the test.</p>' +
    '<p class="t-note">More exams are coming. Math exams will need 90% or higher, and they earn more points.</p>' +
    (examPassed() ? '<p class="t-ok">You already passed and earned your ' + EXAM_POINTS + ' points. This try is for fun.</p>' : '') +
    '<form data-form="cobol-test" class="t-quiz">' + QUESTIONS.map((q, i) => '<fieldset class="t-q"><legend>' + String(i + 1).padStart(2, '0') + '. ' + esc(q.q) + '</legend>' +
      order[i].map(c => '<label><input type="radio" name="q' + i + '" value="' + c + '"> ' + esc(q.choices[c]) + '</label>').join('') + '</fieldset>').join('') +
      '<p class="error t-error" role="alert" hidden></p>' +
      '<button type="submit" class="t-key">SUBMIT ANSWERS</button></form></div>';
}

function resultBody() {
  const r = result;
  const pct = r.right * 10;
  const passed = r.right >= PASS;
  const reread = r.missed.length ? '<p>' + (passed ? 'FOR A PERFECT SCORE, REREAD:' : 'REREAD THESE, THEN TRY AGAIN:') + '</p><ul class="t-missed">' +
    r.missed.map(i => '<li>' + String(i + 1).padStart(2, '0') + '. ' + esc(QUESTIONS[i].q) + ' <span>(' + QUESTIONS[i].file + ')</span></li>').join('') + '</ul>' : '';
  const verdict = passed
    ? '<p class="t-ok">RESULT: PASSED.</p>' + (r.earned ? '<p class="t-callout">+' + EXAM_POINTS + ' POINTS. They count just like AR points.</p>'
      : r.already ? '<p>You already earned these ' + EXAM_POINTS + ' points, so none were added this time.</p>' : '')
    : '<p class="t-warn">RESULT: NOT YET. You need 8 of 10 (80%) to pass.</p>';
  return '<div class="t-body t-result" role="status"><p class="t-score">SCORE: ' + r.right + ' OF 10 (' + pct + '%)</p>' + verdict + reread +
    (passed && !r.missed.length ? '<p>ALL ANSWERS CORRECT. FASCINATING DATA.</p>' : '') + '</div>' +
    '<div class="t-actions"><button type="button" class="t-key" data-act="cobol-pf1">REREAD THE HISTORY</button>' +
    '<button type="button" class="t-key" data-act="cobol-test">TAKE IT AGAIN</button></div>';
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

function draw(focus) {
  const box = $('.ai-sheet.cobol', sheet);
  if (!sheet.open || !box) return;
  if (screen === 'grownup') { box.innerHTML = grownupBody(); return; }
  box.innerHTML = frame(screen === 'history' ? historyBody() : screen === 'test' ? testBody() : screen === 'result' ? resultBody() : chatBody());
  const log = $('.t-log', sheet);
  if (log) log.scrollTop = log.scrollHeight;
  if (focus && screen === 'chat' && $('#chat-input', sheet)) $('#chat-input', sheet).focus();
}

function go(next) {
  if (next === 'test' && screen !== 'test') order = [];
  screen = next;
  draw(true);
  const body = $('.t-body', sheet);
  if (body) body.scrollTop = 0;
  // Back to the top of the sheet, where the grown-up button is.
  sheet.scrollTop = 0;
}

function show(start, origin) {
  state.openId = null;
  from = origin;
  screen = start;
  sheet.innerHTML = sheetBar('COBOL') + '<div class="sheet-body ai-sheet cobol"></div>';
  if (!sheet.open) sheet.showModal();
  draw(true);
}

// ---------------------------------------------------------------------------------------------------------------------
// The chat.

// The break suggestion: soft, never blocking, at 15, 30 and 45 minutes at the terminal (counted from when she
// opened it, and starting over after an hour away). On another screen it waits for the chat.
function checkBreak() {
  if (!sheet.open || !$('.ai-sheet.cobol', sheet) || from !== 'chat') { clearInterval(breakTimer); breakTimer = 0; return; }
  const minutes = (Date.now() - state.chatSince) / 60000;
  const due = BREAKS.filter(m => minutes >= m).length;
  if (due > (state.breaksSeen || 0)) {
    state.breaksSeen = due;
    state.breakShown = true;
    beep([[523, 90], [392, 140]]);
    if (screen === 'chat') draw();
  }
}

function openChat() {
  state.chat = state.chat || [];
  if (!state.chatSince || Date.now() - (state.chatLast || 0) > 3600e3) Object.assign(state, { chatSince: Date.now(), breaksSeen: 0, breakShown: false });
  state.chatLast = Date.now();
  show('chat', 'chat');
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
    if (out.error === 'hours') Object.assign(state.ai.chat, { open: false, hours: out.hours || state.ai.chat.hours });
    if (out.error === 'off') state.ai.chat.on = false;
    if (out.error === 'limit') state.ai.chat.left = 0;
    if (!['hours', 'off', 'limit'].includes(out.error)) state.chat.push({ role: 'note', text: CHAT_TROUBLE[out.error] || CHAT_TROUBLE.busy });
    beep([[180, 160]]);
  }
  if (screen !== 'chat') return;
  draw(true);
  if (!out.reply && $('#chat-input', sheet)) $('#chat-input', sheet).value = text;
  checkBreak();
}

// ---------------------------------------------------------------------------------------------------------------------
// The test. Every question needs an answer; then her score, and which questions to reread (never the right answers,
// so a retake still makes her think). The first pass saves the points as a record, so they count like AR points and
// go in backups.

async function grade(form) {
  const picked = QUESTIONS.map((q, i) => { const c = form.querySelector('input[name="q' + i + '"]:checked'); return c ? Number(c.value) : null; });
  const blank = picked.map((p, i) => (p === null ? i + 1 : 0)).filter(Boolean);
  if (blank.length) {
    const err = $('.t-error', form);
    err.textContent = 'ANSWER EVERY QUESTION FIRST. STILL BLANK: ' + blank.join(', ') + '.';
    err.hidden = false;
    beep([[180, 160]]);
    return;
  }
  const missed = picked.map((p, i) => (p === 0 ? -1 : i)).filter(i => i >= 0);
  const right = QUESTIONS.length - missed.length;
  const already = examPassed();
  const earned = right >= PASS && !already;
  result = { right, missed, earned, already };
  if (earned) {
    const was = rewardPoints();
    await save(EXAM_ID, { earnedPoints: EXAM_POINTS, quizScore: right * 10, quizDate: today() });
    const news = pointsNews(was, rewardPoints());
    beep([[523, 80], [659, 80], [784, 80], [1047, 160]]);
    celebrate();
    toast('You passed COBOL’s history test: +' + EXAM_POINTS + ' points!' + (news ? ' ' + news : ''));
    // The weekly email hears about it next time the app is online.
    await saveSetting('reportAt', '');
    sendReport();
  } else beep(right >= PASS ? [[660, 60], [990, 90]] : [[392, 120], [262, 200]]);
  go('result');
}

// Her passed tests, for the weekly email's numbers.
export function examReport() {
  return Object.keys(EXAMS).filter(id => state.records[id] && state.records[id].earnedPoints !== null)
    .map(id => ({ title: EXAMS[id], date: state.records[id].quizDate, score: state.records[id].quizScore || 0, points: state.records[id].earnedPoints }));
}

// About the Dude's way in: a small green screen with the start of the file.
export function storySectionHtml() {
  return '<section class="cobol-intro"><h2>COBOL’s history file</h2><div class="crt"><div class="crt-screen">' +
    '<p>' + esc(OPENING[0]) + '</p><p>' + esc(OPENING[1]) + ' GRACE HOPPER’S IDEAS HELPED BUILD ME.</p>' +
    '<p>' + (examPassed() ? 'TEST PASSED. ' + EXAM_POINTS + ' POINTS EARNED.' : 'TEST AVAILABLE: PASS WITH 8 OF 10 (80%) TO EARN ' + EXAM_POINTS + ' POINTS.') + '</p>' +
    '<button type="button" class="t-key" data-act="cobol-history">READ THE HISTORY FILE</button></div></div></section>';
}

// PF3 EXIT: back one screen. The test and its result go back to the history, the history to the chat or About the
// Dude (whichever opened it), and the chat closes.
function exit() {
  if (screen === 'test' || screen === 'result') return go('history');
  if (screen === 'history' && from === 'chat') return go('chat');
  if (screen === 'history') return openStory();
  closeSheet();
}

export const actions = {
  cobol: () => openChat(),
  'cobol-history': () => show('history', 'story'),
  'cobol-pf1': () => {
    if (screen !== 'history') return go('history');
    const body = $('.t-body', sheet);
    if (body) body.scrollTop = 0;
  },
  'cobol-pf3': () => exit(),
  // PF5 changes only its own key, so answers already picked on the test stay picked.
  'cobol-pf5': el => {
    try { localStorage.setItem(SOUND_KEY, soundOn() ? 'off' : 'on'); } catch (e) { /* storage blocked: stays as it was */ }
    el.textContent = pf5Label();
    el.setAttribute('aria-pressed', String(soundOn()));
    beep([[880, 40]]);
  },
  'cobol-test': () => go('test'),
  grownup: () => {
    if (screen !== 'grownup') before = screen;
    screen = 'grownup';
    draw();
    post({ action: 'grownup', messages: (state.chat || []).filter(m => m.role !== 'note').slice(-6) }).then(out => {
      const sent = $('.grownup-sent', sheet);
      if (sent) sent.textContent = out && out.ok ? 'We sent Mom and Dad a message too.' : 'The message didn’t go through, so go find them yourself. You’re doing the right thing.';
    });
  },
  'grownup-back': () => { screen = before; draw(true); }
};

export const submits = {
  'cobol-chat': form => send(form),
  'cobol-test': form => grade(form)
};
