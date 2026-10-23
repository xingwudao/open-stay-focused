import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSettings,validateSettings} from '../extension/core/settings.js';
import {budgetDay} from '../extension/core/policy.js';
import {companionReminder,browsingReminderGroups} from '../extension/core/companion.js';
import {assessChange} from '../extension/core/protections.js';
const now=new Date(2026,9,23,12).getTime(),day=budgetDay(now,0);
function state(used=0){return {settings:{...defaultSettings(),groups:[{id:'social',name:'Social',enabled:true,patterns:['example.com'],budgetMs:600000}]},usage:{[day]:{social:used}}};}
test('milestones use shared group usage and exact total-budget durations',()=>{
 let ledger;
 for(const [used,level,durationMs] of [[299999,null,null],[300000,50,30000],[479999,null,null],[480000,80,60000],[599999,null,null],[600000,100,null]]){
  const result=companionReminder(state(used),now,ledger,['social'],level===100?'blocked':'browsing');
  assert.equal(result.reminder?.level??null,level);
  if(level){assert.equal(result.reminder.durationMs,durationMs);ledger=result.ledger;}
 }
 const repeat=companionReminder(state(600000),now,ledger,['social'],'blocked');
 assert.equal(repeat.reminder.sound,false);assert.equal(repeat.reminder.durationMs,null);
});
test('deduplication survives serialization, skips stale milestones and resets with budget day',()=>{
 const first=companionReminder(state(490000),now,null,['social']);assert.equal(first.reminder.level,80);
 const ledger=JSON.parse(JSON.stringify(first.ledger));
 assert.equal(companionReminder(state(490000),now,ledger,['social']).reminder,null);
 const tomorrow=now+86400000,s=state();s.usage={[budgetDay(tomorrow,0)]:{social:300000}};
 assert.equal(companionReminder(s,tomorrow,ledger,['social']).reminder.level,50);
 assert.equal(companionReminder(state(600000),now,null,['social']).reminder,null);
});
test('overlapping groups coalesce; special IDs and excluded pages are safe',()=>{
 const s=state(490000);s.settings.groups.push({...s.settings.groups[0],id:'constructor'});s.usage[day].constructor=300000;
 const result=companionReminder(s,now,null,['social','constructor']);assert.equal(result.reminder.level,80);
 assert.equal(companionReminder(s,now,result.ledger,['constructor']).reminder,null);
 s.settings.allowlist=['example.com'];assert.deepEqual(browsingReminderGroups('https://example.com',s,now),[]);
 s.settings.allowlist=[];s.settings.enabled=false;assert.deepEqual(browsingReminderGroups('https://example.com',s,now),[]);
 s.settings.enabled=true;s.settings.schedule.days=[];assert.deepEqual(browsingReminderGroups('https://example.com',s,now),[]);
});
test('old settings migrate; reminder preferences bypass locks but mixed relaxation does not',()=>{
 const s=state(600000),old=structuredClone(s.settings);delete old.companionEnabled;delete old.companionSound;
 assert.equal(validateSettings(old).companionEnabled,true);
 assert.throws(()=>validateSettings({...old,companionSound:'yes'}));
 s.nuclear={startAt:now-1,endAt:now+10000};
 const next={...s.settings,companionEnabled:false,companionSound:false};
 assert.deepEqual(assessChange(s,{type:'saveSettings',settings:next},now),{steps:0,challengeRequired:false});
 assert.throws(()=>assessChange(s,{type:'saveSettings',settings:{...next,allowlist:['example.com']}},now),/locked/);
});
