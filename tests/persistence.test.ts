import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createPlayer,step} from '../src/simulation.ts';
import {restoreWorld,serializeWorld} from '../src/persistence.ts';
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
