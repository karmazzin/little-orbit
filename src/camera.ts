import {Vector3,Quaternion} from 'three';
/** Virtual trackball in camera space; coordinates are measured in globe radii. */
export function trackballPoint(x:number,y:number){
 const d=x*x+y*y;
 return d<=1?new Vector3(x,y,Math.sqrt(1-d)):new Vector3(x,y,0).normalize();
}
export function dragGlobe(orientation:Quaternion,from:Vector3,to:Vector3){
 // Rotate the camera inversely so the grabbed surface follows the pointer.
 orientation.multiply(new Quaternion().setFromUnitVectors(to,from)).normalize();
}
export function globePosition(orientation:Quaternion,distance:number){
 return new Vector3(0,0,distance).applyQuaternion(orientation);
}
