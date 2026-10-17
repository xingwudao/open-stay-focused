(() => {
 let alive=true,style;
 async function send(type){
  if(!alive)return null;
  try {const response=await chrome.runtime.sendMessage({type});return response?.ok?response.data:null;}
  catch{alive=false;return null;}
 }
 async function update(){
  const toggles=await send('getDistractions');if(!toggles)return;
  if(!style){style=document.createElement('style');style.id='open-stay-focused-controls';}
  style.textContent=OpenStayDistractions.css(location.hostname,toggles);
  if(!style.isConnected)(document.head??document.documentElement)?.append(style);
 }
 function heartbeat(){if(document.visibilityState==='visible')void send('heartbeat');}
 document.addEventListener('visibilitychange',heartbeat);
 window.addEventListener('pageshow',heartbeat);
 document.addEventListener('DOMContentLoaded',()=>{void update();heartbeat();},{once:true});
 chrome.storage.onChanged.addListener(()=>void update());
 // Content scripts cannot inspect local settings; periodically request only
 // distraction toggles, since TRUSTED_CONTEXTS suppresses storage events.
 setInterval(()=>{heartbeat();void update();},5000);
 heartbeat();void update();
})();
