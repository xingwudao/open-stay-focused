import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePattern, matchesPattern} from '../extension/core/patterns.js';
import {defaultSettings, validateSettings} from '../extension/core/settings.js';
import {budgetDay, isScheduled, evaluate} from '../extension/core/policy.js';
import {accountInterval, initialState} from '../extension/core/accounting.js';
const time = (s) => new Date(s).getTime();
const group = (id='g') => ({id,name:'Social',enabled:true,patterns:['example.com'],budgetMs:10000});
function state() { const s=initialState(); s.settings.groups=[group()]; return s; }
test('domain boundary, Unicode and anchored case-sensitive wildcard paths',()=>{
 for(const [p,u,want] of [
  ['example.com','https://example.com/a',true],['example.com','https://a.example.com',true],
  ['example.com','https://notexample.com',false],['example.com','https://example.com.evil.org',false],
  ['https://example.com/A*','http://example.com/Abc',true],['example.com/A*','https://example.com/abc',false],
  ['bücher.de','https://xn--bcher-kva.de/',true],['example.com/a','https://example.com/ab',false],
  ['example.com','file:///example.com',false],['127.0.0.1','http://127.0.0.1:8000',true]
 ]) assert.equal(matchesPattern(u,parsePattern(p)),want,`${p} ${u}`);
 for(const p of ['', 'ftp://example.com','user@example.com','example.com:80','example.com?q=1','example.com/#x','*.com','a..com','http://']) assert.throws(()=>parsePattern(p),p);
});
test('settings strictly validate and cap import size',()=>{
 const s=defaultSettings(); assert.deepEqual(validateSettings(s),s);
 for(const bad of [{...s,nuclear:{}},{...s,groups:[group(),group()]},{...s,resetMinute:1440},
 {...s,schedule:{days:[8],intervals:[[0,1440]]}},{...s,groups:[{...group(),budgetMs:NaN}]},
 {...s,schedule:{days:[1],intervals:[[20,20]]}},{...s,allowlist:['x'.repeat(262145)]}]) assert.throws(()=>validateSettings(bad));
 assert.equal(validateSettings({...s,groups:[{...group(),budgetMs:0}]}).groups[0].budgetMs,0);
});
test('overnight intervals belong to start day and reset uses local calendar',()=>{
 const schedule={days:[1],intervals:[[1320,120]]};
 assert.equal(isScheduled(time('2026-10-19T23:00:00'),schedule),true);
 assert.equal(isScheduled(time('2026-10-20T01:59:00'),schedule),true);
 assert.equal(isScheduled(time('2026-10-20T02:00:00'),schedule),false);
 assert.equal(isScheduled(time('2026-10-19T01:00:00'),schedule),false);
 assert.equal(budgetDay(time('2026-10-20T03:59:00'),240),'2026-10-19');
 assert.equal(budgetDay(time('2026-10-20T04:00:00'),240),'2026-10-20');
});
test('allowlist and overlapping groups; all nuclear priorities and expiry',()=>{
 const s=state(), now=time('2026-10-17T12:00:00'); s.settings.groups.push(group('g2'));
 s.usage[budgetDay(now,0)]={g:0,g2:10000};
 assert.equal(evaluate('https://example.com',now,s).blocked,true);
 s.settings.allowlist=['example.com/ok'];
 assert.equal(evaluate('https://example.com/ok',now,s).blocked,false);
 for(const [mode,url,want] of [['all','https://other.com',true],['all','https://example.com/ok',true],
 ['exceptAllowed','https://example.com/ok',false],['blocked','https://other.com',false],['blocked','https://example.com',true]]){
  s.nuclear={startAt:now-1,endAt:now+60000,mode,policySnapshot:structuredClone(s.settings)};
  assert.equal(evaluate(url,now,s).blocked,want,mode+url);
 }
 assert.equal(evaluate('chrome://settings',now,s).blocked,false);
 s.nuclear={...s.nuclear,mode:'all',endAt:now};
 assert.equal(evaluate('https://other.com',now,s).blocked,false);
});
test('accounting accrues all groups, splits midnight, preserves separate stats',()=>{
 const s=state(); s.settings.groups.push(group('g2'));
 const r=accountInterval(s,{url:'https://example.com/private?q=secret',from:time('2026-10-17T23:59:55'),to:time('2026-10-18T00:00:05'),eligible:true});
 assert.deepEqual(r.usage,{'2026-10-17':{g:5000,g2:5000},'2026-10-18':{g:5000,g2:5000}});
 assert.equal(r.stats['2026-10-18']['example.com'],5000);
 assert.equal(JSON.stringify(r).includes('secret'),false);
 assert.deepEqual(s.usage,{});
});
test('accounting excludes allowlist and inactive schedule from budget but counts stats',()=>{
 let s=state();s.settings.allowlist=['example.com'];
 const from=time('2026-10-17T12:00:00');
 s=accountInterval(s,{url:'https://example.com',from,to:from+5000,eligible:true});
 assert.deepEqual(s.usage,{}); assert.equal(s.stats['2026-10-17']['example.com'],5000);
});
test('no unattended, backward or stale-gap charge; split schedule and reset boundary',()=>{
 const from=time('2026-10-19T11:59:55');const s=state();
 for(const [to,eligible] of [[from+16000,true],[from-1000,true],[from+1000,false]])
  assert.deepEqual(accountInterval(s,{url:'https://example.com',from,to,eligible}).usage,{});
 s.settings.schedule={days:[1],intervals:[[720,780]]};s.settings.resetMinute=720;
 const r=accountInterval(s,{url:'https://example.com',from,to:from+10000,eligible:true});
 assert.equal(r.usage['2026-10-19'].g,5000);
 assert.equal(r.stats['2026-10-19']['example.com'],10000);
});
test('retains only 30 local dates of statistics',()=>{
 const s=state();s.stats={'2026-09-17':{'example.com':10},'2026-09-18':{'example.com':10}};
 const from=time('2026-10-17T12:00:00');
 const r=accountInterval(s,{url:'https://example.com',from,to:from+1000,eligible:true});
 assert.equal(r.stats['2026-09-17'],undefined);assert.ok(r.stats['2026-09-18']);
});
test('DST reset boundaries preserve local dates',()=>{
 const prev=process.env.TZ;process.env.TZ='America/New_York';
 try {assert.equal(budgetDay(time('2026-03-08T01:59:00'),240),'2026-03-07');
 assert.equal(budgetDay(time('2026-03-08T04:00:00'),240),'2026-03-08');
 assert.equal(budgetDay(time('2026-11-01T03:59:00'),240),'2026-10-31');}finally{process.env.TZ=prev;}
});
