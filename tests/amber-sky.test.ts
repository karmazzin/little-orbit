import {test} from 'node:test';import assert from 'node:assert/strict';import {Vector3} from 'three';
import {amberSolarState,amberNeighborPosition,AMBER_NEIGHBORS,amberPlanetAim} from '../src/amber-sky.ts';import {neighborPosition} from '../src/planets.ts';
test('Amber sky uses its actual orbit and shows Khvoya instead of itself',()=>{
 assert.deepEqual([...AMBER_NEIGHBORS],['Хвоя','Лазурь','Ирис','Рубин']);for(const t of [0,155,800,1500]){const state=amberSolarState(t);assert.ok(state.planetPosition.distanceTo(neighborPosition(0,t))<1e-9);assert.ok(Math.abs(state.sunDirection.length()-1)<1e-9);for(let i=0;i<4;i++){const n=amberNeighborPosition(i,t);assert.ok(Number.isFinite(n.length()));const up=n.clone().normalize();assert.ok(amberPlanetAim(i,t,up,new Vector3(0,1,0)));assert.equal(amberPlanetAim(i,t,up.clone().negate(),new Vector3(0,1,0)),null);}}
});
