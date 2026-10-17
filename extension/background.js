import {createController} from './controller.js';
import {evaluate} from './core/policy.js';
import {webURL} from './core/patterns.js';
const UI_PATHS=new Set(['/ui/options.html','/ui/popup.html','/ui/blocked.html']);
const beats=new Map();
let pipeline=Promise.resolve();
function serial(fn){const result=pipeline.then(fn);pipeline=result.catch(()=>{});return result;}
const storage={
 async get(){
  const {state}=await chrome.storage.local.get('state');
  if(!state)return null;
  const {checkpoint}=await chrome.storage.session.get('checkpoint');
  state.checkpoint=checkpoint&&checkpoint.at===state.checkpoint?.at?checkpoint:null;
  return state;
 },
 async set(state){
  const persistent=structuredClone(state);
  if(persistent.checkpoint)delete persistent.checkpoint.url;
  await chrome.storage.local.set({state:persistent});
  // The local checkpoint is authoritative. Losing this cache can only lose
  // a small unsettled interval, never replay already committed usage.
  try {await chrome.storage.session.set({checkpoint:state.checkpoint??null});}catch{/* reconstruct on next heartbeat */}
 }
};
const controller=createController({storage});
function trustedUI(sender){
 try {const u=new URL(sender.url);return sender.id===chrome.runtime.id&&u.protocol==='chrome-extension:'&&u.hostname===chrome.runtime.id&&UI_PATHS.has(u.pathname);}catch{return false;}
}
async function redirect(tab,state){
 if(!tab?.id||!webURL(tab.url))return;
 const decision=evaluate(tab.url,Date.now(),state);
 if(decision.blocked) {
  try {await chrome.tabs.update(tab.id,{url:chrome.runtime.getURL(`ui/blocked.html?reason=${decision.reason}`)});}catch{/* tab closed during evaluation */}
 }
}
async function sample(){
 const now=Date.now();
 const win=await chrome.windows.getLastFocused();
 const [tab]=await chrome.tabs.query({active:true,windowId:win.id});
 const idle=await chrome.idle.queryState(60);
 const beat=tab?beats.get(tab.id):null;
 const eligible=!!(win.focused&&tab?.active&&webURL(tab.url)&&idle==='active'&&beat&&now-beat.at<=15000&&beat.url===tab.url);
 await controller.tick({url:tab?.url??'',tabId:tab?.id,eligible,now});
 return tab;
}
async function refresh(){await sample();const state=await controller.snapshot();for(const tab of await chrome.tabs.query({}))await redirect(tab,state);}
function report(error){console.error('Open Stay Focused:',error.message);chrome.action.setBadgeText({text:'!'}).catch(()=>{});chrome.action.setTitle({title:`Open Stay Focused: ${error.message}`}).catch(()=>{});}
function schedule(){serial(refresh).catch(report);}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 serial(async()=>{
  if(trustedUI(sender)) {
   await sample();
   const data=await controller.handle(message,{trustedUI:true});
   if(message.type!=='getState'){
    const state=await controller.snapshot();for(const tab of await chrome.tabs.query({}))await redirect(tab,state);
   }
   // Never expose the ephemeral full URL or checkpoint through the UI API.
   delete data.checkpoint;return data;
  }
  if(sender.id!==chrome.runtime.id||sender.frameId!==0||!sender.tab?.id||!webURL(sender.url))throw Error('Untrusted message sender.');
  if(!['heartbeat','checkPage','getDistractions'].includes(message?.type))throw Error('A trusted extension page is required.');
  const tab=await chrome.tabs.get(sender.tab.id);
  if(sender.url!==tab.url)throw Error('Stale document.');
  if(message.type==='getDistractions')return (await controller.snapshot()).settings.distractions;
  if(message.type==='heartbeat')beats.set(tab.id,{at:Date.now(),url:tab.url});
  await sample();await redirect(tab,await controller.snapshot());return null;
 }).then(data=>respond({ok:true,data}),error=>respond({ok:false,error:error.message}));
 return true;
});
chrome.tabs.onActivated.addListener(schedule);
chrome.tabs.onUpdated.addListener((_id,change)=>{if(change.url||change.status==='complete')schedule();});
chrome.tabs.onRemoved.addListener(id=>{beats.delete(id);schedule();});
chrome.windows.onFocusChanged.addListener(schedule);
chrome.idle.onStateChanged.addListener(schedule);
chrome.webNavigation.onHistoryStateUpdated.addListener(details=>{if(details.frameId===0)schedule();});
chrome.webNavigation.onCommitted.addListener(details=>{if(details.frameId===0)schedule();});
chrome.alarms.onAlarm.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
chrome.runtime.onInstalled.addListener(schedule);
// Content scripts cannot read/write quota state directly.
Promise.all([
 chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}),
 chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}),
 chrome.alarms.create('reconcile',{periodInMinutes:0.5})
]).then(schedule).catch(report);
