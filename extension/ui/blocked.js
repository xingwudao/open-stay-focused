import {setLanguage,t} from './i18n.js';
import {$,send,duration,notice} from './shared.js';
const nuclear=new URLSearchParams(location.search).get('reason')==='nuclear';
function explain(){$('explanation').textContent=t(nuclear?'Your focus session is holding this space for you. Return when it ends.':'You have used this website’s daily allowance. Your budget returns at your configured reset time; restrictions apply during active hours.');}
$('close-tab').addEventListener('click',async()=>{const tab=await chrome.tabs.getCurrent();if(tab?.id)await chrome.tabs.remove(tab.id);});
$('open-settings').addEventListener('click',()=>chrome.runtime.openOptionsPage());
let state;
function update(){if(state?.nuclear&&nuclear)$('timer').textContent=Date.now()<state.nuclear.endAt?t('{time} remaining',{time:duration(state.nuclear.endAt-Date.now())}):t('Session finished. You can open the website again.');}
send({type:'getState'}).then(s=>{state=s;setLanguage(s.settings.language);explain();update();}).catch(e=>notice(e.message,true));
setInterval(update,1000);

let companionPending=false,companionShown=false;
async function refreshCompanion(){
 if(nuclear||document.visibilityState!=='visible'||companionPending)return;
 companionPending=true;
 try{const data=await send({type:'getCompanion'});if(!data.enabled)OpenStayCompanion.stop();else if(data.reminder&&!companionShown){companionShown=true;OpenStayCompanion.show(data.reminder);}if(!data.sound)OpenStayCompanion.silence();}
 catch{/* The block remains effective even if the reminder is unavailable. */}
 finally{companionPending=false;}
}
void refreshCompanion();
const companionInterval=setInterval(refreshCompanion,1000);
addEventListener('pagehide',()=>{clearInterval(companionInterval);OpenStayCompanion.stop();});
