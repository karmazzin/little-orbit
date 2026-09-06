import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {Soundscape,spatialMix,footSurface} from '../src/soundscape.ts';
import {normalAt} from '../src/terrain.ts';

const up=normalAt(0,0),forward=new Vector3(0,0,-1);
const frame=()=>({up:up.clone(),forward,sun:up.clone(),active:true,walking:true,moving:false,grounded:true,bell:null});
test('local sound is silent beyond its range and pans relative to the listener on a sphere',()=>{
 assert.equal(spatialMix(up,forward,normalAt(50,0),18).gain,0);
 assert.equal(spatialMix(up,forward,up.clone().negate(),18).gain,0);
 assert.ok(spatialMix(up,forward,normalAt(4,0),18).pan>.9);
 assert.ok(spatialMix(up,forward.clone().negate(),normalAt(4,0),18).pan<-.9);
 assert.ok(spatialMix(up,forward,normalAt(2,0),18).gain>spatialMix(up,forward,normalAt(12,0),18).gain);
});
test('footsteps distinguish the wooden bridge, rocky ford, and grass',()=>{
 assert.equal(footSurface(normalAt(10,0)),'wood');
 assert.equal(footSurface(normalAt(10,-26)),'stone');
 assert.equal(footSurface(normalAt(-4,4)),'grass');
});
test('steps depend on actual ground travel, never input against a wall, air, pause or teleport',()=>{
 const model=new Soundscape([],()=>.5),f=frame();model.update(.1,f);
 for(let i=0;i<30;i++)assert.equal(model.update(.1,{...f,moving:true}).shots.length,0);
 const sounds=[];
 for(let i=1;i<=25;i++)sounds.push(...model.update(.05,{...f,up:normalAt(-i*.15,0),moving:true}).shots);
 assert.ok(sounds.length>=2);assert.ok(sounds.every(s=>s.id.startsWith('step-')));
 assert.notEqual(sounds[0].id,sounds[1].id);
 assert.equal(model.update(.05,{...f,up:normalAt(100,0),moving:true}).shots.length,0);
 for(let i=0;i<20;i++)assert.equal(model.update(.05,{...f,up:normalAt(i*.2,0),moving:true,grounded:false}).shots.length,0);
 assert.equal(model.update(.05,{...f,moving:true,walking:false}).shots.length,0);
});
test('birds are sparse in daylight, absent at night; insects only sound at night',()=>{
 const model=new Soundscape([normalAt(2,0)],()=>.5),f=frame();
 let birds=0;
 for(let i=0;i<1200;i++){
  const mix=model.update(.1,f);birds+=mix.shots.filter(s=>s.id.startsWith('bird-')).length;
  assert.equal(mix.loops.find(s=>s.id==='crickets')!.gain,0);
 }
 assert.ok(birds>=2&&birds<=6);
 let insects=false;
 for(let i=0;i<600;i++){
  const mix=model.update(.1,{...f,sun:up.clone().negate()});
  assert.ok(mix.shots.every(s=>!s.id.startsWith('bird-')));
  insects||=mix.loops.find(s=>s.id==='crickets')!.gain>0;
 }
 assert.ok(insects);
});
test('water and leaves are local, overview is silent, and bell needs a nearby active source',()=>{
 const model=new Soundscape([normalAt(-4,4)],()=>.5),f=frame();
 let mix=model.update(.1,{...f,up:normalAt(10,0)});
 assert.ok(mix.loops.find(s=>s.id==='river')!.gain>.1);
 mix=model.update(.1,{...f,up:normalAt(-4,4)});
 assert.ok(mix.loops.find(s=>s.id==='leaves')!.gain>.1);
 mix=model.update(.1,{...f,up:up.clone().negate()});
 assert.equal(mix.loops.find(s=>s.id==='river')!.gain,0);
 assert.equal(mix.loops.find(s=>s.id==='leaves')!.gain,0);
 assert.deepEqual(model.update(.1,{...f,active:false}),{loops:[],shots:[]});
 let bells=0;
 for(let i=0;i<100;i++)bells+=model.update(.1,{...f,bell:normalAt(2,0)}).shots.filter(s=>s.id==='bell').length;
 assert.ok(bells>0&&bells<4);
 for(let i=0;i<100;i++)assert.ok(model.update(.1,{...f,bell:normalAt(50,0)}).shots.every(s=>s.id!=='bell'));
});

test('swimming never produces footsteps even when the surface controller is grounded',()=>{
 const model=new Soundscape([],()=>.5),f=frame();
 for(let i=0;i<45;i++){
  const mix=model.update(.05,{...f,up:normalAt(12,27+i*.08),moving:true,grounded:true});
  assert.ok(mix.shots.every(s=>!s.id.startsWith('step-')));
 }
});

test('remote river mouths have local water ambience',async()=>{
 const {BASINS}=await import('../src/hydrology.ts');
 const model=new Soundscape([],()=>.5),f=frame();
 const sea=BASINS.find(b=>b.name==='Лазурное море')!;
 const {Quaternion}=await import('three');
 const shore=normalAt(sea.radius,0).applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),sea.up));
 assert.ok(model.update(.1,{...f,up:shore}).loops.find(s=>s.id==='river')!.gain>.08);
});

test('fire ambience is local and disappears when the fire is out or audio is inactive',()=>{
 const model=new Soundscape([],()=>.5),f=frame(),fire=normalAt(-10,-4);
 const sound=(up:Vector3,lit=true)=>model.update(.1,{...f,up,fire:lit?fire:null}).loops.find(s=>s.id==='fire')!;
 assert.ok(sound(fire).gain>.9);assert.equal(sound(fire.clone().negate()).gain,0);assert.equal(sound(fire,false).gain,0);
 assert.deepEqual(model.update(.1,{...f,up:fire,fire,active:false}),{loops:[],shots:[]});
});
