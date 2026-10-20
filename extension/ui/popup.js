import {setLanguage,t} from './i18n.js';
import {$,send,duration,notice,mutate,element} from './shared.js';
import {webURL,matchesAny} from '../core/patterns.js';
$('version').textContent='v'+chrome.runtime.getManifest().version;
let state,tab,busy=false,refreshing=false,groupSignature='',selectedGroupId=null;
function renderAddState(){
 if(!state)return;
 const url=webURL(tab?.url),group=state.settings.groups.find(g=>g.id===$('target-group').value);
 const included=!!(url&&group&&matchesAny(url.href,group.patterns));
 $('quick-add').disabled=busy||!url||included;
 $('quick-add').textContent=t(included?'Already in this group':group?'Add to this group':'Add website');
}
$('target-group').addEventListener('change',renderAddState);
async function load(){
 if(refreshing||busy)return;refreshing=true;
 try{
 const live=await send({type:'getLiveState',popupFocused:document.hasFocus()});state=live.state;tab=live.tab;setLanguage(state.settings.language);
 const url=webURL(tab?.url),decision=live.decision;
 $('site').textContent=url?.hostname??t('Browser or extension page');$('remaining').textContent=duration(decision.remainingMs);
 $('host-usage').textContent=t('Today on this website: {time}',{time:duration(live.hostUsedMs??0)});
 $('reason').textContent=t(({'available':'Available within your current rules.','allowed':'This page is on your allowlist.','unsupported':'Budgets apply to HTTP and HTTPS websites.','nuclear':'A focus session is active.','quota':'Daily budget reached.','paused':'Restrictions are paused.','disabled':'Restrictions are paused.','outside-schedule':'Outside active hours. Your budget is paused.'})[decision.reason]??'Available within your current rules.');
 if(decision.remainingMs!==null&&decision.reason==='available'&&!live.eligible){
  $('reason').textContent=t(live.idle==='locked'?'Timer paused: your device is locked.':live.idle==='idle'?'Timer paused: no activity for 60 seconds. Move the mouse or press a key to resume.':!live.hasHeartbeat?'Reconnecting to this page. Refresh the website if the timer stays paused.':'Timer paused: return focus to this browser window.');
 }
 $('quick-add').disabled=!url;$('quick-allow').hidden=state.settings.hideQuickAllow;$('quick-allow').disabled=!url;
 $('pause').hidden=state.settings.hidePause;$('pause').textContent=t(state.settings.enabled?'Pause restrictions':'Resume restrictions');
 const signature=JSON.stringify([state.settings.language,state.settings.groups.map(g=>[g.id,g.name])]);
 if(signature!==groupSignature){const selected=selectedGroupId??$('target-group').value;selectedGroupId=null;$('target-group').replaceChildren();for(const g of state.settings.groups){const o=element('option',g.name);o.value=g.id;$('target-group').append(o);}const o=element('option',t('New group · 10 min/day'));o.value='new';$('target-group').append(o);if([...$('target-group').options].some(o=>o.value===selected))$('target-group').value=selected;groupSignature=signature;}
 renderAddState();
 }finally{refreshing=false;}
}
async function change(fn){if(busy)return;busy=true;renderAddState();try{await fn();}catch(e){notice(e.message,true);}finally{busy=false;await load().catch(e=>notice(e.message,true));}}
$('open-settings').addEventListener('click',()=>chrome.runtime.openOptionsPage());
$('quick-add').addEventListener('click',()=>change(async()=>{
 const url=webURL(tab?.url);if(!url)throw Error('This page cannot be added.');
 const settings=structuredClone(state.settings);let group=settings.groups.find(g=>g.id===$('target-group').value);
 if(group&&matchesAny(url.href,group.patterns)){notice('Already in this group');return;}
 if(!group){group={id:crypto.randomUUID(),name:t('Distractions'),enabled:true,budgetMs:600000,patterns:[]};settings.groups.push(group);}
 if(!group.patterns.includes(url.hostname))group.patterns.push(url.hostname);
 await mutate(state,{type:'saveSettings',settings,revision:state.revision});selectedGroupId=group.id;groupSignature='';notice('Website added.');
}));
$('quick-allow').addEventListener('click',()=>change(async()=>{const url=webURL(tab?.url);if(!url)throw Error('This page cannot be added.');const settings=structuredClone(state.settings);if(!settings.allowlist.includes(url.hostname))settings.allowlist.push(url.hostname);await mutate(state,{type:'saveSettings',settings,revision:state.revision});notice('Settings saved.');}));
$('pause').addEventListener('click',()=>change(async()=>{const settings={...state.settings,enabled:!state.settings.enabled};await mutate(state,{type:'saveSettings',settings,revision:state.revision});}));
const timer=setInterval(()=>load().catch(e=>notice(e.message,true)),1000);addEventListener('pagehide',()=>clearInterval(timer),{once:true});
load().catch(e=>notice(e.message,true));

for(const event of ['focus','blur'])addEventListener(event,()=>load().catch(e=>notice(e.message,true)));
