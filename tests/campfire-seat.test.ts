import {test} from 'node:test';import assert from 'node:assert/strict';
import {Scene,Vector3} from 'three';import {buildWorld} from '../src/view.ts';
import {SEATS,ResidentNavigation} from '../src/resident-life.ts';import {createPlayer} from '../src/simulation.ts';import {normalAt,RADIUS} from '../src/terrain.ts';
import {createFireSeat,beginFireSeat,advanceFireSeat,leaveFireSeat,guestSeatUp} from '../src/campfire-seat.ts';
test('hero walks to a free place beside Noah using normal collision physics, then sits and can leave',()=>{
 const world=buildWorld(new Scene()),nav=new ResidentNavigation(world.obstacles.map(o=>({...o,radius:o.radius+.06}))),target=guestSeatUp();
 assert.ok(nav.clear(target),'guest seat must leave clearance from the log');assert.ok(target.distanceTo(SEATS.noah)*RADIUS>.65);
 const tangent=new Vector3().crossVectors(SEATS.noah,normalAt(-10,-4)).normalize();
 const start=[-2,2].map(d=>SEATS.noah.clone().addScaledVector(tangent,d/RADIUS).normalize()).find(up=>nav.clear(up))!;assert.ok(start);
 const player=createPlayer(start),seat=createFireSeat(),before=player.up.clone();assert.equal(beginFireSeat(seat,player,true),true);assert.ok(player.up.equals(before));
 let arrived=false;for(let i=0;i<1200&&!arrived;i++){const old=player.up.clone();arrived=advanceFireSeat(seat,player,nav,world.obstacles,1/60,true)==='arrived';assert.ok(player.up.distanceTo(old)*RADIUS<=2.8/60+.001);assert.ok(nav.clear(player.up));}
 assert.ok(arrived);assert.equal(seat.phase,'seated');assert.ok(player.up.distanceTo(target)*RADIUS<.1);
 leaveFireSeat(seat);assert.equal(seat.phase,'idle');
 assert.equal(beginFireSeat(seat,player,false),false);player.grounded=false;assert.equal(beginFireSeat(seat,player,true),false);
});
test('ending the evening cancels the seat request without moving the player',()=>{
 const seat=createFireSeat(),player=createPlayer(SEATS.noah),nav=new ResidentNavigation([]),before=player.up.clone();
 assert.equal(beginFireSeat(seat,player,true),true);assert.equal(advanceFireSeat(seat,player,nav,[],1/60,false),'cancelled');assert.equal(seat.phase,'idle');assert.ok(player.up.equals(before));
});
