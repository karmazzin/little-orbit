import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildLandscape} from '../src/landscape-view.ts';
import {character} from '../src/view.ts';
import {CLOUD_BASE_RADIUS,ATMOSPHERE_RADIUS} from '../src/environment.ts';
import {RIVER_SEGMENTS,BASINS,waterAt} from '../src/hydrology.ts';
import {sample} from '../src/terrain.ts';

test('shared landscape covers narrow remote rivers at their actual elevations and clips dry land',()=>{
 const {ground,water}=buildLandscape();ground.updateMatrixWorld();water.updateMatrixWorld();
 assert.ok((ground.geometry.getAttribute('position').count+water.geometry.getAttribute('position').count)/3<190000,'landscape stays within the GPU triangle budget');
 const ray=new T.Raycaster(),up=new T.Vector3();
 const stations=[...RIVER_SEGMENTS.filter((_,i)=>i%7===0).map(s=>s.a.clone().add(s.b).normalize()),...BASINS.map(b=>b.up)];
 for(const n of stations){
  ray.set(n.clone().multiplyScalar(110),n.clone().negate());
  const hits=ray.intersectObject(water);assert.ok(hits.length,`missing water at ${n.toArray()}`);
  assert.ok(Math.abs(hits[0].point.length()-waterAt(n)!.level)<.25,'water tracks local river level');
  const terrain=ray.intersectObject(ground)[0];if(sample(n).wet)assert.ok(terrain.distance>hits[0].distance,'water covers channel bed');
 }
 const positions=water.geometry.getAttribute('position');
 let maxDryOverlap=-Infinity,worstShore='';
 for(let i=0;i<positions.count;i+=3){up.set(0,0,0);for(let j=0;j<3;j++)up.add(new T.Vector3().fromBufferAttribute(positions,i+j));up.normalize();const shore=waterAt(up)!;if(shore.distance>maxDryOverlap){maxDryOverlap=shore.distance;worstShore=`${shore.name} at ${up.toArray()}`;}}
 assert.ok(maxDryOverlap<.05,`maximum dry overlap ${maxDryOverlap.toFixed(4)}m: ${worstShore}`);
 // Every ground edge must meet another face, including adaptive river-bank borders.
 const terrain=ground.geometry.getAttribute('position'),edges=new Map<string,number>();
 const vertexKey=(i:number)=>[terrain.getX(i),terrain.getY(i),terrain.getZ(i)].map(v=>v.toFixed(4)).join(',');
 for(let i=0;i<terrain.count;i+=3)for(let j=0;j<3;j++){const a=vertexKey(i+j),b=vertexKey(i+(j+1)%3);if(a===b)continue;const edge=[a,b].sort().join('|');edges.set(edge,(edges.get(edge)??0)+1);}
 assert.equal([...edges.values()].filter(count=>count===1).length,0,'ground is watertight at all adaptive polygon seams');
 let highest=0;for(let i=0;i<terrain.count;i++)highest=Math.max(highest,up.fromBufferAttribute(terrain,i).length());
 assert.ok(highest>80);assert.ok(CLOUD_BASE_RADIUS-1.1>highest+1);assert.ok(ATMOSPHERE_RADIUS>CLOUD_BASE_RADIUS+4);
 assert.ok(water.geometry.getAttribute('flow'));assert.equal(water.customDepthMaterial?.depthWrite,false);
});
test('swimming is horizontal with a raised head and restores walking pose',()=>{
 const hero=character(0x996633,true);hero.animate(.2,true,true);
 const head=hero.body.children.find(o=>o.position.y===1.58)!;hero.root.updateMatrixWorld(true);
 const point=head.getWorldPosition(new T.Vector3());assert.ok(point.y>0);assert.ok(Math.abs(hero.body.rotation.x)>1);
 const stroke=hero.body.children.at(-1)!.rotation.x;hero.animate(.5,true,true);assert.notEqual(hero.body.children.at(-1)!.rotation.x,stroke);
 hero.animate(.5,false);assert.equal(hero.body.rotation.x,0);assert.equal(hero.body.position.y,0);
});
