import {test,expect,chromium} from '@playwright/test';
import path from 'node:path';
let context,worker,page,base;
test.beforeEach(async()=>{
 const extension=path.resolve(process.env.EXTENSION_PATH??'extension');
 context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');base='chrome-extension://'+new URL(worker.url()).host;
 page=await context.newPage();await page.goto(base+'/ui/options.html');
 // Explicit test-fixture opt-out through the valid challenge; production defaults
 // stay protected and are covered separately in controller/UI migration tests.
 await page.evaluate(async()=>{const r=await chrome.runtime.sendMessage({type:'getState'}),s=r.data;const {challengeForLanguage}=await import('../core/settings.js');
  const saved=await chrome.runtime.sendMessage({type:'saveSettings',revision:s.revision,settings:{...s.settings,challengeEnabled:false},challenge:challengeForLanguage(s.settings.language,s.settings.challengeText)});if(!saved.ok)throw Error(saved.error);});
});
test.afterEach(async()=>{await context?.close();});
async function state(){return page.evaluate(async()=>{const r=await chrome.runtime.sendMessage({type:'getState'});if(!r.ok)throw Error(r.error);return r.data;});}
async function setup(audio=false){await page.evaluate(async audio=>{const {data:s}=await chrome.runtime.sendMessage({type:'getState'});s.settings.trackAudio=audio;s.settings.groups=[{id:'live',name:'Live fixture',enabled:true,budgetMs:600000,patterns:['127.0.0.1']}];const r=await chrome.runtime.sendMessage({type:'saveSettings',settings:s.settings,revision:s.revision});if(!r.ok)throw Error(r.error);},audio);}
test('floating countdown updates each second and can be hidden for the document',async()=>{
 await setup();const site=await context.newPage();await site.goto('http://127.0.0.1:4173/');await site.bringToFront();
 const timer=site.locator('#open-stay-focused-timer');await expect(timer).toBeVisible();
 const before=await timer.locator('strong').innerText();await expect.poll(()=>timer.locator('strong').innerText(),{timeout:5000}).not.toBe(before);
 await expect(timer.locator('p')).toContainText('Today');
 await timer.getByRole('button',{name:'Hide timer on this page'}).click();await expect(timer).toHaveCount(0);
 const start=Object.values((await state()).usage).reduce((n,d)=>n+(d.live??0),0);
 await expect.poll(async()=>Object.values((await state()).usage).reduce((n,d)=>n+(d.live??0),0),{timeout:5000}).toBeGreaterThan(start+1000);
 await expect(timer).toHaveCount(0);
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
