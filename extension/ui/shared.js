import {t} from './i18n.js';
import {challengeForLanguage} from '../core/settings.js';
export const $=id=>document.getElementById(id);
export async function send(command){const r=await chrome.runtime.sendMessage(command);if(!r?.ok)throw Error(r?.error??'Extension is unavailable. Reload this page.');return r.data;}
export const duration=ms=>{if(ms===null||ms===undefined)return t('No limit');const seconds=Math.max(0,Math.ceil(ms/1000));return t('{minutes}m {seconds}s',{minutes:Math.floor(seconds/60),seconds:String(seconds%60).padStart(2,'0')});};
export function notice(message,error=false){const el=$(error?'error':'status');el.textContent=t(message);el.hidden=!message;}
export function clearNotice(){notice('');notice('',true);}
export async function challengeIfNeeded(state){
 if(!state.settings.challengeEnabled)return undefined;
 const CHALLENGE=challengeForLanguage(state.settings.language);
 const dialog=$('challenge-dialog');$('challenge-phrase').textContent=CHALLENGE;$('challenge-input').value='';$('challenge-error').textContent='';
 dialog.showModal();$('challenge-input').focus();
 return new Promise((resolve,reject)=>{
  const cancel=()=>{cleanup();dialog.close();reject(Error('Change canceled.'));};
  const confirm=()=>{if($('challenge-input').value!==CHALLENGE){$('challenge-error').textContent=t('Type the sentence exactly before confirming.');return;}cleanup();dialog.close();resolve(CHALLENGE);};
  const onCancel=e=>{e.preventDefault();cancel();};
  const cleanup=()=>{$('challenge-cancel').removeEventListener('click',cancel);$('challenge-confirm').removeEventListener('click',confirm);dialog.removeEventListener('cancel',onCancel);};
  $('challenge-cancel').addEventListener('click',cancel);$('challenge-confirm').addEventListener('click',confirm);dialog.addEventListener('cancel',onCancel);
 });
}
$('challenge-input')?.addEventListener('paste',e=>e.preventDefault());
$('challenge-input')?.addEventListener('drop',e=>e.preventDefault());
export function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
