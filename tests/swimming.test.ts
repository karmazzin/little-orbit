import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalAt,sample,RADIUS,riverX} from '../src/terrain.ts';
import * as sim from '../src/simulation.ts';
const idle={forward:0,right:0,run:false,jump:false};
function bank(){
 for(let x=riverX(-15)-5;x<riverX(-15);x+=.025){
  const up=normalAt(x,-15);
  if(sample(up).waterDepth===0&&sample(normalAt(x+.1,-15)).waterDepth>0)return sim.createPlayer(up);
 }
 throw new Error('No bank found in valley river fixture');
}
test('walking stops at even shallow water until the player deliberately enters',()=>{
 const p=bank();
 for(let i=0;i<60;i++)sim.step(p,{...idle,right:1},1/60,[]);
 assert.equal(sample(p.up).waterDepth,0);
 assert.equal(p.mode,'walk');
 assert.equal(sim.movementAction(p,[]),'swim');
 sim.step(p,{...idle,toggleMode:true},1/60,[]);
 assert.equal(p.mode,'swim');assert.ok(sample(p.up).waterDepth>0);
 assert.ok(Math.abs(p.position.length()-sample(p.up).waterLevel)<1e-8);
});
test('a swimmer cannot walk onto land or jump, but can deliberately leave an accessible bank',()=>{
 const p=bank();
 assert.equal(typeof sim.movementAction,'function');
 sim.step(p,{...idle,toggleMode:true},1/60,[]);
 for(let i=0;i<60;i++)sim.step(p,{...idle,right:-1,jump:true},1/60,[]);
 assert.equal(p.mode,'swim');assert.ok(sample(p.up).waterDepth>0);assert.equal(p.jumpHeight,0);
 assert.equal(sim.movementAction(p,[]),'walk');
 sim.step(p,{...idle,toggleMode:true},1/60,[]);
 assert.equal(p.mode,'walk');assert.equal(sample(p.up).waterDepth,0);
});
test('shoreline actions cannot teleport through a solid obstacle',()=>{
 const p=bank(),start=p.up.clone();
 assert.equal(typeof sim.movementAction,'function');
 const wall={up:p.up.clone(),radius:3};
 assert.equal(sim.movementAction(p,[wall]),null);
 sim.step(p,{...idle,toggleMode:true},1/60,[wall]);
 assert.equal(p.mode,'walk');assert.ok(p.up.distanceTo(start)<1e-10);
});
test('falling into water enters swimming at the water surface',()=>{
 const p=sim.createPlayer(normalAt(riverX(-15),-15));
 p.mode='walk';p.groundHeight=sample(p.up).height;p.jumpHeight=5;p.grounded=false;p.verticalSpeed=-2;
 for(let i=0;i<120;i++)sim.step(p,idle,1/60,[]);
 assert.equal(p.mode,'swim');assert.equal(p.jumpHeight,0);assert.equal(p.verticalSpeed,0);
 assert.ok(Math.abs(p.position.length()-sample(p.up).waterLevel)<1e-8);
});
test('river currents move idle swimmers downstream while retaining tangent orientation',()=>{
 const p=sim.createPlayer(normalAt(riverX(-15),-15));p.mode='swim';
 const start=p.up.clone();
 for(let i=0;i<30;i++)sim.step(p,idle,1/60,[]);
 assert.ok(p.up.distanceTo(start)*RADIUS>.015);
 assert.ok(p.up.clone().sub(start).dot(sample(start).flow)>0);
 assert.ok(Math.abs(p.forward.dot(p.up))<1e-9);assert.ok(Math.abs(p.up.length()-1)<1e-9);
});
test('swimmers cannot climb onto the middle of a bridge',()=>{
 const p=sim.createPlayer(normalAt(riverX(2),2));p.mode='swim';
 assert.equal(typeof sim.movementAction,'function');
 for(let i=0;i<60;i++){
  const action=sim.movementAction(p,[]);
  if(action==='walk') {const before=p.up.clone();sim.step(p,{...idle,toggleMode:true},1/60,[]);assert.equal(sample(p.up).bridge,false);assert.ok(before.distanceTo(p.up)*RADIUS<=2.6);break;}
  sim.step(p,{...idle,forward:1},1/60,[]);
  assert.equal(sample(p.up).bridge,false);
 }
});

test('running cannot climb a steep dry mountain face',()=>{
 const p=sim.createPlayer(normalAt(-44,-88)),start=p.up.clone();
 assert.equal(sample(start).waterDepth,0);
 for(let i=0;i<60;i++)sim.step(p,{...idle,forward:1,run:true},1/60,[]);
 assert.ok(p.up.distanceTo(start)*RADIUS<.01);
});
