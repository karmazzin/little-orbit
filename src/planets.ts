import * as T from 'three';
import {createAtlasPlanet} from './system-planet.ts';
import {solarState} from './sky.ts';
const Z=new T.Vector3(0,0,1);
export const HOME_PLANET={name:'Хвоя',locative:'Хвое'} as const;
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
  const mesh=createAtlasPlanet(index+1,false,p.color,4);mesh.name=p.name;mesh.scale.setScalar(p.size/(5+(index+1)*.4));
  mesh.traverse(object=>{if(object instanceof T.Mesh){object.material.fog=false;object.castShadow=false;object.receiveShadow=false;if(object.material instanceof T.MeshStandardMaterial){object.material.emissive.set(p.color);object.material.emissiveIntensity=.12;}}});
  scene.add(mesh);return mesh;
 });
 return {update(seconds:number){
  const spin=solarState(seconds).spinAngle;
  for(let i=0;i<bodies.length;i++){bodies[i].position.copy(neighborSkyPosition(i,seconds));bodies[i].rotation.z=-spin;bodies[i].getObjectByName('surface')!.rotation.y=seconds*(.025+(i+1)*.007);}
 }};
}
/** Recompute every frame: a one-time look direction drifts as the world rotates. */
export function planetAim(index:number,seconds:number,up:T.Vector3,previousForward:T.Vector3){
 const direction=neighborDirection(index,seconds),altitude=T.MathUtils.clamp(direction.dot(up),-1,1);
 if(altitude<.02)return null;
 const tangent=direction.clone().projectOnPlane(up);
 return {forward:tangent.lengthSq()>1e-10?tangent.normalize():previousForward.clone(),elevation:-Math.asin(altitude)};
}
