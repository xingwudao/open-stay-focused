import {initialState,accountIntervalMany,pruneHistory} from './core/accounting.js';
import {validateSettings,challengeForLanguage} from './core/settings.js';
import {evaluate} from './core/policy.js';
import {assessChange,queueSettings} from './core/protections.js';
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function createController({storage,clock=Date.now}) {
  let state,queue=Promise.resolve();const tickets=new Map();
  const serial=fn=>{const next=queue.then(fn);queue=next.catch(()=>{});return next;};
  function settle(input,now){
    const previous=input.checkpoint;if(!previous)return structuredClone(input);
    const visits=previous.visits??(previous.eligible?[{url:previous.url,tabId:previous.tabId}]:[]);
    const next=accountIntervalMany(input,{visits,from:previous.at,to:now,eligible:previous.eligible??true});
    next.checkpoint={...previous,at:Math.max(now,previous.at)};return next;
  }
  function refreshCheckpoint(next,now){
    if(next.checkpoint){const cp=next.checkpoint;cp.visits=(cp.visits??(cp.eligible?[{url:cp.url,tabId:cp.tabId}]:[])).filter(v=>!evaluate(v.url,now,next).blocked);cp.eligible=cp.visits.length>0;}
    return next;
  }
  async function load(){
    const original=state??await storage.get()??initialState();
    if(original.version!==1)throw Error('Unsupported saved state version.');
    const current=structuredClone(original);current.settings=validateSettings(current.settings);
    // Session continuity is valid only with its session-scoped interval checkpoint.
    // Durable totals can survive a full browser restart; activeHosts must not.
    const cp=current.checkpoint;
    const validCheckpoint=cp&&Number.isFinite(cp.at)&&(Array.isArray(cp.visits)?cp.visits.every(v=>v&&typeof v.url==='string'):typeof cp.url==='string');
    if(!validCheckpoint){current.checkpoint=null;current.activeHosts=[];}
    let clean=pruneHistory(current,clock());
    const due=['intervals','resetMinute'].filter(key=>clean.pending?.[key]?.applyAt<=clock()).sort((a,b)=>clean.pending[a].applyAt-clean.pending[b].applyAt);
    if(due.length&&clean.checkpoint&&clock()-clean.checkpoint.at>15000)clean=settle(clean,clock());
    for(const key of due){
      clean=settle(clean,clean.pending[key].applyAt);
      if(key==='intervals')clean.settings.schedule.intervals=structuredClone(clean.pending[key].value);else clean.settings.resetMinute=clean.pending[key].value;
      const appliedAt=clean.pending[key].applyAt;delete clean.pending[key];clean.revision++;refreshCheckpoint(clean,appliedAt);
    }
    if(due.length)clean=settle(clean,clock());
    if(canonical(original)!==canonical(clean))await storage.set(clean);
    state=clean;return state;
  }
  async function commit(next){await storage.set(next);state=next;return structuredClone(state);}
  const snapshot=()=>serial(async()=>structuredClone(await load()));
  function normalize(cmd,current,now){
    if(!['saveSettings','startNuclear','cancelScheduledNuclear','clearStats'].includes(cmd?.type))throw Error('Unknown command.');
    if(cmd.type==='saveSettings'){
      if(cmd.revision!==current.revision)throw Error('Settings changed in another page. Reload before saving.');
      return {type:cmd.type,settings:validateSettings(cmd.settings),revision:cmd.revision};
    }
    if(cmd.type==='startNuclear'){
      if(!['all','exceptAllowed','blocked'].includes(cmd.mode)||!Number.isInteger(cmd.minutes)||cmd.minutes<1||cmd.minutes>1440)throw Error('Choose a mode and 1–1,440 minutes.');
      if(cmd.startAt!=null&&(!Number.isFinite(cmd.startAt)||cmd.startAt<now-60000||cmd.startAt>now+365*86400000))throw Error('Choose a start time within the next year.');
      return {type:cmd.type,mode:cmd.mode,minutes:cmd.minutes,...(cmd.startAt!=null?{startAt:cmd.startAt}:{})};
    }
    return {type:cmd.type};
  }
  function getTicket(id,current,now){const ticket=tickets.get(id);if(!ticket||ticket.expiresAt<=now||ticket.revision!==current.revision)throw Error('Confirmation expired or settings changed. Prepare this change again.');return ticket;}
  const handle=(cmd,context)=>serial(async()=>{
    if(!context?.trustedUI)throw Error('A trusted extension page is required.');
    const loaded=await load(),now=clock();
    if(cmd?.type==='getState')return structuredClone(loaded);
    if(cmd?.type==='setLanguage'){
      if(cmd.revision!==loaded.revision)throw Error('Settings changed in another page. Reload before saving.');
      const next=structuredClone(loaded);
      next.settings=validateSettings({...next.settings,language:cmd.language});
      next.revision++;return commit(next);
    }
    const current=settle(loaded,now);
    for(const [id,t] of tickets)if(t.expiresAt<=now||t.revision!==current.revision)tickets.delete(id);
    if(cmd?.type==='confirmChange'){
      const ticket=getTicket(cmd.ticket,current,now);ticket.confirmed=Math.min(ticket.steps,ticket.confirmed+1);
      return {confirmed:ticket.confirmed,steps:ticket.steps};
    }
    const operation=normalize(cmd?.type==='prepareChange'?cmd.operation:cmd,current,now),assessment=assessChange(current,operation,now);
    if(cmd.type==='prepareChange'){
      const ticket=assessment.steps?crypto.randomUUID():null;
      if(ticket){if(tickets.size>=100)tickets.delete(tickets.keys().next().value);tickets.set(ticket,{operation:canonical(operation),revision:current.revision,steps:assessment.steps,confirmed:0,expiresAt:now+300000});}
      return {ticket,...assessment};
    }
    if(assessment.steps){const ticket=getTicket(cmd.ticket,current,now);if(ticket.operation!==canonical(operation)||ticket.steps!==assessment.steps||ticket.confirmed!==ticket.steps)throw Error('Complete every confirmation before applying this change.');}
    if(assessment.challengeRequired&&cmd.challenge!==challengeForLanguage(current.settings.language,current.settings.challengeText))throw Error('Complete the typing challenge first.');
    let next=structuredClone(current);
    if(operation.type==='saveSettings'){next=queueSettings(current,operation.settings,now);next.revision++;}
    else if(operation.type==='startNuclear'){const startAt=Math.max(now,operation.startAt??now);next.nuclear={startAt,endAt:startAt+operation.minutes*60000,mode:operation.mode,policySnapshot:structuredClone(current.settings)};}
    else if(operation.type==='cancelScheduledNuclear')next.nuclear=null;
    else {next.stats={};next.sessionCounts={};next.hourly={};}
    refreshCheckpoint(next,now);
    const result=await commit(next);if(cmd.ticket)tickets.delete(cmd.ticket);return result;
  });
  const tick=input=>serial(async()=>{
    const current=await load(),now=input.now??clock(),previous=current.checkpoint;
    const visits=previous?.visits??(previous?.eligible?[{url:previous.url,tabId:previous.tabId}]:[]);
    const next=previous?accountIntervalMany(current,{visits,from:previous.at,to:now,eligible:previous.eligible??true}):structuredClone(current);
    const decision=evaluate(input.url,now,next);
    const candidates=input.visits??(input.eligible?[{url:input.url,tabId:input.tabId}]:[]);
    next.checkpoint={at:Math.max(now,previous?.at??now),tabId:input.tabId??null,url:input.url??'',eligible:input.visits?true:!!input.eligible&&!decision.blocked,visits:candidates.filter(v=>!evaluate(v.url,now,next).blocked).map(v=>({url:v.url,tabId:v.tabId??null}))};
    await commit(next);return decision;
  });
  return {snapshot,handle,tick};
}
