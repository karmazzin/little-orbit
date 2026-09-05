import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialAdventures,reduceAdventures,restoreAdventures,festivalAvailable,travelerScheduled} from '../src/adventures.ts';
test('meteor and bell require their quests and handoff, tracks are ordered',()=>{
 let s=initialAdventures();assert.deepEqual(reduceAdventures(s,{type:'meteor-pick'}),s);assert.deepEqual(reduceAdventures(s,{type:'bell-return'}),s);
 for(const type of ['meteor-start','meteor-pick','meteor-return'] as const)s=reduceAdventures(s,{type});assert.equal(s.meteor,'complete');
 s=reduceAdventures(s,{type:'bell-start'});s=reduceAdventures(s,{type:'track',index:2});assert.equal(s.tracks,0);
 s=reduceAdventures(s,{type:'track',index:1});s=reduceAdventures(s,{type:'track',index:2});s=reduceAdventures(s,{type:'bell-pick'});s=reduceAdventures(s,{type:'bell-return'});assert.equal(s.bell,'complete');
});
test('wrong cave symbol resets the sequence and correct sequence solves it once',()=>{
 let s=initialAdventures();s=reduceAdventures(s,{type:'rune',symbol:'tree'});assert.equal(s.runes,0);
 for(const symbol of ['sun','tree','star'])s=reduceAdventures(s,{type:'rune',symbol});assert.equal(s.cave,true);assert.equal(s.runes,3);assert.deepEqual(reduceAdventures(s,{type:'rune',symbol:'tree'}),s);
});
test('bottles and tales are distinct collectible entries',()=>{
 let s=initialAdventures();for(const id of ['bottle-1','bottle-1','bad'])s=reduceAdventures(s,{type:'bottle',id});assert.deepEqual(s.bottles,['bottle-1']);
 for(const id of ['amber','amber','fake'])s=reduceAdventures(s,{type:'tale',id});assert.deepEqual(s.tales,['amber']);
});
test('malformed adventures restore safely and dependent progress is validated',()=>{
 assert.deepEqual(restoreAdventures('bad'),initialAdventures());
 const s=restoreAdventures('{"meteor":"fake","bell":"complete","tracks":0,"cave":true,"runes":0,"bottles":["bad"],"tales":false}');assert.equal(s.bell,'new');assert.equal(s.cave,false);assert.deepEqual(s.bottles,[]);
});
test('celebration requires two completed stories and an evening; traveler has rare visits',()=>{
 const s=initialAdventures();assert.ok(!Array.from({length:360},(_,i)=>festivalAvailable(s,1,i)).some(Boolean));
 assert.ok(Array.from({length:360},(_,i)=>festivalAvailable(s,2,i)).some(Boolean));
 assert.ok(Array.from({length:360},(_,i)=>travelerScheduled(i)).some(Boolean));
 assert.ok(!Array.from({length:360},(_,i)=>travelerScheduled(360+i)).some(Boolean));
});

test('the complete storyteller notebook counts toward the celebration and saves round-trip',()=>{
 let s=initialAdventures();for(const id of ['amber','azure','ruby'])s=reduceAdventures(s,{type:'tale',id});
 for(const symbol of ['sun','tree','star'])s=reduceAdventures(s,{type:'rune',symbol});
 const evening=Array.from({length:360},(_,i)=>i).find(i=>festivalAvailable(s,0,i));assert.notEqual(evening,undefined);
 s=reduceAdventures(s,{type:'festival',completed:0,seconds:evening!});assert.equal(s.festival,true);assert.deepEqual(restoreAdventures(JSON.stringify(s)),s);
});
