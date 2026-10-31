import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSettings,validateSettings,CHALLENGE,challengeForLanguage} from '../extension/core/settings.js';
import {initialState} from '../extension/core/accounting.js';
import {createController} from '../extension/controller.js';
const trusted={trustedUI:true};
function fixture(){let saved=initialState(),now=new Date('2026-10-17T12:00:00').getTime();saved.settings.groups=[{id:'g',name:'Focus',enabled:true,patterns:['example.com'],budgetMs:600000}];const storage={get:async()=>structuredClone(saved),set:async x=>{saved=structuredClone(x)}};return {c:createController({storage,clock:()=>now}),storage,now:()=>now,advance:ms=>now+=ms,set:fn=>fn(saved)};}
async function op(f,patch){const s=await f.c.snapshot();return {type:'saveSettings',revision:s.revision,settings:{...s.settings,...patch}};}
async function finish(f,operation){const p=await f.c.handle({type:'prepareChange',operation},trusted);for(let i=0;i<p.steps;i++)await f.c.handle({type:'confirmChange',ticket:p.ticket},trusted);return f.c.handle({...operation,ticket:p.ticket,challenge:CHALLENGE},trusted);}
test('schema3 mandatory migration and normalized custom phrase',()=>{const s=defaultSettings();assert.equal(s.schemaVersion,3);assert.equal(s.challengeEnabled,true);assert.equal(s.hidePause,true);const old={...s,schemaVersion:1,challengeEnabled:false};for(const k of ['enabled','showTimer','trackAudio','hidePause','hideQuickAllow','challengeText','beneficialPool'])delete old[k];assert.equal(validateSettings(old).challengeEnabled,true);assert.throws(()=>validateSettings({...s,challengeText:'a '.repeat(130)}),/challenge/i);assert.equal(validateSettings({...s,challengeText:'abcde '.repeat(50)}).challengeText.trim(),'abcde '.repeat(50).trim());});
test('exhausted group cannot relax via import/save but tightening works',async()=>{const f=fixture();f.set(s=>s.usage={'2026-10-17':{g:600000}});const s=(await f.c.snapshot()).settings;for(const patch of [{groups:[]},{groups:[{...s.groups[0],budgetMs:700000}]},{groups:[{...s.groups[0],enabled:false}]},{allowlist:['other.com']}])await assert.rejects(f.c.handle({...await op(f,patch),challenge:CHALLENGE},trusted),/exhausted/i);await f.c.handle(await op(f,{groups:[{...s.groups[0],patterns:['example.com','other.com']}]}),trusted);});
test('today cannot be removed; interval/reset queues survive restart and unchanged save',async()=>{const f=fixture();await assert.rejects(f.c.handle({...await op(f,{schedule:{days:[0],intervals:[[0,1440]]}}),challenge:CHALLENGE},trusted),/today/i);let s=(await f.c.snapshot()).settings;await finish(f,await op(f,{schedule:{...s.schedule,intervals:[[540,1020]]},resetMinute:60}));s=await f.c.snapshot();assert.deepEqual(s.settings.schedule.intervals,[[0,1440]]);assert.deepEqual(s.pending.intervals.value,[[540,1020]]);await finish(f,await op(f,{}));f.advance(86400000);const c=createController({storage:f.storage,clock:f.now});s=await c.snapshot();assert.deepEqual(s.settings.schedule.intervals,[[540,1020]]);assert.equal(s.settings.resetMinute,60);assert.equal(s.pending.intervals,undefined);});
test('escalation tickets bound to op/revision, sequential and expire',async()=>{const f=fixture();let s=(await f.c.snapshot()).settings;const operation=await op(f,{groups:[{...s.groups[0],budgetMs:700000}]});const p=await f.c.handle({type:'prepareChange',operation},trusted);assert.equal(p.steps,2);await assert.rejects(f.c.handle({...operation,challenge:CHALLENGE},trusted),/confirmation/i);await f.c.handle({type:'confirmChange',ticket:p.ticket},trusted);await assert.rejects(f.c.handle({...operation,ticket:p.ticket,challenge:CHALLENGE},trusted),/confirmation/i);await f.c.handle({type:'confirmChange',ticket:p.ticket},trusted);await assert.rejects(f.c.handle({...operation,settings:{...operation.settings,language:'zh-CN'},ticket:p.ticket,challenge:CHALLENGE},trusted),/confirmation/i);f.advance(300001);await assert.rejects(f.c.handle({...operation,ticket:p.ticket,challenge:CHALLENGE},trusted),/confirmation/i);await finish(f,operation);});
test('near exhaustion eight steps, pause ten, zero budget remains editable',async()=>{const f=fixture();f.set(s=>s.usage={'2026-10-17':{g:500000}});let s=(await f.c.snapshot()).settings;let p=await f.c.handle({type:'prepareChange',operation:await op(f,{groups:[{...s.groups[0],budgetMs:700000}]})},trusted);assert.equal(p.steps,8);p=await f.c.handle({type:'prepareChange',operation:await op(f,{enabled:false,hidePause:false})},trusted);assert.equal(p.steps,10);await finish(f,await op(f,{groups:[{...s.groups[0],budgetMs:0}]}));s=(await f.c.snapshot()).settings;await finish(f,await op(f,{groups:[{...s.groups[0],budgetMs:60000}]}));});
test('pure tightening bypasses typing, mixed edits require saved challenge',async()=>{const f=fixture();let s=(await f.c.snapshot()).settings;const operation=await op(f,{groups:[...s.groups,{id:'new',name:'new',enabled:true,patterns:['other.com'],budgetMs:10000}]});assert.equal((await f.c.handle({type:'prepareChange',operation},trusted)).challengeRequired,false);await f.c.handle(operation,trusted);await assert.rejects(f.c.handle(await op(f,{challengeEnabled:false}),trusted),/challenge/i);});
test('changes settle old checkpoint before applying new groups and nuclear',async()=>{const f=fixture();await f.c.tick({url:'https://other.com',tabId:1,eligible:true});f.advance(5000);let s=(await f.c.snapshot()).settings;await f.c.handle(await op(f,{groups:[...s.groups,{id:'new',name:'New',enabled:true,patterns:['other.com'],budgetMs:10000}]}),trusted);f.advance(1000);await f.c.tick({url:'https://other.com',tabId:1,eligible:true});assert.equal((await f.c.snapshot()).usage['2026-10-17'].new,1000);await finish(f,{type:'startNuclear',mode:'all',minutes:1});f.advance(1000);await f.c.tick({url:'https://other.com',tabId:1,eligible:true});assert.equal((await f.c.snapshot()).usage['2026-10-17'].new,1000);});
test('ticket survives failed persistence but cannot be reused after commit',async()=>{const f=fixture();const real=f.storage.set;let fail=false;f.storage.set=async s=>{if(fail)throw Error('Disk full');return real(s)};const operation=await op(f,{enabled:false,hidePause:false});const p=await f.c.handle({type:'prepareChange',operation},trusted);for(let i=0;i<p.steps;i++)await f.c.handle({type:'confirmChange',ticket:p.ticket},trusted);fail=true;await assert.rejects(f.c.handle({...operation,ticket:p.ticket,challenge:CHALLENGE},trusted),/Disk/);fail=false;await f.c.handle({...operation,ticket:p.ticket,challenge:CHALLENGE},trusted);await assert.rejects(f.c.handle({type:'confirmChange',ticket:p.ticket},trusted),/Confirmation/);});
test('custom challenge guards its own removal and current saved phrase is required',async()=>{const f=fixture(),custom='A focused day begins with one deliberate choice. '.repeat(6).trim();await finish(f,await op(f,{challengeText:custom}));const operation=await op(f,{challengeText:''});await assert.rejects(f.c.handle({...operation,challenge:CHALLENGE},trusted),/challenge/);await f.c.handle({...operation,challenge:custom},trusted);});
test('hidden pause reveal and exhausted patterns protected; outside hours changes permitted',async()=>{const f=fixture();f.set(s=>s.usage={'2026-10-17':{g:600000}});let s=(await f.c.snapshot()).settings;for(const patch of [{hidePause:false},{groups:[{...s.groups[0],patterns:[]}]}])await assert.rejects(f.c.handle({...await op(f,patch),challenge:CHALLENGE},trusted),/exhausted/i);f.advance(86400000);await finish(f,await op(f,{hidePause:false}));});
test('pending boundary splits interval under old and new rules without offline invention',async()=>{const f=fixture(),start=f.now();f.set(s=>{s.pending={intervals:{value:[],applyAt:start+3000}};s.checkpoint={at:start,url:'https://example.com',eligible:true,visits:[{url:'https://example.com',tabId:1}]};});f.advance(5000);let state=await f.c.snapshot();assert.equal(state.usage['2026-10-17'].g,3000);assert.equal(state.stats['2026-10-17']['example.com'],5000);const g=fixture();g.set(s=>{s.pending={intervals:{value:[[0,1440]],applyAt:start+30000}};s.checkpoint={at:start,url:'https://example.com',eligible:true,visits:[{url:'https://example.com',tabId:1}]};});g.advance(35000);state=await g.c.snapshot();assert.equal(state.stats['2026-10-17'],undefined);});
test('outside active hours permits group relaxation and revealing pause',async()=>{const f=fixture();f.set(s=>{s.settings.schedule.intervals=[];s.usage={'2026-10-17':{g:600000}};});await finish(f,await op(f,{hidePause:false,allowlist:['other.com']}));await finish(f,await op(f,{groups:[]}));});
test('last second is protected; hidden pause cannot deactivate directly; group removal confirms',async()=>{const f=fixture();f.set(s=>s.usage={'2026-10-17':{g:599000}});const s=(await f.c.snapshot()).settings;await assert.rejects(f.c.handle({...await op(f,{groups:[{...s.groups[0],budgetMs:700000}]}),challenge:CHALLENGE},trusted),/exhausted/i);await assert.rejects(f.c.handle({...await op(f,{enabled:false}),challenge:CHALLENGE},trusted),/pause/i);const g=fixture();await assert.rejects(g.c.handle({...await op(g,{enabled:false}),challenge:CHALLENGE},trusted),/pause/i);const p=await g.c.handle({type:'prepareChange',operation:await op(g,{groups:[]})},trusted);assert.equal(p.steps,1);});

test('both independent default challenges require sustained typing',()=>{for(const language of ['en','zh-CN']){const phrase=challengeForLanguage(language);assert.ok(Array.from(phrase).length>=250);assert.ok(new Set(Array.from(phrase)).size>=5);}});
test('exhausted positive budget cannot become zero to escape later guards',async()=>{
 const f=fixture();f.set(s=>{s.settings.groups[0].budgetMs=60000;s.usage={'2026-10-17':{g:60000}};});
 const s=(await f.c.snapshot()).settings,operation=await op(f,{groups:[{...s.groups[0],budgetMs:0}]});
 await assert.rejects(f.c.handle({type:'prepareChange',operation},trusted),/exhausted/i);
 await assert.rejects(f.c.handle({...operation,challenge:CHALLENGE},trusted),/exhausted/i);
 assert.equal((await f.c.snapshot()).settings.groups[0].budgetMs,60000);
 const zero=fixture();zero.set(s=>{s.settings.groups[0].budgetMs=0;s.usage={'2026-10-17':{g:60000}};});
 const z=(await zero.c.snapshot()).settings;await finish(zero,await op(zero,{groups:[{...z.groups[0],budgetMs:120000}]}));
 assert.equal((await zero.c.snapshot()).settings.groups[0].budgetMs,120000);
});
test('overnight active segment protects its previous-weekday origin until end',async()=>{
 const f=fixture();f.advance(-11.5*3600000);f.set(s=>{s.settings.schedule={days:[5],intervals:[[1380,60]]};});
 const operation=await op(f,{schedule:{days:[],intervals:[[1380,60]]}});
 await assert.rejects(f.c.handle({...operation,challenge:CHALLENGE},trusted),/active day/i);
 f.advance(30*60000);await finish(f,operation);assert.deepEqual((await f.c.snapshot()).settings.schedule.days,[]);
});
test('lost checkpoint ends session continuity but valid worker restart and zero delta preserve it',async()=>{
 for(const checkpoint of [null,undefined,{at:NaN,visits:[]},{at:123}]){
  const f=fixture();f.set(s=>{s.activeHosts=['example.com'];s.checkpoint=checkpoint;s.stats={'2026-10-17':{'example.com':5000}};s.sessionCounts={'2026-10-17':{'example.com':1}};});
  const loaded=await f.c.snapshot();assert.deepEqual(loaded.activeHosts,[]);assert.equal(loaded.stats['2026-10-17']['example.com'],5000);
  await f.c.tick({url:'https://example.com',tabId:1,eligible:true});f.advance(1000);await f.c.tick({url:'https://example.com',tabId:1,eligible:true});
  assert.equal((await f.c.snapshot()).sessionCounts['2026-10-17']['example.com'],2);
 }
 const f=fixture();await f.c.tick({url:'https://example.com',tabId:1,eligible:true});f.advance(1000);await f.c.tick({url:'https://example.com',tabId:1,eligible:true});
 const c=createController({storage:f.storage,clock:f.now});await c.tick({url:'https://example.com',tabId:1,eligible:true});f.advance(1000);await c.tick({url:'https://example.com',tabId:1,eligible:true});
 assert.equal((await c.snapshot()).sessionCounts['2026-10-17']['example.com'],1);
});
test('equivalent settings bypass exhausted and nuclear locks without changing usage or pending rules',async()=>{
 for(const nuclear of [false,true]){
  const f=fixture();f.set(s=>{s.usage={'2026-10-17':{g:600000}};s.settings.groups[0].patterns=['example.com','other.com'];s.settings.groups.push({id:'second',name:'Second',enabled:true,patterns:['second.com'],budgetMs:10000});s.settings.allowlist=['allowed.com','safe.com'];s.pending={resetMinute:{value:60,applyAt:f.now()+86400000}};if(nuclear)s.nuclear={startAt:f.now()-1000,endAt:f.now()+60000,mode:'all',policySnapshot:structuredClone(s.settings)};});
  const before=await f.c.snapshot(),settings=structuredClone(before.settings);
  settings.language='zh-CN';settings.groups.reverse();settings.groups[1].name='Renamed';settings.groups[1].patterns=['other.com','example.com','example.com'];settings.allowlist.reverse();
  const operation=await op(f,settings),prepared=await f.c.handle({type:'prepareChange',operation},trusted);
  assert.equal(prepared.steps,0);assert.equal(prepared.challengeRequired,false);
  const after=await f.c.handle(operation,trusted);
  assert.equal(after.settings.groups[1].name,'Renamed');assert.deepEqual(after.usage,before.usage);assert.deepEqual(after.pending,before.pending);assert.deepEqual(after.nuclear,before.nuclear);
  await f.c.handle(await op(f,{}),trusted);
  for(const mutate of [s=>s.groups[1].budgetMs++,s=>s.groups[1].id='replacement',s=>s.groups[1].patterns.pop(),s=>s.groups[1].enabled=false,s=>s.allowlist.push('example.com'),s=>s.resetMinute++,s=>s.schedule.intervals=[[0,60]]]){
   const settings=structuredClone(after.settings);settings.groups[1].name='Another name';mutate(settings);
   const opChange=await op(f,settings);
   if(nuclear||settings.resetMinute===after.settings.resetMinute&&JSON.stringify(settings.schedule)===JSON.stringify(after.settings.schedule))await assert.rejects(f.c.handle(opChange,trusted));
   else assert.equal((await f.c.handle({type:'prepareChange',operation:opChange},trusted)).challengeRequired,true);
  }
 }
});
test('renaming with tightening keeps existing confirmation behavior',async()=>{
 const f=fixture(),s=(await f.c.snapshot()).settings;
 const p=await f.c.handle({type:'prepareChange',operation:await op(f,{groups:[{...s.groups[0],name:'New',patterns:['example.com','other.com']}]})},trusted);
 assert.equal(p.challengeRequired,false);assert.equal(p.steps,0);
});
