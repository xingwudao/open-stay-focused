function normalized(value){
 try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol))return null;url.hash='';return url;}catch{return null;}
}
function pick(items,random){
 const value=random();const scaled=Number.isFinite(value)?Math.floor(value*items.length):0;
 return items[Math.max(0,Math.min(items.length-1,scaled))];
}
export function matchesBeneficialHost(value,itemUrl){
 const url=normalized(value),target=normalized(itemUrl);if(!url||!target)return false;
 return url.hostname===target.hostname||url.hostname.endsWith(`.${target.hostname}`);
}
export function selectBeneficialDestination({pool,usage={},currentUrl,isEligible,random=Math.random}){
 const current=normalized(currentUrl)?.toString();
 const candidates=[];
 for(const item of pool.items){
  if(!item.enabled)continue;
  const url=normalized(item.url)?.toString();
  if(!url||url===current||!isEligible(item))continue;
  const usedMs=Object.hasOwn(usage,item.id)?usage[item.id]:0;
  candidates.push({id:item.id,name:item.name,url,targetMs:item.targetMs,usedMs,remainingMs:Math.max(0,item.targetMs-usedMs)});
 }
 if(!candidates.length)return null;
 if(pool.policy==='random')return pick(candidates,random);
 const largest=Math.max(...candidates.map(item=>item.remainingMs));
 return pick(candidates.filter(item=>item.remainingMs===largest),random);
}
