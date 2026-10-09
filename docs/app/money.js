/* Book money and the Secret Files: the jar on the Progress tab, the grown-up settings on the More tab,
 * and the files she unlocks with AR points. */

import { C, esc, fmtNum, plural, DUDE, fill, dayOfYear } from './util.js';
import { icon } from './icons.js';
import { BOOKS } from './books.js';
import { state, saveSetting } from './state.js';
import { sheet, toast, sheetBar, showConfirm } from './page.js';
import { renderProgress } from './progress.js';
import { renderMore } from './more.js';

// "A trip to the bookstore" reads as "earned a trip to the bookstore" mid-sentence.
const prizeText = prize => String(prize).replace(/^(A|An|The)\b/, w => w.toLowerCase());
const moneyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const money = n => { const s = moneyFormat.format(n); return s.endsWith('.00') ? s.slice(0, -3) : s; };
// One payout in a sentence: "$100 for your Barnes & Noble account", or the non-money prize.
export const rewardLabel = cfg => (cfg.perPoint > 0 ? money(cfg.every * cfg.perPoint) + ' for ' + cfg.where : prizeText(cfg.prize));

export function allTimePoints() {
  return C.metrics(BOOKS, state.records, '').earned;
}

const JAR_SVG = '<svg viewBox="0 0 120 150" aria-hidden="true" focusable="false"><defs><clipPath id="jar-clip"><path d="M34 30h52v10c12 6 18 17 18 32v50c0 13-9 22-22 22H38c-13 0-22-9-22-22V72c0-15 6-26 18-32z"/></clipPath><linearGradient id="jar-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7D774"/><stop offset="1" stop-color="#D49A2A"/></linearGradient></defs><path class="jar-back" d="M34 30h52v10c12 6 18 17 18 32v50c0 13-9 22-22 22H38c-13 0-22-9-22-22V72c0-15 6-26 18-32z"/><g clip-path="url(#jar-clip)"><g class="jar-fill" data-fill="__FILL__"><path fill="url(#jar-gold)" d="M0 40q15-5 30 0t30 0 30 0 30 0V150H0z"/><g class="jar-coins"><circle cx="34" cy="132" r="8"/><circle cx="56" cy="138" r="8"/><circle cx="80" cy="131" r="8"/><circle cx="96" cy="139" r="7"/><circle cx="45" cy="116" r="8"/><circle cx="69" cy="118" r="8"/><circle cx="88" cy="112" r="7"/><circle cx="28" cy="100" r="7"/><circle cx="56" cy="98" r="8"/><circle cx="80" cy="95" r="7"/><circle cx="40" cy="80" r="7"/><circle cx="66" cy="78" r="8"/><circle cx="90" cy="76" r="6"/><circle cx="52" cy="60" r="7"/><circle cx="76" cy="58" r="7"/></g></g></g><path class="jar-glass" d="M34 30h52v10c12 6 18 17 18 32v50c0 13-9 22-22 22H38c-13 0-22-9-22-22V72c0-15 6-26 18-32z"/><path class="jar-shine" d="M26 74c-3 12-3 32 0 46"/><rect class="jar-lid" x="29" y="17" width="62" height="15" rx="4"/><rect class="jar-label" x="32" y="84" width="56" height="30" rx="4"/><text class="jar-label-text" x="60" y="97" text-anchor="middle">BOOK</text><text class="jar-label-text" x="60" y="108" text-anchor="middle">MONEY</text></svg>';

function lastFile(total) {
  let hit = null;
  for (const f of DUDE.files) if (total >= f.at) hit = f;
  return hit;
}
const nextFile = total => DUDE.files.find(f => total < f.at) || null;

function factLine(total) {
  if (!total || !DUDE.facts.length) return 'Earn your first points and the Dude will do some very serious math about them.';
  const vars = { points: fmtNum(total), pages: fmtNum(Math.round(total * 25)), nuggets: fmtNum(Math.max(1, Math.floor(total / 10))) };
  return fill(DUDE.facts[dayOfYear() % DUDE.facts.length], vars);
}

export function jarHtml(total) {
  const cfg = C.reward(state.settings.reward);
  if (!cfg.on) return '';
  const st = C.rewardStatus(total, cfg);
  const vars = { points: fmtNum(total), toGo: fmtNum(st.toGo), prize: rewardLabel(cfg) };
  let line = '';
  for (const [at, text] of DUDE.jar) if (st.frac >= at) line = text;
  const full = st.owed > 0;
  const title = lastFile(total);
  const next = nextFile(total);
  return '<section class="jar-card' + (full ? ' full' : '') + '" aria-label="Book Money Jar">' +
    '<div class="jar" role="img" aria-label="' + esc(st.money ? money(st.jarMoney) + ' of ' + money(st.payout) + ' in the book money jar' : fmtNum(st.into) + ' of ' + st.every + ' points in the book money jar') + '">' +
      JAR_SVG.replace('__FILL__', (full ? 1 : st.frac).toFixed(3)) + '</div>' +
    '<div class="jar-info"><p class="jar-kicker">Book Money Jar</p>' +
      (st.money
        ? '<p class="jar-count"><span class="big">' + money(st.jarMoney) + '</span> <span class="of">of ' + money(st.payout) + '</span></p>' +
          '<p class="jar-goal">' + fmtNum(st.into) + ' of ' + st.every + ' points. At ' + st.every + ', ' + money(st.payout) + ' goes into ' + esc(cfg.where) + '.</p>'
        : '<p class="jar-count"><span class="big">' + fmtNum(st.into) + '</span> <span class="of">of ' + st.every + ' points</span></p>' +
          '<p class="jar-goal">until ' + esc(prizeText(cfg.prize)) + '</p>') +
      '<p class="jar-line">' + esc(fill(full ? DUDE.jarFull : line, vars)) + '</p></div>' +
    (full ? '<div class="jar-owed"><b>' + (st.money ? money(st.owedMoney) + ' is waiting to go into ' + esc(cfg.where) : plural(st.owed, 'reward is', 'rewards are') + ' waiting for a grown-up') + '</b>' +
      '<button type="button" class="btn small" data-act="reward-given">' + (st.money ? 'Grown-up: mark as deposited' : 'Grown-up: mark one as given') + '</button></div>' : '') +
    '<div class="jar-foot">' +
      '<p class="jar-title"><span>Your title</span><b>' + esc(title ? fill(title.title) : 'Fresh Bookworm') + '</b></p>' +
      '<p class="jar-next">' + (next ? 'Next Secret File opens at ' + next.at + ' points.' : 'Every Secret File is open. Legend.') + '</p>' +
      '<p class="jar-fact">' + esc(factLine(total)) + '</p>' +
      '<p class="jar-tally">' + (st.money
        ? fmtNum(total) + ' points all time = ' + money(st.totalMoney) + ' · payouts earned: ' + st.earned + (cfg.paid ? ', deposited: ' + cfg.paid : '')
        : fmtNum(total) + ' points all time · rewards earned: ' + st.earned + (cfg.paid ? ', given: ' + cfg.paid : '')) + '</p>' +
    '</div></section>';
}

export function filesHtml(total) {
  if (!DUDE.files.length) return '';
  const open = DUDE.files.filter(f => total >= f.at).length;
  return '<section><h2 class="section-title">The Dude’s Secret Files <small>' + open + ' of ' + DUDE.files.length + ' unlocked</small></h2>' +
    '<p class="hint files-hint">A story from each of the Dude’s old jobs. Earn AR points to open them.</p>' +
    '<div class="files">' + DUDE.files.map((f, i) => {
      const unlocked = total >= f.at;
      return '<button type="button" class="file' + (unlocked ? '' : ' locked') + '" data-act="open-file" data-i="' + i + '" aria-label="' +
        esc(unlocked ? 'Secret file ' + (i + 1) + ': ' + fill(f.title) : 'Locked secret file ' + (i + 1) + ', opens at ' + f.at + ' points') + '">' +
        '<span class="file-no">File ' + (i + 1) + '</span>' +
        (unlocked ? '<b>' + esc(fill(f.title)) + '</b><span class="file-job">' + esc(fill(f.job)) + '</span>'
          : '<b>' + icon('lock') + 'Top secret</b><span class="file-job">Opens at ' + f.at + ' pts</span>') +
        '</button>';
    }).join('') + '</div></section>';
}

function openFile(i) {
  const f = DUDE.files[i];
  const total = allTimePoints();
  if (!f) return;
  if (total < f.at) {
    toast(fmtNum(Math.round((f.at - total) * 100) / 100) + ' more points to open this one. ' + DUDE.dog + ' is guarding it.');
    return;
  }
  const open = DUDE.files.map((x, j) => (total >= x.at ? j : -1)).filter(j => j >= 0);
  const pos = open.indexOf(i);
  const prev = open[pos - 1], next = open[pos + 1];
  state.openId = null;
  sheet.innerHTML = sheetBar('Secret file ' + (i + 1)) + '<div class="sheet-body file-sheet">' +
    '<p class="stamp" aria-hidden="true">Top secret</p>' +
    '<div><p class="file-label">File ' + (i + 1) + ' · ' + esc(fill(f.job)) + '</p><h1>' + esc(fill(f.title)) + '</h1></div>' +
    '<div class="file-paper"><img class="file-face" src="img/dude-face.jpg" alt="" width="56" height="56"><p class="desc">' + esc(fill(f.text)) + '</p>' +
      '<p class="signoff">' + esc(fill(DUDE.signoff)) + '</p></div>' +
    '<div class="row-actions">' +
      (prev !== undefined ? '<button type="button" class="btn" data-act="open-file" data-i="' + prev + '">Previous file</button>' : '') +
      (next !== undefined ? '<button type="button" class="btn primary" data-act="open-file" data-i="' + next + '">Next file</button>'
        : '<button type="button" class="btn primary" data-act="close-sheet">Back to reading</button>') +
    '</div></div>';
  if (!sheet.open) sheet.showModal();
  sheet.scrollTop = 0;
}

async function saveReward(patch) {
  const next = C.reward(Object.assign({}, state.settings.reward, patch, { updatedAt: new Date().toISOString() }));
  await saveSetting('reward', next);
  return next;
}

export function rewardPanelHtml() {
  const cfg = C.reward(state.settings.reward);
  const total = allTimePoints();
  const st = C.rewardStatus(total, cfg);
  return '<section class="panel"><h2>Book money <small class="for-grownups">for grown-ups</small></h2>' +
    '<p class="lead">Turn AR points into a real reward. The points come from the quiz results entered in this app, so it runs on the honor system; you can check them against the school’s AR report.</p>' +
    '<div class="stack">' +
      '<label class="switch"><input type="checkbox" id="reward-on"' + (cfg.on ? ' checked' : '') + '> Show the Book Money Jar</label>' +
      '<div class="two"><label class="field"><span>Dollars per point</span><input id="reward-per" class="input" type="text" inputmode="decimal" autocomplete="off" value="' + cfg.perPoint + '"></label>' +
      '<label class="field"><span>Points per payout</span><input id="reward-every" class="input" type="text" inputmode="numeric" autocomplete="off" value="' + cfg.every + '"></label></div>' +
      (st.money
        ? '<label class="field"><span>Where the money goes</span><input id="reward-where" class="input" type="text" maxlength="60" autocomplete="off" value="' + esc(cfg.where) + '"></label>'
        : '<label class="field"><span>The reward</span><input id="reward-prize" class="input" type="text" maxlength="80" autocomplete="off" value="' + esc(cfg.prize) + '"></label>') +
      '<div class="stepper"><span class="label" id="paid-label">' + (st.money ? 'Payouts already deposited' : 'Rewards already given') + '</span><div class="seg" role="group" aria-labelledby="paid-label">' +
        '<button type="button" data-act="paid-minus" aria-label="One fewer">−</button><output id="reward-paid">' + cfg.paid + '</output>' +
        '<button type="button" data-act="paid-plus" aria-label="One more">+</button></div></div>' +
      '<p class="hint">' + (st.money
        ? money(cfg.perPoint) + ' a point × ' + cfg.every + ' points = ' + money(st.payout) + ' each payout. ' + fmtNum(total) + ' points so far · ' + plural(st.earned, 'payout') + ' earned · ' + money(st.owedMoney) + ' waiting to be deposited.'
        : fmtNum(total) + ' points so far · ' + plural(st.earned, 'reward') + ' earned · ' + st.owed + ' waiting to be given.') +
        ' Set dollars per point to 0 for a reward that isn’t money.</p>' +
    '</div></section>';
}

export const actions = {
  'open-file': el => openFile(Number(el.dataset.i)),
  'reward-given': () => {
    const cfg = C.reward(state.settings.reward);
    const cash = cfg.perPoint > 0;
    const payout = money(cfg.every * cfg.perPoint);
    showConfirm(cash ? 'Mark ' + payout + ' as deposited?' : 'Mark book money as given?',
      cash ? '<p>Tap this after ' + esc(payout) + ' goes into ' + esc(cfg.where) + '. The jar keeps counting toward the next ' + esc(payout) + '.</p>'
        : '<p>Tap this after a grown-up hands over ' + esc(prizeText(cfg.prize)) + '. The jar keeps counting toward the next one.</p>',
      cash ? 'Mark as deposited' : 'Mark as given', async () => {
        await saveReward({ paid: cfg.paid + 1 });
        renderProgress();
        toast(cash ? payout + ' deposited! Enjoy the bookstore. (Socks required.)' : 'Marked as given. Enjoy the bookstore! (Socks optional. Kidding. Socks required.)');
      });
  },
  'paid-minus': async () => { const cfg = C.reward(state.settings.reward); await saveReward({ paid: Math.max(0, cfg.paid - 1) }); renderMore(); },
  'paid-plus': async () => { const cfg = C.reward(state.settings.reward); await saveReward({ paid: cfg.paid + 1 }); renderMore(); }
};

export const changes = {
  'reward-on': async t => {
    await saveReward({ on: t.checked });
    toast(t.checked ? 'The Book Money Jar is on the Progress tab.' : 'The Book Money Jar is hidden.');
  },
  'reward-every': async t => {
    const n = Number(t.value.trim());
    if (!Number.isInteger(n) || n < 1 || n > 10000) { toast('Points for each reward must be a whole number, like 100.'); t.value = C.reward(state.settings.reward).every; return; }
    await saveReward({ every: n });
    renderMore();
  },
  'reward-per': async t => {
    const raw = t.value.trim().replace('$', '').replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) > 1000) { toast('Dollars per point must be a number, like 1 or 0.50.'); t.value = C.reward(state.settings.reward).perPoint; return; }
    await saveReward({ perPoint: Number(raw) });
    renderMore();
  },
  'reward-where': async t => {
    await saveReward({ where: t.value });
    t.value = state.settings.reward.where;
  },
  'reward-prize': async t => {
    await saveReward({ prize: t.value });
    t.value = state.settings.reward.prize;
  }
};
