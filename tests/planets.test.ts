import {test} from 'node:test';import assert from 'node:assert/strict';
import {NEIGHBORS,neighborPosition,neighborDirection} from '../src/planets.ts';
test('four different planets have distinct colours, orbital radii and periods',()=>{
 assert.equal(NEIGHBORS.length,4);for(const key of ['color','radius','period'] as const)assert.equal(new Set(NEIGHBORS.map(p=>p[key])).size,4);
});
test('neighbour orbits move and close at their own periods',()=>{NEIGHBORS.forEach((p,i)=>{assert.ok(neighborPosition(i,0).distanceTo(neighborPosition(i,p.period/4))>500);assert.ok(neighborPosition(i,0).distanceTo(neighborPosition(i,p.period))<1e-8);assert.ok(Math.abs(neighborDirection(i,100).length()-1)<1e-8);});});
test('neighbours rise above the valley during a day',()=>{for(let i=0;i<4;i++){let visible=false;for(let t=0;t<360;t+=10)if(neighborDirection(i,t).y>.2)visible=true;assert.ok(visible);}});
test('initial orbital phases spread neighbours across the sky rather than one cluster',()=>{
 const directions=NEIGHBORS.map((_,i)=>neighborDirection(i,360*.43));
 let widest=0;for(let i=0;i<directions.length;i++)for(let j=i+1;j<directions.length;j++){const angle=directions[i].angleTo(directions[j]);assert.ok(angle>.25);widest=Math.max(widest,angle);}
 assert.ok(widest>Math.PI*.8,'at least two neighbours should be in substantially different directions');
});
test('tracking updates camera aim as a planet moves and ends below the horizon',async()=>{
 const {planetAim}=await import('../src/planets.ts');const {Vector3}=await import('three');
 const up=new Vector3(0,1,0),forward=new Vector3(0,0,-1);
 let checked=false;
 for(let t=0;t<360;t+=5){const aim=planetAim(1,t,up,forward);if(!aim)continue;const next=planetAim(1,t+.2,up,forward);if(!next)continue;
 const look=next.forward.clone().multiplyScalar(Math.cos(next.elevation)).addScaledVector(up,-Math.sin(next.elevation));assert.ok(look.distanceTo(neighborDirection(1,t+.2))<.001);assert.ok(Math.abs(aim.elevation-next.elevation)>1e-6||aim.forward.distanceTo(next.forward)>1e-6);checked=true;break;}
 assert.ok(checked);assert.ok(Array.from({length:36},(_,i)=>planetAim(1,i*10,up,forward)).some(p=>p===null));
});
