import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import * as life from '../src/resident-life.ts';
import {normalAt,RADIUS} from '../src/terrain.ts';

test('all five residents have daily purposes and Ada rests by day',()=>{
 assert.equal(typeof life.residentIntent,'function');
 assert.deepEqual(life.PEOPLE.map(p=>p.id),['mira','lev','ada','noah','savva']);
 assert.equal(life.residentIntent('ada',140,false).activity,'home');
 assert.equal(life.residentIntent('ada',355,false).activity,'observe');
 assert.equal(life.residentIntent('lev',350,false).activity,'home');
});
test('time jumps select a destination without teleportation; dialog and knocking preserve motion',()=>{
 const nav=new life.ResidentNavigation([]),r=life.createResident('mira');
 const before=r.up.clone();life.advanceResident(r,nav,{dt:.05,seconds:350,paused:false,player:normalAt(-40,0),party:false});
 assert.ok(before.distanceTo(r.up)*RADIUS<=life.WALK_SPEED*.05+.001);
 const stopped=r.up.clone();life.advanceResident(r,nav,{dt:1,seconds:180,paused:true,player:normalAt(-40,0),party:false});assert.ok(stopped.equals(r.up));
 r.up.copy(life.HOMES.mira.porch);r.inside=true;r.activity='home';life.knockResident(r);assert.ok(r.visit>0);assert.equal(r.inside,false);
});
test('resident save validates each entry and preserves position, destination and indoor state',()=>{
 const residents=life.PEOPLE.map(p=>life.createResident(p.id));residents[0].up.copy(normalAt(-6,-7));
 const raw=life.serializeResidents(residents);const loaded=life.restoreResidents(raw,new life.ResidentNavigation([]));
 assert.ok(loaded[0].up.distanceTo(residents[0].up)<1e-6);
 for(const raw of ['broken','{}','{"version":99}', '{"version":1,"residents":[{"id":"mira","up":[null,0,0]}]}'])assert.equal(life.restoreResidents(raw,new life.ResidentNavigation([])).length,life.PEOPLE.length);
});
test('navigation finds a dry route across the river instead of cutting through water',()=>{
 const nav=new life.ResidentNavigation([]),from=normalAt(-4,-8),to=normalAt(23,5),path=nav.route(from,to);
 assert.ok(path&&path.length>1);
 let a=from;for(const b of path!){assert.ok(nav.safeEdge(a,b));a=b;}
 assert.ok(a.distanceTo(to)<1e-6);
 assert.equal(nav.safeEdge(normalAt(7,10),normalAt(16,10)),false);
});
test('all homes, work points and seats are reachable with actual world obstacles',async()=>{
 const {Scene}=await import('three');const {buildWorld}=await import('../src/view.ts');const world=buildWorld(new Scene()),nav=new life.ResidentNavigation(world.obstacles);
 for(const p of life.PEOPLE){
  const targets=[life.HOMES[p.id].porch,...life.ACTIVITY_POINTS[p.id],life.SEATS[p.id]];
  for(const to of targets){assert.ok(nav.clear(to),`${p.id}: blocked destination ${to.toArray()}`);const path=nav.route(p.start,to);assert.ok(path,`${p.id}: unreachable destination ${to.toArray()}`);}
 }
});
test('a natural full day includes work, home and all four actually reaching the celebration',async()=>{
 const {Scene}=await import('three');const {buildWorld}=await import('../src/view.ts');const {festivalAvailable,initialAdventures}=await import('../src/adventures.ts');
 const world=buildWorld(new Scene()),nav=new life.ResidentNavigation(world.obstacles),residents=life.PEOPLE.map(p=>life.createResident(p.id));
 const seen=new Map(residents.map(r=>[r.id,new Set<string>()]));let together=false;
 for(let t=154;t<514;t+=.1){const party=festivalAvailable(initialAdventures(),2,t);
  const before=residents.map(r=>r.up.clone());life.advanceResidents(residents,nav,{dt:.1,seconds:t,paused:false,player:normalAt(-90,40),party});residents.forEach((r,i)=>{seen.get(r.id)!.add(r.activity);assert.ok(before[i].distanceTo(r.up)*RADIUS<=life.WALK_SPEED*.1+.002,`${r.id} jumped`);assert.equal(r.blocked,false,`${r.id} stuck`);});
  if(party&&residents.filter(r=>r.id!=='savva').every(r=>r.up.distanceTo(life.FIRE_UP)*RADIUS<4))together=true;
 }
 assert.ok(together,'four residents must physically arrive, including Ada');
 for(const [id,activity] of [['mira','letters'],['lev','water'],['ada','observe'],['noah','tell']] as const){assert.ok(seen.get(id)!.has(activity));assert.ok(seen.get(id)!.has('home'));}
});
test('home transitions finish, a knock brings the resident out, and greeting does not hold them forever',()=>{
 const nav=new life.ResidentNavigation([]),r=life.createResident('mira');r.up.copy(life.HOMES.mira.porch);
 const f={dt:.1,seconds:350,paused:false,player:normalAt(-40,0),party:false};
 for(let i=0;i<30;i++)life.advanceResident(r,nav,f);assert.equal(r.inside,true);assert.equal(r.transition,0);
 life.knockResident(r);assert.equal(r.inside,false);assert.ok(r.transition<0);
 for(let i=0;i<20;i++)life.advanceResident(r,nav,f);assert.equal(r.transition,0);assert.equal(r.inside,false);
 r.visit=0;const origin=r.up.clone();for(let i=0;i<100;i++)life.advanceResident(r,nav,{...f,seconds:170,player:origin});assert.ok(r.up.distanceTo(origin)*RADIUS>3);
 assert.equal(life.homeLit('mira',0,true),false);
});
test('seated legs face forward and activity poses reset when walking',async()=>{
 const {character}=await import('../src/view.ts');const model=character(0x799d68,false,'male',true);
 model.animate(1,false,false,'sit');assert.ok(model.body.position.z>.6);assert.ok(model.legs.every(l=>l.rotation.x>1));
 model.animate(2,true,false,'walk');assert.equal(model.body.position.z,0);assert.equal(model.body.position.y,0);
 model.animate(2,false,false,'greet');assert.ok(Math.abs(model.arms[1].rotation.z)>1);
 model.animate(3,true);assert.equal(model.arms[1].rotation.z,0);
});
test('a pending route restored just outside the home arrival radius is retried',()=>{
 class PendingNavigation extends life.ResidentNavigation {calls=0;override route(from:Vector3,to:Vector3){this.calls++;return this.calls===1?null:[to.clone()];}}
 const nav=new PendingNavigation([]),r=life.createResident('mira');r.target.copy(life.HOMES.mira.porch);r.up.copy(r.target).addScaledVector(new Vector3(1,0,0).projectOnPlane(r.target).normalize(),.13/RADIUS).normalize();r.intent='home';
 const restored=life.restoreResidents(life.serializeResidents([r]),nav)[0];
 for(let i=0;i<100;i++)life.advanceResident(restored,nav,{dt:.1,seconds:350,paused:false,player:normalAt(-40,0),party:false});
 assert.ok(nav.calls>1);assert.equal(restored.inside,true);
});
