import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildHearth,hearthLayout,fireSamples} from '../src/hearth.ts';
import {normalAt,RADIUS} from '../src/terrain.ts';
const up=normalAt(-10,-4);
test('hearth seats have clear inward approaches between logs and fire',()=>{
 const layout=hearthLayout(up);assert.equal(layout.seats.length,4);
 for(const seat of layout.seats){
  assert.ok(Math.abs(seat.length()-1)<1e-9);
  for(const o of layout.obstacles)assert.ok(seat.distanceTo(o.up)*RADIUS>o.radius+.35);
  assert.ok(seat.distanceTo(up)*RADIUS>1.8);
 }
});
test('daylight extinguishes flames, sparks and light; animation remains finite',()=>{
 const scene=new T.Scene(),statics=new T.Group();scene.add(statics);const hearth=buildHearth(scene,statics,up);
 const flame=scene.getObjectByName('hearth-flames')!,sparks=scene.getObjectByName('hearth-sparks')!,light=scene.getObjectByName('hearth-light') as T.PointLight;
 assert.ok(flame);assert.equal(flame.visible,false);assert.equal(light.intensity,0);
 hearth.update(20,true);assert.equal(flame.visible,true);assert.equal(sparks.visible,true);assert.ok(light.intensity>0);assert.equal(light.castShadow,false);
 for(const t of [0,1,500,1e9]){hearth.update(t,true);scene.traverse(o=>assert.ok([...o.position,...o.scale,...o.quaternion.toArray()].every(Number.isFinite)));}
 hearth.update(21,false);assert.equal(flame.visible,false);assert.equal(sparks.visible,false);assert.equal(light.intensity,0);
});
test('procedural crackle is deterministic, quiet, finite and seamless',()=>{
 const a=fireSamples(8000),b=fireSamples(8000);assert.deepEqual(a,b);assert.equal(a.length,32000);
 assert.ok(a.some(v=>Math.abs(v)>.01));assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v)<.6));assert.equal(a[0],0);assert.equal(a.at(-1),0);
});
