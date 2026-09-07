import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,PerspectiveCamera,Quaternion} from 'three';
import {createPlayer} from '../src/simulation.ts';
import {createSessionState,readMovementInput,clearMovementInput} from '../src/runtime/session.ts';
import {FrameClock,FixedStepper} from '../src/runtime/loop.ts';
import {updateGameCamera} from '../src/runtime/camera.ts';

test('held keys and joystick combine, but jumping and swimming queue only until consumed',()=>{
 const s=createSessionState();s.keys.add('KeyW');s.keys.add('ArrowUp');s.keys.add('ShiftRight');s.jumpQueued=true;s.modeQueued=true;
 assert.deepEqual(readMovementInput(s,{forward:.25,right:-.5,run:false}),{forward:1.25,right:-.5,run:true,jump:true,toggleMode:true});
 s.jumpQueued=false;s.modeQueued=false;
 assert.equal(readMovementInput(s,{forward:0,right:0,run:false}).jump,false);
 clearMovementInput(s);assert.deepEqual(readMovementInput(s,{forward:0,right:0,run:false}),{forward:0,right:0,run:false,jump:false,toggleMode:false});
});
test('frame clock clamps simulation while retaining real frame timing and ignores hidden time',()=>{
 const c=new FrameClock();assert.deepEqual(c.next(1000,false),{frameMs:1000/60,dt:1/60,previousDelta:0});
 assert.deepEqual(c.next(1200,false),{frameMs:200,dt:.05,previousDelta:.05});
 assert.equal(c.next(5000,true),null);assert.equal(c.next(8000,false)!.dt,1/60);
 c.reset();assert.equal(c.next(9000,false)!.previousDelta,0);
});
test('fixed steps retain fractions, clear paused backlog, and stop when a step opens a dialog',()=>{
 const c=new FixedStepper();let count=0;c.advance(.01,false,()=>count++);assert.equal(count,0);
 c.advance(.01,false,()=>count++);assert.equal(count,1);
 c.advance(.05,true,()=>count++);c.advance(.01,false,()=>count++);assert.equal(count,1);
 c.reset();let allowed=true;c.advance(.05,false,()=>{count++;allowed=false;},()=>allowed);assert.equal(count,2);
 c.advance(0,true,()=>count++);c.advance(1/60,false,()=>count++);assert.equal(count,3);
});
test('walking camera clears raised terrain and water without changing look direction',()=>{
 const s=createSessionState();s.started=true;s.distance=15;s.elevation=-1;
 const player=createPlayer();player.up.set(0,1,0);player.position.set(0,64,0);player.forward.set(0,0,-1);
 const camera=new PerspectiveCamera(),cameraLook=new Vector3();
 updateGameCamera({session:s,camera,player,dt:100,planetOrbit:{orientation:new Quaternion(),distance:200},welcomeRotation:0,sample:()=>({height:65,wet:true,waterLevel:68})},cameraLook);
 assert.ok(Math.abs(camera.position.length()-69.5)<1e-8);
 assert.ok(camera.up.distanceTo(player.up)<1e-8);
 const expected=new Vector3(0,-15*Math.sin(-1),-15*Math.cos(-1)).normalize();
 assert.ok(cameraLook.clone().sub(camera.position).normalize().distanceTo(expected)<1e-8);
});
test('globe dragging has no easing and tracked sky target overrides smoothed look',()=>{
 const s=createSessionState();s.started=true;s.overview=true;s.drag=true;const camera=new PerspectiveCamera(),look=new Vector3(10,0,0),target=new Vector3(70,80,90);
 updateGameCamera({session:s,camera,player:createPlayer(),dt:1/60,planetOrbit:{orientation:new Quaternion(),distance:200},welcomeRotation:0,sample:()=>({height:64,wet:false,waterLevel:64}),trackedPosition:target},look);
 assert.deepEqual(camera.position.toArray(),[0,0,200]);assert.deepEqual(look.toArray(),[70,80,90]);
});
