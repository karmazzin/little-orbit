import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {sample,normalAt,RADIUS} from '../src/terrain.ts';

test('the planet has prominent mountains and hills rather than only small ripples',()=>{
 let low=Infinity,high=-Infinity;
 for(let i=0;i<2000;i++){
  const y=1-2*(i+.5)/2000,a=i*2.399963,r=Math.sqrt(1-y*y);
  const h=sample(new Vector3(Math.cos(a)*r,y,Math.sin(a)*r)).height;
  low=Math.min(low,h);high=Math.max(high,h);
 }
 assert.ok(high>RADIUS+13,`highest peak ${high}`);
 assert.ok(high-low>15,`relief ${high-low}`);
});

test('water belongs to several sides of the globe, including the far hemisphere',()=>{
 let far=0,east=0,west=0;
 for(let i=0;i<6000;i++){
  const y=1-2*(i+.5)/6000,a=i*2.399963,r=Math.sqrt(1-y*y),n=new Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
  if(sample(n).wet){if(y<0)far++;if(n.x>.3)east++;if(n.x<-.3)west++;}
 }
 assert.ok(far>35,`far side wet samples ${far}`);
 assert.ok(east>15&&west>15,`east ${east}, west ${west}`);
});

test('village and old stepping crossing stay dry',()=>{
 for(const [x,z] of [[-4,4],[-4,-8],[23,5],[27,21],[16,-27],[26,34],[7,44],[13,-51]])assert.equal(sample(normalAt(x,z)).wet,false,`${x},${z}`);
 for(let x=4;x<=17;x+=.25)assert.equal(sample(normalAt(x,-26)).wet,false,'stone crossing');
});

test('tributaries join at matching levels and every river drains into another river or basin',async()=>{
 const {RIVERS,BASINS}=await import('../src/hydrology.ts');
 for(const river of RIVERS){
  for(let i=1;i<river.nodes.length;i++)assert.ok(river.nodes[i].level<=river.nodes[i-1].level,`${river.name} flows uphill`);
  const end=river.nodes.at(-1)!;
  const downstream=RIVERS.filter(r=>r!==river).flatMap(r=>r.nodes).find(n=>n.up.distanceTo(end.up)<1e-6&&Math.abs(n.level-end.level)<1e-6);
  const basin=BASINS.find(b=>b.up.angleTo(end.up)*RADIUS<b.radius&&Math.abs(b.level-end.level)<1e-6);
  assert.ok(downstream||basin,`${river.name} has a disconnected outlet`);
 }
});

test('rendered/simulated channel centerlines remain wet and descend continuously',async()=>{
 const {RIVER_SEGMENTS}=await import('../src/hydrology.ts');
 for(const s of RIVER_SEGMENTS){
  const a=sample(s.a),b=sample(s.b);
  assert.ok(a.wet||a.bridge||a.ford,`${s.name} dry centerline`);
  assert.ok(b.waterLevel<=a.waterLevel+.06,`${s.name} water climbs ${a.waterLevel} -> ${b.waterLevel}`);
 }
});

test('sea coastlines have broad coves instead of perfect circular bowls',async()=>{
 const {BASINS,waterAt}=await import('../src/hydrology.ts');
 const {Quaternion}=await import('three');
 const sea=BASINS.find(b=>b.name==='Южное море')!,q=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),sea.up);
 const distances=Array.from({length:24},(_,i)=>waterAt(normalAt(Math.cos(i*Math.PI/12)*sea.radius,Math.sin(i*Math.PI/12)*sea.radius).applyQuaternion(q))!.distance);
 assert.ok(Math.max(...distances)-Math.min(...distances)>3);
});

test('swimmers do not snap vertically where rivers enter lakes or seas',async()=>{
 const {RIVER_SEGMENTS}=await import('../src/hydrology.ts');
 for(const segment of RIVER_SEGMENTS){
  let previous=sample(segment.a),up=segment.a;
  for(let i=1;i<=40;i++){
   const next=segment.a.clone().lerp(segment.b,i/40).normalize(),s=sample(next),distance=up.distanceTo(next)*RADIUS;
   assert.ok(Math.abs(s.waterLevel-previous.waterLevel)<distance*.85+.015,`${segment.name}: ${previous.waterLevel} -> ${s.waterLevel} in ${distance}m`);
   previous=s;up=next;
  }
 }
});
