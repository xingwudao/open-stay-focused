(() => {
 if(globalThis.__openStayFocusedAlive?.())return;
 globalThis.__openStayFocusedStop?.();
 let alive=true,style,pending=false;
 globalThis.__openStayFocusedAlive=()=>alive&&!!chrome.runtime?.id;
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
 async function heartbeat(){
  if(document.visibilityState!=='visible'||pending)return;pending=true;
  try{const data=await send('heartbeat');if(data){if(!data.companionEnabled)OpenStayCompanion.stop();else if(data.reminder&&document.visibilityState==='visible')OpenStayCompanion.show(data.reminder);if(!data.companionSound)OpenStayCompanion.silence();}}finally{pending=false;}
 }
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void heartbeat();});
 window.addEventListener('pageshow',()=>void heartbeat());
 document.addEventListener('DOMContentLoaded',()=>{void update();void heartbeat();},{once:true});
 const heartbeatInterval=setInterval(()=>void heartbeat(),1000);
 const updateInterval=setInterval(()=>void update(),5000);
 globalThis.__openStayFocusedStop=()=>{alive=false;clearInterval(heartbeatInterval);clearInterval(updateInterval);style?.remove();OpenStayCompanion.stop();};
 void heartbeat();void update();
})();
