import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createPlayer,step} from '../src/simulation.ts';
import type {TerrainSample} from '../src/terrain.ts';
const env={radius:51.2,sample:(_n:Vector3):TerrainSample=>({height:52,waterDepth:0,waterLevel:51,flow:new Vector3(),bridge:false,ford:false,wet:false,path:true,biome:'meadow',region:'Янтарь'})};
test('movement respects an independent planet radius and surface without changing Khvoya defaults',()=>{
 const p=createPlayer(new Vector3(0,1,0),env);assert.equal(p.position.length(),52);
 const old=p.up.clone();for(let i=0;i<60;i++)step(p,{forward:1,right:0,run:false,jump:false},1/60,[],env);
 assert.ok(Math.abs(old.angleTo(p.up)*env.radius-2.8)<.01);assert.ok(Math.abs(p.position.length()-52)<1e-9);
 assert.notEqual(createPlayer().position.length(),52);
});

test('restoring a foreign world uses its terrain and keeps surface position',async()=>{
 const {serializeWorld,restoreWorld}=await import('../src/persistence.ts');
 const p=createPlayer(new Vector3(0,1,0),env);step(p,{forward:1,right:0,run:false,jump:false},1/30,[],env);
 const raw=serializeWorld({player:p,solarSeconds:155,timeSpeed:1,timeStopped:false,distance:10,elevation:.4});
 const saved=restoreWorld(raw,env)!;assert.ok(saved);assert.ok(saved.player.up.distanceTo(p.up)<1e-10);assert.ok(Math.abs(saved.player.position.length()-52)<1e-10);
 assert.notEqual(restoreWorld(raw)!.player.position.length(),52);
});
