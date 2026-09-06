import {test} from 'node:test';import assert from 'node:assert/strict';
import {initialAzureStory,reduceAzureStory,restoreAzureStory,azureObjective} from '../src/azure-story.ts';
test('the route requires map, both marks, bottle and a lit beacon before writing an ending',()=>{
 let s=initialAzureStory();assert.equal(reduceAzureStory(s,{type:'finish',entry:'welcome',lit:true}),s);
 for(const id of ['old-shelter','azure-pass','birch-trail','azure-cove'])s=reduceAzureStory(s,{type:'read',id});
 assert.equal(s.complete,false);assert.match(azureObjective(s,false),/Зажги/);assert.match(azureObjective(s,true),/запись/);
 assert.equal(reduceAzureStory(s,{type:'finish',entry:'welcome',lit:false}),s);
 s=reduceAzureStory(s,{type:'finish',entry:'welcome',lit:true});assert.equal(s.complete,true);assert.equal(s.entry,'welcome');assert.equal(reduceAzureStory(s,{type:'finish',entry:'home',lit:true}),s);
 assert.deepEqual(restoreAzureStory(JSON.stringify(s)),s);
});
test('out-of-order exploration is remembered, and an already lit beacon can finish the story',()=>{
 let s=initialAzureStory();for(const id of ['azure-cove','birch-trail','azure-pass'])s=reduceAzureStory(s,{type:'read',id});assert.match(azureObjective(s,true),/привал/);s=reduceAzureStory(s,{type:'read',id:'old-shelter'});assert.match(azureObjective(s,true),/запись/);assert.equal(reduceAzureStory(s,{type:'finish',entry:'home',lit:true}).complete,true);
 assert.equal(reduceAzureStory(s,{type:'read',id:'old-shelter'}),s);assert.equal(reduceAzureStory(s,{type:'read',id:'lookout'}),s);
});
test('invalid saves cannot forge a completed story or import unrelated progress',()=>{
 for(const raw of [null,'broken','{}','{"version":2}','{"places":["old-shelter"]}'])assert.deepEqual(restoreAzureStory(raw),initialAzureStory());
 const s=restoreAzureStory(JSON.stringify({version:1,map:false,marks:['alien','azure-pass','azure-pass'],bottle:true,complete:true,entry:'unknown'}));assert.deepEqual(s.marks,['azure-pass']);assert.equal(s.complete,false);assert.equal(s.entry,null);
});

test('dialogue actions require physical presence; journal rereading never advances the quest',async()=>{
 const {createAzureStoryUI}=await import('../src/azure-story-ui.ts');let near=true,lit=true,text='',saved='';const choices:{label:string;run:()=>void}[]=[];
 const ui=createAzureStoryUI({near:()=>near,lit:()=>lit,dialog:(_title,t)=>{text=t;choices.length=0;},choice:(label,run)=>choices.push({label,run}),journal:()=>{},toast:()=>{},load:()=>null,save:raw=>{saved=raw;}});
 ui.read('old-shelter');assert.equal(text,'');ui.choices('old-shelter');near=false;choices[0].run();assert.equal(ui.state.map,false);near=true;choices[0].run();assert.equal(ui.state.map,true);assert.ok(saved);
 for(const id of ['azure-pass','birch-trail','azure-cove']){choices.length=0;ui.choices(id);choices[0].run();}
 const before=JSON.stringify(ui.state);near=false;ui.read('azure-cove');assert.equal(JSON.stringify(ui.state),before);
 near=true;choices.length=0;ui.choices('azure-beacon');choices[0].run();const finish=choices[0].run;lit=false;finish();assert.equal(ui.state.complete,false);lit=true;finish();assert.equal(ui.state.complete,true);
});
