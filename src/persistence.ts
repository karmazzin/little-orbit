import {Vector3} from 'three';
import {createPlayer,type Player} from './simulation.ts';

export const WORLD_SAVE_KEY='little-orbit-world-v1';
export type WorldState={player:Player;solarSeconds:number;timeSpeed:number;timeStopped:boolean;distance:number;elevation:number};
export function serializeWorld(state:WorldState){
 const {player,...world}=state;
 return JSON.stringify({version:1,...world,player:{up:player.up.toArray(),forward:player.forward.toArray(),groundHeight:player.groundHeight,jumpHeight:player.jumpHeight,verticalSpeed:player.verticalSpeed,grounded:player.grounded,coyoteTime:player.coyoteTime,jumpBuffer:player.jumpBuffer}});
}
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const between=(n:unknown,min:number,max:number)=>finite(n)&&n>=min&&n<=max;
function vector(value:unknown){
 if(!Array.isArray(value)||value.length!==3||!value.every(finite))return null;
 const v=new Vector3().fromArray(value);
 return Math.abs(v.length()-1)<.001?v.normalize():null;
}
/** Invalid or newer snapshots leave the normal new-game defaults intact. */
export function restoreWorld(raw:string|null):WorldState|null{
 try{
  if(!raw)return null;
  const data=JSON.parse(raw);
  if(!data||data.version!==1||!between(data.solarSeconds,0,Number.MAX_SAFE_INTEGER)||![1,5,20].includes(data.timeSpeed)||typeof data.timeStopped!=='boolean'||!between(data.distance,7,27)||!between(data.elevation,-Math.PI/2,1.15))return null;
  const p=data.player;
  if(!p)return null;
  const up=vector(p.up),forward=vector(p.forward);
  if(!up||!forward||Math.abs(up.dot(forward))>.001||!between(p.groundHeight,1,1000)||!between(p.jumpHeight,0,1000)||!between(p.verticalSpeed,-1000,1000)||typeof p.grounded!=='boolean'||!between(p.coyoteTime,0,.1)||!between(p.jumpBuffer,0,.12))return null;
  const player=createPlayer(up);
  player.forward.copy(forward).projectOnPlane(up).normalize();
  player.groundHeight=p.groundHeight;player.jumpHeight=p.jumpHeight;player.verticalSpeed=p.verticalSpeed;
  player.grounded=p.grounded;player.coyoteTime=p.coyoteTime;player.jumpBuffer=p.jumpBuffer;
  player.position.copy(up).multiplyScalar(p.groundHeight+p.jumpHeight);
  return {player,solarSeconds:data.solarSeconds,timeSpeed:data.timeSpeed,timeStopped:data.timeStopped,distance:data.distance,elevation:data.elevation};
 }catch{return null;}
}
