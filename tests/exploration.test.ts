import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3} from 'three';
import {nightStrength,createNight} from '../src/night.ts';
import {CAMP,createCamp} from '../src/discoveries.ts';
import {sample,RADIUS} from '../src/terrain.ts';
test('night lights follow the local hemisphere and fade through twilight',()=>{
 const up=new Vector3(0,1,0);assert.equal(nightStrength(up,up),0);assert.equal(nightStrength(up,up.clone().negate()),1);
 assert.ok(nightStrength(up,new Vector3(1,0,0))>0);assert.ok(nightStrength(up,new Vector3(1,0,0))<1);
 const scene=new Scene(),night=createNight(scene);night.update(3,up);scene.traverse(o=>assert.ok(!('isPointLight' in o),'night scene must not add point lights'));
});
test('camp is dry on the far side and its note is outside the tent collider',()=>{
 assert.ok(CAMP.up.y<0);assert.equal(sample(CAMP.up).waterDepth,0);
 const scene=new Scene(),camp=createCamp(scene);
 assert.ok(camp.noteUp.distanceTo(camp.obstacle.up)*RADIUS>camp.obstacle.radius+.34);
 assert.ok(scene.children.length>0);
});
