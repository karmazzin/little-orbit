import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createPlayer,step} from '../src/simulation.ts';
import {restoreWorld,serializeWorld} from '../src/persistence.ts';
import {normalAt,riverX,sample} from '../src/terrain.ts';
import {neighborDirection} from '../src/planets.ts';

test('reload preserves player motion, camera and orbital time',()=>{
 const player=createPlayer(new Vector3(0,1,0));
 player.forward.set(1,0,0);
 step(player,{forward:1,right:0,run:false,jump:true},1/60,[]);
 const state={player,solarSeconds:123456,timeSpeed:5,timeStopped:true,distance:23,elevation:-.4};
 const restored=restoreWorld(serializeWorld(state))!;
 assert.ok(restored);
 assert.ok(restored.player.position.distanceTo(player.position)<1e-10);
 assert.ok(restored.player.forward.distanceTo(player.forward)<1e-10);
 assert.equal(restored.solarSeconds,123456);
 assert.equal(restored.timeSpeed,5);assert.equal(restored.timeStopped,true);
 assert.equal(restored.distance,23);assert.equal(restored.elevation,-.4);
 assert.deepEqual(neighborDirection(1,restored.solarSeconds),neighborDirection(1,state.solarSeconds));
 const input={forward:1,right:0,run:false,jump:false};
 step(player,input,1/60,[]);step(restored.player,input,1/60,[]);
 assert.ok(restored.player.position.distanceTo(player.position)<1e-10);
});

test('missing, corrupt and incompatible saves are ignored',()=>{
 const valid=JSON.parse(serializeWorld({player:createPlayer(),solarSeconds:100,timeSpeed:1,timeStopped:false,distance:15,elevation:.55}));
 for(const raw of [null,'{','null','{}',JSON.stringify({...valid,version:99}),JSON.stringify({...valid,solarSeconds:-1}),JSON.stringify({...valid,timeSpeed:2}),JSON.stringify({...valid,player:{...valid.player,up:[0,0,0]}}),JSON.stringify({...valid,player:{...valid.player,forward:valid.player.up}})]){
  assert.equal(restoreWorld(raw),null);
 }
});

test('version two saves retain swimming mode and reconcile the water surface',()=>{
 const player=createPlayer(normalAt(riverX(-15),-15));player.mode='swim';
 const raw=serializeWorld({player,solarSeconds:321,timeSpeed:20,timeStopped:false,distance:12,elevation:.4});
 assert.equal(JSON.parse(raw).version,2);
 const restored=restoreWorld(raw)!;
 assert.equal(restored.player.mode,'swim');
 assert.ok(Math.abs(restored.player.position.length()-sample(player.up).waterLevel)<1e-8);
});
test('legacy snapshots reconcile changed ground without losing time or position',()=>{
 const player=createPlayer();
 const old=JSON.parse(serializeWorld({player,solarSeconds:765,timeSpeed:5,timeStopped:true,distance:18,elevation:.5}));
 old.version=1;delete old.player.mode;old.player.groundHeight=20;
 const restored=restoreWorld(JSON.stringify(old))!;
 assert.ok(restored.player.position.distanceTo(player.position)<1e-8);
 assert.equal(restored.solarSeconds,765);assert.equal(restored.player.mode,'walk');
});
test('invalid movement modes are rejected and obsolete swimming on land becomes walking',()=>{
 const old=JSON.parse(serializeWorld({player:createPlayer(),solarSeconds:1,timeSpeed:1,timeStopped:false,distance:15,elevation:.5}));
 old.version=2;old.player.mode='flying';assert.equal(restoreWorld(JSON.stringify(old)),null);
 old.player.mode='swim';assert.equal(restoreWorld(JSON.stringify(old))!.player.mode,'walk');
});

test('legacy walkers stranded in a changed river recover as swimmers',()=>{
 const player=createPlayer(normalAt(riverX(-15),-15));
 const old=JSON.parse(serializeWorld({player,solarSeconds:765,timeSpeed:5,timeStopped:true,distance:18,elevation:.5}));
 old.version=1;delete old.player.mode;old.player.groundHeight=60;old.player.jumpHeight=0;
 const restored=restoreWorld(JSON.stringify(old))!;
 assert.equal(restored.player.mode,'swim');
 assert.ok(Math.abs(restored.player.position.length()-sample(player.up).waterLevel)<1e-8);
});

test('reloading an airborne walker over water preserves fall altitude',()=>{
 const player=createPlayer(normalAt(riverX(-15),-15));
 player.mode='walk';player.grounded=false;player.groundHeight=sample(player.up).waterLevel;player.jumpHeight=3;player.verticalSpeed=-2;
 player.position.copy(player.up).multiplyScalar(player.groundHeight+player.jumpHeight);
 const restored=restoreWorld(serializeWorld({player,solarSeconds:50,timeSpeed:1,timeStopped:false,distance:15,elevation:.5}))!;
 assert.ok(restored);assert.equal(restored.player.mode,'walk');
 assert.ok(restored.player.position.distanceTo(player.position)<1e-8);
});
