(() => {
 if(globalThis.__openStayFocusedAlive?.())return;
 globalThis.__openStayFocusedStop?.();
 let alive=true,style,timerHost,timerText,timerStatus,closeButton,dismissed=false,pending=false;
 globalThis.__openStayFocusedAlive=()=>alive&&!!chrome.runtime?.id;
 let lastRemaining=null,warningUntil=0;
 async function send(type){
  if(!alive)return null;
  try {const response=await chrome.runtime.sendMessage({type});return response?.ok?response.data:null;}
  catch{alive=false;timerHost?.remove();return null;}
 }
 async function update(){
  const toggles=await send('getDistractions');if(!toggles)return;
  if(!style){style=document.createElement('style');style.id='open-stay-focused-controls';}
  style.textContent=OpenStayDistractions.css(location.hostname,toggles);
  if(!style.isConnected)(document.head??document.documentElement)?.append(style);
 }
 function createTimer(){
  timerHost=document.createElement('div');timerHost.id='open-stay-focused-timer';
  Object.assign(timerHost.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:'2147483647'});
  const root=timerHost.attachShadow({mode:'open'}),css=document.createElement('style');
  css.textContent=':host{all:initial}section{font:13px/1.5 system-ui,sans-serif;background:#203b37;color:#fffef9;padding:12px 16px;border:1px solid #a6c58a;border-radius:12px;box-shadow:0 4px 22px #0003;max-width:280px;min-width:180px}header{display:flex;gap:16px;align-items:center;cursor:move;touch-action:none;font-size:11px}strong{font-size:22px;font-variant-numeric:tabular-nums;display:block;margin-top:6px}p{margin:0;font-size:11px;opacity:.85}button{margin-left:auto;border:0;background:transparent;color:inherit;font:20px system-ui;cursor:pointer;padding:0 4px}button:focus-visible{outline:2px solid #c5eba4}';
  const box=document.createElement('section'),header=document.createElement('header'),brand=document.createElement('span');brand.textContent='Open Stay Focused';
  closeButton=document.createElement('button');closeButton.type='button';closeButton.textContent='×';
  closeButton.addEventListener('click',()=>{dismissed=true;timerHost.remove();});header.append(brand,closeButton);
  timerText=document.createElement('strong');timerStatus=document.createElement('p');box.append(header,timerText,timerStatus);root.append(css,box);
  let drag=null;
  header.addEventListener('pointerdown',event=>{if(event.target===closeButton)return;const r=timerHost.getBoundingClientRect();drag={x:event.clientX-r.left,y:event.clientY-r.top};header.setPointerCapture(event.pointerId);event.preventDefault();});
  header.addEventListener('pointermove',event=>{if(!drag)return;const r=timerHost.getBoundingClientRect();Object.assign(timerHost.style,{right:'auto',bottom:'auto',left:Math.max(0,Math.min(innerWidth-r.width,event.clientX-drag.x))+'px',top:Math.max(0,Math.min(innerHeight-r.height,event.clientY-drag.y))+'px'});});
  header.addEventListener('pointerup',()=>{drag=null;});header.addEventListener('lostpointercapture',()=>{drag=null;});
 }
 function format(ms,zh){const secs=Math.max(0,Math.ceil(ms/1000)),mins=Math.floor(secs/60),rest=String(secs%60).padStart(2,'0');return zh?`${mins}分${rest}秒`:`${mins}m ${rest}s`;}
 function renderTimer(data){
  if(!data?.show||dismissed){timerHost?.remove();return;}
  if(!document.documentElement)return;
  if(!timerHost)createTimer();if(!timerHost.isConnected)document.documentElement.append(timerHost);
  const zh=data.language==='zh-CN';timerHost.lang=zh?'zh-CN':'en';closeButton.setAttribute('aria-label',zh?'隐藏本页计时器':'Hide timer on this page');
  timerText.textContent=(zh?'剩余 ':'Remaining ')+format(data.remainingMs,zh);
  const seconds=Math.ceil(data.remainingMs/1000);
  if(lastRemaining!==null&&[60,10,5].some(n=>lastRemaining>n&&seconds<=n))warningUntil=Date.now()+3000;
  lastRemaining=seconds;
  const paused=!data.running||['paused','outside-schedule','allowed'].includes(data.reason);
  timerStatus.textContent=Date.now()<warningUntil?(zh?'额度即将用完':'Your allowance is almost used up'):(zh?'今日浏览 ':'Today: ')+format(data.usedMs,zh)+(paused?(zh?' · 暂停计时':' · Paused'):'');
 }
 async function heartbeat(){
  if(document.visibilityState!=='visible'||pending)return;pending=true;
  try{renderTimer(await send('heartbeat'));}finally{pending=false;}
 }
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void heartbeat();});
 window.addEventListener('pageshow',()=>void heartbeat());
 document.addEventListener('DOMContentLoaded',()=>{void update();void heartbeat();},{once:true});
 const heartbeatInterval=setInterval(()=>void heartbeat(),1000);
 const updateInterval=setInterval(()=>void update(),5000);
 globalThis.__openStayFocusedStop=()=>{alive=false;clearInterval(heartbeatInterval);clearInterval(updateInterval);timerHost?.remove();style?.remove();};
 void heartbeat();void update();
})();
