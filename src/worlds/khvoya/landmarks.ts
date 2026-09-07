import * as T from 'three';
import {FRONTIER_PLACES} from './frontier.ts';
import {WILDERNESS} from './wilderness.ts';
import {hiddenByPlanet} from '../../sectors.ts';
import {normalAt,sample,RADIUS} from './terrain.ts';
import {surfaceOrientation} from '../../environment.ts';
import {solarState} from '../../sky.ts';
import type {Obstacle} from '../../simulation.ts';
export const LANDMARKS=[
 {id:'arch',name:'Арка ветров',x:-40,z:-37,hint:'За холмами к западу от почтового домика.',text:'Каменная арка стоит здесь дольше любого дома. Ветер выточил в ней узкие борозды. На внутренней стороне кто-то выбил пять кружков вокруг шестого — старую карту нашей звёздной системы.'},
 {id:'grove',name:'Медная роща',x:-48,z:35,hint:'На западном склоне, далеко от речных берегов.',text:'Листья здесь медные даже в разгар лета. Между корнями лежит табличка: «Посажено теми, кто вернулся». Лев говорит, что каждое дерево появилось после чьего-то долгого путешествия.'},
 {id:'lookout',name:'Звёздный уступ',x:44,z:48,hint:'За восточным берегом озера, дальше по холмам.',text:'Небольшая площадка открыта ветру и небу. На телескопе выгравировано: «Сначала научись смотреть». На скамье записка Ады: «Приходи, когда здесь стемнеет. Покажу, где искать Ирис».'},
].map(p=>({...p,up:normalAt(p.x,p.z)}));
export const ALL_LANDMARKS=[...LANDMARKS,...WILDERNESS,...FRONTIER_PLACES];
export type Exploration={places:string[];nightMeeting:boolean};
export const initialExploration=():Exploration=>({places:[],nightMeeting:false});
export function discoverPlace(state:Exploration,id:string):Exploration{
 return ALL_LANDMARKS.some(p=>p.id===id)&&!state.places.includes(id)?{...state,places:[...state.places,id]}:state;
}
export function restoreExploration(raw:string|null):Exploration{
 try{const s=JSON.parse(raw??'null');if(!s||!Array.isArray(s.places))return initialExploration();
 return {places:ALL_LANDMARKS.filter(p=>s.places.includes(p.id)).map(p=>p.id),nightMeeting:s.nightMeeting===true};}catch{return initialExploration();}
}
export function atObservatoryNight(seconds:number){return solarState(seconds).sunDirection.dot(LANDMARKS[2].up)<-.12;}
export const ADA_OBSERVATORY_UP=normalAt(42,49);
export function buildLandmarks(parent:T.Group){
 const obstacles:Obstacle[]=[];const soundTrees:T.Vector3[]=[];const materials=new Map<number,T.MeshStandardMaterial>();
 function add(root:T.Group,geometry:T.BufferGeometry,color:number,x=0,y=0,z=0){let material=materials.get(color);if(!material){material=new T.MeshStandardMaterial({color,roughness:.92,flatShading:true});materials.set(color,material);}const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);root.add(mesh);return mesh;}
 const places=LANDMARKS.map(place=>{
  const root=new T.Group();root.name=place.name;root.position.copy(place.up).multiplyScalar(sample(place.up).height);root.quaternion.copy(surfaceOrientation(place.up));parent.add(root);
  const solid=(x:number,z:number,radius:number)=>{root.updateMatrixWorld(true);const up=root.localToWorld(new T.Vector3(x,0,z)).normalize();obstacles.push({up,radius});return up;};
  const box=(c:number,w:number,h:number,d:number,x:number,y:number,z:number)=>add(root,new T.BoxGeometry(w,h,d),c,x,y,z);
  if(place.id==='arch'){
   for(const x of [-2.5,2.5]){for(let i=0;i<3;i++){const rock=box(i%2?0x8c9998:0x9ea8a0,1.4,1.3,1.7,x,i*1.15+.6,0);rock.rotation.y=i*.13;}solid(x,0,.95);}
   const lintel=box(0xb0b9aa,5.5,1.2,1.9,0,4,0);lintel.rotation.z=.06;
   for(let i=0;i<5;i++)add(root,new T.IcosahedronGeometry(.09,0),0xddd4a9,-.6+i*.3,3.8,-.97);
  }else if(place.id==='grove'){
   for(let i=0;i<9;i++){const a=i/9*Math.PI*2,x=Math.cos(a)*(4+i%2),z=Math.sin(a)*(4+i%2);
    add(root,new T.CylinderGeometry(.17,.24,2.4,6),0x735244,x,1.2,z);
    const crown=add(root,new T.IcosahedronGeometry(1.55,1),[0xc38756,0xb26549,0xd9ab68][i%3],x,3.1,z);crown.scale.set(1,1.2,1);soundTrees.push(solid(x,z,.35));
   }
   box(0x8b7152,1,.5,.7,0,.25,0);box(0xe0c894,.7,.06,.45,0,.55,0).rotation.x=.15;solid(0,0,.55);
  }else{
   // Ground-level stones keep the platform walkable with the terrain controller.
   for(let i=0;i<12;i++){const a=i/12*Math.PI*2;add(root,new T.IcosahedronGeometry(.35,0),0xaab2a3,Math.cos(a)*3.5,.08,Math.sin(a)*3.5);}
   for(let i=0;i<3;i++){const leg=add(root,new T.CylinderGeometry(.045,.07,1.5,5),0x8b7758,Math.cos(i*2.094)*.35,.65,Math.sin(i*2.094)*.35);leg.rotation.z=Math.cos(i*2.094)*.3;leg.rotation.x=Math.sin(i*2.094)*.3;}
   const tube=add(root,new T.CylinderGeometry(.2,.26,1.6,10),0xb5b4a0,0,1.75,0);tube.rotation.x=1;
   const lens=add(root,new T.CylinderGeometry(.18,.18,.05,10),0x476876,0,2.18,.67);lens.rotation.x=1;
   solid(0,0,.7);
   box(0x9b7e59,2.4,.2,.7,2,.55,-2.1);for(const x of [1.1,2.9])box(0x6b5b45,.18,.5,.5,x,.25,-2.1);
   solid(2,-2.1,1.25);
  }
  // Inspection plaque in a clear approach corridor, separate from the obstacle footprint.
  const plaque=box(0xcdb78b,.55,.08,.38,0,.65,-2.3);box(0x80694e,.08,.65,.08,0,.32,-2.3);
  root.updateMatrixWorld(true);const inspectUp=plaque.getWorldPosition(new T.Vector3()).normalize();
  return {...place,inspectUp};
 });
 return {places,obstacles,soundTrees};
}

export function canRelocateResident(source:T.Vector3,target:T.Vector3,player:T.Vector3,camera:T.Camera){
 if(source.distanceTo(player)*RADIUS<=24||target.distanceTo(player)*RADIUS<=6)return false;
 return [source,target].every(up=>{
  const position=up.clone().multiplyScalar(sample(up).height+1),point=position.clone().project(camera);
  return point.z< -1||point.z>1||Math.abs(point.x)>1.1||Math.abs(point.y)>1.1||hiddenByPlanet(camera.position,new T.Sphere(position,2));
 });
}
