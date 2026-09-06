import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {solarState,localSky,DAY_SECONDS,YEAR_SECONDS} from '../src/sky.ts';
const up=new Vector3(0,1,0);
test('noon is blue and bright; midnight is dark with stars',()=>{
 const day=localSky(solarState(DAY_SECONDS*.5).sunDirection,up);
 const night=localSky(solarState(0).sunDirection,up);
 assert.ok(day.daylight>.95);assert.ok(day.zenith.b>day.zenith.r);assert.ok(day.stars<.01);
 assert.ok(night.daylight<.01);assert.ok(night.stars>.99);assert.ok(night.zenith.r+night.zenith.g+night.zenith.b<.03);
});
test('sunset horizon is muted and opposite hemisphere has inverse sun elevation',()=>{
 const state=solarState(DAY_SECONDS*.75),sunset=localSky(state.sunDirection,up);
 assert.ok(sunset.horizon.r<sunset.horizon.b*1.5);assert.ok(Math.abs(sunset.horizon.r-sunset.horizon.g)<.2);
 const other=localSky(state.sunDirection,up.clone().negate());assert.ok(Math.abs(sunset.altitude+other.altitude)<1e-8);
});
test('planet follows circular solar orbit and daylight repeats each solar day',()=>{
 const first=solarState(0),quarter=solarState(YEAR_SECONDS/4);
 assert.ok(first.planetPosition.distanceTo(quarter.planetPosition)>1000);
 assert.ok(Math.abs(first.planetPosition.length()-quarter.planetPosition.length())<1e-8);
 assert.ok(solarState(123).sunDirection.distanceTo(solarState(123+DAY_SECONDS).sunDirection)<1e-8);
});
test('local dawn and sunset reverse on opposite hemispheres',async()=>{
 const {localPhase}=await import('../src/sky.ts');
 assert.equal(localPhase(DAY_SECONDS*.25,up),'Рассвет');
 assert.equal(localPhase(DAY_SECONDS*.25,up.clone().negate()),'Закат');
 assert.equal(localPhase(DAY_SECONDS*.75,up),'Закат');
 assert.equal(localPhase(DAY_SECONDS*.75,up.clone().negate()),'Рассвет');
});
test('local clock and time presets agree with daylight away from the starting valley',async()=>{
 const {localHours,secondsAtLocalHour}=await import('../src/sky.ts');
 for(const up of [new Vector3(0,1,0),new Vector3(1,0,0),new Vector3(0,-1,0),new Vector3(-1,0,0)]){
  assert.ok(secondsAtLocalHour(0,0,up)>=0);
  const noon=secondsAtLocalHour(4321,12,up);assert.ok(Math.abs(localHours(noon,up)-12)<1e-8);assert.ok(solarState(noon).sunDirection.dot(up)>.99);
  const night=secondsAtLocalHour(4321,0,up);assert.ok(localHours(night,up)<1e-8);assert.ok(solarState(night).sunDirection.dot(up)<-.99);
 }
});
