const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const DOCS = path.join(__dirname, '..', 'docs');
const APP = path.join(DOCS, 'app');
const files = () => fs.readdirSync(APP).filter(f => f.endsWith('.js')).sort();

// Links the app's files the way a browser does, without running them. A typo in an import, or a name a file
// imports but another file does not export, stops the whole app from starting; this catches it first.
const LINK = `
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const seen = new Map();
const load = file => {
  if (!seen.has(file)) seen.set(file, new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), { identifier: file }));
  return seen.get(file);
};
load(path.join(process.argv[1], 'main.js'))
  .link(async (spec, from) => load(path.resolve(path.dirname(from.identifier), spec)))
  .then(() => console.log(JSON.stringify([...seen.keys()].map(f => path.relative(process.argv[1], f)).sort())))
  .catch(e => { console.error(e.message); process.exit(1); });
`;

test('the app files fit together: every import names a real export, and main.js reaches every file', () => {
  const r = spawnSync(process.execPath, ['--experimental-vm-modules', '--no-warnings', '-e', LINK, APP], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), files());
});

test('the page starts at app/main.js and every app file is saved for offline', () => {
  const html = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8');
  assert.match(html, /<script src="app\/main\.js" type="module"><\/script>/);
  const sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');
  const assets = JSON.parse(sw.match(/const ASSETS = (\[.*?\]);/)[1]);
  for (const f of files()) assert.ok(assets.includes('app/' + f), 'app/' + f + ' is not in the offline list; run python3 scripts/build.py');
});
