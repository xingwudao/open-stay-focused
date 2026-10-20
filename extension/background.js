import {createController} from './controller.js';
import {evaluate,localDay} from './core/policy.js';
import {webURL} from './core/patterns.js';
import {eligibleVisits,pageTimer} from './core/tracking.js';
const UI_PATHS=new Set(['/ui/options.html','/ui/popup.html','/ui/blocked.html']);
const beats=new Map();
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
  if(persistent.checkpoint){delete persistent.checkpoint.url;delete persistent.checkpoint.visits;}
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
 const decision=evaluate(tab.url,Date.now(),state);
 if(decision.blocked)try{await chrome.tabs.update(tab.id,{url:chrome.runtime.getURL(`ui/blocked.html?reason=${decision.reason}`)});}catch{/* tab closed */}
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
async function sample(){
 const now=Date.now(),before=await controller.snapshot();
 const [win,tabs,idle]=await Promise.all([chrome.windows.getLastFocused().catch(()=>null),chrome.tabs.query({}),chrome.idle.queryState(60)]);
 const tab=tabs.find(t=>t.active&&t.windowId===win?.id);
 // On macOS a toolbar popup takes focus away from its owning browser window.
 // Accept only a fresh focus report from a live, Chrome-identified POPUP context.
 const popupAlive=popupFocus&&popupFocus.windowId===win?.id&&now>=popupFocus.at&&now-popupFocus.at<1500
  &&(await chrome.runtime.getContexts({contextTypes:['POPUP'],documentIds:[popupFocus.documentId]})).length>0;
 const visits=eligibleVisits({tabs,win,idle,beats,now,trackAudio:before.settings.trackAudio,popupFocused:!!popupAlive});
 await controller.tick({url:tab?.url??'',tabId:tab?.id,visits,eligible:visits.length>0,now});
 const state=await controller.snapshot();setTicker(visits.length>0);await badge(tab,state);
 return {tab,tabs,visits,state};
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
   if(message.type==='getLiveState'){
    const host=webURL(live.tab?.url)?.hostname;
    return {state:cleanState(live.state),tab:live.tab?{id:live.tab.id,url:live.tab.url}:null,
     decision:evaluate(live.tab?.url,Date.now(),live.state),hostUsedMs:host?(live.state.stats[localDay(Date.now())]?.[host]??0):0,
     eligible:live.visits.some(v=>v.tabId===live.tab?.id)};
   }
   const data=await controller.handle(message,{trustedUI:true});
   if(['saveSettings','startNuclear','cancelScheduledNuclear','clearStats'].includes(message.type)){
    const state=await controller.snapshot();for(const tab of await chrome.tabs.query({}))await redirect(tab,state);
   }
   return cleanState(data);
  }
  if(sender.id!==chrome.runtime.id||sender.frameId!==0||!sender.tab?.id||!webURL(sender.url))throw Error('Untrusted message sender.');
  if(!['heartbeat','checkPage','getDistractions','getPageTimer'].includes(message?.type))throw Error('A trusted extension page is required.');
  const tab=await chrome.tabs.get(sender.tab.id);if(sender.url!==tab.url)throw Error('Stale document.');
  if(message.type==='getDistractions')return (await controller.snapshot()).settings.distractions;
  if(message.type==='heartbeat')beats.set(tab.id,{at:Date.now(),url:tab.url});
  const live=await sample();await redirect(tab,live.state);
  return pageTimer(tab,live.state,Date.now(),live.visits.some(v=>v.tabId===tab.id));
 }).then(data=>respond({ok:true,data}),error=>respond({ok:false,error:error.message}));return true;
});
chrome.tabs.onActivated.addListener(schedule);
chrome.tabs.onUpdated.addListener((_id,change)=>{if(change.url||change.status==='complete'||Object.hasOwn(change,'audible'))schedule();});
chrome.tabs.onRemoved.addListener(id=>{beats.delete(id);schedule();});
chrome.windows.onFocusChanged.addListener(schedule);
chrome.idle.onStateChanged.addListener(schedule);
chrome.webNavigation.onHistoryStateUpdated.addListener(details=>{if(details.frameId===0)schedule();});
chrome.webNavigation.onCommitted.addListener(details=>{if(details.frameId===0)schedule();});
chrome.alarms.onAlarm.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
chrome.runtime.onInstalled.addListener(schedule);
Promise.all([chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}),chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}),chrome.alarms.create('reconcile',{periodInMinutes:0.5})]).then(schedule).catch(report);
