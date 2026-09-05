import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3} from 'three';
import {createWildlife} from '../src/wildlife.ts';
import {normalAt,sample,RADIUS} from '../src/terrain.ts';
test('wildlife stays finite, rabbits remain on dry ground and avoid obstacles',()=>{
 const obstacle={up:normalAt(-13,6),radius:1.2},animals=createWildlife(new Scene(),[obstacle]);
 for(let i=0;i<600;i++){animals.update(i*.05,.05,normalAt(-15,6),new Vector3(0,1,0));for(const rabbit of animals.rabbits){assert.ok(Math.abs(rabbit.up.length()-1)<1e-8);assert.ok(sample(rabbit.up).waterDepth<=.1);assert.ok(rabbit.up.distanceTo(obstacle.up)*RADIUS>obstacle.radius+.3);}}
 assert.equal(animals.rabbits.length,3);assert.equal(animals.count,21);
});
test('approaching player makes a rabbit move away',()=>{
 const animals=createWildlife(new Scene(),[]),rabbit=animals.rabbits[0],player=rabbit.up.clone().add(new Vector3(.008,0,0)).normalize(),before=rabbit.up.distanceTo(player);
 animals.update(1,.05,player,new Vector3(0,1,0));assert.ok(rabbit.up.distanceTo(player)>before);
});
