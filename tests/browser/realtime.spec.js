import {test,expect,chromium} from '@playwright/test';
import path from 'node:path';
let context,worker,page,base;
test.beforeEach(async({},testInfo)=>{
 const extension=path.resolve(process.env.EXTENSION_PATH??'extension');
 context=await chromium.launchPersistentContext('',{channel:'chromium',headless:!testInfo.title.includes('native toolbar'),args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');base='chrome-extension://'+new URL(worker.url()).host;
 // Keep normal accounting fixtures independent of the host machine's idle time.
 await worker.evaluate(()=>{chrome.idle.queryState=async()=>'active';});
 page=await context.newPage();await page.goto(base+'/ui/options.html');
 // Explicit test-fixture opt-out through the valid challenge; production defaults
 // stay protected and are covered separately in controller/UI migration tests.
 await page.evaluate(async()=>{const r=await chrome.runtime.sendMessage({type:'getState'}),s=r.data;const {challengeForLanguage}=await import('../core/settings.js');
  const saved=await chrome.runtime.sendMessage({type:'saveSettings',revision:s.revision,settings:{...s.settings,challengeEnabled:false},challenge:challengeForLanguage(s.settings.language,s.settings.challengeText)});if(!saved.ok)throw Error(saved.error);});
});
test.afterEach(async({},testInfo)=>{
 if(testInfo.status!==testInfo.expectedStatus&&worker)console.log('failed test browser focus',await worker.evaluate(async()=>({window:await chrome.windows.getLastFocused(),idle:await chrome.idle.queryState(60)})).catch(()=>null));
 await context?.close();
});
async function state(){return page.evaluate(async()=>{const r=await chrome.runtime.sendMessage({type:'getState'});if(!r.ok)throw Error(r.error);return r.data;});}
async function setup(audio=false){await page.evaluate(async audio=>{const {data:s}=await chrome.runtime.sendMessage({type:'getState'});s.settings.trackAudio=audio;s.settings.groups=[{id:'live',name:'Live fixture',enabled:true,budgetMs:600000,patterns:['127.0.0.1']}];const r=await chrome.runtime.sendMessage({type:'saveSettings',settings:s.settings,revision:s.revision});if(!r.ok)throw Error(r.error);},audio);}
test('website has no floating timer while background usage keeps accumulating',async()=>{
 await setup();
 // An existing installation can retain the old preference; it must not add UI.
 await page.evaluate(async()=>{const {data:s}=await chrome.runtime.sendMessage({type:'getState'});s.settings.showTimer=true;const r=await chrome.runtime.sendMessage({type:'saveSettings',settings:s.settings,revision:s.revision});if(!r.ok)throw Error(r.error);});
 const site=await context.newPage();await site.goto('http://127.0.0.1:4173/');await site.bringToFront();
 const start=Object.values((await state()).usage).reduce((n,d)=>n+(d.live??0),0);
 await expect.poll(async()=>Object.values((await state()).usage).reduce((n,d)=>n+(d.live??0),0),{timeout:5000}).toBeGreaterThan(start+1000);
 await expect(site.locator('#open-stay-focused-timer')).toHaveCount(0);
});
test('same-host audible tabs accrue one shared budget and hostname duration',async()=>{
 await setup(true);const a=await context.newPage(),b=await context.newPage();await a.goto('http://127.0.0.1:4173/one');await b.goto('http://127.0.0.1:4173/two');
 await worker.evaluate(()=>{const query=chrome.tabs.query.bind(chrome.tabs);chrome.tabs.query=async q=>(await query(q)).map(t=>t.url?.startsWith('http://127.0.0.1:4173/')?{...t,audible:true}:t);chrome.idle.queryState=async()=>'active';});
 await page.bringToFront();
 await expect.poll(async()=>Object.values((await state()).usage).reduce((n,d)=>n+(d.live??0),0),{timeout:6000}).toBeGreaterThan(1500);
 const s=await state(),quota=Object.values(s.usage).reduce((n,d)=>n+(d.live??0),0),duration=Object.values(s.stats).reduce((n,d)=>n+(d['127.0.0.1']??0),0);
 expect(quota).toBe(duration);expect(quota).toBeLessThan(10000);
 const persistent=await worker.evaluate(()=>chrome.storage.local.get('state'));expect(JSON.stringify(persistent)).not.toContain('/one');expect(JSON.stringify(persistent)).not.toContain('/two');
});

test('popup countdown keeps decreasing against the live website budget',async()=>{
 await setup();
 const site=await context.newPage();await site.goto('http://127.0.0.1:4173/');
 const popup=await context.newPage();await popup.goto(base+'/ui/popup.html');
 // A toolbar popup is not exposed in headless Chromium. Keep the real website
 // active while exercising the actual popup document and background accounting.
 await site.bringToFront();
 await expect(popup.locator('#site')).toHaveText('127.0.0.1');
 const seconds=async()=>{const text=await popup.locator('#remaining').innerText();const m=text.match(/(\d+)m (\d+)s/);return m?Number(m[1])*60+Number(m[2]):null;};
 const start=await seconds();expect(start).not.toBeNull();
 await expect.poll(seconds,{timeout:6000}).toBeLessThan(start-1);
 const next=await seconds();await expect.poll(seconds,{timeout:6000}).toBeLessThan(next-1);
 const s=await state(),used=Object.values(s.usage).reduce((n,d)=>n+(d.live??0),0);
 expect(Math.abs((await seconds())-Math.ceil((600000-used)/1000))).toBeLessThanOrEqual(2);
});


test('native toolbar popup keeps counting while it holds browser focus',async()=>{
 await setup();
 const site=await context.newPage();await site.goto('http://127.0.0.1:4173/');await site.bringToFront();
 await worker.evaluate(async()=>{const win=await chrome.windows.getLastFocused();await chrome.windows.update(win.id,{focused:true});});
 // Isolate popup focus from the host machine's physical idle duration.
 await worker.evaluate(()=>{chrome.idle.queryState=async()=>'active';});
 await worker.evaluate(()=>chrome.action.openPopup());
 const cdp=await context.newCDPSession(site);
 const targets=await cdp.send('Target.getTargets');
 const target=targets.targetInfos.find(t=>t.url===base+'/ui/popup.html');expect(target).toBeTruthy();
 const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId});
 let id=0;
 const read=()=>new Promise((resolve,reject)=>{
  const requestId=++id;
  const listener=event=>{if(event.sessionId!==sessionId)return;const message=JSON.parse(event.message);if(message.id!==requestId)return;cdp.off('Target.receivedMessageFromTarget',listener);if(message.error)reject(Error(message.error.message));else resolve(JSON.parse(message.result.result.value));};
  cdp.on('Target.receivedMessageFromTarget',listener);
  cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id:requestId,method:'Runtime.evaluate',params:{expression:'JSON.stringify({text:document.querySelector("#remaining").textContent,focused:document.hasFocus(),reason:document.querySelector("#reason").textContent})',returnByValue:true}})}).catch(reject);
 });
 await expect.poll(async()=>(await read()).focused).toBe(true);
 // Keep the native popup foreground on a shared desktop; focus loss is a valid pause.
 const seconds=async()=>{const view=await read();if(!view.focused)console.log('native popup lost focus',view);if(!view.focused)await cdp.send('Target.activateTarget',{targetId:target.targetId});const {text}=view;const m=text.match(/(\d+)m (\d+)s/);return m?Number(m[1])*60+Number(m[2]):null;};
 await expect.poll(seconds).not.toBeNull();const start=await seconds();
 await expect.poll(seconds,{timeout:10000}).toBeLessThan(start-2);
 const next=await seconds();await expect.poll(seconds,{timeout:10000}).toBeLessThan(next-2);
 await worker.evaluate(()=>{chrome.idle.queryState=async()=>'locked';});
 await expect.poll(async()=>{const {checkpoint}=await worker.evaluate(()=>chrome.storage.session.get('checkpoint'));return checkpoint.visits.length;}).toBe(0);
 // Let the popup display the final settled interval, then prove it stops.
 await new Promise(resolve=>setTimeout(resolve,1200));const locked=await seconds();
 await new Promise(resolve=>setTimeout(resolve,2200));expect(await seconds()).toBe(locked);
 await cdp.send('Target.closeTarget',{targetId:target.targetId});
 await worker.evaluate(async()=>{chrome.idle.queryState=async()=>'active';const win=await chrome.windows.getLastFocused();await chrome.windows.update(win.id,{focused:true});});await site.bringToFront();
 const closedUsage=Object.values((await state()).usage).reduce((n,d)=>n+(d.live??0),0);
 await expect.poll(async()=>Object.values((await state()).usage).reduce((n,d)=>n+(d.live??0),0),{timeout:6000}).toBeGreaterThan(closedUsage+1000);
 await expect(site.locator('#open-stay-focused-timer')).toHaveCount(0);
});


test('stopped page heartbeats recover without reloading the website',async()=>{
 await setup();const site=await context.newPage();await site.goto('http://127.0.0.1:4173/');await site.bringToFront();
 await expect.poll(async()=>Object.values((await state()).usage).reduce((n,d)=>n+(d.live??0),0)).toBeGreaterThan(0);
 const tabs=await worker.evaluate(()=>chrome.tabs.query({}));const tab=tabs.find(t=>t.url==='http://127.0.0.1:4173/');
 await worker.evaluate(id=>chrome.scripting.executeScript({target:{tabId:id},func:()=>globalThis.__openStayFocusedStop()}),tab.id);
 await expect(site.locator('#open-stay-focused-timer')).toHaveCount(0);
 await expect.poll(async()=>{const [r]=await worker.evaluate(id=>chrome.scripting.executeScript({target:{tabId:id},func:()=>globalThis.__openStayFocusedAlive?.()}),tab.id);return r.result;},{timeout:22000}).toBe(true);
 const start=Object.values((await state()).usage).reduce((n,d)=>n+(d.live??0),0);
 await expect.poll(async()=>Object.values((await state()).usage).reduce((n,d)=>n+(d.live??0),0),{timeout:6000}).toBeGreaterThan(start+1500);
 await expect(site.locator('#open-stay-focused-timer')).toHaveCount(0);
});

for(const scenario of ['fresh tabs','SPA navigation'])test(`without any extension UI, ${scenario} accrue persisted usage`,async()=>{
 await setup();await page.close();
 const a=await context.newPage();await a.goto('http://127.0.0.1:4173/one');
 const b=await context.newPage();await b.goto('http://127.0.0.1:4173/two');await b.bringToFront();
 if(scenario==='SPA navigation')await b.getByRole('button',{name:'SPA route'}).click();
 // Read storage only: UI messages call sample() and would mask startup failures.
 const persisted=()=>worker.evaluate(async()=>{const {state}=await chrome.storage.local.get('state');return Object.values(state.usage).reduce((n,d)=>n+(d.live??0),0);});
 await expect.poll(persisted,{timeout:8000}).toBeGreaterThan(3000);
 const before=await persisted();await a.bringToFront();
 await expect.poll(persisted,{timeout:8000}).toBeGreaterThan(before+3000);
 console.log(JSON.stringify({scenario,usedBeforeOpeningPopup:await persisted()}));
});

test('SPA heartbeats accept the current document but reject stale document identity',async()=>{
 await setup();await page.close();
 const site=await context.newPage();await site.goto('http://127.0.0.1:4173/one');
 await site.evaluate(()=>history.replaceState({},'', '/replacement#details'));
 const tab=await worker.evaluate(async()=> (await chrome.tabs.query({})).find(t=>t.url==='http://127.0.0.1:4173/replacement#details'));
 const heartbeat=()=>worker.evaluate(async id=>{const [result]=await chrome.scripting.executeScript({target:{tabId:id},func:()=>chrome.runtime.sendMessage({type:'heartbeat'})});return result.result;},tab.id);
 expect((await heartbeat()).ok).toBe(true);
 await worker.evaluate(()=>{globalThis.actualGetFrame=chrome.webNavigation.getFrame.bind(chrome.webNavigation);chrome.webNavigation.getFrame=async arg=>({...await globalThis.actualGetFrame(arg),documentId:'another-document'});});
 expect(await heartbeat()).toEqual({ok:false,error:'Stale document.'});
 await worker.evaluate(()=>{chrome.webNavigation.getFrame=globalThis.actualGetFrame;});
 expect((await heartbeat()).ok).toBe(true);
});
