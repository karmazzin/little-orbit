import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {normalAt, sample, RADIUS, riverX} from '../src/terrain.ts';
import {createPlayer, step} from '../src/simulation.ts';
import {initialStory, reduceStory, restoreStory} from '../src/story.ts';

test('surface is finite across poles and continuous around south pole',()=>{
 for (const n of [new Vector3(0,1,0),new Vector3(0,-1,0),normalAt(30,30)]) assert.ok(Number.isFinite(sample(n).height));
 assert.ok(Math.abs(sample(new Vector3(.000001,-1,0).normalize()).height-sample(new Vector3(-.000001,-1,0).normalize()).height)<.001);
});
test('lake and river have deep water, bridge is dry, ford is shallow',()=>{
 assert.ok(sample(normalAt(12,30)).waterDepth>.6);
 assert.ok(sample(normalAt(riverX(-15),-15)).waterDepth>.6);
 assert.equal(sample(normalAt(riverX(0),0)).bridge,true);
 assert.equal(sample(normalAt(riverX(0),0)).waterDepth,0);
 assert.ok(sample(normalAt(riverX(-26),-26)).waterDepth<=.4);
});
test('walking crosses pole with normalized position and tangent heading',()=>{
 const p=createPlayer(normalAt(0,4));
 for(let i=0;i<300;i++) step(p,{forward:1,right:0,run:false,jump:false},1/60,[]);
 assert.ok(p.up.z<0); assert.ok(Math.abs(p.up.length()-1)<1e-8); assert.ok(Math.abs(p.forward.dot(p.up))<1e-8);
 assert.ok(Math.abs(p.position.length()-sample(p.up).height)<.01);
});
test('solid obstacles prevent penetration',()=>{
 const p=createPlayer(normalAt(0,0)); const obstacle={up:normalAt(0,-2),radius:1};
 for(let i=0;i<120;i++)step(p,{forward:1,right:0,run:false,jump:false},1/60,[obstacle]);
 assert.ok(p.up.distanceTo(obstacle.up)*RADIUS>=1.3); assert.ok(p.up.z<-.001);
});
test('deep water blocks movement and bridge allows crossing',()=>{
 const p=createPlayer(normalAt(3,-15));
 for(let i=0;i<240;i++)step(p,{forward:0,right:1,run:false,jump:false},1/60,[]);
 assert.ok(sample(p.up).waterDepth<=.48);
 const q=createPlayer(normalAt(6,0));
 for(let i=0;i<240;i++)step(q,{forward:0,right:1,run:false,jump:false},1/60,[]);
 assert.ok(q.up.x>normalAt(15,0).x);
});
test('jump returns to terrain without falling through',()=>{
 const p=createPlayer(); step(p,{forward:0,right:0,run:false,jump:true},1/60,[]); assert.ok(p.jumpHeight>0);
 for(let i=0;i<180;i++) step(p,{forward:0,right:0,run:false,jump:false},1/60,[]);
 assert.equal(p.jumpHeight,0); assert.equal(p.verticalSpeed,0);
});
test('quest requires accepting, three distinct letters, and returning',()=>{
 let s=initialStory(); s=reduceStory(s,{type:'collect',id:'bridge'});assert.equal(s.letters.length,0);
 s=reduceStory(s,{type:'accept'});s=reduceStory(s,{type:'collect',id:'bridge'});s=reduceStory(s,{type:'collect',id:'bridge'});assert.equal(s.letters.length,1);
 s=reduceStory(s,{type:'finish'});assert.equal(s.phase,'active');
 for(const id of ['lake','hill'])s=reduceStory(s,{type:'collect',id});
 s=reduceStory(s,{type:'finish'});assert.equal(s.phase,'complete');
});
test('malformed saved progress is reset and unknown letters rejected',()=>{
 assert.deepEqual(restoreStory('broken'),initialStory());
 assert.deepEqual(restoreStory('{"phase":"complete","letters":[]}'),initialStory());
 assert.deepEqual(restoreStory('{"phase":"active","letters":["bridge","bridge","fake"]}').letters,['bridge']);
});
