import {Vector3} from 'three';
import {FIRE_UP,SEATS,type ResidentNavigation} from './resident-life.ts';
import {step,type Player,type Obstacle} from './simulation.ts';
import {RADIUS} from './terrain.ts';
export function guestSeatUp(){const tangent=new Vector3().crossVectors(SEATS.noah,FIRE_UP).normalize();return SEATS.noah.clone().addScaledVector(tangent,.72/RADIUS).normalize();}
export function createFireSeat(){return {phase:'idle' as 'idle'|'approaching'|'seated',path:[] as Vector3[],index:0,retry:0,stalled:0};}
export type FireSeat=ReturnType<typeof createFireSeat>;
export function leaveFireSeat(s:FireSeat){s.phase='idle';s.path=[];s.index=0;s.stalled=0;s.retry=0;}
export function beginFireSeat(s:FireSeat,p:Player,storytelling:boolean,target?:Vector3){
 if(!storytelling||p.mode!=='walk'||!p.grounded||p.jumpHeight>.05||p.up.distanceTo(target??SEATS.noah)*RADIUS>3.2)return false;
 leaveFireSeat(s);s.phase='approaching';return true;
}
/** Drive the existing player controller: walking and collisions remain the same as WASD. */
export function advanceFireSeat(s:FireSeat,p:Player,nav:ResidentNavigation,obstacles:Obstacle[],dt:number,storytelling:boolean,seatTarget?:Vector3):'arrived'|'cancelled'|null{
 if(s.phase==='idle')return null;
 if(!storytelling){leaveFireSeat(s);p.moving=false;return 'cancelled';}
 p.moving=false;if(s.phase==='seated')return null;
 const target=seatTarget??guestSeatUp();
 if(p.up.distanceTo(target)*RADIUS<.075){s.phase='seated';return 'arrived';}
 if(!s.path.length&&(s.retry-=dt)<=0){s.retry=.3;s.path=nav.route(p.up,target)??[];s.index=0;}
 while(s.index<s.path.length&&p.up.distanceTo(s.path[s.index])*RADIUS<.025)s.index++;
 const next=s.path[s.index];
 if(next){
  const direction=next.clone().projectOnPlane(p.up).normalize(),right=new Vector3().crossVectors(p.forward,p.up).normalize();
  const distance=p.up.angleTo(next)*RADIUS;
  step(p,{forward:direction.dot(p.forward),right:direction.dot(right),run:false,jump:false},Math.min(dt,distance/2.8),obstacles);
 }
 s.stalled=p.moving?0:s.stalled+dt;
 if(s.stalled>12){leaveFireSeat(s);return 'cancelled';}
 return null;
}
