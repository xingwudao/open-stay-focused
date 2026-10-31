import {companionReminder,browsingReminderGroups} from './core/companion.js';
import {createController} from './controller.js';
import {evaluate,localDay,budgetDay} from './core/policy.js';
import {webURL,isLocalFile,usageHost} from './core/patterns.js';
import {eligibleVisits,foregroundVisits,pageTimer} from './core/tracking.js';
import {selectBeneficialDestination} from './core/redirect-policy.js';
const UI_PATHS=new Set(['/ui/options.html','/ui/popup.html','/ui/blocked.html']);
const beats=new Map(),injectionAttempts=new Map();
let popupFocus=null;
let pipeline=Promise.resolve(),ticker=null,tickQueued=false,lastBadge='';
function serial(fn){const result=pipeline.then(fn);pipeline=result.catch(()=>{});return result;}
const storage={
 async get(){
  const {state}=await chrome.storage.local.get('state');if(!state)return null;
  const {checkpoint}=await chrome.storage.session.get('checkpoint');
  state.checkpoint=checkpoint&&checkpoint.at===state.checkpoint?.at?checkpoint:null;return state;
 },
 async set(state){
  const persistent=structuredClone(state);
  if(persistent.checkpoint){delete persistent.checkpoint.url;delete persistent.checkpoint.visits;delete persistent.checkpoint.beneficialVisits;}
  await chrome.storage.local.set({state:persistent});
  try {await chrome.storage.session.set({checkpoint:state.checkpoint??null});}catch{/* a lost cache loses at most an unsettled interval */}
 }
};
const controller=createController({storage});
function trustedUI(sender){
 try {const u=new URL(sender.url);return sender.id===chrome.runtime.id&&u.protocol==='chrome-extension:'&&u.hostname===chrome.runtime.id&&UI_PATHS.has(u.pathname);}catch{return false;}
}
async function redirect(tab,state){
 if(!tab?.id||!webURL(tab.url))return;
 const now=Date.now(),decision=evaluate(tab.url,now,state);
 if(decision.blocked)try{
  if(decision.reason==='quota'){
   const day=budgetDay(now,state.settings.resetMinute);
   let destination=null;try{destination=selectBeneficialDestination({pool:state.settings.beneficialPool,usage:state.beneficialUsage[day]??{},currentUrl:tab.url,isEligible:item=>!evaluate(item.url,now,state).blocked});}catch{/* use the block page */}
   if(destination){await chrome.tabs.update(tab.id,{url:destination.url});return;}
  }
  const query=new URLSearchParams({reason:decision.reason});
  if(decision.reason==='quota'){query.set('day',budgetDay(now,state.settings.resetMinute));for(const id of decision.groupIds)query.append('group',id);}
  await chrome.tabs.update(tab.id,{url:chrome.runtime.getURL(`ui/blocked.html?${query}`)});}catch{/* tab closed */}
}
async function claimCompanion(state,groupIds,stage,currentUrl){
 if(!state.settings.companionEnabled)return null;
 const {companionLedger}=await chrome.storage.local.get('companionLedger');
 const now=Date.now(),result=companionReminder(state,now,companionLedger,groupIds,stage);
 if(result.reminder&&stage==='browsing'&&currentUrl){
  const day=budgetDay(now,state.settings.resetMinute);
  let destination=null;try{destination=selectBeneficialDestination({pool:state.settings.beneficialPool,usage:state.beneficialUsage[day]??{},currentUrl,isEligible:item=>!evaluate(item.url,now,state).blocked});}catch{/* keep the reminder without a link */}
  if(destination)result.reminder.destination={name:destination.name,url:destination.url};
 }
 if(result.reminder&&JSON.stringify(result.ledger)!==JSON.stringify(companionLedger))await chrome.storage.local.set({companionLedger:result.ledger});
 return result.reminder;
}
function setTicker(active){
 if(active&&!ticker)ticker=setInterval(()=>{
  if(tickQueued)return;tickQueued=true;
  serial(async()=>{const snapshot=await sample();for(const tab of snapshot.tabs.filter(t=>snapshot.visits.some(v=>v.tabId===t.id)))await redirect(tab,snapshot.state);})
   .catch(report).finally(()=>tickQueued=false);
 },1000);
 if(!active&&ticker){clearInterval(ticker);ticker=null;}
}
async function badge(tab,state){
 const decision=evaluate(tab?.url,Date.now(),state),seconds=decision.remainingMs===null?null:Math.max(0,Math.ceil(decision.remainingMs/1000));
 const text=state.settings.enabled===false?'II':decision.blocked?'×':seconds!==null&&seconds<=60?String(seconds):'';
 const color=seconds!==null&&seconds<=10?'#a13d2f':'#657a33';
 const signature=text+color;if(lastBadge===signature)return;lastBadge=signature;
 await chrome.action.setBadgeText({text});await chrome.action.setBadgeBackgroundColor({color});
 await chrome.action.setTitle({title:'Open Stay Focused'});
}
async function rememberPopupFocus(message,sender){
 if(message.type!=='getLiveState'||sender.tab||!sender.url?.endsWith('/ui/popup.html'))return;
 const contexts=await chrome.runtime.getContexts({contextTypes:['POPUP'],documentUrls:[sender.url]});
 if(contexts.length!==1)return; // A popup opened as a regular tab is not a focus proxy.
 if(!message.popupFocused){popupFocus=null;return;}
 const win=await chrome.windows.getLastFocused();
 popupFocus={documentId:contexts[0].documentId,windowId:win.id,at:Date.now()};
}
function recoverPage(tab,now){
 if(!tab?.id||!webURL(tab.url)||tab.status==='loading')return;
 const beat=beats.get(tab.id),last=injectionAttempts.get(tab.id);
 if(beat&&beat.url===tab.url&&now-beat.at<15000)return;
 if(last&&last.url===tab.url&&now-last.at<10000)return;
 injectionAttempts.set(tab.id,{url:tab.url,at:now});
 // Reloaded extensions leave existing tabs with invalidated content scripts.
 // Reattach only our declared scripts, using the already-granted host access.
 void chrome.scripting.executeScript({target:{tabId:tab.id},files:['distractions.js','companion.js','content.js']}).catch(()=>{});
}
async function sample(){
 const now=Date.now(),before=await controller.snapshot();
 const [win,tabs,idle]=await Promise.all([chrome.windows.getLastFocused().catch(()=>null),chrome.tabs.query({}),chrome.idle.queryState(60)]);
 const tab=tabs.find(t=>t.active&&t.windowId===win?.id);
 recoverPage(tab,now);
 // On macOS a toolbar popup takes focus away from its owning browser window.
 // Accept only a fresh focus report from a live, Chrome-identified POPUP context.
 const popupAlive=popupFocus&&popupFocus.windowId===win?.id&&now>=popupFocus.at&&now-popupFocus.at<1500
  &&(await chrome.runtime.getContexts({contextTypes:['POPUP'],documentIds:[popupFocus.documentId]})).length>0;
 const visits=eligibleVisits({tabs,win,idle,beats,now,trackAudio:before.settings.trackAudio,popupFocused:!!popupAlive});
 const beneficialVisits=foregroundVisits({tabs,win,idle,beats,now,popupFocused:!!popupAlive});
 await controller.tick({url:isLocalFile(tab?.url)?'file:///':tab?.url??'',tabId:tab?.id,visits,beneficialVisits,eligible:visits.length>0,now});
 const state=await controller.snapshot();setTicker(visits.length>0);await badge(tab,state);
 return {tab,tabs,visits,state,idle,hasHeartbeat:!!(tab&&beats.get(tab.id)?.url===tab.url&&now-beats.get(tab.id).at<15000)};
}
async function refresh(){const {tabs,state}=await sample();for(const tab of tabs)await redirect(tab,state);}
function report(error){console.error('Open Stay Focused:',error.message);lastBadge='';chrome.action.setBadgeText({text:'!'}).catch(()=>{});chrome.action.setTitle({title:`Open Stay Focused: ${error.message}`}).catch(()=>{});}
function schedule(){serial(refresh).catch(report);}
function cleanState(state){const data=structuredClone(state);delete data.checkpoint;return data;}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 serial(async()=>{
  if(trustedUI(sender)) {
   await rememberPopupFocus(message,sender);
   const live=await sample();
   if(message.type==='getCompanion'){
    if(!sender.tab?.id||new URL(sender.url).pathname!=='/ui/blocked.html')throw Error('A blocked page is required.');
    const query=new URL(sender.url).searchParams;
    const win=await chrome.windows.getLastFocused();
    const visible=sender.tab.active&&sender.tab.windowId===win.id&&win.focused;
    const reminder=visible&&query.get('reason')==='quota'&&query.get('day')===budgetDay(Date.now(),live.state.settings.resetMinute)
      ?await claimCompanion(live.state,query.getAll('group'),'blocked'):null;
    return {reminder,enabled:live.state.settings.companionEnabled,sound:live.state.settings.companionSound};
   }
   if(message.type==='getLiveState'){
    const host=usageHost(live.tab?.url);
    return {state:cleanState(live.state),tab:live.tab?{id:live.tab.id,url:isLocalFile(live.tab.url)?'file:///':live.tab.url}:null,
     decision:evaluate(live.tab?.url,Date.now(),live.state),hostUsedMs:host?(live.state.stats[localDay(Date.now())]?.[host]??0):0,
     eligible:live.visits.some(v=>v.tabId===live.tab?.id),idle:live.idle,hasHeartbeat:live.hasHeartbeat};
   }
   const data=await controller.handle(message,{trustedUI:true});
   if(['saveSettings','startNuclear','cancelScheduledNuclear','clearStats'].includes(message.type)){
    const state=await controller.snapshot();for(const tab of await chrome.tabs.query({}))await redirect(tab,state);
   }
   return cleanState(data);
  }
  if(sender.id!==chrome.runtime.id||sender.frameId!==0||!sender.tab?.id||!webURL(sender.url))throw Error('Untrusted message sender.');
  if(!['heartbeat','checkPage','getDistractions','getPageTimer'].includes(message?.type))throw Error('A trusted extension page is required.');
  const tab=await chrome.tabs.get(sender.tab.id);
  // SPA navigation changes tab.url but Chrome retains the sender's original URL.
  const frame=await chrome.webNavigation.getFrame({tabId:tab.id,frameId:0});
  if(!sender.documentId||sender.documentId!==frame?.documentId)throw Error('Stale document.');
  if(message.type==='getDistractions')return (await controller.snapshot()).settings.distractions;
  if(message.type==='heartbeat')beats.set(tab.id,{at:Date.now(),url:tab.url});
  const live=await sample();await redirect(tab,live.state);
  const timer=pageTimer(tab,live.state,Date.now(),live.visits.some(v=>v.tabId===tab.id));
  const win=await chrome.windows.getLastFocused();
  const foreground=tab.active&&win.focused&&tab.windowId===win.id&&timer.running;
  return {...timer,companionEnabled:live.state.settings.companionEnabled,companionSound:live.state.settings.companionSound,
   reminder:message.type==='heartbeat'&&foreground?await claimCompanion(live.state,browsingReminderGroups(tab.url,live.state,Date.now()),'browsing',tab.url):null};
 }).then(data=>respond({ok:true,data}),error=>respond({ok:false,error:error.message}));return true;
});
chrome.tabs.onActivated.addListener(schedule);
chrome.tabs.onUpdated.addListener((_id,change)=>{if(change.url||change.status==='complete'||Object.hasOwn(change,'audible'))schedule();});
chrome.tabs.onRemoved.addListener(id=>{beats.delete(id);injectionAttempts.delete(id);schedule();});
chrome.windows.onFocusChanged.addListener(schedule);
chrome.idle.onStateChanged.addListener(schedule);
chrome.webNavigation.onHistoryStateUpdated.addListener(details=>{if(details.frameId===0)schedule();});
chrome.webNavigation.onCommitted.addListener(details=>{if(details.frameId===0)schedule();});
chrome.alarms.onAlarm.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
chrome.runtime.onInstalled.addListener(schedule);
Promise.all([chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}),chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}),chrome.alarms.create('reconcile',{periodInMinutes:0.5})]).then(schedule).catch(report);
