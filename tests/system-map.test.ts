import {test} from 'node:test';
import assert from 'node:assert/strict';
import {systemBodies,orbitPoint} from '../src/system-map.ts';
import {solarState} from '../src/sky.ts';
import {neighborPosition} from '../src/planets.ts';
test('system map has all five bodies at the actual sky simulation positions',()=>{
 for(const t of [0,154.8,3700,18000]){const bodies=systemBodies(t);assert.equal(bodies.length,5);assert.equal(new Set(bodies.map(b=>b.name)).size,5);
 assert.ok(bodies.find(b=>b.home)!.position.distanceTo(solarState(t).planetPosition)<1e-8);
 bodies.filter(b=>!b.home).forEach((b,i)=>assert.ok(b.position.distanceTo(neighborPosition(i,t))<1e-8));}
});
test('each plotted orbit is closed and contains its moving planet',()=>{
 for(const b of systemBodies(1234)){assert.ok(orbitPoint(b,0).distanceTo(orbitPoint(b,Math.PI*2))<1e-8);
 assert.ok(orbitPoint(b,b.phase+1234/b.period*Math.PI*2).distanceTo(b.position)<1e-8);}
});
test('3D atlas puts spheres and inclined orbit lines in the same spatial coordinates',async()=>{
 const {createSystemScene}=await import('../src/system-map.ts');const atlas=createSystemScene();atlas.update(1234);
 assert.equal(atlas.planets.length,5);assert.equal(atlas.orbits.length,5);
 assert.ok(atlas.scene.getObjectByName('atlas-stars'));assert.ok(atlas.orbits.every(line=>line.material.opacity===.3));
 const bodies=systemBodies(1234);atlas.planets.forEach((mesh,i)=>assert.ok(mesh.position.distanceTo(bodies[i].position.clone().multiplyScalar(atlas.scale))<1e-8));
 assert.ok(atlas.orbits.some(line=>{const p=line.geometry.getAttribute('position');for(let i=0;i<p.count;i++)if(Math.abs(p.getZ(i))>1)return true;return false;}));
});
test('atlas worlds have relief and surface colours that make axial rotation visible',async()=>{
 const {createSystemScene}=await import('../src/system-map.ts');const atlas=createSystemScene();
 for(const planet of atlas.planets){const mesh=planet.getObjectByName('terrain') as import('three').Mesh;assert.ok(mesh,'a planet has a terrain surface');const p=mesh.geometry.getAttribute('position');const radii=Array.from({length:p.count},(_,i)=>Math.hypot(p.getX(i),p.getY(i),p.getZ(i)));assert.ok(Math.max(...radii)-Math.min(...radii)>.1);assert.ok(mesh.geometry.getAttribute('color'));}
 atlas.update(0);const before=atlas.planets.map(p=>p.getObjectByName('surface')!.quaternion.clone());atlas.update(30);
 atlas.planets.forEach((p,i)=>assert.ok(p.getObjectByName('surface')!.quaternion.angleTo(before[i])>.1));
});
