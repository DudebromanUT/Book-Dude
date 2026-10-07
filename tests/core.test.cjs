const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../docs/core.js');
const books=[{book_id:'b1',title:'One',author:'A',year:'2020',ar_points:'10'},{book_id:'b2',title:'Two',author:'B',year:'2021',ar_points:''}];
test('finishing a book never awards quiz points; unknown values remain unknown',()=>{
 const records={b1:C.entry({id:'b1',status:'finished',finishedDate:'2026-10-06'}),b2:C.entry({id:'b2',status:'finished',finishedDate:'2026-10-06'})};
 const m=C.metrics(books,records,'2026');assert.equal(m.earned,0);assert.equal(m.potential,10);assert.equal(m.awaiting,2);assert.equal(m.unknown,1);assert.equal(m.finished,2);
});
test('a recorded zero is a quiz result, not an unrecorded quiz',()=>{
 const m=C.metrics(books,{b1:C.entry({id:'b1',status:'finished',earnedPoints:0,quizDate:'2026-10-06'})});
 assert.equal(m.earned,0);assert.equal(m.awaiting,0);assert.equal(m.potential,0);
});
test('quiz dates and finish dates use their own periods; edits do not double count',()=>{
 const records={b1:C.entry({id:'b1',status:'finished',finishedDate:'2025-12-31',earnedPoints:7.5,quizDate:'2026-01-02'})};
 assert.equal(C.metrics(books,records,'2025').finished,1);assert.equal(C.metrics(books,records,'2025').earned,0);
 assert.equal(C.metrics(books,records,'2026').finished,0);assert.equal(C.metrics(books,records,'2026').months[0],7.5);
 records.b1.earnedPoints=8;assert.equal(C.metrics(books,records).earned,8);
});
test('undated historical completions count only in all time',()=>{
 const r={b1:C.entry({id:'b1',status:'finished'})};assert.equal(C.metrics(books,r).finished,1);assert.equal(C.metrics(books,r,'2026').finished,0);assert.equal(C.metrics(books,r,'2026').undated,1);
});
test('round-trip backup keeps private notes, zero points, goals, and out-of-catalog records',()=>{
 const r=C.entry({id:'b1',note:'A note, with "quotes"\nand <markup>.',favorite:true,status:'reading',earnedPoints:0,quizDate:'2026-10-06',progress:25,updatedAt:'2026-10-06T12:00:00Z'});
 const out=C.parseBackup(JSON.parse(JSON.stringify({app:'reading-room',version:1,records:{b1:r,missing:{...r,id:'missing'}},settings:{goals:{2026:50}}})),books);
 assert.deepEqual(out.records.b1,r);assert.equal(out.unknown,1);assert.equal(out.records.missing.note,r.note);assert.equal(out.goals['2026'],50);
});
test('legacy reading-list checkmarks migrate without inventing earned points',()=>{
 const out=C.parseBackup({version:2,updated:'2026-10-01T00:00:00Z',books:{'one--a':{read:true,note:'Remember this'}}},books);
 assert.equal(out.records.b1.status,'finished');assert.equal(out.records.b1.note,'Remember this');assert.equal(out.records.b1.earnedPoints,null);
});
test('backup validation rejects invalid dates, points, formats, and unsafe IDs',()=>{
 const payload=v=>({app:'reading-room',version:1,records:{b1:v}});
 assert.throws(()=>C.parseBackup(payload({earnedPoints:-1}),books));assert.throws(()=>C.parseBackup(payload({earnedPoints:'abc'}),books));assert.throws(()=>C.parseBackup(payload({quizDate:'2026-02-30'}),books));assert.throws(()=>C.parseBackup({app:'reading-room',version:99,records:{}},books));assert.throws(()=>C.parseBackup({app:'reading-room',version:1,records:JSON.parse('{"__proto__":{}}')},books));
 assert.equal(C.day('2024-02-29'),'2024-02-29');assert.equal(C.day('2026-02-29'),'');
});
test('shipping catalog matches completed CSV coverage and unique persistent IDs',()=>{
 const context={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../docs/catalog.js'),'utf8'),context);const rows=context.window.READING_CATALOG;
 assert.equal(rows.length,637);assert.equal(new Set(rows.map(r=>r.book_id)).size,637);assert.equal(rows.filter(r=>r.ar_points!=='').length,468);assert.ok(rows.every(r=>r.description));assert.ok(rows.filter(r=>r.ar_points!=='').every(r=>r.ar_source));
});
