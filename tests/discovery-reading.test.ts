import {test} from 'node:test';import assert from 'node:assert/strict';
import {nextDiscoveryReading} from '../src/discovery-reading.ts';
test('new nearby entries open one at a time, nearest first, and never interrupt a modal',()=>{
 const entries=[{id:'grove',distance:5,radius:7,unread:true},{id:'camp',distance:2,radius:3.2,unread:true}];
 assert.equal(nextDiscoveryReading(entries,true),null);assert.equal(nextDiscoveryReading(entries,false),'camp');entries[1].unread=false;assert.equal(nextDiscoveryReading(entries,false),'grove');entries[0].unread=false;assert.equal(nextDiscoveryReading(entries,false),null);
 assert.equal(nextDiscoveryReading([{id:'far',distance:9,radius:7,unread:true}],false),null);
});
test('a newly added lore page can open even when its location was discovered in an older save',async()=>{
 const {createAzureStoryUI}=await import('../src/azure-story-ui.ts');let near=true,shown=0,saved='';
 const host={near:()=>near,lit:()=>false,dialog:()=>{shown++;},choice:()=>{},journal:()=>{},toast:()=>{},load:()=>saved||null,save:(raw:string)=>{saved=raw;}};
 const ui=createAzureStoryUI(host);assert.equal(ui.unread('old-shelter'),true);near=false;assert.equal(ui.discover('old-shelter'),false);assert.equal(shown,0);
 near=true;assert.equal(ui.discover('old-shelter','Описание места'),true);assert.equal(shown,1);assert.equal(ui.state.map,true);assert.equal(ui.discover('old-shelter'),false);assert.equal(shown,1);
 const restored=createAzureStoryUI(host);assert.equal(restored.unread('old-shelter'),false);assert.equal(restored.discover('old-shelter'),false);restored.read('old-shelter');assert.equal(shown,2);
});
