import {defaultSettings} from './settings.js';
import {matchesAny,webURL} from './patterns.js';
import {budgetDay,isScheduled,localDay} from './policy.js';
function add(map,key,ms){const value=(Object.hasOwn(map,key)?map[key]:0)+ms;Object.defineProperty(map,key,{value,writable:true,enumerable:true,configurable:true});}
export const initialState=()=>({version:1,settings:defaultSettings(),usage:{},stats:{},nuclear:null,revision:0});
export function pruneHistory(input,now) {
  const state=structuredClone(input);
  if(!Number.isFinite(now))return state;
  const cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-29);const min=localDay(cutoff.getTime());
  for(const field of ['stats','usage'])for(const day of Object.keys(state[field]))if(day<min)delete state[field][day];
  return state;
}
export function accountInterval(input,{url,from,to,eligible}) {
  const state=pruneHistory(input,to),u=webURL(url);
  if(!eligible||!u||!Number.isFinite(from)||!Number.isFinite(to)||to<=from||to-from>15000)return state;
  const s=state.settings,groups=matchesAny(url,s.allowlist)?[]:s.groups.filter(g=>g.enabled&&matchesAny(url,g.patterns));
  // At most 16 segments, split on wall-clock seconds (all policy boundaries
  // are minute-aligned). This also handles offset changes at DST boundaries.
  for(let t=from;t<to;) {
    const end=Math.min(to,Math.floor(t/1000)*1000+1000),ms=end-t,day=localDay(t);
    state.stats[day]??={};add(state.stats[day],u.hostname,ms);
    if(groups.length&&isScheduled(t,s.schedule)) {
      const key=budgetDay(t,s.resetMinute);state.usage[key]??={};
      for(const g of groups)add(state.usage[key],g.id,ms);
    }
    t=end;
  }
  return state;
}
