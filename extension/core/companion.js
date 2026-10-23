import {budgetDay,evaluate} from './policy.js';

// The ledger is separate from usage: dismissing reminders never restores time.
export function companionReminder(state,now,ledger,groupIds,stage='browsing'){
 const day=budgetDay(now,state.settings.resetMinute);
 const next=ledger?.day===day?structuredClone(ledger):{day,groups:{}};
 const candidates=[];
 for(const group of state.settings.groups){
  if(!group.enabled||group.budgetMs<=0||!groupIds.includes(group.id))continue;
  const usage=state.usage[day]??{};
  const used=Object.hasOwn(usage,group.id)?usage[group.id]:0;
  const level=used>=group.budgetMs?100:used>=group.budgetMs*.8?80:used>=group.budgetMs*.5?50:0;
  const seen=Object.hasOwn(next.groups,group.id)?next.groups[group.id]:0;
  if(!level||(stage==='blocked')!==(level===100)||(stage!=='blocked'&&level<=seen))continue;
  candidates.push({group,level,seen});
 }
 candidates.sort((a,b)=>b.level-a.level||a.group.budgetMs-b.group.budgetMs);
 const selected=candidates[0];
 if(!selected)return {ledger:next,reminder:null};
 // Coalesce overlapping groups instead of putting several animals on the page.
 for(const {group,level} of candidates)Object.defineProperty(next.groups,group.id,{value:level,enumerable:true,writable:true,configurable:true});
 const {group,level,seen}=selected;
 return {ledger:next,reminder:{level,groupName:group.name,language:state.settings.language,sound:state.settings.companionSound&&level>seen,durationMs:level===100?null:group.budgetMs*(level===50?.05:.1)}};
}
export function browsingReminderGroups(url,state,now){
 const decision=evaluate(url,now,state);
 return decision.reason==='available'?decision.groupIds:[];
}
