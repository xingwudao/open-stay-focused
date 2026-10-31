import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesBeneficialHost,selectBeneficialDestination} from '../extension/core/redirect-policy.js';

const item=(id,url,targetMs=600000)=>({id,name:id,url,enabled:true,targetMs});

test('beneficial host matching includes subdomains but excludes suffixes and unsupported URLs',()=>{
 assert.equal(matchesBeneficialHost('https://docs.example.com/page','https://example.com/guide'),true);
 assert.equal(matchesBeneficialHost('https://example.com/page','https://example.com/guide'),true);
 assert.equal(matchesBeneficialHost('https://notexample.com','https://example.com'),false);
 assert.equal(matchesBeneficialHost('file:///tmp/a.pdf','https://example.com'),false);
});

test('random policy selects uniformly from safe normalized candidates',()=>{
 const pool={policy:'random',items:[item('a','https://a.example/'),item('current','https://current.example/path'),item('blocked','https://blocked.example/'),item('b','https://b.example/'),{...item('off','https://off.example/'),enabled:false}]};
 const input={pool,usage:{},currentUrl:'https://current.example/path#section',isEligible:x=>x.id!=='blocked'};
 assert.equal(selectBeneficialDestination({...input,random:()=>0}).id,'a');
 assert.equal(selectBeneficialDestination({...input,random:()=>.999}).id,'b');
});

test('largest deficit uses positive remaining target and random tie breaking',()=>{
 const pool={policy:'largestDeficit',items:[item('a','https://a.example/',600000),item('b','https://b.example/',900000),item('c','https://c.example/',300000)]};
 const usage={a:100000,b:400000,c:0};
 const first=selectBeneficialDestination({pool,usage,currentUrl:'https://elsewhere.example/',isEligible:()=>true,random:()=>0});
 const last=selectBeneficialDestination({pool,usage,currentUrl:'https://elsewhere.example/',isEligible:()=>true,random:()=>.999});
 assert.deepEqual(first,{id:'a',name:'a',url:'https://a.example/',targetMs:600000,usedMs:100000,remainingMs:500000});
 assert.equal(last.id,'b');
});

test('completed goals remain selectable and empty safe sets return null',()=>{
 const pool={policy:'largestDeficit',items:[item('a','https://a.example/'),item('b','https://b.example/')]};
 assert.equal(selectBeneficialDestination({pool,usage:{a:700000,b:600000},currentUrl:'https://elsewhere.example/',isEligible:()=>true,random:()=>.999}).id,'b');
 assert.equal(selectBeneficialDestination({pool:{...pool,items:[]},usage:{},currentUrl:'',isEligible:()=>true,random:()=>0}),null);
 assert.equal(selectBeneficialDestination({pool,usage:{},currentUrl:'',isEligible:()=>false,random:()=>0}),null);
});
