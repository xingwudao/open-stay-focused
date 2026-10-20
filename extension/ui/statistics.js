import {$,element,duration} from './shared.js';
import {t,getLanguage} from './i18n.js';
const colors=['#337868','#bd773f','#677cb0','#9a647e','#84954a','#777d79'];
let lastRender='';
const valueText=(value,metric)=>metric==='ms'?duration(value):t('{count} sessions',{count:value});
function svgElement(tag,attrs={},text){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);if(text!==undefined)el.textContent=text;return el;}
function lineChart(points,metric){
 const svg=svgElement('svg',{viewBox:'0 0 640 230',role:'img','aria-label':t('Usage over time')}),max=Math.max(1,...points.map(p=>p[metric]));
 const x=i=>points.length===1?350:76+i*548/(points.length-1),y=v=>182-v/max*152;
 for(const value of new Set([0,.5,1].map(fraction=>metric==='sessions'?Math.round(max*fraction):max*fraction))){
  svg.append(svgElement('line',{x1:76,x2:624,y1:y(value),y2:y(value),stroke:'#dbe1d5'}),svgElement('text',{x:68,y:y(value)+4,'text-anchor':'end'},metric==='ms'?duration(value):String(value)));
 }
 svg.append(svgElement('polyline',{points:points.map((p,i)=>`${x(i)},${y(p[metric])}`).join(' '),fill:'none',stroke:colors[0],'stroke-width':3}));
 points.forEach((point,i)=>{
  const text=`${point.label}: ${valueText(point[metric],metric)}`,dot=svgElement('circle',{cx:x(i),cy:y(point[metric]),r:4,fill:colors[0],tabindex:0,'data-point':i,'aria-label':text});
  dot.append(svgElement('title',{},text));svg.append(dot);
  if(i===0||i===points.length-1||i%Math.ceil(points.length/5)===0)svg.append(svgElement('text',{x:x(i),y:210,'text-anchor':i===0?'start':i===points.length-1?'end':'middle'},point.label.length===10?point.label.slice(5):point.label));
 });
 return svg;
}
function shareChart(rows,metric,total){
 const root=element('div',undefined,'share-chart'),svg=svgElement('svg',{viewBox:'0 0 220 220',role:'img','aria-label':t('Website share')});
 const parts=rows.filter(row=>row[metric]>0).slice(0,5).map(row=>({label:row.host,value:row[metric]}));
 const other=total-parts.reduce((sum,p)=>sum+p.value,0);if(other>0)parts.push({label:t('Other websites'),value:other});
 let offset=0;const legend=element('ul',undefined,'chart-legend');
 parts.forEach((part,i)=>{
  const percent=part.value/total*100,text=`${part.label}: ${valueText(part.value,metric)} (${percent.toFixed(1)}%)`;
  const arc=svgElement('circle',{cx:110,cy:110,r:78,pathLength:100,fill:'none',stroke:colors[i],'stroke-width':28,'stroke-dasharray':`${percent} ${100-percent}`,'stroke-dashoffset':-offset,transform:'rotate(-90 110 110)',tabindex:0,'data-point':i,'aria-label':text});
  arc.append(svgElement('title',{},text));svg.append(arc);offset+=percent;
  const item=element('li'),swatch=element('span',undefined,'chart-swatch');swatch.style.background=colors[i];swatch.setAttribute('aria-hidden','true');item.append(swatch,element('span',text));legend.append(item);
 });
 svg.append(svgElement('text',{x:110,y:107,'text-anchor':'middle'},t('Total')),svgElement('text',{x:110,y:130,'text-anchor':'middle'},valueText(total,metric)));
 root.append(svg,legend);return root;
}
export function renderUsage(data){
 const metric=$('stats-metric').value,hourlyOption=$('stats-view').querySelector('[value="hourly"]');
 hourlyOption.disabled=metric==='sessions';if(metric==='sessions'&&$('stats-view').value==='hourly')$('stats-view').value='daily';
 const view=$('stats-view').value,key=JSON.stringify([data,metric,view,getLanguage()]);if(key===lastRender)return;lastRender=key;
 const focused=document.activeElement?.closest('#stats-chart')?document.activeElement.dataset.point:null;
 const rows=[...data.rows].sort((a,b)=>b[metric]-a[metric]||a.host.localeCompare(b.host)),total=metric==='ms'?data.totalMs:data.totalSessions;
 $('stats-total').textContent=t('{time} total · {count} sessions',{time:duration(data.totalMs),count:data.totalSessions});
 const highlights=$('stats-highlights');highlights.replaceChildren();
 for(const [label,value] of [['Total time',duration(data.totalMs)],['Sessions',String(data.totalSessions)],['Websites',String(data.rows.length)],['Busiest hour',data.peakHour===null?'—':`${String(data.peakHour).padStart(2,'0')}:00–${String((data.peakHour+1)%24).padStart(2,'0')}:00`]]){
  const card=element('div');card.append(element('span',t(label)),element('strong',value));highlights.append(card);
 }
 const notes=[];
 if(metric==='sessions')notes.push(t('Session trends use daily totals. Hourly session history is not recorded.'));
 if(view==='hourly')notes.push(t('Hours are combined across the selected local dates.'));
 if(data.hourlyTotalMs<data.totalMs)notes.push(t('Some older usage has no hourly detail. Hourly charts and busiest hour only use recorded detail.'));
 $('stats-note').textContent=notes.join(' ');
 const chart=$('stats-chart'),values=$('stats-values');chart.replaceChildren();values.replaceChildren();
 const points=view==='hourly'?data.hourly:data.daily,chartTotal=view==='hourly'?data.hourlyTotalMs:total;
 if(!chartTotal)chart.append(element('p',t('No data for this chart. Try another range or filter.'),'empty'));
 else chart.append(view==='websites'?shareChart(rows,metric,total):lineChart(points,metric));
 const chartValues=view==='websites'?rows.map(row=>({label:row.host,...row})):points;
 for(const point of chartValues){const row=element('div',undefined,'stat-row');row.append(element('span',point.label),element('strong',valueText(point[metric],metric)));values.append(row);}
 if(focused!==null)chart.querySelector(`[data-point="${focused}"]`)?.focus({preventScroll:true});
 const root=$('stats');root.replaceChildren();
 if(!rows.length)root.append(element('p',t('Nothing recorded yet. A little breathing room.'),'empty'));
 rows.forEach((row,i)=>{
  const item=element('div',undefined,'usage-ranking'),heading=element('div',undefined,'stat-row'),share=total?row[metric]/total*100:0;
  heading.append(element('span',`${i+1}. ${row.host}`),element('strong',valueText(row[metric],metric)));
  const track=element('div',undefined,'ranking-track'),fill=element('div');fill.style.width=`${share}%`;track.setAttribute('aria-hidden','true');track.append(fill);
  item.append(heading,track,element('p',`${share.toFixed(1)}% · ${valueText(row[metric==='ms'?'sessions':'ms'],metric==='ms'?'sessions':'ms')}`,'hint'));root.append(item);
 });
}
