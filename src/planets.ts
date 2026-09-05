import * as T from 'three';
import {solarState} from './sky.ts';
const Z=new T.Vector3(0,0,1);
export const NEIGHBORS=[
 {name:'Янтарь',color:0xd9a664,radius:1050,period:1500,phase:.8,tilt:.18,size:10},
 {name:'Лазурь',color:0x67b5d1,radius:2600,period:8300,phase:.05,tilt:-.32,size:13},
 {name:'Ирис',color:0xa692c4,radius:3400,period:12000,phase:.9,tilt:.28,size:12},
 {name:'Рубин',color:0xc87570,radius:4300,period:17000,phase:3,tilt:-.4,size:11},
] as const;
export function neighborPosition(index:number,seconds:number){
 const p=NEIGHBORS[index],a=p.phase+seconds/p.period*Math.PI*2;
 return new T.Vector3(Math.cos(a)*p.radius,Math.sin(a)*Math.cos(p.tilt)*p.radius,Math.sin(a)*Math.sin(p.tilt)*p.radius);
}
export function neighborDirection(index:number,seconds:number){
 const state=solarState(seconds);
 return neighborPosition(index,seconds).sub(state.planetPosition).applyAxisAngle(Z,-state.spinAngle).normalize();
}
export function neighborSkyPosition(index:number,seconds:number){return neighborDirection(index,seconds).multiplyScalar(610+index*12);}
export function createNeighbors(scene:T.Scene){
 const bodies=NEIGHBORS.map((p,index)=>{
  const geometry=new T.IcosahedronGeometry(p.size,2);
  const material=new T.MeshStandardMaterial({color:p.color,roughness:1,flatShading:true,emissive:p.color,emissiveIntensity:.16,fog:false});
  const mesh=new T.Mesh(geometry,material);mesh.name=p.name;mesh.castShadow=false;mesh.receiveShadow=false;scene.add(mesh);
  if(index===2){const ring=new T.Mesh(new T.RingGeometry(p.size*1.4,p.size*1.9,36),new T.MeshBasicMaterial({color:0xcbbad8,side:T.DoubleSide,transparent:true,opacity:.7,depthWrite:false,fog:false}));ring.rotation.x=.95;mesh.add(ring);}
  return mesh;
 });
 return {update(seconds:number){
  for(let i=0;i<bodies.length;i++){bodies[i].position.copy(neighborSkyPosition(i,seconds));bodies[i].rotation.y=seconds*(.025+i*.007);}
 }};
}
/** Recompute every frame: a one-time look direction drifts as the world rotates. */
export function planetAim(index:number,seconds:number,up:T.Vector3,previousForward:T.Vector3){
 const direction=neighborDirection(index,seconds),altitude=T.MathUtils.clamp(direction.dot(up),-1,1);
 if(altitude<.02)return null;
 const tangent=direction.clone().projectOnPlane(up);
 return {forward:tangent.lengthSq()>1e-10?tangent.normalize():previousForward.clone(),elevation:-Math.asin(altitude)};
}
