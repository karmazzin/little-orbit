import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialContent,reduceContent,restoreContent,irisCanBeObserved,contentObjective} from '../src/content.ts';
import {LANDMARKS} from '../src/landmarks.ts';
test('postcard album requires acceptance, three different places and delivery',()=>{
 let s=initialContent();assert.deepEqual(reduceContent(s,{type:'card',id:'arch'}),s);
 s=reduceContent(s,{type:'accept'});s=reduceContent(s,{type:'card',id:'arch'});s=reduceContent(s,{type:'card',id:'arch'});s=reduceContent(s,{type:'card',id:'fake'});assert.equal(s.cards.length,1);
 assert.equal(reduceContent(s,{type:'deliver'}).postcards,'active');
 for(const p of LANDMARKS)s=reduceContent(s,{type:'card',id:p.id});s=reduceContent(s,{type:'deliver'});assert.equal(s.postcards,'complete');assert.deepEqual(reduceContent(s,{type:'deliver'}),s);
});
test('Iris story requires the camp, both marks, telescope observation and Ada',()=>{
 let s=initialContent();assert.deepEqual(reduceContent(s,{type:'observe'}),s);assert.deepEqual(reduceContent(s,{type:'decode'}),s);
 s=reduceContent(s,{type:'clue',id:'arch'});assert.equal(s.clues.length,0);
 for(const id of ['camp','arch','grove'])s=reduceContent(s,{type:'clue',id});assert.equal(s.iris,'searching');
 s=reduceContent(s,{type:'observe'});assert.equal(s.iris,'observed');s=reduceContent(s,{type:'decode'});assert.equal(s.iris,'complete');assert.match(contentObjective(s),/станци/);
});
test('malformed saves cannot grant unearned story rewards',()=>{
 assert.deepEqual(restoreContent('{"postcards":"complete","cards":[],"iris":"complete","clues":[]}'),initialContent());
 const s=restoreContent('{"postcards":"active","cards":["arch","arch","fake"],"iris":"searching","clues":["camp","grove","fake"]}');assert.deepEqual(s.cards,['arch']);assert.deepEqual(s.clues,['camp','grove']);
});
test('there are playable night windows to observe Iris from the telescope',()=>{
 assert.ok(Array.from({length:360},(_,t)=>irisCanBeObserved(t)).some(Boolean));
 assert.ok(Array.from({length:360},(_,t)=>irisCanBeObserved(t)).some(v=>!v));
});
test('free sketches unlock after album delivery and survive reload without changing quest cards',()=>{
 let s=initialContent();
 assert.equal(reduceContent(s,{type:'sketch',id:'cave'}),s);
 s=reduceContent(s,{type:'accept'});
 assert.equal(reduceContent(s,{type:'sketch',id:'cave'}),s);
 for(const p of LANDMARKS)s=reduceContent(s,{type:'card',id:p.id});
 s=reduceContent(s,{type:'deliver'});
 for(const id of ['cave','traveler','lookout'])s=reduceContent(s,{type:'sketch',id});
 assert.deepEqual(s.sketches,['cave','traveler','lookout']);
 assert.equal(s.cards.length,3);assert.equal(s.postcards,'complete');
 assert.equal(reduceContent(s,{type:'sketch',id:'cave'}),s);
 assert.equal(reduceContent(s,{type:'sketch',id:'fake'}),s);
 assert.deepEqual(restoreContent(JSON.stringify(s)),s);
});
