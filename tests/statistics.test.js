import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,accountIntervalMany,pruneHistory} from '../extension/core/accounting.js';
import {summarizeUsage,csvUsage} from '../extension/core/statistics.js';
const time=()=>new Date(2026,9,17,12).getTime();
const visits=(...hosts)=>hosts.map((host,i)=>({url:`https://${host}/`,tabId:i}));
test('concurrent hosts count once each and shared groups charge once',()=>{
 const s=initialState();s.settings.groups=[{id:'g',name:'Group',enabled:true,budgetMs:60000,patterns:['example.com','other.com']}];
 const out=accountIntervalMany(s,{visits:visits('example.com','example.com','other.com'),from:time(),to:time()+1000});
 assert.equal(out.stats['2026-10-17']['example.com'],1000);assert.equal(out.stats['2026-10-17']['other.com'],1000);assert.equal(out.usage['2026-10-17'].g,1000);
 assert.equal(out.sessionCounts['2026-10-17']['example.com'],1);assert.equal(out.hourly['2026-10-17']['example.com'][12],1000);
});
test('session starts track continuous hosts and idle transitions',()=>{
 let s=initialState();const settle=(hosts,delta=1000,eligible=true)=>{const from=time();s=accountIntervalMany(s,{visits:visits(...hosts),from,to:from+delta,eligible});};
 settle(['example.com']);settle(['example.com','other.com']);settle([]);settle(['example.com']);
 assert.equal(s.sessionCounts['2026-10-17']['example.com'],2);assert.equal(s.sessionCounts['2026-10-17']['other.com'],1);
 settle(['example.com'],20000);assert.deepEqual(s.activeHosts,[]);assert.equal(s.stats['2026-10-17']['example.com'],3000);
});
test('midnight splits duration without manufacturing a new session',()=>{
 const from=new Date(2026,9,17,23,59,59,500).getTime();const s=accountIntervalMany(initialState(),{visits:visits('example.com'),from,to:from+1000});
 assert.equal(s.stats['2026-10-17']['example.com'],500);assert.equal(s.stats['2026-10-18']['example.com'],500);assert.equal(s.sessionCounts['2026-10-17']['example.com'],1);assert.equal(s.sessionCounts['2026-10-18']?.['example.com'],undefined);
});
test('local date/hour boundaries survive DST fall-back',()=>{
 const previous=process.env.TZ;process.env.TZ='America/New_York';try{
 const from=Date.parse('2026-11-01T01:59:59.500-04:00');const s=accountIntervalMany(initialState(),{visits:visits('example.com'),from,to:from+1000});
 assert.equal(s.stats['2026-11-01']['example.com'],1000);assert.equal(s.hourly['2026-11-01']['example.com'][1],1000);
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
test('summaries keep legacy duration, range/filter counts and hourly/daily series',()=>{
 const s=initialState();s.settings.groups=[{id:'g',name:'G',enabled:true,budgetMs:60000,patterns:['example.com']}];s.stats={'2026-10-17':{'example.com':2000,'other.com':1000},'2026-10-16':{'example.com':500}};s.sessionCounts={'2026-10-17':{'example.com':2}};s.hourly={'2026-10-17':{'example.com':Array.from({length:24},(_,i)=>i===12?2000:0)}};
 const a=summarizeUsage(s,{range:'today',now:time(),filter:'blocked'});assert.equal(a.totalMs,2000);assert.equal(a.totalSessions,2);assert.equal(a.series[12].ms,2000);assert.equal(a.series.length,24);
 const b=summarizeUsage(s,{range:'week',now:time(),search:'EXAMPLE'});assert.equal(b.totalMs,2500);assert.equal(b.days.length,7);assert.equal(b.rows[0].sessions,2);
});
test('retention prunes all history stores but never changes current budget',()=>{
 const s=initialState();for(const field of ['stats','sessionCounts','hourly','usage'])s[field]={'2020-01-01':{},'2026-10-17':{}};s.usage['2026-10-17'].g=3000;
 const out=pruneHistory(s,time());for(const field of ['stats','sessionCounts','hourly','usage'])assert.equal(out[field]['2020-01-01'],undefined);assert.equal(out.usage['2026-10-17'].g,3000);
});
test('CSV escapes spreadsheet formulas, delimiters, quotes and newlines',()=>{
 const csv=csvUsage({rows:[{host:'=cmd,"evil"\nnext',ms:1500,sessions:2}]});assert.ok(csv.startsWith('Host,Duration seconds,Sessions\r\n'));assert.ok(csv.includes('"\'=cmd,""evil""\nnext",1.5,2'));
});
test('duplicate and rollback samples preserve session identity',()=>{
 const from=time();let s=accountIntervalMany(initialState(),{visits:visits('example.com'),from,to:from+1000});
 for(const to of [from+1000,from])s=accountIntervalMany(s,{visits:visits('example.com'),from:from+1000,to});
 s=accountIntervalMany(s,{visits:visits('example.com'),from:from+1000,to:from+2000});
 assert.equal(s.sessionCounts['2026-10-17']['example.com'],1);assert.equal(s.stats['2026-10-17']['example.com'],2000);
});
test('paused settings stop quota accrual while statistics continue',()=>{
 const s=initialState();s.settings.enabled=false;s.settings.groups=[{id:'g',name:'Group',enabled:true,budgetMs:60000,patterns:['example.com']}];
 const out=accountIntervalMany(s,{visits:visits('example.com'),from:time(),to:time()+1000});
 assert.equal(out.stats['2026-10-17']['example.com'],1000);assert.equal(out.sessionCounts['2026-10-17']['example.com'],1);assert.deepEqual(out.usage,{});
});
test('chart summaries expose daily sessions, hourly duration and an honest peak hour',()=>{
 const s=initialState();s.stats={'2026-10-17':{'a.com':60000,'b.com':120000},'2026-10-16':{'a.com':30000}};
 s.sessionCounts={'2026-10-17':{'a.com':2,'b.com':3},'2026-10-16':{'a.com':1}};
 s.hourly={'2026-10-17':{'a.com':Array.from({length:24},(_,h)=>h===9?60000:0)}};
 const data=summarizeUsage(s,{range:'week',now:time()});
 assert.equal(data.daily.at(-1).sessions,5);assert.equal(data.daily.at(-2).ms,30000);
 assert.equal(data.hourly[9].ms,60000);assert.equal(data.peakHour,9);assert.equal(data.hourlyTotalMs,60000);
 const empty=summarizeUsage(s,{range:'today',now:time(),search:'missing'});
 assert.equal(empty.peakHour,null);assert.equal(empty.totalSessions,0);
});

test('local reading aggregates time without consuming quotas, supports filters and CSV',()=>{
 const now=new Date(2026,9,25,12).getTime(),s=initialState();
 s.settings.groups=[{id:'g',name:'Sites',enabled:true,patterns:['example.com'],budgetMs:60000}];
 const result=accountIntervalMany(s,{from:now,to:now+3000,visits:[{url:'file:///private/a.pdf'}]});
 const summary=summarizeUsage(result,{now});
 assert.deepEqual(summary.rows,[{host:'file://',ms:3000,sessions:1}]);
 assert.deepEqual(result.usage,{});assert.equal(JSON.stringify(result).includes('private'),false);
 assert.equal(summarizeUsage(result,{now,filter:'blocked'}).totalMs,0);
 assert.equal(summarizeUsage(result,{now,filter:'allowed'}).totalMs,0);
 assert.equal(summarizeUsage(result,{now,filter:'local',search:'本地文件'}).totalMs,3000);
 assert.match(csvUsage(summary),/"file:\/\/",3,1/);
});
