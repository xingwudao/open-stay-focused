import {t} from './i18n.js';
import {challengeForLanguage} from '../core/settings.js';
export const $=id=>document.getElementById(id);
export async function send(command){const r=await chrome.runtime.sendMessage(command);if(!r?.ok)throw Error(r?.error??'Extension is unavailable. Reload this page.');return r.data;}
export const duration=ms=>{if(ms===null||ms===undefined)return t('No limit');const seconds=Math.max(0,Math.ceil(ms/1000));return t('{minutes}m {seconds}s',{minutes:Math.floor(seconds/60),seconds:String(seconds%60).padStart(2,'0')});};
export function notice(message,error=false){const el=$(error?'error':'status');el.textContent=t(message);el.hidden=!message;}
export function clearNotice(){notice('');notice('',true);}
export async function challengeIfNeeded(state,force=false){
 if(!force&&!state.settings.challengeEnabled)return undefined;
 const CHALLENGE=challengeForLanguage(state.settings.language,state.settings.challengeText);
 const dialog=$('challenge-dialog'),input=$('challenge-input');$('challenge-phrase').textContent=CHALLENGE;input.value='';$('challenge-error').textContent='';
 dialog.showModal();input.focus();
 return new Promise((resolve,reject)=>{
  let previous='',composing=false;
  const reset=()=>{input.value='';previous='';$('challenge-error').textContent=t('Typing restarted. Enter the text without mistakes, deletion or pasting.');};
  const check=()=>{if(composing)return;const value=input.value.normalize('NFC');if(value.length<previous.length||!CHALLENGE.startsWith(value))reset();else{previous=value;input.value=value;}};
  const before=e=>{if(e.inputType?.startsWith('delete')||e.inputType==='insertFromPaste'||e.inputType==='insertFromDrop'){e.preventDefault();reset();}};
  const paste=e=>{e.preventDefault();reset();};
  const start=()=>{composing=true;};const end=()=>{composing=false;check();};
  const cancel=()=>{cleanup();dialog.close();reject(Error('Change canceled.'));};
  const confirm=()=>{if(composing||input.value!==CHALLENGE){$('challenge-error').textContent=t('Type the sentence exactly before confirming.');return;}cleanup();dialog.close();resolve(CHALLENGE);};
  const onCancel=e=>{e.preventDefault();cancel();};
  const handlers={beforeinput:before,input:check,paste,drop:paste,compositionstart:start,compositionend:end};
  const cleanup=()=>{for(const [event,fn] of Object.entries(handlers))input.removeEventListener(event,fn);$('challenge-cancel').removeEventListener('click',cancel);$('challenge-confirm').removeEventListener('click',confirm);dialog.removeEventListener('cancel',onCancel);};
  for(const [event,fn] of Object.entries(handlers))input.addEventListener(event,fn);
  $('challenge-cancel').addEventListener('click',cancel);$('challenge-confirm').addEventListener('click',confirm);dialog.addEventListener('cancel',onCancel);
 });
}
async function confirmStep(step,total,explanation){
 const dialog=document.createElement('dialog'),heading=element('h2',t('Confirm change {step} of {total}',{step,total})),description=element('p',explanation),yes=element('button',t('Continue')),no=element('button',t('Cancel'),'secondary');
 const stage=element('p',step===total?t('This is the last confirmation. Continuing applies the change after any required typing challenge.'):step===1?t('Review the consequences before beginning these confirmations.'):t('{remaining} confirmations remain, including this one. You can still cancel.',{remaining:total-step+1}));
 dialog.append(heading,description,stage,yes,no);document.body.append(dialog);dialog.showModal();
 return new Promise((resolve,reject)=>{const finish=ok=>{dialog.close();dialog.remove();ok?resolve():reject(Error('Change canceled.'));};yes.addEventListener('click',()=>finish(true),{once:true});no.addEventListener('click',()=>finish(false),{once:true});dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false);},{once:true});});
}
export async function mutate(state,operation){
 const prepared=await send({type:'prepareChange',operation});
 const reasons=[];if(operation.type==='saveSettings'){const next=operation.settings,old=state.settings;if(old.enabled&&!next.enabled)reasons.push(t('Pausing stops ordinary website restrictions until you resume them.'));if(old.groups.some(g=>!next.groups.some(n=>n.id===g.id)))reasons.push(t('Deleting a group removes its website restrictions.'));if(old.groups.some(g=>next.groups.some(n=>n.id===g.id&&n.budgetMs>g.budgetMs)))reasons.push(t(prepared.steps===8?'At most three minutes remain. Increasing the allowance gives these websites more time today.':'Increasing the allowance gives these websites more time today.'));if(old.groups.some(g=>next.groups.some(n=>n.id===g.id&&n.budgetMs<g.budgetMs)))reasons.push(t('Reducing this allowance can block matching websites immediately.'));}
 const explanation=reasons.join(' ')||t('This change affects your boundaries. Review its consequences before continuing.');
 for(let i=1;i<=prepared.steps;i++){await confirmStep(i,prepared.steps,explanation);await send({type:'confirmChange',ticket:prepared.ticket});}
 const challenge=prepared.challengeRequired?await challengeIfNeeded(state,true):undefined;
 return send({...operation,ticket:prepared.ticket,challenge});
}
export function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
