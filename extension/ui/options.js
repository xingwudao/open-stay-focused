import {setLanguage,t,getLanguage} from './i18n.js';
import {renderUsage} from './statistics.js';
import {summarizeUsage,csvUsage} from '../core/statistics.js';
import {DISTRACTIONS,validateSettings} from '../core/settings.js';
import {budgetDay,localDay,activeNuclear} from '../core/policy.js';
import {$,send,duration,notice,clearNotice,challengeIfNeeded,mutate,element} from './shared.js';
$('version').textContent='v'+chrome.runtime.getManifest().version;
let state,draft,draftRevision,refreshing=false,acting=false;
const lines=value=>value.split('\n').map(x=>x.trim()).filter(Boolean);
const timeText=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
function parseTime(text,allow24=false){if(!/^\d{2}:\d{2}$/.test(text))throw Error('Use times in HH:MM format.');const [h,m]=text.split(':').map(Number);if(m>59||h>23&&!(allow24&&h===24&&m===0))throw Error('Invalid time.');return h*60+m;}
async function act(fn){if(acting)return;acting=true;clearNotice();try{await fn();}catch(e){notice(e.message,true);}finally{acting=false;}}
function renderGroups(){
 const root=$('groups');root.replaceChildren();
 if(!draft.groups.length)root.append(element('p',t('No groups yet. Start with one website you want more distance from.'),'empty'));
 for(const g of draft.groups){
  const card=element('div',undefined,'card group-card'),heading=element('div',undefined,'section-top');
  const pill=element('span','','pill');pill.dataset.group=g.id;heading.append(element('h3',g.name),pill);card.append(heading);
  const label=element('label',t('Enabled'),'check'),check=element('input');check.type='checkbox';check.checked=g.enabled;check.addEventListener('change',()=>g.enabled=check.checked);label.prepend(check);card.append(label);
  for(const [text,key,type,value] of [['Name','name','text',g.name],['Minutes per day','budgetMs','number',g.budgetMs/60000]]){
   const l=element('label',t(text)),input=element('input');input.type=type;input.value=value;
   if(type==='number'){input.min='0';input.max='1440';input.step='1';}else input.maxLength=80;
   input.addEventListener('input',()=>g[key]=key==='budgetMs'?Number(input.value)*60000:input.value);l.append(input);card.append(l);
  }
  const l=element('label',t('Patterns')),ta=element('textarea');ta.rows=3;ta.value=g.patterns.join('\n');ta.addEventListener('input',()=>g.patterns=lines(ta.value));l.append(ta);card.append(l);
  const remove=element('button',t('Remove group'),'quiet');remove.addEventListener('click',()=>{draft.groups=draft.groups.filter(x=>x.id!==g.id);renderGroups();});card.append(remove);root.append(card);
 }
 refreshPills();
}
function renderBeneficial(){
 $('beneficial-policy').value=draft.beneficialPool.policy;const root=$('beneficial-sites');root.replaceChildren();
 if(!draft.beneficialPool.items.length)root.append(element('p',t('No destinations yet.'),'empty'));
 for(const item of draft.beneficialPool.items){
  const card=element('div',undefined,'beneficial-card');
  const enabled=element('label',t('Enabled'),'check'),check=element('input');check.type='checkbox';check.checked=item.enabled;check.addEventListener('change',()=>item.enabled=check.checked);enabled.prepend(check);card.append(enabled);
  for(const [text,key,type,value] of [['Name','name','text',item.name],['URL','url','url',item.url],['Daily minimum minutes','targetMs','number',item.targetMs/60000]]){
   const label=element('label',t(text)),input=element('input');input.type=type;input.value=value;
   if(type==='number'){input.min='1';input.max='1440';input.step='1';}else input.maxLength=key==='name'?80:2048;
   input.addEventListener('input',()=>item[key]=key==='targetMs'?Number(input.value)*60000:input.value);label.append(input);card.append(label);
  }
  const remove=element('button',t('Remove destination'),'quiet');remove.addEventListener('click',()=>{draft.beneficialPool.items=draft.beneficialPool.items.filter(x=>x.id!==item.id);renderBeneficial();});card.append(remove);root.append(card);
 }
}
function refreshPills(){for(const pill of document.querySelectorAll('[data-group]')){const g=state.settings.groups.find(g=>g.id===pill.dataset.group)??draft.groups.find(g=>g.id===pill.dataset.group);if(g)pill.textContent=t('{time} left',{time:duration(Math.max(0,g.budgetMs-(state.usage[budgetDay(Date.now(),state.settings.resetMinute)]?.[g.id]??0)))});}}
const toggleNames=['YouTube · Shorts','YouTube · Recommendations','YouTube · Comments','Instagram · Reels links','Facebook · Reels links','X · Trending topics','TikTok · Recommendations'];
function render(){
 setLanguage(state.settings.language);$('language').value=state.settings.language;
 draftRevision=state.revision;draft=structuredClone(state.settings);renderGroups();renderBeneficial();$('allowlist').value=draft.allowlist.join('\n');$('days').replaceChildren();
 ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((name,day)=>{const l=element('label',t(name),'day');const c=element('input');c.type='checkbox';c.value=day;c.checked=draft.schedule.days.includes(day);l.prepend(c);$('days').append(l);});
 $('intervals').value=draft.schedule.intervals.map(([a,b])=>`${timeText(a)}-${timeText(b)}`).join('\n');$('reset').value=timeText(draft.resetMinute);$('challenge-enabled').checked=draft.challengeEnabled;
 $('toggles').replaceChildren();DISTRACTIONS.forEach((key,i)=>{const l=element('label',t(toggleNames[i]),'check'),c=element('input');c.type='checkbox';c.dataset.key=key;c.checked=draft.distractions[key];l.prepend(c);$('toggles').append(l);});
 for(const [id,key] of [['companion-enabled','companionEnabled'],['companion-sound','companionSound'],['track-audio','trackAudio'],['hide-pause','hidePause'],['hide-quick-allow','hideQuickAllow']])$(id).checked=draft[key];$('challenge-text').value=draft.challengeText??'';
 renderSession();renderStats();
}
function renderSession(){
 const n=state.nuclear,active=activeNuclear(state,Date.now()),pending=n&&Date.now()<n.startAt;
 $('session-banner').hidden=!active&&!pending;
 if(active||pending)$('session-banner').textContent=active?t('Focus session active · {time} remaining. Restrictive settings stay locked; beneficial destinations remain editable.',{time:duration(n.endAt-Date.now())}):t('Focus session scheduled for {time}.',{time:new Date(n.startAt).toLocaleString(getLanguage())});
 $('pause').hidden=state.settings.hidePause;$('pause').textContent=t(state.settings.enabled?'Pause restrictions':'Resume restrictions');
 const pendingText=[];if(state.pending?.intervals)pendingText.push(t('Time windows: {effective}. Pending: {value}, effective {time}.',{effective:state.settings.schedule.intervals.map(([a,b])=>`${timeText(a)}–${timeText(b)}`).join(', '),value:state.pending.intervals.value.map(([a,b])=>`${timeText(a)}–${timeText(b)}`).join(', '),time:new Date(state.pending.intervals.applyAt).toLocaleString(getLanguage())}));if(state.pending?.resetMinute)pendingText.push(t('Daily reset: {effective}. Pending: {value}, effective {time}.',{effective:timeText(state.settings.resetMinute),value:timeText(state.pending.resetMinute.value),time:new Date(state.pending.resetMinute.applyAt).toLocaleString(getLanguage())}));$('pending-banner').hidden=!pendingText.length;$('pending-banner').textContent=pendingText.join(' ');
 $('start-focus').disabled=!!active;$('cancel-focus').disabled=!pending;
}
function summary(){return summarizeUsage(state,{range:$('stats-range').value,filter:$('stats-filter').value,search:$('stats-search').value,now:Date.now()});}
function renderStats(){renderUsage(summary());}

function collect(){
 draft.language=$('language').value;draft.allowlist=lines($('allowlist').value);draft.schedule.days=[...$('days').querySelectorAll('input:checked')].map(e=>Number(e.value));
 draft.beneficialPool.policy=$('beneficial-policy').value;
 draft.schedule.intervals=lines($('intervals').value).map(line=>{const parts=line.split('-');if(parts.length!==2)throw Error('Use time windows like 09:00-17:00.');return [parseTime(parts[0].trim()),parseTime(parts[1].trim(),true)];});
 draft.resetMinute=parseTime($('reset').value);draft.challengeEnabled=$('challenge-enabled').checked;draft.challengeText=$('challenge-text').value;
 for(const [id,key] of [['companion-enabled','companionEnabled'],['companion-sound','companionSound'],['track-audio','trackAudio'],['hide-pause','hidePause'],['hide-quick-allow','hideQuickAllow']])draft[key]=$(id).checked;
 for(const c of $('toggles').querySelectorAll('input'))draft.distractions[c.dataset.key]=c.checked;
 return validateSettings(draft);
}
$('language').addEventListener('change',()=>act(async()=>{
 const language=$('language').value;
 try{state=await send({type:'setLanguage',language,revision:draftRevision});}
 catch(error){$('language').value=draft.language;throw error;}
 draft.language=language;draftRevision=state.revision;setLanguage(language);renderGroups();renderBeneficial();
 [...$('days').children].forEach((label,i)=>label.lastChild.textContent=t(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]));
 [...$('toggles').children].forEach((label,i)=>label.lastChild.textContent=t(toggleNames[i]));renderSession();renderStats();notice('Language saved. Other changes still need Save settings.');
}));
$('add-group').addEventListener('click',()=>act(async()=>{
 const group={id:crypto.randomUUID(),name:$('group-name').value,enabled:true,patterns:lines($('group-patterns').value),budgetMs:Number($('group-minutes').value)*60000};
 const checked=validateSettings({...draft,groups:[...draft.groups,group]});draft.groups=checked.groups;renderGroups();$('group-name').value='';$('group-patterns').value='';notice('Group added to your draft. Save settings to apply it.');
}));
$('add-beneficial').addEventListener('click',()=>act(async()=>{
 const item={id:crypto.randomUUID(),name:$('beneficial-name').value,url:$('beneficial-url').value,enabled:true,targetMs:Number($('beneficial-minutes').value)*60000};
 const checked=validateSettings({...draft,beneficialPool:{policy:$('beneficial-policy').value,items:[...draft.beneficialPool.items,item]}});draft.beneficialPool=checked.beneficialPool;renderBeneficial();$('beneficial-name').value='';$('beneficial-url').value='';notice('Destination added to your draft. Save settings to apply it.');
}));
$('save').addEventListener('click',()=>act(async()=>{const settings=collect();state=await mutate(state,{type:'saveSettings',settings,revision:draftRevision});render();notice('Settings saved.');}));
$('start-focus').addEventListener('click',()=>act(async()=>{
 if(!$('focus-confirm').checked)throw Error('Confirm that the session cannot be canceled once active.');
 const startAt=$('focus-start').value?new Date($('focus-start').value).getTime():undefined;
 state=await mutate(state,{type:'startNuclear',mode:$('focus-mode').value,minutes:Number($('focus-minutes').value),startAt});renderSession();notice('Focus session committed using your saved rules.');
}));
$('cancel-focus').addEventListener('click',()=>act(async()=>{state=await mutate(state,{type:'cancelScheduledNuclear'});renderSession();notice('Scheduled session canceled.');}));
$('clear-stats').addEventListener('click',()=>act(async()=>{state=await mutate(state,{type:'clearStats'});renderStats();notice('Statistics cleared. Existing budgets and focus sessions are unchanged.');}));
$('refresh-stats').addEventListener('click',()=>act(async()=>{state=await send({type:'getState'});renderStats();renderSession();notice('Usage refreshed.');}));
$('stats-range').addEventListener('change',renderStats);
$('stats-metric').addEventListener('change',renderStats);
$('stats-view').addEventListener('change',renderStats);
$('export').addEventListener('click',()=>act(async()=>{
 const saved=await send({type:'getState'}),url=URL.createObjectURL(new Blob([JSON.stringify(saved.settings,null,2)],{type:'application/json'}));
 const a=element('a');a.href=url;a.download='open-stay-focused-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Saved settings exported.');
}));
$('import-file').addEventListener('change',()=>act(async()=>{
 const file=$('import-file').files[0];if(!file)return;
 try {if(file.size>262144)throw Error('Settings must be at most 256 KiB.');let input;try{input=JSON.parse(await file.text());}catch{throw Error('Invalid JSON file. Your settings were not changed.');}
 const settings=validateSettings(input);state=await mutate(state,{type:'saveSettings',settings,revision:draftRevision});render();notice('Settings imported.');
 } finally {$('import-file').value='';}
}));
$('stats-filter').addEventListener('change',renderStats);$('stats-search').addEventListener('input',renderStats);
$('export-csv').addEventListener('click',()=>act(async()=>{const url=URL.createObjectURL(new Blob([csvUsage(summary())],{type:'text/csv;charset=utf-8'})),a=element('a');a.href=url;a.download='open-stay-focused-usage.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
$('test-challenge').addEventListener('click',()=>act(async()=>{const preview=validateSettings({...state.settings,language:$('language').value,challengeText:$('challenge-text').value});await challengeIfNeeded({settings:preview},true);notice('Challenge completed.');}));
$('pause').addEventListener('click',()=>act(async()=>{state=await mutate(state,{type:'saveSettings',settings:{...state.settings,enabled:!state.settings.enabled},revision:state.revision});renderSession();notice('Settings saved.');}));
async function refresh(){if(!state||refreshing||acting)return;refreshing=true;try{const live=await send({type:'getLiveState'});state=live.state;renderSession();refreshPills();renderStats();}catch(e){notice(e.message,true);}finally{refreshing=false;}}
const liveTimer=setInterval(refresh,1000);addEventListener('pagehide',()=>clearInterval(liveTimer),{once:true});
act(async()=>{state=await send({type:'getState'});render();});

$('preview-companion').addEventListener('click',()=>OpenStayCompanion.show({level:50,groupName:t('A gentle otter reminder'),language:$('language').value,sound:$('companion-sound').checked,durationMs:10000}));
