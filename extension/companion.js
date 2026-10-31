(() => {
 if(globalThis.OpenStayCompanion)return;
 let host,animation,expiry,movement,audio;
 function silence(){if(audio){void audio.close().catch(()=>{});audio=null;}}
 function stop(){clearTimeout(expiry);clearTimeout(movement);animation?.cancel();host?.remove();host=null;silence();}
 function chirp(){
  try{
   silence();const ctx=new AudioContext();audio=ctx;
   // Never queue a delayed sound when Chrome blocks autoplay.
   if(ctx.state!=='running'){silence();return;}
   for(const delay of [0,.16]){
    const tone=ctx.createOscillator(),gain=ctx.createGain(),at=ctx.currentTime+delay;
    tone.type='sine';tone.frequency.setValueAtTime(1050,at);tone.frequency.exponentialRampToValueAtTime(1800,at+.045);tone.frequency.exponentialRampToValueAtTime(850,at+.12);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.035,at+.015);gain.gain.exponentialRampToValueAtTime(.001,at+.13);
    tone.connect(gain).connect(ctx.destination);tone.start(at);tone.stop(at+.14);
   }
   setTimeout(()=>{if(audio===ctx)silence();},500);
  }catch{/* Visual reminders remain available when audio is unavailable. */}
 }
 function show({level,groupName,language,sound,durationMs,destination}){
  stop();const zh=language==='zh-CN',reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  host=document.createElement('div');host.id='open-stay-focused-companion';
  host.style.cssText='all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;';
  const root=host.attachShadow({mode:'open'});
  root.innerHTML=`<style>
   :host{color-scheme:light}*{box-sizing:border-box}.pet{position:absolute;width:184px;max-width:95vw;pointer-events:auto;text-align:center;font:13px/1.5 system-ui,sans-serif;color:#203d36;filter:drop-shadow(0 5px 10px #203d3622)}
   .note{background:#fffef5;border:1px solid #c6d3bb;border-radius:16px;padding:10px 24px 10px 12px;text-align:left;overflow-wrap:anywhere}.message{margin:0}.name{font-size:11px;opacity:.7;max-height:33px;overflow:hidden;margin-bottom:3px}
   button{font:inherit;color:inherit;cursor:pointer;border:0;background:transparent}button:focus-visible,a:focus-visible{outline:2px solid #386c52;outline-offset:2px}.close{position:absolute;right:4px;top:3px;font-size:19px}.animal{display:block;padding:0;margin:0 auto;width:100px;height:104px}svg{width:100%;height:100%}.listen{font-size:11px;text-decoration:underline;padding:2px 0}.destination{display:block;margin-top:6px;color:#285f50;font-weight:650;overflow-wrap:anywhere}
   .body{transform-origin:60px 100px;animation:breathe 2.6s ease-in-out infinite}.head{transform-origin:60px 65px;animation:nod 3.2s ease-in-out infinite}.tail{transform-origin:76px 92px;animation:tail 2.3s ease-in-out infinite}.foot{animation:step .9s ease-in-out infinite}.foot.right{animation-delay:-.45s}.paw{transform-box:fill-box;transform-origin:center;animation:paw 1.8s ease-in-out infinite}.paw.right{animation-delay:-.9s}
   @keyframes breathe{50%{transform:translateY(-2px) scaleY(1.025)}}@keyframes nod{25%{transform:rotate(-5deg) translateY(-1px)}75%{transform:rotate(4deg)}}@keyframes tail{50%{transform:rotate(-9deg)}}@keyframes step{50%{transform:translateY(-3px)}}@keyframes paw{50%{translate:0 -2px}}
   @media(prefers-reduced-motion:reduce){.body,.head,.tail,.foot,.paw{animation:none}}
  </style><div class="pet"><div class="note" role="status"><div class="name"></div><p class="message"></p><a class="destination" hidden></a><button class="close" type="button">×</button><button class="listen" type="button" hidden></button></div><button class="animal" type="button"><svg viewBox="0 0 120 126" aria-hidden="true">
   <path class="tail" d="M79 85Q120 105 91 115Q80 116 68 104" fill="#876449"/>
   <g class="body"><ellipse cx="59" cy="86" rx="31" ry="34" fill="#88664c"/><ellipse cx="59" cy="86" rx="21" ry="25" fill="#d9bd8f"/></g>
   <ellipse class="foot" cx="39" cy="113" rx="14" ry="7" fill="#674d3b"/><ellipse class="foot right" cx="77" cy="113" rx="14" ry="7" fill="#674d3b"/>
   <g class="head"><circle cx="29" cy="30" r="12" fill="#88664c"/><circle cx="90" cy="30" r="12" fill="#88664c"/><circle cx="29" cy="30" r="6" fill="#d9bd8f"/><circle cx="90" cy="30" r="6" fill="#d9bd8f"/>
   <ellipse cx="60" cy="46" rx="39" ry="31" fill="#88664c"/><path d="M26 48Q30 36 44 41Q60 50 76 41Q92 36 95 48Q96 72 60 74Q25 72 26 48" fill="#e8d5b3"/>
   <circle cx="43" cy="42" r="3.5" fill="#253c33"/><circle cx="77" cy="42" r="3.5" fill="#253c33"/><circle cx="44" cy="41" r="1" fill="white"/><circle cx="78" cy="41" r="1" fill="white"/>
   <path d="M53 50Q60 46 67 50L60 57Z" fill="#253c33"/><path d="M60 56V61M60 61Q53 66 49 60M60 61Q67 66 71 60M38 55L16 51M38 61L15 64M82 55L104 51M82 61L105 64" fill="none" stroke="#674d3b" stroke-width="1.8" stroke-linecap="round"/></g>
   <ellipse class="paw" cx="35" cy="83" rx="10" ry="16" transform="rotate(-35 35 83)" fill="#88664c"/><ellipse class="paw right" cx="83" cy="83" rx="10" ry="16" transform="rotate(35 83 83)" fill="#88664c"/>
   <path d="M47 82Q60 73 73 82L60 101Z" fill="#8fae70"/><path d="M60 83V96" stroke="#edf4d9" stroke-width="2"/>
  </svg></button></div>`;
  root.querySelector('.name').textContent=groupName;
  root.querySelector('.message').textContent=zh?({50:'额度已用一半，伸个懒腰吧。',80:'额度已用八成，慢慢收个尾吧。',100:'今天就到这里，我陪你歇一会儿。'}[level]):({50:'Half your budget used. A little stretch?',80:'80% used. Time to wrap up gently.',100:'All done for today. Let’s take a breath.'}[level]);
  const destinationLink=root.querySelector('.destination');
  if(destination){destinationLink.hidden=false;destinationLink.href=destination.url;destinationLink.textContent=zh?`去看看${destination.name}`:`Visit ${destination.name} instead`;}
  for(const button of root.querySelectorAll('.close,.animal')){button.setAttribute('aria-label',zh?'收起水獭提醒':'Dismiss otter reminder');button.addEventListener('click',stop);}
  const listen=root.querySelector('.listen');listen.hidden=!sound;listen.textContent=zh?'听一声':'Play chirp';listen.addEventListener('click',chirp);
  (document.body??document.documentElement).append(host);
  const pet=root.querySelector('.pet');
  let x=Math.random()*Math.max(0,innerWidth-pet.offsetWidth),y=innerHeight;
  const point=()=>({x:Math.random()*Math.max(0,innerWidth-pet.offsetWidth),y:Math.random()*Math.max(0,innerHeight-pet.offsetHeight)});
  function roam(first=false){
   if(!host)return;
   const target=first?{x,y:Math.max(0,innerHeight-pet.offsetHeight-16)}:point();
   const ms=first?1800:Math.max(6000,Math.hypot(target.x-x,target.y-y)/45*1000);
   animation=pet.animate([{transform:`translate(${x}px,${y}px)`},{transform:`translate(${target.x}px,${target.y}px)`}],{duration:ms,easing:'ease-in-out',fill:'forwards'});
   x=target.x;y=target.y;movement=setTimeout(()=>roam(),ms+800);
  }
  if(reduced){pet.style.left=`${x}px`;pet.style.bottom='16px';}else roam(true);
  if(durationMs!==null)expiry=setTimeout(stop,durationMs);
  if(sound&&document.visibilityState==='visible')chirp();
 }
 globalThis.OpenStayCompanion={show,stop,silence};
 addEventListener('pagehide',stop);
})();
