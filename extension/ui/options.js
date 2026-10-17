import {CHALLENGE,DISTRACTIONS,validateSettings} from '../core/settings.js';
import {budgetDay,localDay,activeNuclear} from '../core/policy.js';
import {$,send,duration,notice,clearNotice,challengeIfNeeded,element} from './shared.js';
let state,draft;
const lines=value=>value.split('\n').map(x=>x.trim()).filter(Boolean);
const timeText=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
function parseTime(text,allow24=false){if(!/^\d{2}:\d{2}$/.test(text))throw Error('Use times in HH:MM format.');const [h,m]=text.split(':').map(Number);if(m>59||h>23&&!(allow24&&h===24&&m===0))throw Error('Invalid time.');return h*60+m;}
async function act(fn){clearNotice();try{await fn();}catch(e){notice(e.message,true);}}
function renderGroups(){
 const root=$('groups');root.replaceChildren();
 if(!draft.groups.length)root.append(element('p','No groups yet. Start with one website you want more distance from.','empty'));
 for(const g of draft.groups){
  const card=element('div',undefined,'card group-card'),heading=element('div',undefined,'section-top');
  heading.append(element('h3',g.name),element('span',duration(Math.max(0,g.budgetMs-(Object.hasOwn(state.usage[budgetDay(Date.now(),draft.resetMinute)]??{},g.id)?state.usage[budgetDay(Date.now(),draft.resetMinute)][g.id]:0)))+' left','pill'));card.append(heading);
  const label=element('label','Enabled','check'),check=element('input');check.type='checkbox';check.checked=g.enabled;check.addEventListener('change',()=>g.enabled=check.checked);label.prepend(check);card.append(label);
  for(const [text,key,type,value] of [['Name','name','text',g.name],['Minutes per day','budgetMs','number',g.budgetMs/60000]]){
   const l=element('label',text),input=element('input');input.type=type;input.value=value;
   if(type==='number'){input.min='0';input.max='1440';input.step='1';}else input.maxLength=80;
   input.addEventListener('input',()=>g[key]=key==='budgetMs'?Number(input.value)*60000:input.value);l.append(input);card.append(l);
  }
  const l=element('label','Patterns'),ta=element('textarea');ta.rows=3;ta.value=g.patterns.join('\n');ta.addEventListener('input',()=>g.patterns=lines(ta.value));l.append(ta);card.append(l);
  const remove=element('button','Remove group','quiet');remove.addEventListener('click',()=>{draft.groups=draft.groups.filter(x=>x.id!==g.id);renderGroups();});card.append(remove);root.append(card);
 }
}
const toggleNames=['YouTube · Shorts','YouTube · Recommendations','YouTube · Comments','Instagram · Reels links','Facebook · Reels links','X · Trending topics','TikTok · Recommendations'];
function render(){
 draft=structuredClone(state.settings);renderGroups();$('allowlist').value=draft.allowlist.join('\n');$('days').replaceChildren();
 ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((name,day)=>{const l=element('label',name,'day');const c=element('input');c.type='checkbox';c.value=day;c.checked=draft.schedule.days.includes(day);l.prepend(c);$('days').append(l);});
 $('intervals').value=draft.schedule.intervals.map(([a,b])=>`${timeText(a)}-${timeText(b)}`).join('\n');$('reset').value=timeText(draft.resetMinute);$('challenge-enabled').checked=draft.challengeEnabled;
 $('toggles').replaceChildren();DISTRACTIONS.forEach((key,i)=>{const l=element('label',toggleNames[i],'check'),c=element('input');c.type='checkbox';c.dataset.key=key;c.checked=draft.distractions[key];l.prepend(c);$('toggles').append(l);});
 renderSession();renderStats();
}
function renderSession(){
 const n=state.nuclear,active=activeNuclear(state,Date.now()),pending=n&&Date.now()<n.startAt;
 $('session-banner').hidden=!active&&!pending;
 if(active||pending)$('session-banner').textContent=active?`Focus session active · ${duration(n.endAt-Date.now())} remaining. Settings are locked.`:`Focus session scheduled for ${new Date(n.startAt).toLocaleString()}.`;
 $('save').disabled=!!active;$('start-focus').disabled=!!active;$('cancel-focus').disabled=!pending;
}
function renderStats(){
 const totals=Object.create(null);for(const [day,values] of Object.entries(state.stats))if($('stats-range').value==='all'||day===localDay(Date.now()))for(const [host,ms] of Object.entries(values))totals[host]=(totals[host]??0)+ms;
 const root=$('stats');root.replaceChildren();const rows=Object.entries(totals).sort((a,b)=>b[1]-a[1]);
 if(!rows.length)root.append(element('p','Nothing recorded yet. A little breathing room.','empty'));
 for(const [host,ms] of rows){const row=element('div',undefined,'stat-row');row.append(element('span',host),element('strong',duration(ms)));root.append(row);}
}
function collect(){
 draft.allowlist=lines($('allowlist').value);draft.schedule.days=[...$('days').querySelectorAll('input:checked')].map(e=>Number(e.value));
 draft.schedule.intervals=lines($('intervals').value).map(line=>{const parts=line.split('-');if(parts.length!==2)throw Error('Use time windows like 09:00-17:00.');return [parseTime(parts[0].trim()),parseTime(parts[1].trim(),true)];});
 draft.resetMinute=parseTime($('reset').value);draft.challengeEnabled=$('challenge-enabled').checked;
 for(const c of $('toggles').querySelectorAll('input'))draft.distractions[c.dataset.key]=c.checked;
 return validateSettings(draft);
}
$('add-group').addEventListener('click',()=>act(async()=>{
 const group={id:crypto.randomUUID(),name:$('group-name').value,enabled:true,patterns:lines($('group-patterns').value),budgetMs:Number($('group-minutes').value)*60000};
 const checked=validateSettings({...draft,groups:[...draft.groups,group]});draft.groups=checked.groups;renderGroups();$('group-name').value='';$('group-patterns').value='';notice('Group added to your draft. Save settings to apply it.');
}));
$('save').addEventListener('click',()=>act(async()=>{const settings=collect(),challenge=await challengeIfNeeded(state);state=await send({type:'saveSettings',settings,revision:state.revision,challenge});render();notice('Settings saved.');}));
$('start-focus').addEventListener('click',()=>act(async()=>{
 if(!$('focus-confirm').checked)throw Error('Confirm that the session cannot be canceled once active.');
 const challenge=await challengeIfNeeded(state),startAt=$('focus-start').value?new Date($('focus-start').value).getTime():undefined;
 state=await send({type:'startNuclear',mode:$('focus-mode').value,minutes:Number($('focus-minutes').value),startAt,challenge});renderSession();notice('Focus session committed using your saved rules.');
}));
$('cancel-focus').addEventListener('click',()=>act(async()=>{state=await send({type:'cancelScheduledNuclear',challenge:await challengeIfNeeded(state)});renderSession();notice('Scheduled session canceled.');}));
$('clear-stats').addEventListener('click',()=>act(async()=>{state=await send({type:'clearStats',challenge:await challengeIfNeeded(state)});renderStats();notice('Statistics cleared. Existing budgets and focus sessions are unchanged.');}));
$('refresh-stats').addEventListener('click',()=>act(async()=>{state=await send({type:'getState'});renderStats();renderSession();notice('Usage refreshed.');}));
$('stats-range').addEventListener('change',renderStats);
$('export').addEventListener('click',()=>act(async()=>{
 const saved=await send({type:'getState'}),url=URL.createObjectURL(new Blob([JSON.stringify(saved.settings,null,2)],{type:'application/json'}));
 const a=element('a');a.href=url;a.download='open-stay-focused-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Saved settings exported.');
}));
$('import-file').addEventListener('change',()=>act(async()=>{
 const file=$('import-file').files[0];if(!file)return;
 try {if(file.size>262144)throw Error('Settings must be at most 256 KiB.');let input;try{input=JSON.parse(await file.text());}catch{throw Error('Invalid JSON file. Your settings were not changed.');}
 const settings=validateSettings(input),challenge=await challengeIfNeeded(state);state=await send({type:'saveSettings',settings,revision:state.revision,challenge});render();notice('Settings imported.');
 } finally {$('import-file').value='';}
}));
setInterval(()=>{if(state)renderSession();},1000);
act(async()=>{state=await send({type:'getState'});render();});
