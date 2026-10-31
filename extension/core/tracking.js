import {webURL,isLocalFile,usageHost} from './patterns.js';
import {evaluate,localDay} from './policy.js';
function foregroundTab(tab,{win,idle,beats,now,popupFocused}){
 if(!tab.active||tab.windowId!==win?.id||(!win.focused&&!popupFocused)||win.state==='minimized'||idle!=='active'||tab.status==='loading'||tab.discarded)return false;
 if(isLocalFile(tab.url))return true;
 if(!webURL(tab.url))return false;
 const beat=beats.get(tab.id);return !!(popupFocused||(beat&&now>=beat.at&&now-beat.at<=15000&&beat.url===tab.url));
}
export function foregroundVisits({tabs,win,idle,beats,now,popupFocused=false}){
 return tabs.filter(tab=>foregroundTab(tab,{win,idle,beats,now,popupFocused})).map(tab=>({url:isLocalFile(tab.url)?'file:///':tab.url,tabId:tab.id}));
}
export function eligibleVisits({tabs,win,idle,beats,now,trackAudio=false,popupFocused=false}){
 if(idle==='locked')return [];
 const foreground=foregroundVisits({tabs,win,idle,beats,now,popupFocused}),seen=new Set(foreground.map(v=>v.tabId));
 if(trackAudio)for(const tab of tabs)if(!seen.has(tab.id)&&webURL(tab.url)&&tab.audible)foreground.push({url:tab.url,tabId:tab.id});
 return foreground;
}
export function pageTimer(tab,state,now,running){
 const decision=evaluate(tab?.url,now,state),host=usageHost(tab?.url);
 return {show:false,language:state.settings.language,
  remainingMs:decision.remainingMs,usedMs:host?(state.stats[localDay(now)]?.[host]??0):0,
  reason:decision.reason,running:!!running};
}
