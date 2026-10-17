import {matchesAny, webURL} from './patterns.js';
export function localDay(now) {
  const d=new Date(now);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function budgetDay(now, resetMinute) {
  const d=new Date(now);const reset=new Date(d.getFullYear(),d.getMonth(),d.getDate(),Math.floor(resetMinute/60),resetMinute%60);
  if(now<reset.getTime()) d.setDate(d.getDate()-1);
  return localDay(d.getTime());
}
export function isScheduled(now,{days,intervals}) {
  const d=new Date(now),day=d.getDay(),m=d.getHours()*60+d.getMinutes();
  return intervals.some(([start,end])=>start<end ? days.includes(day)&&m>=start&&m<end : (days.includes(day)&&m>=start)||(days.includes((day+6)%7)&&m<end));
}
export const activeNuclear = (state, now) => state.nuclear && state.nuclear.startAt<=now && now<state.nuclear.endAt;
export function evaluate(url, now, state) {
  const clear={blocked:false,reason:'available',groupIds:[],remainingMs:null};
  if(!webURL(url)) return {...clear,reason:'unsupported'};
  const nuclear=state.nuclear;
  if(activeNuclear(state,now)) {
    const s=nuclear.policySnapshot,allowed=matchesAny(url,s.allowlist);
    const block=nuclear.mode==='all'||(nuclear.mode==='exceptAllowed'&&!allowed)||(nuclear.mode==='blocked'&&!allowed&&s.groups.some(g=>g.enabled&&matchesAny(url,g.patterns)));
    if(block)return {...clear,blocked:true,reason:'nuclear',remainingMs:nuclear.endAt-now};
  }
  const s=state.settings;
  if(s.enabled===false)return {...clear,reason:'paused'};
  if(matchesAny(url,s.allowlist))return {...clear,reason:'allowed'};
  const groups=s.groups.filter(g=>g.enabled&&matchesAny(url,g.patterns));
  const used=state.usage[budgetDay(now,s.resetMinute)]??{};
  const remainingMs=groups.length?Math.max(0,Math.min(...groups.map(g=>g.budgetMs-(Object.hasOwn(used,g.id)?used[g.id]:0)))):null;
  const blocked=isScheduled(now,s.schedule)&&remainingMs===0;
  return {blocked,reason:blocked?'quota':!isScheduled(now,s.schedule)?'outside-schedule':'available',groupIds:groups.map(g=>g.id),remainingMs};
}
