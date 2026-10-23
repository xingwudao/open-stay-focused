import {budgetDay,isScheduled,activeNuclear} from './policy.js';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const valueFor=(used,id)=>Object.hasOwn(used,id)?used[id]:0;
const includes=(a,b)=>b.every(x=>a.includes(x));
function restrictionKey(settings){
  const {language,companionEnabled,companionSound,groups,allowlist,...rest}=settings;
  // Compare validated rules exactly; names and ordering do not affect enforcement.
  const value={...rest,allowlist:[...new Set(allowlist)].sort(),groups:groups.map(({name,patterns,...group})=>({...group,patterns:[...new Set(patterns)].sort()})).sort((a,b)=>a.id.localeCompare(b.id))};
  return JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
}
function equivalentRestrictions(old,next){return restrictionKey(old)===restrictionKey(next);}
export function exhaustedGroups(state,now){const s=state.settings,used=state.usage[budgetDay(now,s.resetMinute)]??{};return isScheduled(now,s.schedule)?s.groups.filter(g=>g.enabled&&g.budgetMs>0&&g.budgetMs-valueFor(used,g.id)<=1000):[];}
export function onlyTightening(old,next){
  // Deliberately conservative: uncertain pattern substitutions require the challenge.
  if(['showTimer','challengeText','resetMinute'].some(k=>!same(old[k],next[k]))||!same(old.schedule.intervals,next.schedule.intervals))return false;
  if(old.enabled&&!next.enabled||old.trackAudio&&!next.trackAudio||old.challengeEnabled&&!next.challengeEnabled||old.hidePause&&!next.hidePause||old.hideQuickAllow&&!next.hideQuickAllow)return false;
  if(!includes(next.schedule.days,old.schedule.days)||!includes(old.allowlist,next.allowlist))return false;
  if(Object.keys(old.distractions).some(k=>old.distractions[k]&&!next.distractions[k]))return false;
  for(const g of old.groups){const n=next.groups.find(x=>x.id===g.id);if(!n||g.enabled&&!n.enabled||n.budgetMs>g.budgetMs||!includes(n.patterns,g.patterns))return false;}
  return true;
}
export function assessChange(state,operation,now){
  if(operation.type==='saveSettings'&&equivalentRestrictions(state.settings,operation.settings))return {steps:0,challengeRequired:false};
  if(activeNuclear(state,now)&&operation.type!=='clearStats')throw Error('A nuclear session is active. Settings are locked until it ends.');
  if(operation.type!=='saveSettings')return {steps:0,challengeRequired:state.settings.challengeEnabled};
  const old=state.settings,next=operation.settings,exhausted=exhaustedGroups(state,now),today=new Date(now).getDay();
  const date=new Date(now),minute=date.getHours()*60+date.getMinutes(),previousDay=(today+6)%7;
  const overnightActive=old.schedule.days.includes(previousDay)&&old.schedule.intervals.some(([start,end])=>start>end&&minute<end);
  if(old.schedule.days.includes(today)&&!next.schedule.days.includes(today)||overnightActive&&!next.schedule.days.includes(previousDay))throw Error("Today's active day cannot be removed.");
  if(exhausted.length){
    if(next.allowlist.some(x=>!old.allowlist.includes(x)))throw Error('An exhausted budget prevents adding allowed websites.');
    for(const g of exhausted){const n=next.groups.find(x=>x.id===g.id);if(!n||!n.enabled||n.budgetMs===0||n.budgetMs>g.budgetMs||!includes(n.patterns,g.patterns))throw Error('An exhausted group cannot be relaxed during active hours.');}
  }
  if(old.hidePause&&!next.hidePause&&(exhausted.length||activeNuclear(state,now)))throw Error('The pause control cannot be revealed during an exhausted budget or nuclear session.');
  if(old.enabled&&!next.enabled&&old.hidePause&&next.hidePause)throw Error('Reveal the pause control before deactivating.');
  const used=state.usage[budgetDay(now,old.resetMinute)]??{};
  let steps=old.enabled&&!next.enabled?10:0;
  for(const g of old.groups){const n=next.groups.find(x=>x.id===g.id);if(!n){steps=Math.max(steps,1);continue;}if(n.budgetMs>g.budgetMs)steps=Math.max(steps,g.budgetMs-valueFor(used,g.id)<=180000?8:2);else if(n.budgetMs<g.budgetMs&&n.budgetMs<=valueFor(used,g.id))steps=Math.max(steps,1);}
  return {steps,challengeRequired:old.challengeEnabled&&!onlyTightening(old,next)};
}
export function tomorrow(now){const date=new Date(now);date.setDate(date.getDate()+1);return date.getTime();}
export function queueSettings(state,settings,now){
  const next=structuredClone(state);next.pending??={};next.settings=structuredClone(settings);
  if(!same(settings.schedule.intervals,state.settings.schedule.intervals)){next.pending.intervals={value:settings.schedule.intervals,applyAt:tomorrow(now)};next.settings.schedule.intervals=structuredClone(state.settings.schedule.intervals);}
  if(settings.resetMinute!==state.settings.resetMinute){next.pending.resetMinute={value:settings.resetMinute,applyAt:tomorrow(now)};next.settings.resetMinute=state.settings.resetMinute;}
  return next;
}
