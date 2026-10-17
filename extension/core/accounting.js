import {defaultSettings} from './settings.js';
import {matchesAny,webURL} from './patterns.js';
import {budgetDay,isScheduled,localDay} from './policy.js';
function add(map,key,ms){const value=(Object.hasOwn(map,key)?map[key]:0)+ms;Object.defineProperty(map,key,{value,writable:true,enumerable:true,configurable:true});}
function own(map,key,create){if(!Object.hasOwn(map,key))Object.defineProperty(map,key,{value:create(),writable:true,enumerable:true,configurable:true});return map[key];}
export const initialState=()=>({version:1,settings:defaultSettings(),usage:{},stats:{},sessionCounts:{},hourly:{},activeHosts:[],nuclear:null,revision:0});
export function pruneHistory(input,now) {
  const state=structuredClone(input);
  for(const field of ['stats','usage','sessionCounts','hourly'])state[field]??={};
  state.activeHosts??=[];
  if(!Number.isFinite(now))return state;
  const cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-29);const min=localDay(cutoff.getTime());
  for(const field of ['stats','usage','sessionCounts','hourly'])for(const day of Object.keys(state[field]))if(day<min)delete state[field][day];
  return state;
}
export function accountInterval(input,{url,from,to,eligible}) {
  return accountIntervalMany(input,{visits:[{url}],from,to,eligible:Boolean(eligible)});
}
export function accountIntervalMany(input,{visits=[],from,to,eligible=true}) {
  const state=pruneHistory(input,to);
  if(!eligible||to-from>15000){state.activeHosts=[];return state;}
  // Repeated or backward timestamps are not evidence that a session ended.
  if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)return state;
  const s=state.settings,hosts=new Set(),groups=new Set();
  for(const visit of visits){const u=webURL(visit.url);if(!u)continue;hosts.add(u.hostname);
    if(!matchesAny(visit.url,s.allowlist))for(const g of s.groups)if(g.enabled&&matchesAny(visit.url,g.patterns))groups.add(g.id);
  }
  const previous=new Set(state.activeHosts);
  for(const host of hosts)if(!previous.has(host))add(own(state.sessionCounts,localDay(from),()=>({})),host,1);
  state.activeHosts=[...hosts];
  // Timestamp differences, split at wall-clock seconds so minute policy boundaries
  // and local timezone changes are respected. A host/group is charged once per span.
  for(let t=from;t<to;) {
    const end=Math.min(to,Math.floor(t/1000)*1000+1000),ms=end-t,day=localDay(t);
    for(const host of hosts){
      add(own(state.stats,day,()=>({})),host,ms);
      const hours=own(own(state.hourly,day,()=>({})),host,()=>Array(24).fill(0));hours[new Date(t).getHours()]+=ms;
    }
    if(s.enabled!==false&&groups.size&&isScheduled(t,s.schedule)) {
      const used=own(state.usage,budgetDay(t,s.resetMinute),()=>({}));
      for(const id of groups)add(used,id,ms);
    }
    t=end;
  }
  return state;
}
