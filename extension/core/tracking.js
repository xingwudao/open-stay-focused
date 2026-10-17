import {webURL} from './patterns.js';
import {evaluate,localDay} from './policy.js';
export function eligibleVisits({tabs,win,idle,beats,now,trackAudio=false}){
 if(idle==='locked')return [];
 return tabs.filter(tab=>{
  if(!webURL(tab.url))return false;
  if(trackAudio&&tab.audible)return true;
  const beat=beats.get(tab.id);
  return !!(tab.active&&tab.windowId===win?.id&&win.focused&&win.state!=='minimized'&&idle==='active'&&beat&&now>=beat.at&&now-beat.at<=15000&&beat.url===tab.url);
 }).map(tab=>({url:tab.url,tabId:tab.id}));
}
export function pageTimer(tab,state,now,running){
 const decision=evaluate(tab?.url,now,state),host=webURL(tab?.url)?.hostname;
 return {show:!!(state.settings.showTimer&&state.settings.enabled!==false&&decision.remainingMs!==null),language:state.settings.language,
  remainingMs:decision.remainingMs,usedMs:host?(state.stats[localDay(now)]?.[host]??0):0,
  reason:decision.reason,running:!!running};
}
