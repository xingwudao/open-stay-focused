import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleVisits,pageTimer} from '../extension/core/tracking.js';
import {initialState} from '../extension/core/accounting.js';
const now=100000,win={id:1,focused:true,state:'normal'};
const tabs=[{id:1,windowId:1,active:true,url:'https://a.example/work'},{id:2,windowId:1,active:false,url:'https://b.example/',audible:true}];
const beats=new Map([[1,{at:now,url:tabs[0].url}]]);
test('foreground and optional audio tracking use browser eligibility',()=>{
 assert.deepEqual(eligibleVisits({tabs,win,idle:'active',beats,now,trackAudio:false}),[{url:tabs[0].url,tabId:1}]);
 assert.equal(eligibleVisits({tabs,win,idle:'active',beats,now,trackAudio:true}).length,2);
 assert.deepEqual(eligibleVisits({tabs,win:{...win,focused:false},idle:'active',beats,now,trackAudio:false}),[]);
 assert.deepEqual(eligibleVisits({tabs,win:{...win,state:'minimized'},idle:'active',beats,now,trackAudio:false}),[]);
 assert.deepEqual(eligibleVisits({tabs,win,idle:'locked',beats,now,trackAudio:true}),[]);
 assert.equal(eligibleVisits({tabs,win,idle:'idle',beats,now,trackAudio:true}).length,1);
 assert.equal(eligibleVisits({tabs,win,idle:'active',beats,now:now+16000,trackAudio:false}).length,0);
});
test('page timer payload exposes only current-page totals and display preference',()=>{
 const state=initialState();state.settings.showTimer=true;state.settings.groups=[{id:'g',name:'Private name',enabled:true,budgetMs:60000,patterns:['a.example']}];
 const timer=pageTimer(tabs[0],state,now,true);
 assert.equal(timer.show,true);assert.equal(timer.remainingMs,60000);assert.equal(timer.running,true);
 assert.equal(JSON.stringify(timer).includes('Private name'),false);assert.equal('state' in timer,false);
 assert.equal(pageTimer(tabs[1],state,now,false).show,false);
});

test('focused toolbar popup counts its active site without bypassing idle or visibility rules',()=>{
 const input={tabs,win:{...win,focused:false},idle:'active',beats,now,popupFocused:true};
 assert.deepEqual(eligibleVisits(input),[{url:tabs[0].url,tabId:1}]);
 for(const idle of ['idle','locked'])assert.deepEqual(eligibleVisits({...input,idle}),[]);
 assert.deepEqual(eligibleVisits({...input,win:{...input.win,state:'minimized'}}),[]);
 assert.deepEqual(eligibleVisits({...input,now:now+16000,popupFocused:false}),[]);
 assert.deepEqual(eligibleVisits({...input,popupFocused:false}),[]);
 assert.deepEqual(eligibleVisits({...input,tabs:tabs.map(t=>({...t,active:false}))}),[]);
});

test('focused popup is fresh activity evidence even before page heartbeat recovers',()=>{
 const input={tabs,win:{...win,focused:false},idle:'active',beats:new Map(),now,popupFocused:true};
 assert.deepEqual(eligibleVisits(input),[{url:tabs[0].url,tabId:1}]);
 assert.deepEqual(eligibleVisits({...input,popupFocused:false}),[]);
});
