import {Vector3, type PerspectiveCamera,type Quaternion} from 'three';
import {globePosition} from '../camera.ts';
import type {Player} from '../simulation.ts';
import type {SessionState} from './session.ts';
export type PlanetOrbit={orientation:Quaternion;distance:number};
export type CameraSurface={height:number;wet:boolean;waterLevel:number};
export type GameCameraOptions={session:SessionState;camera:PerspectiveCamera;player:Player;planetOrbit:PlanetOrbit;dt:number;welcomeRotation:number;sample:(up:Vector3)=>CameraSurface;trackedPosition?:Vector3};
/** Each planet supplies its surface and welcome rotation; camera math is shared. */
export function updateGameCamera(options:GameCameraOptions,cameraLook:Vector3){
 const {session:s,camera,player,planetOrbit,dt,sample}=options;
 const desiredCamera=new Vector3(),desiredUp=new Vector3(),look=new Vector3();
 if(s.overview){
  desiredCamera.copy(globePosition(planetOrbit.orientation,planetOrbit.distance));desiredUp.set(0,1,0).applyQuaternion(planetOrbit.orientation);look.set(0,0,0);
 }else if(!s.started){
  const axis=new Vector3(0,0,1),rotation=options.welcomeRotation;
  desiredCamera.set(100,155,143).applyAxisAngle(axis,rotation);desiredUp.set(0,1,0).applyAxisAngle(axis,rotation);look.set(-27,0,0).applyAxisAngle(axis,rotation);
 }else{
  desiredCamera.copy(player.position).addScaledVector(player.forward,-s.distance*Math.cos(s.elevation)).addScaledVector(player.up,s.distance*Math.sin(s.elevation)+(player.mode==='swim'?.65:1.5));
  const n=desiredCamera.clone().normalize(),surface=sample(n),min=Math.max(surface.height,surface.wet?surface.waterLevel:0)+1.5;
  if(desiredCamera.length()<min)desiredCamera.copy(n).multiplyScalar(min);
  look.copy(desiredCamera).addScaledVector(player.forward,s.distance*Math.cos(s.elevation)).addScaledVector(player.up,-s.distance*Math.sin(s.elevation));desiredUp.copy(player.up);
 }
 if(options.trackedPosition)look.copy(options.trackedPosition);
 const ease=s.overview&&s.drag?1:1-Math.exp(-dt*3.8);
 camera.position.lerp(desiredCamera,ease);camera.up.lerp(desiredUp,ease).normalize();
 if(options.trackedPosition)cameraLook.copy(look);else cameraLook.lerp(look,ease);
 camera.lookAt(cameraLook);camera.updateMatrixWorld();
}
