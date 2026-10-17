import {parsePattern} from './patterns.js';
export const CHALLENGE = 'My attention belongs to me. I choose this change deliberately, and I accept the time it will cost.';
export const challengeForLanguage = language => language === 'zh-CN' ? '我的注意力属于自己。我认真决定这次修改，并愿意承担它所花费的时间。' : CHALLENGE;
export const DISTRACTIONS = ['youtubeShorts','youtubeRecommendations','youtubeComments','instagramReels','facebookReels','xTrends','tiktokRecommendations'];
export function defaultSettings() {
  return {schemaVersion:1,language:'en',groups:[],allowlist:[],schedule:{days:[0,1,2,3,4,5,6],intervals:[[0,1440]]},resetMinute:0,challengeEnabled:false,distractions:Object.fromEntries(DISTRACTIONS.map(k=>[k,false]))};
}
const fail = (message) => { throw new Error(message); };
function keys(o, allowed) {
  if (!o || typeof o !== 'object' || Array.isArray(o) || Object.keys(o).some(k=>!allowed.includes(k)) || allowed.some(k=>!Object.hasOwn(o,k))) fail('Unexpected or missing settings fields.');
}
const integer = (v,min,max) => Number.isInteger(v) && v>=min && v<=max;
function patterns(list) {
  if (!Array.isArray(list) || list.length>1000) fail('Too many patterns.');
  return [...new Set(list.map(p=>{const n=parsePattern(p);return n.host+(n.path??'');}))];
}
export function validateSettings(input) {
  if (new TextEncoder().encode(JSON.stringify(input)).length>262144) fail('Settings must be at most 256 KiB.');
  if(input && typeof input === 'object' && !Array.isArray(input) && !Object.hasOwn(input,'language')) input={...input,language:'en'};
  keys(input,['language','schemaVersion','groups','allowlist','schedule','resetMinute','challengeEnabled','distractions']);
  if (!['en','zh-CN'].includes(input.language)) fail('Unsupported language.');
  if (input.schemaVersion!==1) fail('Unsupported settings version.');
  if (!Array.isArray(input.groups) || input.groups.length>100) fail('Use at most 100 groups.');
  const ids=new Set();
  const groups=input.groups.map(g=>{
    keys(g,['id','name','enabled','patterns','budgetMs']);
    if(typeof g.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(g.id)||ids.has(g.id)) fail('Group IDs must be unique.');
    ids.add(g.id);
    if(typeof g.name!=='string'||!g.name.trim()||g.name.length>80) fail('Group names need 1–80 characters.');
    if(typeof g.enabled!=='boolean'||!integer(g.budgetMs,0,86400000)) fail('Daily budget must be between 0 and 24 hours.');
    return {...g,name:g.name.trim(),patterns:patterns(g.patterns)};
  });
  const allowlist=patterns(input.allowlist);
  if(groups.reduce((n,g)=>n+g.patterns.length,allowlist.length)>1000) fail('Use at most 1,000 patterns in total.');
  keys(input.schedule,['days','intervals']);
  const {days,intervals}=input.schedule;
  if(!Array.isArray(days)||days.length>7||new Set(days).size!==days.length||days.some(d=>!integer(d,0,6))) fail('Invalid active days.');
  if(!Array.isArray(intervals)||intervals.length>24||intervals.some(i=>!Array.isArray(i)||i.length!==2||!integer(i[0],0,1439)||!integer(i[1],0,1440)||i[0]===i[1])) fail('Invalid active hours.');
  if(!integer(input.resetMinute,0,1439)||typeof input.challengeEnabled!=='boolean') fail('Invalid reset time or challenge setting.');
  keys(input.distractions,DISTRACTIONS);
  if(Object.values(input.distractions).some(x=>typeof x!=='boolean')) fail('Invalid distraction toggle.');
  return structuredClone({...input,groups,allowlist});
}
