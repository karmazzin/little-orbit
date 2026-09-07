import * as T from 'three';
import {createSky,solarState,DAY_SECONDS} from '../../sky.ts';
import {NEIGHBORS,neighborPosition} from '../../planets.ts';
import {createAtlasPlanet} from '../../system-planet.ts';
import {AMBER_RADIUS} from './world.ts';
import {cloudNormal,surfaceOrientation} from '../../environment.ts';
const Z=new T.Vector3(0,0,1),TAU=Math.PI*2;
export const AMBER_NEIGHBORS=['Хвоя','Лазурь','Ирис','Рубин'] as const;
export function amberSolarState(seconds:number){
 const orbitAngle=NEIGHBORS[0].phase+seconds/NEIGHBORS[0].period*TAU;
 const planetPosition=neighborPosition(0,seconds),spinAngle=orbitAngle+Math.PI*1.5-seconds/DAY_SECONDS*TAU;
 return {orbitAngle,planetPosition,spinAngle,sunDirection:planetPosition.clone().negate().normalize().applyAxisAngle(Z,-spinAngle)};
}
export function amberNeighborPosition(index:number,seconds:number){
 const state=amberSolarState(seconds),position=index===0?solarState(seconds).planetPosition:neighborPosition(index,seconds);
 return position.sub(state.planetPosition).applyAxisAngle(Z,-state.spinAngle).normalize().multiplyScalar(610+index*12);
}
export function amberPlanetAim(index:number,seconds:number,up:T.Vector3,forward:T.Vector3){
 const direction=amberNeighborPosition(index,seconds).normalize(),altitude=T.MathUtils.clamp(direction.dot(up),-1,1);
 if(altitude<.02)return null;
 const tangent=direction.clone().projectOnPlane(up);return {forward:tangent.lengthSq()>1e-10?tangent.normalize():forward.clone(),elevation:-Math.asin(altitude)};
}
export function createAmberSky(scene:T.Scene){
 scene.background=new T.Color(0x02040a);scene.fog=new T.FogExp2(0x182c35,.0018);
 const points:number[]=[];for(let i=0;i<700;i++){const y=1-2*(i+.5)/700,a=i*2.3999632297,r=Math.sqrt(1-y*y);points.push(Math.cos(a)*r*700,y*700,Math.sin(a)*r*700);}
 const stars=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points,3)),new T.PointsMaterial({color:0xe3e9ee,size:1,transparent:true,depthWrite:false}));scene.add(stars);
 const shared=createSky(scene,stars,{state:amberSolarState,radius:AMBER_RADIUS});
 const planets=AMBER_NEIGHBORS.map((name,i)=>{const m=createAtlasPlanet(i===0?0:i+1,i===0,i===0?0x9fc894:NEIGHBORS[i].color,4);m.name=name;m.scale.setScalar(1.7);m.traverse(o=>{if(o instanceof T.Mesh){o.material.fog=false;o.castShadow=false;if(o.material instanceof T.MeshStandardMaterial){o.material.emissive.set(i===0?0x9fc894:NEIGHBORS[i].color);o.material.emissiveIntensity=.1;}}});scene.add(m);return m;});
 const cloudMat=new T.MeshStandardMaterial({color:0xffffff,flatShading:true,roughness:1,transparent:true,opacity:.78,depthWrite:false});
 const clouds=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),cloudMat,48);clouds.name='Облака Янтаря';const obj=new T.Object3D(),tint=new T.Color();scene.add(clouds);
 return {sun:shared.sun,followCamera:shared.followCamera,aim:amberPlanetAim,names:AMBER_NEIGHBORS,neighborPosition:amberNeighborPosition,
  update(seconds:number,camera:T.PerspectiveCamera,up:T.Vector3,space:boolean){
   const {state}=shared.update(seconds,camera,up,space);shared.syncSun(state.sunDirection);
   planets.forEach((m,i)=>{m.position.copy(amberNeighborPosition(i,seconds));m.rotation.z=-state.spinAngle;});
   for(let i=0;i<48;i++){const n=cloudNormal(Math.floor(i/3),16,seconds);const tangent=new T.Vector3(1,0,0).projectOnPlane(n).normalize();obj.position.copy(n).multiplyScalar(AMBER_RADIUS+14).addScaledVector(tangent,(i%3-1)*2.2);obj.quaternion.copy(surfaceOrientation(n));obj.scale.set(3.2,1.1,2);obj.updateMatrix();clouds.setMatrixAt(i,obj.matrix);tint.setScalar(.24+.76*T.MathUtils.smoothstep(n.dot(state.sunDirection),-.2,.25));clouds.setColorAt(i,tint);}
   clouds.instanceMatrix.needsUpdate=true;if(clouds.instanceColor)clouds.instanceColor.needsUpdate=true;clouds.computeBoundingSphere();return state;
  }};
}
