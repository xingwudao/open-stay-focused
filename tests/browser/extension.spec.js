import {test,expect,chromium} from '@playwright/test';
import path from 'node:path';
import {existsSync} from 'node:fs';
const extension=path.resolve(process.env.EXTENSION_PATH??'extension');
let context,worker,base,page,initialSettings;
test.beforeEach(async()=>{
 expect(existsSync(path.join(extension,'manifest.json')), 'loadable manifest exists').toBe(true);
 context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
 base=`chrome-extension://${new URL(worker.url()).host}`;
 // Keep normal accounting fixtures independent of the host machine's idle time.
 await worker.evaluate(()=>{chrome.idle.queryState=async()=>'active';});
 page=await context.newPage();await page.goto(base+'/ui/options.html');
 const initial=await send({type:'getState'});initialSettings=initial.settings;if(initial.settings.challengeEnabled){await save({...initial.settings,challengeEnabled:false});await page.reload();}
});
test.afterEach(async()=>{await context?.close();});
async function send(command){return page.evaluate(async c=>{const r=await chrome.runtime.sendMessage(c);if(!r.ok)throw Error(r.error);return r.data;},command);}
async function settings(){return (await send({type:'getState'})).settings;}
async function save(s){const state=await send({type:'getState'}),operation={type:'saveSettings',settings:s,revision:state.revision};const prepared=await send({type:'prepareChange',operation});for(let i=0;i<prepared.steps;i++)await send({type:'confirmChange',ticket:prepared.ticket});const challenge=await page.evaluate(async settings=>{const {challengeForLanguage}=await import('./../core/settings.js');return challengeForLanguage(settings.language,settings.challengeText);},state.settings);await send({...operation,ticket:prepared.ticket,challenge});}
const group=(patterns,budgetMs=0)=>({id:'test',name:'Test group',enabled:true,patterns,budgetMs});
test('loads extension and UI creates a group, persists and exports settings',async()=>{
 await expect(page.getByRole('heading',{name:'Your attention, on your terms.'})).toBeVisible();
 await page.getByLabel('Group name').fill('Reading');await page.getByLabel('Daily minutes').fill('10');
 await page.getByLabel('Website patterns').fill('example.com');
 await page.getByRole('button',{name:'Add group',exact:true}).click();
 await expect(page.getByText('Reading',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Save settings',exact:true}).click();
 expect((await settings()).groups[0].name).toBe('Reading');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export settings'}).click();
 expect((await download).suggestedFilename()).toMatch(/\.json$/);
 await page.reload();await expect(page.getByText('Reading',{exact:true})).toBeVisible();
});
test('quota blocks new pages; allowlist bypass and SPA route check',async()=>{
 const s=await settings();s.groups=[group(['127.0.0.1/blocked'])];await save(s);
 const site=await context.newPage();await site.goto('http://127.0.0.1:4173/');
 await site.getByRole('button',{name:'SPA route'}).click();
 await expect(site).toHaveURL(/ui\/blocked.html/);
 await expect(site.getByRole('heading',{name:'Make room for what matters.'})).toBeVisible();
 s.allowlist=['127.0.0.1/blocked'];await save(s);
 await site.goto('http://127.0.0.1:4173/blocked');await expect(site.getByRole('heading',{name:'Fixture site'})).toBeVisible();
});
test('foreground quota expires on existing tab and stats do not retain URL',async()=>{
 const s=await settings();s.groups=[group(['127.0.0.1'],2000)];await save(s);
 const site=await context.newPage();await site.goto('http://127.0.0.1:4173/private?secret=yes');await site.bringToFront();
 await expect(site).toHaveURL(/ui\/blocked.html/,{timeout:20000});
 const state=await send({type:'getState'});expect(Object.values(state.usage).some(d=>d.test>=2000)).toBe(true);
 const local=await worker.evaluate(()=>chrome.storage.local.get(null));expect(JSON.stringify(local)).not.toContain('secret=yes');
});
test('nuclear session locks mutations and survives worker termination',async()=>{
 await send({type:'startNuclear',mode:'all',minutes:1});
 await expect(send({type:'cancelScheduledNuclear'})).rejects.toThrow(/active/);
 const before=(await send({type:'getState'})).nuclear.endAt;
 const cdp=await context.newCDPSession(page);await cdp.send('ServiceWorker.enable');
 await cdp.send('ServiceWorker.stopAllWorkers');
 expect((await send({type:'getState'})).nuclear.endAt).toBe(before);
 const site=await context.newPage();await site.goto('http://127.0.0.1:4173/').catch(()=>{});await expect(site).toHaveURL(/ui\/blocked.html/);
});
test('challenge and invalid imports show errors; clear stats preserves quota',async()=>{
 const s=await settings();s.challengeEnabled=true;await save(s);await page.reload();
 await page.locator('#challenge-enabled').uncheck();await page.getByRole('button',{name:'Save settings',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByLabel('Type the sentence exactly').fill('wrong');
 await page.getByRole('button',{name:'Confirm change'}).click();
 await expect(page.getByRole('alert')).toContainText('sentence');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 const upload=page.locator('#import-file');await upload.setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
 await expect(page.getByRole('alert')).toContainText('JSON');
});
test('distraction CSS covers every adapter including dynamically added elements',async()=>{
 const fixture=await context.newPage();await fixture.goto('http://127.0.0.1:4173');
 await fixture.addScriptTag({path:path.join(extension,'distractions.js')});
 const results=await fixture.evaluate(()=>{
  const selectors={youtubeShorts:'ytd-reel-shelf-renderer',youtubeRecommendations:'#related',youtubeComments:'ytd-comments',instagramReels:'a[href="/reels/"]',facebookReels:'a[href="/reel/123"]',xTrends:'[data-testid="trend"]',tiktokRecommendations:'[data-e2e="recommend-list-item-container"]'};
  const hosts={youtubeShorts:'www.youtube.com',youtubeRecommendations:'www.youtube.com',youtubeComments:'www.youtube.com',instagramReels:'www.instagram.com',facebookReels:'www.facebook.com',xTrends:'x.com',tiktokRecommendations:'www.tiktok.com'};
  return Object.entries(selectors).map(([key,selector])=>{
   const style=document.createElement('style');style.textContent=OpenStayDistractions.css(hosts[key],{[key]:true});document.head.append(style);
   const element=document.createElement(selector.startsWith('ytd-')?selector:'a');
   if(selector==='#related')element.id='related';
   for(const match of selector.matchAll(/\[([^=]+)="([^"]+)"\]/g))element.setAttribute(match[1],match[2]);
   document.body.append(element);const hidden=getComputedStyle(element).display==='none';style.remove();
   const restored=getComputedStyle(element).display!=='none';element.remove();return {key,hidden,restored};
  });
 });
 for(const r of results){expect(r.hidden,r.key).toBe(true);expect(r.restored,r.key).toBe(true);}
});
test('saved settings round-trip through import and exact typing challenge succeeds',async()=>{
 const original=await settings();original.groups=[group(['example.com'],60000)];
 await page.locator('#import-file').setInputFiles({name:'settings.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(original))});
 await expect(page.getByRole('status')).toContainText('imported');expect((await settings()).groups[0].budgetMs).toBe(60000);
 await page.getByLabel('Require a typing challenge before changing settings').check();
 await page.getByRole('button',{name:'Save settings',exact:true}).click();await expect(page.getByRole('status')).toContainText('saved');
 await page.getByLabel('Allowed websites',{exact:true}).fill('example.com/work/*');await page.getByRole('button',{name:'Save settings',exact:true}).click();
 await page.getByLabel('Type the sentence exactly').fill(await page.locator('#challenge-phrase').innerText());
 await page.getByRole('button',{name:'Confirm change'}).click();await expect(page.getByRole('status')).toContainText('saved');
 expect((await settings()).allowlist).toEqual(['example.com/work/*']);
});
test('popup unsupported-state handling and nuclear UI commitment are usable',async()=>{
 const site=await context.newPage();await site.goto('http://127.0.0.1:4173/');
 // Open popup as a page to exercise its full document. Its active-tab target
 // is the popup here, so test unsupported-state handling as well.
 const popup=await context.newPage();await popup.goto(base+'/ui/popup.html');
 await expect(popup.getByRole('button',{name:'Add website'})).toBeDisabled();
 await popup.close();await page.bringToFront();
 await page.getByLabel('I understand an active session cannot be canceled.').check();
 await page.getByRole('button',{name:'Commit to focus'}).click();
 await expect(page.locator('#session-banner')).toContainText('active');
 await expect(page.getByRole('button',{name:'Save settings',exact:true})).toBeDisabled();
});
test('browser restart retains nuclear deadline and discards transient browsing checkpoint',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');
 const profile=await mkdtemp(path.join(tmpdir(),'open-stay-restart-'));
 const launch=()=>chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 let ctx;
 try{
  ctx=await launch();let w=ctx.serviceWorkers()[0]??await ctx.waitForEvent('serviceworker');const root=`chrome-extension://${new URL(w.url()).host}`;
  let p=await ctx.newPage();await p.goto(root+'/ui/options.html');
  const first=await p.evaluate(async()=>{const {challengeForLanguage}=await import('../core/settings.js');const {data}=await chrome.runtime.sendMessage({type:'getState'});return chrome.runtime.sendMessage({type:'startNuclear',mode:'all',minutes:1,challenge:challengeForLanguage(data.settings.language,data.settings.challengeText)});});expect(first.ok).toBe(true);
  await ctx.close();ctx=await launch();p=await ctx.newPage();await p.goto(root+'/ui/options.html');
  const restored=await p.evaluate(()=>chrome.runtime.sendMessage({type:'getState'}));expect(restored.data.nuclear.endAt).toBe(first.data.nuclear.endAt);
  const site=await ctx.newPage();await site.goto('http://127.0.0.1:4173/').catch(()=>{});await expect(site).toHaveURL(/ui\/blocked.html/);
 }finally{await ctx?.close();await rm(profile,{recursive:true,force:true});}
});
test('content-script messages cannot read private state or write settings',async()=>{
 const site=await context.newPage(),cdp=await context.newCDPSession(site),worlds=[];
 cdp.on('Runtime.executionContextCreated',e=>worlds.push(e.context));await cdp.send('Runtime.enable');await site.goto('http://127.0.0.1:4173/');
 await expect.poll(()=>worlds.some(w=>w.origin===base)).toBe(true);
 const world=worlds.find(w=>w.origin===base);
 const result=await cdp.send('Runtime.evaluate',{contextId:world.id,expression:"chrome.runtime.sendMessage({type:'getState'})",awaitPromise:true,returnByValue:true});
 expect(result.result.value.ok).toBe(false);expect(result.result.value.error).toContain('trusted');
 const local=await cdp.send('Runtime.evaluate',{contextId:world.id,expression:"chrome.storage.local.get('state').then(()=>false,()=>true)",awaitPromise:true,returnByValue:true});
 expect(local.result.value).toBe(true);
});
test('refreshing usage cannot silently overwrite a newer editor',async()=>{
 await page.getByLabel('Allowed websites',{exact:true}).fill('old-draft.example');
 const other=await context.newPage();await other.goto(base+'/ui/options.html');
 await other.getByLabel('Allowed websites',{exact:true}).fill('new-saved.example');
 await other.getByRole('button',{name:'Save settings',exact:true}).click();await expect(other.getByRole('status')).toContainText('saved');
 await page.getByRole('button',{name:'Refresh usage'}).click();await expect(page.getByRole('status')).toContainText('refreshed');
 await page.getByRole('button',{name:'Save settings',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('changed');expect((await settings()).allowlist).toEqual(['new-saved.example']);
});
test('popup quick-add saves the active website through the protected settings command',async()=>{
 const site=await context.newPage();await site.goto('http://127.0.0.1:4173/');
 const tab=await worker.evaluate(async()=> (await chrome.tabs.query({url:'http://127.0.0.1:4173/*'}))[0]);
 const popup=await context.newPage();
 // Headless Chromium doesn't expose its native toolbar popup as a page.
 // Supply the real site-tab result at the browser API boundary only.
 await popup.addInitScript(tab=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=async command=>{const response=await send(command);if(command.type==='getLiveState'&&response.ok)response.data.tab=tab;return response;};},tab);
 await popup.goto(base+'/ui/popup.html');await expect(popup.locator('#site')).toHaveText('127.0.0.1');
 await popup.getByRole('button',{name:'Add website'}).click();await expect(popup.getByRole('status')).toContainText('added');
 expect((await settings()).groups[0].patterns).toEqual(['127.0.0.1']);
});
test('adapter excludes idle and unfocused intervals with controlled OS API responses',async()=>{
 const s=await settings();s.groups=[group(['127.0.0.1'],600000)];await save(s);
 const site=await context.newPage();await site.goto('http://127.0.0.1:4173/');await site.bringToFront();
 const usage=async()=>Object.values((await send({type:'getState'})).usage).reduce((n,d)=>n+(d.test??0),0);
 await expect.poll(usage,{timeout:12000}).toBeGreaterThan(0);
 for(const kind of ['idle','unfocused']){
  await worker.evaluate(kind=>{
   globalThis.originalWindow??=chrome.windows.getLastFocused;
   chrome.idle.queryState=async()=>kind==='idle'?'idle':'active';
   chrome.windows.getLastFocused=async()=>({...await globalThis.originalWindow(),focused:kind!=='unfocused'});
  },kind);
  const before=await usage(),at=Date.now();
  await expect.poll(()=>worker.evaluate(async()=> (await chrome.storage.local.get('state')).state.checkpoint.at),{timeout:14000}).toBeGreaterThan(at+5500);
  expect(await usage()).toBe(before);
 }
});
test('distraction settings update an already-open site without reload',async()=>{
 await context.route('https://www.youtube.com/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body><h1>Controlled YouTube fixture</h1><ytd-reel-shelf-renderer>Shorts fixture</ytd-reel-shelf-renderer></body></html>'}));
 const site=await context.newPage();await site.goto('https://www.youtube.com/');
 await expect(site.locator('ytd-reel-shelf-renderer')).toBeVisible();
 const s=await settings();s.distractions.youtubeShorts=true;await save(s);
 await expect(site.locator('ytd-reel-shelf-renderer')).toBeHidden({timeout:12000});
 await site.evaluate(()=>{const e=document.createElement('ytd-reel-shelf-renderer');e.textContent='Dynamic Shorts';document.body.append(e);});
 await expect(site.locator('ytd-reel-shelf-renderer').last()).toBeHidden();
 s.distractions.youtubeShorts=false;await save(s);
 await expect(site.locator('ytd-reel-shelf-renderer').last()).toBeVisible({timeout:12000});
});
test('Chinese and English selection preserves drafts and persists across all pages',async()=>{
 await page.getByLabel('Group name').fill('Settings');await page.getByLabel('Website patterns').fill('example.com');
 await page.getByRole('button',{name:'Add group',exact:true}).click();
 await page.getByLabel('Allowed websites',{exact:true}).fill('example.com/work/*');
 await page.getByLabel('Mon',{exact:true}).uncheck();
 await page.getByLabel('Language / 语言',{exact:true}).selectOption('zh-CN');
 await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');
 await expect(page.getByRole('heading',{name:/你的注意力/})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible();
 await expect(page.locator('#allowlist')).toHaveValue('example.com/work/*');
 await expect(page.getByLabel('周一',{exact:true})).not.toBeChecked();
 await page.getByRole('button',{name:'保存设置',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('设置已保存。');
 await page.reload();await expect(page.locator('#language')).toHaveValue('zh-CN');
 const popup=await context.newPage();await popup.goto(base+'/ui/popup.html');
 await expect(popup.getByRole('button',{name:'设置',exact:true})).toBeVisible();
 await expect(popup.locator('#reason')).toContainText('HTTP');
 const blocked=await context.newPage();await blocked.goto(base+'/ui/blocked.html?reason=quota');
 await expect(blocked.getByRole('heading',{name:'为重要的事，留出空间。'})).toBeVisible();
 await page.locator('#language').selectOption('en');await page.getByRole('button',{name:'Save settings',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('Settings saved.');await popup.reload();await expect(popup.getByRole('button',{name:'Settings',exact:true})).toBeVisible();
});

test('Chinese challenge, validation and settings export use the saved language',async()=>{
 const s=await settings();s.language='zh-CN';s.challengeEnabled=true;await save(s);await page.reload();
 await expect(page.locator('#language')).toHaveValue('zh-CN');
 await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
 await expect(page.getByRole('alert')).toHaveText('JSON 文件无效。设置未被修改。');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出设置'}).click();
 const stream=await (await download).createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);
 expect(JSON.parse(Buffer.concat(chunks).toString()).language).toBe('zh-CN');
 await page.locator('#challenge-enabled').uncheck();await page.getByRole('button',{name:'保存设置',exact:true}).click();
 const phrase=await page.locator('#challenge-phrase').innerText();expect(phrase).toContain('我的注意力');
 await page.locator('#challenge-input').fill(phrase);await page.getByRole('button',{name:'确认修改'}).click();
 await expect(page.getByRole('status')).toHaveText('设置已保存。');
 await page.locator('#language').selectOption('en');
 await expect.poll(async()=>(await settings()).language).toBe('en');
});

test('live popup refresh preserves selection and options preserve unsaved drafts',async()=>{
 const s=await settings();s.groups=[group(['127.0.0.1'],60000),{...group(['example.com'],60000),id:'other',name:'Other'}];await save(s);await page.reload();
 await page.locator('#allowlist').fill('unsaved.example');
 const popup=await context.newPage();await popup.goto(base+'/ui/popup.html');
 await popup.locator('#target-group').selectOption('other');
 await expect(popup.locator('#host-usage')).toBeVisible();
 await popup.waitForTimeout(2200);
 await expect(popup.locator('#target-group')).toHaveValue('other');
 await expect(page.locator('#allowlist')).toHaveValue('unsaved.example');
 await expect(page.locator('#stats-chart')).toHaveAttribute('aria-label',/Usage/);
});

test('strict challenge resets edits and accepts composed Chinese input',async()=>{
 await page.locator('#language').selectOption('zh-CN');
 await page.locator('#test-challenge').click();
 const input=page.locator('#challenge-input');
 await input.fill('wrong');await expect(input).toHaveValue('');
 const phrase=await page.locator('#challenge-phrase').textContent();
 expect(phrase).toContain('我的注意力');await input.fill(phrase.slice(0,8));await input.press('Backspace');await expect(input).toHaveValue('');
 await input.fill(phrase.slice(0,8));await input.dispatchEvent('paste');await expect(input).toHaveValue('');
 await input.evaluate((el,text)=>{el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.value=text;el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertCompositionText',isComposing:true}));el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:text}));},phrase);
 await page.locator('#challenge-confirm').click();await expect(page.locator('#challenge-dialog')).not.toBeVisible();
});


test('delayed schedule changes remain visible and CSV exports local statistics',async()=>{
 await page.locator('#intervals').fill('09:00-17:00');await page.locator('#save').click();
 await expect(page.locator('#pending-banner')).toContainText('Pending: 09:00–17:00');
 expect((await settings()).schedule.intervals).toEqual([[0,1440]]);
 await page.reload();await expect(page.locator('#pending-banner')).toContainText('09:00–17:00');
 const download=page.waitForEvent('download');await page.locator('#export-csv').click();expect((await download).suggestedFilename()).toBe('open-stay-focused-usage.csv');
});


test('default protections are enabled and allowance increases require every confirmation',async()=>{
 expect(initialSettings.schemaVersion).toBe(2);expect(initialSettings.challengeEnabled).toBe(true);expect(initialSettings.hidePause).toBe(true);expect(initialSettings.hideQuickAllow).toBe(true);
 const s=await settings();s.groups=[group(['example.com'],60000)];await save(s);await page.reload();
 await expect(page.locator('#pause')).toBeHidden();await page.getByLabel('Minutes per day',{exact:true}).fill('2');await page.locator('#save').click();
 for(let i=1;i<=8;i++){await expect(page.getByRole('heading',{name:`Confirm change ${i} of 8`})).toBeVisible();expect((await settings()).groups[0].budgetMs).toBe(60000);await page.getByRole('button',{name:'Continue',exact:true}).click();}
 await expect(page.getByRole('status')).toContainText('saved');expect((await settings()).groups[0].budgetMs).toBe(120000);
});


test('language selection immediately reaches popup without saving website drafts',async()=>{
 await page.locator('#allowlist').fill('unsaved.example');
 await page.locator('#language').selectOption('zh-CN');
 await expect(page.getByRole('status')).toHaveText('语言已保存。其他修改仍需点击保存设置。');
 expect((await settings()).allowlist).not.toContain('unsaved.example');
 expect((await settings()).language).toBe('zh-CN');
 const popup=await context.newPage();await popup.goto(base+'/ui/popup.html');
 await expect(popup.getByRole('button',{name:'设置',exact:true})).toBeVisible();
 await expect(page.locator('#allowlist')).toHaveValue('unsaved.example');
});
