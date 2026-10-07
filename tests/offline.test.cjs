const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const scope='https://example.github.io/Book-Dude/',handlers={},stores=new Map(),deleted=[];let network=0,claimed=false,activated=false;
 const caches={open:async name=>{if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return {addAll:async requests=>requests.forEach(r=>store.set(r.url,{cached:r.url})),match:async url=>store.get(url)};},keys:async()=>[...stores.keys()],delete:async name=>{deleted.push(name);return stores.delete(name);}};
 const self={registration:{scope},clients:{claim:async()=>{claimed=true;}},skipWaiting:()=>{activated=true;},addEventListener:(n,f)=>handlers[n]=f};
 vm.runInNewContext(fs.readFileSync(require.resolve('../docs/sw.js'),'utf8'),{self,caches,URL,Request,fetch:async req=>{network++;return {network:req.url};}});
 const lifecycle=async name=>{let pending;handlers[name]({waitUntil:p=>pending=p});await pending;};
 const request=async(path,mode='navigate',method='GET')=>{let promise;handlers.fetch({request:{url:new URL(path,scope).href,method,mode},respondWith:p=>promise=p});return promise;};
 return {scope,stores,deleted,lifecycle,request,handlers,network:()=>network,claimed:()=>claimed,activated:()=>activated};
}
test('offline navigation works in a GitHub project subdirectory with no network',async()=>{const s=setup();await s.lifecycle('install');await s.lifecycle('activate');const r=await s.request('./?source=homescreen');assert.equal(r.cached,s.scope+'index.html');assert.equal(s.network(),0);assert.ok(s.claimed());});
test('only this app assets are cached/intercepted, never other repos, external links, or writes',async()=>{const s=setup();await s.lifecycle('install');assert.equal(await s.request('/Other-Repo/'),undefined);assert.equal(await s.request('https://example.com/notes'),undefined);assert.equal(await s.request('./backup.json'),undefined);assert.equal(await s.request('./index.html','navigate','POST'),undefined);assert.ok((await s.request('./catalog.js','cors')).cached);});
test('updates delete only this app old caches and wait for reader activation',async()=>{const s=setup();s.stores.set('unrelated',new Map());s.stores.set('reading-room:'+s.scope+':old',new Map());await s.lifecycle('install');assert.equal(s.activated(),false);s.handlers.message({data:'ACTIVATE'});assert.equal(s.activated(),true);await s.lifecycle('activate');assert.deepEqual(s.deleted,['reading-room:'+s.scope+':old']);assert.ok(s.stores.has('unrelated'));});
