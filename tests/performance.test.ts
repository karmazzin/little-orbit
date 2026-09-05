import {test} from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {surfaceOrientation,cloudNormal} from '../src/environment.ts';
import {FrameStats} from '../src/performance.ts';
test('random tree yaw preserves local vertical everywhere',()=>{for(const n of [new Vector3(0,1,0),new Vector3(1,0,0),new Vector3(.5,-.6,.2).normalize()])for(const yaw of [0,1,3,5])assert.ok(new Vector3(0,1,0).applyQuaternion(surfaceOrientation(n,yaw)).distanceTo(n)<1e-8);});
test('clouds cover all hemispheres and move while retaining altitude',()=>{const directions=Array.from({length:36},(_,i)=>cloudNormal(i,36,0));for(const axis of ['x','y','z'] as const){assert.ok(directions.some(n=>n[axis]>.6));assert.ok(directions.some(n=>n[axis]<-.6));}const next=cloudNormal(0,36,100);assert.ok(next.distanceTo(directions[0])>.1);assert.ok(Math.abs(next.length()-1)<1e-8);});
test('frame stats use real elapsed time including slow frames',()=>{const s=new FrameStats();for(let i=0;i<60;i++)s.record(1000/60,3);assert.ok(Math.abs(s.snapshot().fps-60)<.01);s.record(500,8);assert.ok(s.snapshot().fps<45);assert.ok(s.snapshot().maxMs>=500);});
