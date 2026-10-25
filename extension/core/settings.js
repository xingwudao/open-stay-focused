import {parsePattern} from './patterns.js';
export const CHALLENGE = 'My attention belongs to me. I choose this change deliberately, and I accept the time it will cost. Before changing a boundary, I will name the task I intended to finish and consider whether this change helps that task. A passing impulse does not need an immediate answer. I can pause, breathe, and return to one useful action. If I still continue, I take responsibility for this decision and for the time I will spend after it.';
export const challengeForLanguage = (language,customText='') => customText || (language === 'zh-CN' ? '我的注意力属于自己。我认真决定这次修改，并愿意承担它所花费的时间。在改变已经设定的边界之前，我会先想清楚，原本准备完成的事情是什么，这次调整是否真的能够帮助我完成它。一时产生的冲动，不需要立刻得到回应。我可以停下来，放慢呼吸，把目光从屏幕移开，再选择一个有用的小行动。时间不会因为我暂时忘记目标而停止流逝，已经做出的承诺也值得被认真对待。如果此刻的困难来自疲惫，我可以休息；如果来自任务不清楚，我可以把下一步写下来。我不必通过打开更多网页来逃避这些感受。完成这段文字以后，如果我仍然决定修改设置，我会承认这是自己的选择，并对接下来如何使用时间负责。我会重新安排工作与休息，让今天剩余的时间服务于真正重要的事情，而不是只追随眼前最容易得到的刺激。' : CHALLENGE);
export const DISTRACTIONS = ['youtubeShorts','youtubeRecommendations','youtubeComments','instagramReels','facebookReels','xTrends','tiktokRecommendations'];
export function defaultSettings() {
  return {schemaVersion:2,language:'en',companionEnabled:true,companionSound:true,enabled:true,showTimer:false,trackAudio:false,hidePause:true,hideQuickAllow:true,challengeText:'',groups:[],allowlist:[],schedule:{days:[0,1,2,3,4,5,6],intervals:[[0,1440]]},resetMinute:180,challengeEnabled:true,distractions:Object.fromEntries(DISTRACTIONS.map(k=>[k,false]))};
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
  if(input && typeof input==='object' && !Array.isArray(input))input={companionEnabled:true,companionSound:true,...input};
  if(input?.schemaVersion===1){
    keys(input,['companionEnabled','companionSound','language','schemaVersion','groups','allowlist','schedule','resetMinute','challengeEnabled','distractions']);
    if(typeof input.challengeEnabled!=='boolean')fail('Invalid reset time or challenge setting.');
    input={...defaultSettings(),...input,schemaVersion:2,challengeEnabled:true};
  }
  keys(input,['companionEnabled','companionSound','enabled','showTimer','trackAudio','hidePause','hideQuickAllow','challengeText','language','schemaVersion','groups','allowlist','schedule','resetMinute','challengeEnabled','distractions']);
  if (!['en','zh-CN'].includes(input.language)) fail('Unsupported language.');
  if (input.schemaVersion!==2) fail('Unsupported settings version.');
  if (!Array.isArray(input.groups) || input.groups.length>100) fail('Use at most 100 groups.');
  if(['companionEnabled','companionSound','enabled','showTimer','trackAudio','hidePause','hideQuickAllow'].some(k=>typeof input[k]!=='boolean'))fail('Invalid protection setting.');
  if(typeof input.challengeText!=='string')fail('Invalid challenge text.');
  const challengeText=input.challengeText.normalize('NFC').replace(/\s+/gu,' ').trim();
  if(input.challengeText!=='' && (Array.from(challengeText).length<250||new Set(Array.from(challengeText)).size<5))fail('Custom challenge needs 250 characters and 5 distinct characters.');
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
  return structuredClone({...input,groups,allowlist,challengeText});
}
