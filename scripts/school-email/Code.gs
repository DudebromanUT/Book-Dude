/* Book Dude's school quiz feed. Runs in the Google account that gets Maddy's Renaissance quiz emails: once a day it
 * copies each new quiz result (title, author, % score, points, book level, date) out of those emails, and it hands
 * them to Book Dude at a private link. Setup steps: scripts/school-email/README.md.
 *
 * Nothing secret is in this file. The link's key is made in your Google account by setup() and stays there. */

var SENDER = 'autodelivery@renlearnrp.com';
var HEADER = 'Accelerated Reader Reading Practice Quiz';  // Only these; other Renaissance emails are skipped.
var STUDENT = 'Madeleine';     // Only her quizzes; an email about anyone else is skipped.
var START = '2026/10/18';      // Quizzes before this are already in her reading history.
var ZONE = 'America/Denver';
var RUN_HOUR = 15;             // 3 p.m. Utah time (Google runs it some time in that hour).

// Run this once, from the editor. It makes the key, sets up the daily run, collects what's there, and prints the link.
function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('key')) props.setProperty('key', Utilities.getUuid().replace(/-/g, ''));
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('collect').timeBased().everyDays(1).atHour(RUN_HOUR).inTimezone(ZONE).create();
  collect();
  showLink();
}

// Prints the link to type into Book Dude (More, then the grown-up settings). Run it again any time you need it.
function showLink() {
  var key = PropertiesService.getScriptProperties().getProperty('key');
  var url = ScriptApp.getService().getUrl() || '';
  if (!/\/exec$/.test(url)) {
    Logger.log('Copy the Web app URL from Deploy, Manage deployments (it ends in /exec), and add this to its end: ?key=' + key);
    return;
  }
  Logger.log('Book Dude link: ' + url + '?key=' + key);
}

// The daily run: saves every quiz email it hasn't seen before.
function collect() {
  var props = PropertiesService.getScriptProperties();
  var saved = 0;
  GmailApp.search('from:' + SENDER + ' "' + HEADER + '" after:' + START, 0, 100).forEach(function (thread) {
    thread.getMessages().forEach(function (m) {
      var name = 'q_' + m.getId();
      if (m.getFrom().toLowerCase().indexOf(SENDER) < 0 || props.getProperty(name)) return;
      var quiz = parseQuiz(m.getPlainBody(), Utilities.formatDate(m.getDate(), ZONE, 'yyyy-MM-dd'));
      if (!quiz) return;
      quiz.id = m.getId();
      props.setProperty(name, JSON.stringify(quiz));
      saved++;
    });
  });
  Logger.log(saved + ' new quiz result(s) saved.');
}

// One email's quiz result, or null when it isn't a Reading Practice Quiz result of hers. Book Dude checks every value again.
function parseQuiz(body, date) {
  var text = String(body || '').replace(/\*/g, '').replace(/ /g, ' ');
  var field = function (label) {
    var m = text.match(new RegExp(label + '\\s*:\\s*([^\\n]+)', 'i'));
    return m ? m[1].trim() : '';
  };
  // A Reading Practice Quiz result about her: the header, and "Madeleine took an Accelerated Reader Reading Practice Quiz".
  if (text.toLowerCase().indexOf(HEADER.toLowerCase()) < 0) return null;
  var who = text.match(/([A-Za-z'-]+)\s+took an Accelerated Reader Reading Practice Quiz/i);
  if (!who || (STUDENT && who[1].toLowerCase() !== STUDENT.toLowerCase())) return null;
  var points = field('Points').match(/([\d.]+)\s*earned\s*of\s*([\d.]+)/i);
  var title = field('Title');
  if (!title || !points) return null;
  var score = field('Score').match(/([\d.]+)\s*%/);
  var level = field('Book\\s*/\\s*Article level').match(/[\d.]+/);
  return {
    date: date,
    title: title,
    author: field('Author'),
    points: Number(points[1]),
    possible: Number(points[2]),
    score: score ? Number(score[1]) : null,
    level: level ? Number(level[0]) : null
  };
}

// Book Dude asks here when it opens. Without the right key, it gets nothing.
function doGet(e) {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('key');
  var ok = !!key && !!e && !!e.parameter && e.parameter.key === key;
  var quizzes = [];
  if (ok) {
    var all = props.getProperties();
    Object.keys(all).forEach(function (name) { if (name.indexOf('q_') === 0) quizzes.push(JSON.parse(all[name])); });
  }
  var out = ok ? { app: 'book-dude-school', quizzes: quizzes } : { error: 'That link is not right.' };
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
