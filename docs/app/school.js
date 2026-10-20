/* Quiz results from the school's emails. A Google script in the account that gets Maddy's Renaissance emails
 * (scripts/school-email) serves them at a private link; a grown-up types that link in once, and it stays on this
 * device. Each time the app opens online, new results land: the book is marked Finished with her points and % score,
 * or added to her books first when it isn't here. A result already typed in by hand is never changed. */

import { C, plural } from './util.js';
import { BOOKS, rebuildBooks } from './books.js';
import { state, db, rec, save, saveSetting } from './state.js';
import { toast, celebrate } from './page.js';
import { rewardPoints, pointsNews } from './money.js';
import { newCustomId } from './my-books.js';
import { render } from './tabs.js';

const LINK = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec\?key=[\w-]+$/;
export const linkOk = url => LINK.test(String(url || '').trim());
// The link out of whatever was pasted: spaces and line breaks taken out (a key pasted onto the end can bring them),
// and anything around it dropped (like "Book Dude link: " from the script's log). '' when there's no link in it.
export function findLink(text) {
  const m = String(text || '').replace(/\s+/g, '').match(/https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec\?key=[\w-]+/);
  return m ? m[0] : '';
}

async function addBook(q) {
  const now = new Date().toISOString();
  const id = newCustomId();
  const book = C.customBook({
    id, title: q.title, author: q.author, ar_level: q.level === null ? '' : String(q.level), ar_points: q.possible === null ? '' : String(q.possible),
    description: 'Added from her AR quiz email on ' + q.date + '.', createdAt: now, updatedAt: now
  });
  await db.putBooks([book]);
  state.custom[id] = book;
  rebuildBooks(state.custom);
  return id;
}

// Fetches the link and adds what's new. quiet: no toast when nothing is new (the check when the app opens).
// One check at a time, so two at once (opening the app while a grown-up saves the link) can't add a quiz twice.
let busy = null;
export function syncSchool(quiet) {
  if (!busy) busy = check(quiet).finally(() => { busy = null; });
  return busy;
}

async function check(quiet) {
  const url = state.settings.schoolLink;
  if (!linkOk(url)) return;
  let feed;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    feed = await res.json();
  } catch (e) {
    if (!quiet) toast('Could not reach the school quiz link. Check the connection and try again.');
    return;
  }
  if (feed && feed.error) { if (!quiet) toast('The school quiz link says: ' + String(feed.error).slice(0, 80)); return; }
  const seen = new Set(state.settings.schoolSeen || []);
  const fresh = C.schoolQuizzes(feed).filter(q => !seen.has(q.id));
  if (!fresh.length) { if (!quiet) toast('No new quizzes from school yet.'); return; }
  const before = rewardPoints();
  try {
    for (const q of fresh) {
      const id = C.findBook(BOOKS, q.title, q.author) || await addBook(q);
      const r = rec(id);
      const patch = { status: 'finished', progress: 100, finishedDate: r.finishedDate || q.date };
      if (r.earnedPoints === null) Object.assign(patch, { earnedPoints: q.points, quizDate: q.date });
      if (r.quizScore === null && q.score !== null) patch.quizScore = q.score;
      await save(id, patch);
      seen.add(q.id);
    }
  } finally {
    await saveSetting('schoolSeen', Array.from(seen));
  }
  render(true);
  const news = pointsNews(before, rewardPoints());
  const last = fresh[fresh.length - 1];
  celebrate();
  toast((fresh.length === 1 ? 'New from school: ' + last.title + ', ' + plural(last.points, 'point') + (last.score !== null ? ', ' + last.score + '%' : '') + '!'
    : plural(fresh.length, 'new quiz', 'new quizzes') + ' from school!') + (news ? ' ' + news : ''));
}
