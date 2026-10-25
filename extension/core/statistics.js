import {localDay} from './policy.js';
import {matchesAny} from './patterns.js';

// History stores hostnames only. Path-specific policy cannot classify an entire
// hostname; filters intentionally classify its root URL using the saved rules.
function matchesFilter(host,filter,settings){
  if(filter==='all')return true;
  if(filter==='local')return host==='file://';
  if(host==='file://')return false;
  const url=`https://${host}/`,allowed=matchesAny(url,settings.allowlist);
  if(filter==='allowed')return allowed;
  return !allowed&&settings.groups.some(g=>g.enabled&&matchesAny(url,g.patterns));
}
export function summarizeUsage(state,{range='today',now=Date.now(),filter='all',search=''}={}){
  const count=range==='today'?1:range==='week'?7:30,days=[];
  for(let i=count-1;i>=0;i--){const day=new Date(now);day.setDate(day.getDate()-i);days.push(localDay(day.getTime()));}
  const found=new Map(),hourly=Array(24).fill(0),daily=new Map(days.map(day=>[day,{label:day,ms:0,sessions:0}])),query=search.trim().toLowerCase();
  for(const day of days){const stats=state.stats?.[day]??{},counts=state.sessionCounts?.[day]??{};
    for(const host of new Set([...Object.keys(stats),...Object.keys(counts)])){
      if(!(host==='file://'?'file:// local files 本地文件':host.toLowerCase()).includes(query)||!matchesFilter(host,filter,state.settings))continue;
      const ms=Number.isFinite(stats[host])?Math.max(0,stats[host]):0,sessions=Number.isFinite(counts[host])?Math.max(0,counts[host]):0;
      const row=found.get(host)??{host,ms:0,sessions:0};row.ms+=ms;row.sessions+=sessions;found.set(host,row);daily.get(day).ms+=ms;daily.get(day).sessions+=sessions;
      const values=state.hourly?.[day]?.[host];if(Array.isArray(values))for(let h=0;h<24;h++)if(Number.isFinite(values[h]))hourly[h]+=Math.max(0,values[h]);
    }
  }
  const rows=[...found.values()].sort((a,b)=>b.ms-a.ms||a.host.localeCompare(b.host));
  const hourlySeries=hourly.map((ms,h)=>({label:`${String(h).padStart(2,'0')}:00`,ms})),dailySeries=[...daily.values()],hourlyTotalMs=hourly.reduce((sum,ms)=>sum+ms,0);
  return {daily:dailySeries,hourly:hourlySeries,hourlyTotalMs,peakHour:hourlyTotalMs?hourly.indexOf(Math.max(...hourly)):null,rows,totalMs:rows.reduce((n,r)=>n+r.ms,0),totalSessions:rows.reduce((n,r)=>n+r.sessions,0),series:range==='today'?hourlySeries:dailySeries,days};
}
export function csvUsage(summary){
  const cell=value=>{let text=String(value);if(/^[\s]*[=+@-]/u.test(text)||/^[\t\r\n]/u.test(text))text=`'${text}`;return `"${text.replaceAll('"','""')}"`;};
  return 'Host,Duration seconds,Sessions\r\n'+summary.rows.map(row=>`${cell(row.host)},${row.ms/1000},${row.sessions}`).join('\r\n')+'\r\n';
}
