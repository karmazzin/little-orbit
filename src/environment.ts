import {RADIUS} from './terrain.ts';
import {Quaternion,Vector3} from 'three';
// Shared radial envelope: cloud geometry has several units of clear fading air above it.
export const CLOUD_BASE_RADIUS=RADIUS+11;
export const ATMOSPHERE_RADIUS=RADIUS+18;
const Y=new Vector3(0,1,0),X=new Vector3(1,0,0);
export function surfaceOrientation(normal:Vector3,yaw=0){
 return new Quaternion().setFromUnitVectors(Y,normal).multiply(new Quaternion().setFromAxisAngle(Y,yaw));
}
export function cloudNormal(index:number,count:number,seconds:number){
 const y=1-2*(index+.5)/count,a=index*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y);
 return new Vector3(Math.cos(a)*r,y,Math.sin(a)*r).applyAxisAngle(X,seconds*.006).applyAxisAngle(Y,seconds*.003);
}
