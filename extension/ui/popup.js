import {$,send,duration,notice,challengeIfNeeded,element} from './shared.js';
import {evaluate} from '../core/policy.js';
import {webURL} from '../core/patterns.js';
let state,tab;
async function load(){
 state=await send({type:'getState'});[tab]=await chrome.tabs.query({active:true,currentWindow:true});
 const url=webURL(tab?.url),decision=evaluate(tab?.url,Date.now(),state);
 $('site').textContent=url?.hostname??'Browser or extension page';$('remaining').textContent=duration(decision.remainingMs);
 $('reason').textContent=({'available':'Available within your current rules.','allowed':'This page is on your allowlist.','unsupported':'Budgets apply to HTTP and HTTPS websites.','nuclear':'A focus session is active.','quota':'Daily budget reached.','outside-schedule':'Outside active hours. Your budget is paused.'})[decision.reason];
 $('quick-add').disabled=!url;$('target-group').replaceChildren();for(const g of state.settings.groups){const o=element('option',g.name);o.value=g.id;$('target-group').append(o);}const o=element('option','New group · 10 min/day');o.value='new';$('target-group').append(o);
}
$('open-settings').addEventListener('click',()=>chrome.runtime.openOptionsPage());
$('quick-add').addEventListener('click',async()=>{try{
 const url=webURL(tab?.url);if(!url)throw Error('This page cannot be added.');
 const challenge=await challengeIfNeeded(state),settings=structuredClone(state.settings);
 let group=settings.groups.find(g=>g.id===$('target-group').value);
 if(!group){group={id:crypto.randomUUID(),name:'Distractions',enabled:true,budgetMs:600000,patterns:[]};settings.groups.push(group);}
 if(!group.patterns.includes(url.hostname))group.patterns.push(url.hostname);
 await send({type:'saveSettings',settings,revision:state.revision,challenge});notice('Website added.');await load();
}catch(e){notice(e.message,true);}});
load().catch(e=>notice(e.message,true));
