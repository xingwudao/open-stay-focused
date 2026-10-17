import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSettings,validateSettings,challengeForLanguage,CHALLENGE} from '../extension/core/settings.js';
import {createController} from '../extension/controller.js';
import {initialState} from '../extension/core/accounting.js';
import {setLanguage,t} from '../extension/ui/i18n.js';
test('language is validated and legacy settings default to English',()=>{
 const s=defaultSettings();assert.equal(s.language,'en');
 const old=structuredClone(s);delete old.language;
 assert.equal(validateSettings(old).language,'en');
 assert.equal(validateSettings({...s,language:'zh-CN'}).language,'zh-CN');
 for(const language of ['fr',null,undefined,'zh'])assert.throws(()=>validateSettings({...s,language}));
});
test('stored legacy state migrates without changing quotas or nuclear deadline',async()=>{
 let stored=initialState();delete stored.settings.language;stored.usage={'2026-10-17':{g:2345}};
 stored.nuclear={startAt:0,endAt:9999999999999,mode:'all',policySnapshot:structuredClone(stored.settings)};
 const c=createController({clock:()=>new Date('2026-10-17T12:00:00').getTime(),storage:{get:async()=>structuredClone(stored),set:async s=>stored=structuredClone(s)}});
 const state=await c.snapshot();assert.equal(state.settings.language,'en');assert.equal(stored.settings.language,'en');
 assert.equal(state.usage['2026-10-17'].g,2345);assert.equal(state.nuclear.endAt,9999999999999);
});
test('Chinese challenge uses saved language, including language-switching writes',async()=>{
 let stored=initialState();stored.settings.language='zh-CN';stored.settings.challengeEnabled=true;
 const c=createController({storage:{get:async()=>stored,set:async s=>stored=structuredClone(s)}});
 const settings={...stored.settings,language:'en'};
 await assert.rejects(c.handle({type:'saveSettings',settings,revision:0,challenge:CHALLENGE},{trustedUI:true}),/challenge/);
 await c.handle({type:'saveSettings',settings,revision:0,challenge:challengeForLanguage('zh-CN')},{trustedUI:true});
 assert.equal((await c.snapshot()).settings.language,'en');
});
test('translations format text safely and fall back to English',()=>{
 setLanguage('zh-CN');assert.equal(t('Save settings'),'保存设置');
 assert.equal(t('{minutes}m {seconds}s',{minutes:2,seconds:'03'}),'2分03秒');
 assert.equal(t('Unknown diagnostic'),'Unknown diagnostic');
 setLanguage('en');assert.equal(t('Save settings'),'Save settings');
});
