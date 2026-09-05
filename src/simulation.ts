import {Vector3, Quaternion} from 'three';
import {normalAt,sample,RADIUS} from './terrain.ts';
export type Obstacle={up:Vector3;radius:number};
export type Input={forward:number;right:number;run:boolean;jump:boolean};
export function createPlayer(up=normalAt(-4,4)){
 return {up:up.clone(),forward:new Vector3(0,0,-1).projectOnPlane(up).normalize(),position:up.clone().multiplyScalar(sample(up).height),groundHeight:sample(up).height,grounded:true,coyoteTime:.1,jumpBuffer:0,jumpHeight:0,verticalSpeed:0,moving:false};
}
export type Player=ReturnType<typeof createPlayer>;
export function step(p:Player,input:Input,dt:number,obstacles:Obstacle[]){
 dt=Math.max(0,Math.min(dt,1/30));
 const right=new Vector3().crossVectors(p.forward,p.up).normalize();
 const direction=p.forward.clone().multiplyScalar(input.forward).addScaledVector(right,input.right);
 p.moving=false;
 if(direction.lengthSq()>.001){
  direction.normalize();
  const speed=(input.run?5.3:2.8)*(sample(p.up).waterDepth>0?.62:1);
  const next=p.up.clone().addScaledVector(direction,speed*dt/RADIUS).normalize();
  const target=sample(next);
  const blocked=target.waterDepth>.48||obstacles.some(o=>next.distanceTo(o.up)*RADIUS<o.radius+.34);
  if(!blocked){
   const transport=new Quaternion().setFromUnitVectors(p.up,next);
   p.forward.applyQuaternion(transport).projectOnPlane(next).normalize();
   p.up.copy(next);p.moving=true;
  }
 }
 advanceJump(p,sample(p.up).height,input.jump,dt);
 p.position.copy(p.up).multiplyScalar(p.groundHeight+p.jumpHeight);
}
/** Preserve radial altitude over drops; tolerate late and slightly early jump input. */
export function advanceJump(p:Player,ground:number,pressed:boolean,dt:number){
 let altitude=p.groundHeight+p.jumpHeight;
 p.jumpBuffer=pressed?.12:Math.max(0,p.jumpBuffer-dt);
 if(p.grounded && altitude-ground>.2)p.grounded=false;
 if(p.grounded){altitude=ground;p.coyoteTime=.1;}
 else p.coyoteTime=Math.max(0,p.coyoteTime-dt);
 const launch=()=>{p.verticalSpeed=5.2;p.grounded=false;p.coyoteTime=0;p.jumpBuffer=0;};
 if(p.jumpBuffer>0&&(p.grounded||p.coyoteTime>0))launch();
 if(!p.grounded){
  p.verticalSpeed-=13*dt;altitude+=p.verticalSpeed*dt;
  if(altitude<=ground){altitude=ground;p.verticalSpeed=0;p.grounded=true;p.coyoteTime=.1;
   if(p.jumpBuffer>0)launch();
  }
 }
 p.groundHeight=ground;p.jumpHeight=Math.max(0,altitude-ground);
}
