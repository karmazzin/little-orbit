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
export function sample(n:Vector3):{height:number;waterDepth:number;bridge:boolean;wet:boolean;path:boolean}{
 const {x,z}=coordinates(n);
 const base=RADIUS+2.15+.85*Math.sin(n.x*7+n.z*3)+.65*Math.sin(n.z*9-n.y*4)+.35*Math.cos(n.x*16+n.y*8);
 // All special features live on the northern patch; the rest is seamless 3D noise.
 if(n.y<.45)return {height:base,waterDepth:0,bridge:false,wet:false,path:false};
 const lake=Math.hypot((x-12)/1.12,z-30);
 const river=Math.abs(x-riverX(z));
 const inRiver=z>-37&&z<28;
 const bank=Math.min(lake-11,inRiver?river-1.65:999);
 const blend=Math.max(0,Math.min(1,(bank+1.6)/3.4));
 const ford=Math.abs(z+26)<1.7;
 const bed=ford&&inRiver&&river<3?WATER_LEVEL-.25:WATER_LEVEL-1.35;
 let height=bed+(base-bed)*blend*blend*(3-2*blend);
 if(bank>1.8)height=base;
 const bridge=Math.abs(z)<1.65&&x>5.2&&x<15.2;
 if(bridge)height=Math.max(height,WATER_LEVEL+.55);
 const waterDepth=bridge?0:Math.max(0,WATER_LEVEL-height);
 const path=Math.abs(z)<1.6&&x>-9&&x<28||Math.abs(x+4)<1.4&&z>-15&&z<7||Math.abs(x-25)<1.15&&z>0&&z<25;
 return {height,waterDepth,bridge,wet:waterDepth>0,path};
}
