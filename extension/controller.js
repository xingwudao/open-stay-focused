import {initialState,accountInterval,pruneHistory} from './core/accounting.js';
import {validateSettings,challengeForLanguage} from './core/settings.js';
import {activeNuclear,evaluate} from './core/policy.js';
export function createController({storage,clock=Date.now}) {
  let state,queue=Promise.resolve();
  const serial=fn=>{const next=queue.then(fn);queue=next.catch(()=>{});return next;};
  async function load(){
    const current=state??await storage.get()??initialState();
    if(current.version!==1)throw Error('Unsupported saved state version.');
    const migrated=!Object.hasOwn(current.settings,'language');
    if(!state)current.settings=validateSettings(current.settings);
    const clean=pruneHistory(current,clock());
    const changed=['stats','usage'].some(k=>Object.keys(clean[k]).length!==Object.keys(current[k]).length);
    if(changed||migrated)await storage.set(clean);
    state=clean;return state;
  }
  async function commit(next){await storage.set(next);state=next;return structuredClone(state);}
  const snapshot=()=>serial(async()=>structuredClone(await load()));
  const handle=(cmd,context)=>serial(async()=>{
    if(!context?.trustedUI)throw Error('A trusted extension page is required.');
    const current=await load(),now=clock();
    if(cmd?.type==='getState')return structuredClone(current);
    if(!['saveSettings','startNuclear','cancelScheduledNuclear','clearStats'].includes(cmd?.type))throw Error('Unknown command.');
    if(current.settings.challengeEnabled&&cmd.challenge!==challengeForLanguage(current.settings.language))throw Error('Complete the typing challenge first.');
    if(activeNuclear(current,now)&&cmd.type!=='clearStats')throw Error('A nuclear session is active. Settings are locked until it ends.');
    const next=structuredClone(current);
    if(cmd.type==='saveSettings') {
      if(cmd.revision!==current.revision)throw Error('Settings changed in another page. Reload before saving.');
      next.settings=validateSettings(cmd.settings);
    } else if(cmd.type==='startNuclear') {
      if(!['all','exceptAllowed','blocked'].includes(cmd.mode)||!Number.isInteger(cmd.minutes)||cmd.minutes<1||cmd.minutes>1440)throw Error('Choose a mode and 1–1,440 minutes.');
      const startAt=cmd.startAt??now;
      if(!Number.isFinite(startAt)||startAt<now-60000||startAt>now+365*86400000)throw Error('Choose a start time within the next year.');
      next.nuclear={startAt:Math.max(now,startAt),endAt:Math.max(now,startAt)+cmd.minutes*60000,mode:cmd.mode,policySnapshot:structuredClone(current.settings)};
    } else if(cmd.type==='cancelScheduledNuclear') next.nuclear=null;
    else if(cmd.type==='clearStats')next.stats={};
    if(cmd.type==='saveSettings')next.revision++;return commit(next);
  });
  const tick=input=>serial(async()=>{
    const current=await load(),now=input.now??clock(),previous=current.checkpoint;
    let next=previous?accountInterval(current,{url:previous.url,from:previous.at,to:now,eligible:previous.eligible}):structuredClone(current);
    const decision=evaluate(input.url,now,next);
    next.checkpoint={at:Math.max(now,previous?.at??now),tabId:input.tabId??null,url:input.url??'',eligible:!!input.eligible&&!decision.blocked};
    await commit(next);return decision;
  });
  return {snapshot,handle,tick};
}
