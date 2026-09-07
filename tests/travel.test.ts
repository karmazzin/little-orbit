import {test} from 'node:test';import assert from 'node:assert/strict';
import {initialTravel,receiveAmber,insertAmber,restoreTravel,FRAME_UP} from '../src/travel.ts';
import {LANDMARKS} from '../src/landmarks.ts';
import {RADIUS} from '../src/geography.ts';
test('only grove discovery grants amber and only a nearby frame can consume it, repeatedly and across reload',()=>{
 let s=initialTravel();assert.equal(receiveAmber(s,[]),s);assert.equal(insertAmber(s,true),s);
 s=receiveAmber(s,['grove']);assert.equal(s.amber,true);assert.equal(receiveAmber(s,['grove']),s);assert.equal(insertAmber(s,false),s);
 s=restoreTravel(JSON.stringify(s));s=insertAmber(s,true);assert.deepEqual(s,{amber:false,open:true});assert.equal(receiveAmber(s,['grove']),s);assert.equal(insertAmber(s,true),s);assert.deepEqual(restoreTravel(JSON.stringify(s)),s);
});
test('invalid travel data cannot grant a stone or unlock; frame is separate and about ten metres from grove',()=>{
 for(const raw of [null,'broken','{}','{"amber":"true","open":1}'])assert.deepEqual(restoreTravel(raw),initialTravel());
 const d=FRAME_UP.angleTo(LANDMARKS.find(p=>p.id==='grove')!.up)*RADIUS;assert.ok(d>9&&d<11);
 assert.ok(FRAME_UP.angleTo(LANDMARKS[0].up)*RADIUS>30);
});
