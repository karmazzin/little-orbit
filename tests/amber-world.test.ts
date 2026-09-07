import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {AMBER_RADIUS,AMBER_PLACES,AMBER_SPAWN,AMBER_LAKES,AMBER_TRAILS,AMBER_STREAMS,amberSample,buildAmberWorld} from '../src/amber-world.ts';

test('Amber places and trails cover every side with gentle dry approaches',()=>{
 assert.equal(AMBER_RADIUS,51.2);
 for(const axis of [new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)])for(const sign of [-1,1])assert.ok(AMBER_PLACES.some(p=>p.up.dot(axis)*sign>.65));
 for(const p of AMBER_PLACES){assert.ok(amberSample(p.up).path,p.id);assert.equal(amberSample(p.up).wet,false,p.id);}
 for(const [a,b] of AMBER_TRAILS)for(let t=0;t<=1;t+=.04){const n=a.clone().lerp(b,t).normalize();assert.ok(amberSample(n).path);assert.equal(amberSample(n).waterDepth,0);}
});
test('three connected lakes have shallow accessible banks and no mountains',()=>{
 assert.equal(AMBER_LAKES.length,3);
 assert.ok(AMBER_LAKES[0].up.distanceTo(AMBER_LAKES[2].up)*AMBER_RADIUS>65);
 for(const [a,b] of AMBER_STREAMS)for(let t=0;t<=1;t+=.1){const s=amberSample(a.clone().lerp(b,t).normalize());assert.ok(s.wet||s.bridge,'Streams must continuously connect lakes');}
 for(const lake of AMBER_LAKES){assert.ok(amberSample(lake.up).waterDepth>1);const tangent=new T.Vector3(0,1,0).projectOnPlane(lake.up).normalize();let previous=amberSample(lake.up).height;for(let d=.2;d<lake.radius+7;d+=.2){const n=lake.up.clone().multiplyScalar(Math.cos(d/AMBER_RADIUS)).addScaledVector(tangent,Math.sin(d/AMBER_RADIUS));const s=amberSample(n);assert.ok(Math.abs(s.height-previous)<.22);previous=s.height;}}
 for(let i=0;i<1000;i++){const y=1-2*(i+.5)/1000,a=i*2.399963,r=Math.sqrt(1-y*y),s=amberSample(new T.Vector3(r*Math.cos(a),y,r*Math.sin(a)));assert.notEqual(s.biome,'mountain');assert.ok(s.height<AMBER_RADIUS+4);}
});
test('dense forest is instanced, leaves paths clear, and rebuilds deterministically',()=>{
 const scene=new T.Scene(),world=buildAmberWorld(scene);assert.ok(world.treeCount>1600);assert.ok(world.treeCount<4000);assert.ok(world.residents.length>=3);
 for(const o of world.obstacles){assert.ok(o.up.distanceTo(AMBER_SPAWN)*AMBER_RADIUS>6+o.radius);assert.ok(!amberSample(o.up).wet);assert.ok(!amberSample(o.up).path,'Obstacle placed on a trail');}
 const batches:T.InstancedMesh[]=[];let meshes=0;scene.traverse(o=>{if(o instanceof T.InstancedMesh)batches.push(o);if(o instanceof T.Mesh)meshes++;});assert.ok(batches.length>=3);const bridges=scene.getObjectByName('Amber dry footbridges') as T.InstancedMesh;assert.ok(bridges.count>0);assert.ok(meshes<450,`draw meshes ${meshes}`);
 const second=buildAmberWorld(new T.Scene());assert.equal(second.treeCount,world.treeCount);assert.deepEqual(second.obstacles,world.obstacles);
});

test('resident walking stays dry, avoids obstacles, and pauses with zero dt',()=>{const world=buildAmberWorld(new T.Scene()),start=world.residents.map(r=>r.up.clone());world.update(1,0);world.residents.forEach((r,i)=>assert.deepEqual(r.up,start[i]));for(let frame=0;frame<300;frame++){world.update(frame/30,1/30);for(const r of world.residents){assert.equal(amberSample(r.up).wet,false);assert.ok(world.obstacles.every(o=>o.up.distanceTo(r.up)*AMBER_RADIUS>o.radius+.35));}}assert.ok(world.residents.some((r,i)=>r.up.distanceTo(start[i])>.002));});

test('routes use deterministic meanders rather than long straight ribbons',()=>{assert.ok(AMBER_TRAILS.length>100);assert.ok(AMBER_STREAMS.length>20);for(const [a,b] of [...AMBER_TRAILS,...AMBER_STREAMS])assert.ok(a.distanceTo(b)*AMBER_RADIUS<6);const a=AMBER_PLACES[0].up,b=AMBER_PLACES[1].up,normal=new T.Vector3().crossVectors(a,b).normalize();assert.ok(AMBER_TRAILS.slice(0,20).some(([point])=>Math.abs(point.dot(normal))*AMBER_RADIUS>1));});
