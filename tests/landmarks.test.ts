import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LANDMARKS,restoreExploration,discoverPlace,initialExploration,atObservatoryNight} from '../src/landmarks.ts';
import {sample} from '../src/terrain.ts';
import {solarState} from '../src/sky.ts';
test('three distinct dry landmarks lie outside the village',()=>{
 assert.equal(LANDMARKS.length,3);assert.equal(new Set(LANDMARKS.map(p=>p.id)).size,3);
 for(const p of LANDMARKS){assert.equal(sample(p.up).waterDepth,0);assert.ok(Math.hypot(p.x,p.z)>45);}
});
test('discovery is idempotent and rejects unknown identifiers',()=>{
 let state=initialExploration();state=discoverPlace(state,'arch');state=discoverPlace(state,'arch');state=discoverPlace(state,'alien');assert.deepEqual(state.places,['arch']);
});
test('exploration restore validates data and remains independent from letter saves',()=>{
 for(const raw of [null,'broken','{}','{"places":false}','{"phase":"complete","letters":["bridge"]}'])assert.deepEqual(restoreExploration(raw),initialExploration());
 assert.deepEqual(restoreExploration('{"places":["grove","grove","unknown"],"nightMeeting":"yes"}'),{places:['grove'],nightMeeting:false});
 assert.deepEqual(restoreExploration('{"places":["lookout"],"nightMeeting":true}'),{places:['lookout'],nightMeeting:true});
});
test('Ada evening schedule follows the sky at the telescope, not valley clock labels',()=>{
 const p=LANDMARKS.find(p=>p.id==='lookout')!;
 for(let t=0;t<360;t+=10)assert.equal(atObservatoryNight(t),solarState(t).sunDirection.dot(p.up)<-.12);
});
test('resident relocation never places Ada in the visible frame or beside the player',async()=>{
 const {canRelocateResident}=await import('../src/landmarks.ts');const {normalAt}=await import('../src/terrain.ts');const {PerspectiveCamera}=await import('three');
 const source=normalAt(-40,-37),target=normalAt(20,10),player=normalAt(0,0),camera=new PerspectiveCamera(60,1,.1,1000);camera.position.set(0,90,0);
 camera.lookAt(target.clone().multiplyScalar(66));camera.updateMatrixWorld();assert.equal(canRelocateResident(source,target,player,camera),false);
 camera.lookAt(0,180,0);camera.updateMatrixWorld();assert.equal(canRelocateResident(source,target,player,camera),true);
 assert.equal(canRelocateResident(source,target,target,camera),false);
});
