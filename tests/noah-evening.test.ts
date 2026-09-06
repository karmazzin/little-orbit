import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as life from '../src/resident-life.ts';
import {normalAt,RADIUS} from '../src/terrain.ts';
const atHour=(h:number)=>((h-life.localHour(0,life.FIRE_UP)+24)%24)*15;
function seatedNoah(){const r=life.createResident('noah');r.up.copy(life.SEATS.noah);r.target.copy(r.up);r.intent=r.activity='tell';return r;}
test('Noah tells only in the evening, seated at the clearing; presence alone never lights the fire',()=>{
 const r=seatedNoah();assert.equal(life.noahIsTelling(atHour(19),r),true);
 for(const h of [5,12,17.9,22,23])assert.equal(life.noahIsTelling(atHour(h),r),false);
 r.up.copy(life.HOMES.noah.porch);assert.equal(life.noahIsTelling(atHour(19),r),false);
 r.up.copy(life.SEATS.noah);r.activity='rest';assert.equal(life.noahIsTelling(atHour(19),r),false);
});
test('listeners stay home before the story and leave together when Noah begins',()=>{
 const seconds=atHour(19);
 for(const id of ['mira','lev'] as const){
  const waiting=life.residentIntent(id,seconds,false,false);assert.equal(waiting.activity,'home');
  const listening=life.residentIntent(id,seconds,false,true);assert.equal(listening.activity,'sit');assert.ok(listening.target.equals(life.SEATS[id]));
 }
});
test('story brings listeners out of homes and onto seats without teleporting, then ends at night',()=>{
 const rs=life.PEOPLE.map(p=>life.createResident(p.id)),nav=new life.ResidentNavigation([]),noah=rs.find(r=>r.id==='noah')!;
 Object.assign(noah,seatedNoah());
 for(const r of rs.filter(r=>r.id!=='noah')){r.up.copy(life.HOMES[r.id].porch);r.target.copy(r.up);r.intent=r.activity='home';r.inside=true;}
 const f={dt:.1,seconds:atHour(19),paused:false,player:normalAt(-80,40),party:true};
 assert.equal(life.advanceResidents(rs,nav,f),true);
 assert.ok(rs.filter(r=>r.id!=='noah').every(r=>!r.inside&&r.transition<0));
 for(let i=0;i<900;i++){const before=rs.map(r=>r.up.clone());assert.equal(life.advanceResidents(rs,nav,f),true);rs.forEach((r,j)=>assert.ok(r.up.distanceTo(before[j])*RADIUS<=life.WALK_SPEED*.1+.002));}
 assert.ok(rs.filter(r=>r.id!=='savva').every(r=>r.up.distanceTo(life.SEATS[r.id])*RADIUS<.12));
 assert.equal(life.advanceResidents(rs,nav,{...f,seconds:atHour(22.1)}),false);
 assert.ok(rs.every(r=>r.intent!=='tell'&&r.intent!=='sit'));
});
test('approaching Noah does not interrupt the story or flicker the campfire',()=>{
 const r=seatedNoah(),nav=new life.ResidentNavigation([]);
 for(let i=0;i<400;i++){life.advanceResident(r,nav,{dt:.1,seconds:atHour(19),paused:false,player:r.up,party:false});assert.equal(life.noahIsTelling(atHour(19),r),true);}
});
