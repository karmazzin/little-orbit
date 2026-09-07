import {Vector3} from 'three';
import {sample} from './worlds/khvoya/terrain.ts';
import {createPlayer,type Player,type MovementEnvironment} from './simulation.ts';

export const WORLD_SAVE_KEY='little-orbit-world-v1';
export type WorldState={player:Player;solarSeconds:number;timeSpeed:number;timeStopped:boolean;distance:number;elevation:number};
export function serializeWorld(state:WorldState){
 const {player,...world}=state;
 return JSON.stringify({version:2,...world,player:{mode:player.mode,up:player.up.toArray(),forward:player.forward.toArray(),groundHeight:player.groundHeight,jumpHeight:player.jumpHeight,verticalSpeed:player.verticalSpeed,grounded:player.grounded,coyoteTime:player.coyoteTime,jumpBuffer:player.jumpBuffer}});
}
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const between=(n:unknown,min:number,max:number)=>finite(n)&&n>=min&&n<=max;
function vector(value:unknown){
 if(!Array.isArray(value)||value.length!==3||!value.every(finite))return null;
 const v=new Vector3().fromArray(value);
 return Math.abs(v.length()-1)<.001?v.normalize():null;
}
/** Invalid or newer snapshots leave the normal new-game defaults intact. */
export function restoreWorld(raw:string|null,environment?:MovementEnvironment):WorldState|null{
 const sampleSurface=environment?.sample??sample;
 try{
  if(!raw)return null;
  const data=JSON.parse(raw);
  if(!data||![1,2].includes(data.version)||!between(data.solarSeconds,0,Number.MAX_SAFE_INTEGER)||![1,5,20].includes(data.timeSpeed)||typeof data.timeStopped!=='boolean'||!between(data.distance,7,27)||!between(data.elevation,-Math.PI/2,1.15))return null;
  const p=data.player;
  if(!p||(data.version===2&&!['walk','swim'].includes(p.mode)))return null;
  const up=vector(p.up),forward=vector(p.forward);
  if(!up||!forward||Math.abs(up.dot(forward))>.001||!between(p.groundHeight,1,1000)||!between(p.jumpHeight,0,1000)||!between(p.verticalSpeed,-1000,1000)||typeof p.grounded!=='boolean'||!between(p.coyoteTime,0,.1)||!between(p.jumpBuffer,0,.12))return null;
  const player=createPlayer(up,environment);
  player.forward.copy(forward).projectOnPlane(up).normalize();
  const surface=sampleSurface(up);
  player.mode=surface.waterDepth>0?'swim':'walk';
  // Current snapshots preserve an in-progress fall; old terrain altitude is obsolete.
  if(data.version===2&&p.mode==='walk'&&!p.grounded&&p.groundHeight+p.jumpHeight>surface.waterLevel)player.mode='walk';
  const ground=surface.waterDepth>0?surface.waterLevel:surface.height;
  player.groundHeight=ground;player.jumpHeight=p.jumpHeight;player.verticalSpeed=p.verticalSpeed;
  player.grounded=p.grounded;player.coyoteTime=p.coyoteTime;player.jumpBuffer=p.jumpBuffer;
  if(player.mode==='swim'||(p.mode==='swim'&&surface.waterDepth===0)){
   player.jumpHeight=0;player.verticalSpeed=0;player.grounded=true;player.coyoteTime=0;player.jumpBuffer=0;
  }
  player.position.copy(up).multiplyScalar(player.groundHeight+player.jumpHeight);
  return {player,solarSeconds:data.solarSeconds,timeSpeed:data.timeSpeed,timeStopped:data.timeStopped,distance:data.distance,elevation:data.elevation};
 }catch{return null;}
}
