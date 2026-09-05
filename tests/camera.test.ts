import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Vector3} from 'three';
import {trackballPoint,dragGlobe,globePosition} from '../src/camera.ts';
test('dragging right moves the grabbed front surface to screen right',()=>{
 const q=new Quaternion(),from=trackballPoint(0,0),to=trackballPoint(.4,0);
 dragGlobe(q,from,to);
 const grabbed=new Vector3(0,0,1).applyQuaternion(q.clone().invert());
 assert.ok(grabbed.x>0);assert.ok(grabbed.distanceTo(to)<1e-8);
});
test('vertical drag follows pointer and preserves viewing distance',()=>{
 const q=new Quaternion();dragGlobe(q,trackballPoint(0,0),trackballPoint(0,.5));
 assert.ok(new Vector3(0,0,1).applyQuaternion(q.clone().invert()).y>0);
 assert.ok(Math.abs(globePosition(q,230).length()-230)<1e-8);
});
test('reversing a drag restores orientation; poles and off-globe drags remain finite',()=>{
 const q=new Quaternion(),a=trackballPoint(.2,.3),b=trackballPoint(5,-4);
 dragGlobe(q,a,b);dragGlobe(q,b,a);assert.ok(q.angleTo(new Quaternion())<1e-7);
 for(let i=0;i<100;i++)dragGlobe(q,trackballPoint(0,-.8),trackballPoint(0,.8));
 assert.ok(globePosition(q,200).toArray().every(Number.isFinite));assert.ok(Math.abs(q.length()-1)<1e-8);
});
