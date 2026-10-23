import {chromium} from '@playwright/test';
import {mkdir,readFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {initialState} from '../extension/core/accounting.js';
import {localDay} from '../extension/core/policy.js';

// Use real UI renderers with synthetic data in a disposable profile, never personal history.
const output=path.resolve('docs/web-store/images'),extension=path.resolve('extension');
await mkdir(output,{recursive:true});
const context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,viewport:{width:1280,height:800},deviceScaleFactor:1,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
const files=[];
try{
 const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
 const base=`chrome-extension://${new URL(worker.url()).host}`;
 for(const language of ['en','zh-CN']){
  const state=initialState(),day=localDay(Date.now());state.settings.language=language;
  state.settings.groups=[{id:'social',name:language==='en'?'Social media':'社交网站',enabled:true,patterns:['x.com','reddit.com'],budgetMs:1800000}];
  state.usage={[day]:{social:900000}};
  state.stats={[day]:{'x.com':600000,'reddit.com':300000,'wikipedia.org':720000}};
  state.sessionCounts={[day]:{'x.com':4,'reddit.com':2,'wikipedia.org':3}};
  state.hourly={[day]:Object.fromEntries(Object.entries(state.stats[day]).map(([host,ms])=>[host,Array.from({length:24},(_,h)=>h===10?ms:0)]))};
  const page=await context.newPage();
  await page.addInitScript(({state})=>{
   chrome.runtime.sendMessage=async message=>{
    if(message.type==='getState')return {ok:true,data:structuredClone(state)};
    if(message.type==='getLiveState')return {ok:true,data:{state:structuredClone(state)}};
    if(message.type==='getCompanion')return {ok:true,data:{enabled:true,sound:false,reminder:{level:100,groupName:state.settings.groups[0].name,language:state.settings.language,sound:false,durationMs:null}}};
    return {ok:false,error:'Read-only screenshot fixture.'};
   };
   Math.random=()=>.86;
  },{state});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(base+'/ui/options.html');await page.locator('.group-card').waitFor();
  async function capture(name){const file=path.join(output,`${name}-${language}.png`);await page.screenshot({path:file});files.push(file);}
  await page.locator('#budgets').evaluate(el=>el.scrollIntoView());await capture('01-shared-budgets');
  await page.locator('#stats-view').selectOption('websites');
  await page.locator('#stats-highlights').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-24));await capture('02-local-statistics');
  await page.locator('#focus').evaluate(el=>el.scrollIntoView());await capture('03-focus-session');
  await page.goto(base+'/ui/blocked.html?reason=quota');await page.locator('#open-stay-focused-companion').waitFor();await capture('04-otter-boundary');
  await page.close();
 }
 await copyFile(path.join(extension,'icons/128.png'),path.join(output,'icon-128.png'));
 for(const file of files){const bytes=await readFile(file);assert.equal(bytes.readUInt32BE(16),1280);assert.equal(bytes.readUInt32BE(20),800);}
 console.log(`Verified ${files.length} screenshots at 1280×800, plus store icon: ${output}`);
}finally{await context.close();}
