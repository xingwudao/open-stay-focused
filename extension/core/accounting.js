import {defaultSettings} from './settings.js';
import {matchesAny,webURL} from './patterns.js';
import {budgetDay,isScheduled,localDay} from './policy.js';
export const initialState=()=>({version:1,settings:defaultSettings(),usage:{},stats:{},nuclear:null,revision:0});
export function accountInterval(input,{url,from,to,eligible}) {
  const state=structuredClone(input),u=webURL(url);
  if(!eligible||!u||!Number.isFinite(from)||!Number.isFinite(to)||to<=from||to-from>15000)return state;
  const s=state.settings,groups=matchesAny(url,s.allowlist)?[]:s.groups.filter(g=>g.enabled&&matchesAny(url,g.patterns));
  // At most 16 segments, split on wall-clock seconds (all policy boundaries
  // are minute-aligned). This also handles offset changes at DST boundaries.
  for(let t=from;t<to;) {
    const end=Math.min(to,Math.floor(t/1000)*1000+1000),ms=end-t,day=localDay(t);
    state.stats[day]??={};state.stats[day][u.hostname]=(state.stats[day][u.hostname]??0)+ms;
    if(groups.length&&isScheduled(t,s.schedule)) {
      const key=budgetDay(t,s.resetMinute);state.usage[key]??={};
      for(const g of groups)state.usage[key][g.id]=(state.usage[key][g.id]??0)+ms;
    }
    t=end;
  }
  const cutoff=new Date(to);cutoff.setDate(cutoff.getDate()-29);const min=localDay(cutoff.getTime());
  for(const field of ['stats','usage'])for(const day of Object.keys(state[field]))if(day<min)delete state[field][day];
  return state;
}
