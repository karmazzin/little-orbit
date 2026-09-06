import {Vector3} from 'three';
export const RADIUS=64;
export const WATER_LEVEL=64.25;
export const riverX=(z:number)=>10+Math.sin(z*.12)*2.7;
export function normalAt(x:number,z:number):Vector3{
 const d=Math.hypot(x,z),a=d/RADIUS;
 return d<1e-8?new Vector3(0,1,0):new Vector3(x/d*Math.sin(a),Math.cos(a),z/d*Math.sin(a));
}
export function coordinates(n:Vector3){
 const a=Math.acos(Math.max(-1,Math.min(1,n.y))),d=Math.hypot(n.x,n.z);
 return {x:d<1e-8?0:n.x/d*a*RADIUS,z:d<1e-8?0:n.z/d*a*RADIUS};
}
