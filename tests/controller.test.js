import test from 'node:test';
import assert from 'node:assert/strict';
import {createController} from '../extension/controller.js';
import {initialState} from '../extension/core/accounting.js';
import {CHALLENGE} from '../extension/core/settings.js';
const trusted={trustedUI:true};
function setup() {
 let saved=initialState(),now=new Date('2026-10-17T12:00:00').getTime(),fails=false;
 saved.settings.challengeEnabled=false;
 saved.settings.groups=[{id:'g',name:'Social',enabled:true,patterns:['example.com'],budgetMs:10000}];
 const storage={get:async()=>structuredClone(saved),set:async s=>{if(fails)throw Error('Disk full');saved=structuredClone(s);}};
 return {controller:createController({storage,clock:()=>now}),storage,advance:n=>now+=n,now:()=>now,fail:v=>fails=v};
}
test('serial ticks never double count; restart restores checkpoint',async()=>{
 const f=setup();let c=f.controller;
 await c.tick({url:'https://example.com',tabId:1,eligible:true,now:f.now()});f.advance(5000);
 await Promise.all([c.tick({url:'https://example.com',tabId:1,eligible:true,now:f.now()}),c.tick({url:'https://example.com',tabId:1,eligible:true,now:f.now()})]);
 assert.equal((await c.snapshot()).usage['2026-10-17'].g,5000);
 c=createController({storage:f.storage,clock:f.now});f.advance(5000);
 const d=await c.tick({url:'https://example.com',tabId:1,eligible:true,now:f.now()});
 assert.equal(d.blocked,true);assert.equal((await c.snapshot()).usage['2026-10-17'].g,10000);
});
test('tab transitions charge old URL; gaps and unfocused intervals are excluded',async()=>{
 const f=setup(),c=f.controller;
 await c.tick({url:'https://example.com',tabId:1,eligible:true,now:f.now()});f.advance(5000);
 await c.tick({url:'https://other.com',tabId:2,eligible:false,now:f.now()});f.advance(5000);
 await c.tick({url:'https://example.com',tabId:1,eligible:true,now:f.now()});f.advance(20000);
 await c.tick({url:'https://example.com',tabId:1,eligible:true,now:f.now()});
 assert.equal((await c.snapshot()).usage['2026-10-17'].g,5000);
});
test('commands reject untrusted contexts and stale settings; storage failures keep state',async()=>{
 const f=setup(),c=f.controller,s=(await c.snapshot()).settings;
 await assert.rejects(c.handle({type:'getState'},{}),/trusted/);
 await assert.rejects(c.handle({type:'saveSettings',settings:s,revision:-1},trusted),/changed/);
 f.fail(true);await assert.rejects(c.handle({type:'saveSettings',settings:{...s,allowlist:['example.com']},revision:0},trusted),/Disk full/);
 assert.deepEqual((await c.snapshot()).settings.allowlist,[]);
 f.fail(false);await c.handle({type:'saveSettings',settings:s,revision:0},trusted);
 assert.equal((await c.snapshot()).revision,1);
});
test('challenge protects imports, disabling challenge and stats clear',async()=>{
 const {controller:c}=setup();let s=await c.snapshot();
 await c.handle({type:'saveSettings',settings:{...s.settings,challengeEnabled:true},revision:s.revision},trusted);
 s=await c.snapshot();
 await assert.rejects(c.handle({type:'saveSettings',settings:{...s.settings,challengeEnabled:false},revision:s.revision},trusted),/challenge/i);
 await assert.rejects(c.handle({type:'clearStats'},trusted),/challenge/i);
 await c.handle({type:'saveSettings',settings:{...s.settings,challengeEnabled:false},revision:s.revision,challenge:CHALLENGE},trusted);
});
test('nuclear snapshot survives restart, blocks mutation and stats clear preserves budgets',async()=>{
 const f=setup(),c=f.controller;
 await c.tick({url:'https://example.com',tabId:1,eligible:true,now:f.now()});f.advance(5000);
 await c.tick({url:'https://example.com',tabId:1,eligible:false,now:f.now()});
 await c.handle({type:'startNuclear',mode:'blocked',minutes:1,startAt:f.now()},trusted);
 for(const cmd of [{type:'cancelScheduledNuclear'},{type:'saveSettings',settings:{...(await c.snapshot()).settings,trackAudio:true},revision:0},{type:'startNuclear',mode:'all',minutes:1}])await assert.rejects(c.handle(cmd,trusted),/active/i);
 await c.handle({type:'clearStats'},trusted);
 const s=await createController({storage:f.storage,clock:f.now}).snapshot();
 assert.deepEqual(s.stats,{});assert.equal(s.usage['2026-10-17'].g,5000);assert.equal(s.nuclear.mode,'blocked');
});
test('scheduled nuclear captures original patterns; malicious imported fields rejected',async()=>{
 const f=setup(),c=f.controller;
 await c.handle({type:'startNuclear',mode:'blocked',minutes:2,startAt:f.now()+60000},trusted);
 let s=await c.snapshot();
 const operation={type:'saveSettings',settings:{...s.settings,groups:[]},revision:s.revision};
 const prepared=await c.handle({type:'prepareChange',operation},trusted);await c.handle({type:'confirmChange',ticket:prepared.ticket},trusted);
 await c.handle({...operation,ticket:prepared.ticket},trusted);
 s=await c.snapshot();assert.equal(s.nuclear.policySnapshot.groups[0].patterns[0],'example.com');
 await assert.rejects(c.handle({type:'saveSettings',settings:{...s.settings,nuclear:null},revision:s.revision},trusted),/fields/);
 await c.handle({type:'cancelScheduledNuclear'},trusted);assert.equal((await c.snapshot()).nuclear,null);
});
test('clock rollback never recharges an interval, including restart and catch-up',async()=>{
 const f=setup();let c=f.controller;const tick=()=>c.tick({url:'https://example.com',tabId:1,eligible:true,now:f.now()});
 await tick();f.advance(5000);await tick();f.advance(-3000);await tick();
 c=createController({storage:f.storage,clock:f.now});f.advance(3000);await tick();
 assert.equal((await c.snapshot()).usage['2026-10-17'].g,5000);
 f.advance(1000);await tick();assert.equal((await c.snapshot()).usage['2026-10-17'].g,6000);
});
test('idle reopen and midnight rollover prune and persist old history',async()=>{
 const f=setup();let raw=await f.storage.get();raw.stats={'2025-01-01':{old:999},'2026-09-18':{keep:100}};await f.storage.set(raw);
 let c=createController({storage:f.storage,clock:f.now});
 assert.equal((await c.handle({type:'getState'},trusted)).stats['2025-01-01'],undefined);
 assert.equal((await f.storage.get()).stats['2025-01-01'],undefined);
 assert.ok((await c.snapshot()).stats['2026-09-18']);
 f.advance(86400000);await c.tick({url:'about:blank',eligible:false,now:f.now()});
 assert.equal((await c.snapshot()).stats['2026-09-18'],undefined);
 assert.equal((await f.storage.get()).stats['2026-09-18'],undefined);
});

test('language preference saves independently without changing restrictions or accepting extra settings',async()=>{
 const f=setup(),before=await f.controller.snapshot();
 const after=await f.controller.handle({type:'setLanguage',language:'zh-CN',revision:before.revision,settings:{enabled:false}},trusted);
 assert.equal(after.settings.language,'zh-CN');
 assert.deepEqual({...after.settings,language:before.settings.language},before.settings);
 assert.equal(after.revision,before.revision+1);
 await assert.rejects(f.controller.handle({type:'setLanguage',language:'en',revision:before.revision},trusted),/another page/);
 await assert.rejects(f.controller.handle({type:'setLanguage',language:'bad',revision:after.revision},trusted),/language/);
 await assert.rejects(f.controller.handle({type:'setLanguage',language:'en',revision:after.revision},{}),/trusted/);
});
