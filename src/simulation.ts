import {Vector3, Quaternion} from 'three';
import {normalAt,sample,RADIUS} from './worlds/khvoya/terrain.ts';
export type MovementEnvironment={radius:number;sample:typeof sample};
const homeEnvironment:MovementEnvironment={radius:RADIUS,sample};
export type Obstacle={up:Vector3;radius:number};
export type Input={forward:number;right:number;run:boolean;jump:boolean;toggleMode?:boolean};
export type MovementMode='walk'|'swim';
export function createPlayer(up=normalAt(-4,4),environment:MovementEnvironment=homeEnvironment){
 const {sample}=environment;
 const surface=sample(up),mode:MovementMode=surface.waterDepth>0?'swim':'walk';
 const height=mode==='swim'?surface.waterLevel:surface.height;
 return {mode,up:up.clone(),forward:new Vector3(0,0,-1).projectOnPlane(up).normalize(),position:up.clone().multiplyScalar(height),groundHeight:height,grounded:true,coyoteTime:.1,jumpBuffer:0,jumpHeight:0,verticalSpeed:0,moving:false};
}
export type Player=ReturnType<typeof createPlayer>;
function transport(p:Player,next:Vector3){
 p.forward.applyQuaternion(new Quaternion().setFromUnitVectors(p.up,next)).projectOnPlane(next).normalize();
 p.up.copy(next);
}
function obstructed(up:Vector3,obstacles:Obstacle[],environment:MovementEnvironment){
 const RADIUS=environment.radius;
 return obstacles.some(o=>up.distanceTo(o.up)*RADIUS<o.radius+.34);
}
/** Check the whole route, including narrow solids between its endpoints. */
function shoreTarget(p:Player,obstacles:Obstacle[],environment:MovementEnvironment):Vector3|null{
 const {sample,radius:RADIUS}=environment;
 if(!p.grounded||p.jumpHeight>.05||sample(p.up).bridge)return null;
 const right=new Vector3().crossVectors(p.forward,p.up).normalize();
 for(let distance=.25;distance<=2.5;distance+=.25){
  for(let i=0;i<16;i++){
   const angle=i*Math.PI/8;
   const direction=p.forward.clone().multiplyScalar(Math.cos(angle)).addScaledVector(right,Math.sin(angle));
   const next=p.up.clone().addScaledVector(direction,distance/RADIUS).normalize(),target=sample(next);
   if(target.bridge||(target.waterDepth>0)===(p.mode==='swim'))continue;
   let previous=sample(p.up),valid=true;
   const steps=Math.ceil(distance/.12),stride=distance/steps;
   for(let j=1;j<=steps;j++){
    const at=p.up.clone().lerp(next,j/steps).normalize(),surface=sample(at);
    const a=previous.waterDepth>0?previous.waterLevel:previous.height;
    const b=surface.waterDepth>0?surface.waterLevel:surface.height;
    if(surface.bridge||obstructed(at,obstacles,environment)||Math.abs(b-a)>stride*1.05+.015){valid=false;break;}
    previous=surface;
   }
   if(valid)return next;
  }
 }
 return null;
}
export function movementAction(p:Player,obstacles:Obstacle[],environment:MovementEnvironment=homeEnvironment):MovementMode|null{
 return shoreTarget(p,obstacles,environment)?p.mode==='walk'?'swim':'walk':null;
}
function settle(p:Player,height:number){
 p.groundHeight=height;p.jumpHeight=0;p.verticalSpeed=0;p.grounded=true;p.coyoteTime=0;p.jumpBuffer=0;
}
export function step(p:Player,input:Input,dt:number,obstacles:Obstacle[],environment:MovementEnvironment=homeEnvironment){
 const {sample,radius:RADIUS}=environment;
 dt=Math.max(0,Math.min(dt,1/30));
 p.moving=false;
 if(input.toggleMode){
  const target=shoreTarget(p,obstacles,environment);
  if(target){transport(p,target);p.mode=p.mode==='walk'?'swim':'walk';const surface=sample(p.up);settle(p,p.mode==='swim'?surface.waterLevel:surface.height);}
 }
 const right=new Vector3().crossVectors(p.forward,p.up).normalize();
 const direction=p.forward.clone().multiplyScalar(input.forward).addScaledVector(right,input.right);
 const surface=sample(p.up);
 if(direction.lengthSq()>.001)direction.normalize().multiplyScalar(p.mode==='swim'?1.8:input.run?5.3:2.8);
 if(p.mode==='swim')direction.add(surface.flow);
 const distance=direction.length()*dt;
 if(distance>1e-8){
  const next=p.up.clone().addScaledVector(direction,dt/RADIUS).normalize(),target=sample(next);
  // Airborne walkers may pass over a bank, but grounded walking never wades.
  const airborne=!p.grounded&&p.groundHeight+p.jumpHeight>target.waterLevel+.05;
  const waterBlocked=p.mode==='swim'?target.waterDepth<=0:target.waterDepth>0&&!airborne;
  const slope=(target.height-surface.height)/distance;
  const slopeBlocked=p.mode==='walk'&&slope>1.05;
  if(!waterBlocked&&!slopeBlocked&&!obstructed(next,obstacles,environment)){
   transport(p,next);p.moving=true;
  }
 }
 const ground=sample(p.up);
 if(p.mode==='swim')settle(p,ground.waterDepth>0?ground.waterLevel:ground.height);
 else {
  advanceJump(p,ground.waterDepth>0?ground.waterLevel:ground.height,input.jump,dt);
  if(ground.waterDepth>0&&p.groundHeight+p.jumpHeight<=ground.waterLevel+.001){p.mode='swim';settle(p,ground.waterLevel);}
 }
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
