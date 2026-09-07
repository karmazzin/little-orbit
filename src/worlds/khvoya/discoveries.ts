import * as T from 'three';
import {normalAt,sample} from './terrain.ts';
import {surfaceOrientation} from '../../environment.ts';
export const CAMP={name:'Лагерь астронома',up:normalAt(-85,110),text:'Если ты читаешь это, значит, долина осталась далеко позади. Каждую ночь я наблюдаю Ирис — бледно-лиловую планету с тонкими кольцами. Иногда кажется, будто на кольцах вспыхивает крошечный огонёк. Я оставил здесь карту неба, а сам пошёл искать место повыше. Когда-нибудь мы узнаем, что там. — А.'};
export function createCamp(scene:T.Scene){
 const root=new T.Group();root.name=CAMP.name;root.position.copy(CAMP.up).multiplyScalar(sample(CAMP.up).height);root.quaternion.copy(surfaceOrientation(CAMP.up));scene.add(root);
 const mats=new Map<number,T.MeshStandardMaterial>();
 function mesh(geometry:T.BufferGeometry,color:number,x:number,y:number,z:number){let mat=mats.get(color);if(!mat){mat=new T.MeshStandardMaterial({color,roughness:1,flatShading:true,side:T.DoubleSide});mats.set(color,mat);}const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
 const tentGeo=new T.BufferGeometry();tentGeo.setAttribute('position',new T.Float32BufferAttribute([
 -1.25,0,-1.4, 0,1.7,-1.4, 0,1.7,1.4, -1.25,0,-1.4,0,1.7,1.4,-1.25,0,1.4,
 0,1.7,-1.4,1.25,0,-1.4,1.25,0,1.4,0,1.7,-1.4,1.25,0,1.4,0,1.7,1.4,
 -1.25,0,1.4,0,1.7,1.4,1.25,0,1.4],3));tentGeo.computeVertexNormals();mesh(tentGeo,0x9f9169,0,.05,0);
 mesh(new T.BoxGeometry(2.5,.08,2.8),0x655741,0,.05,0);
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2;mesh(new T.IcosahedronGeometry(.2,0),0x8c9387,Math.cos(a)*.7,.12,-3+Math.sin(a)*.7);}
 mesh(new T.CylinderGeometry(.5,.5,.03,10),0x413f39,0,.02,-3);
 for(const angle of [-.6,.6]){const log=mesh(new T.CylinderGeometry(.12,.12,1,6),0x514536,0,.15,-3);log.rotation.set(Math.PI/2,0,angle);}
 mesh(new T.BoxGeometry(.5,.65,.35),0x946249,1.9,.32,-1.3);
 const note=mesh(new T.BoxGeometry(.42,.025,.3),0xf0dbac,2,.55,-2.2);note.rotation.y=.2;
 mesh(new T.BoxGeometry(.8,.5,.7),0x776957,2,.25,-2.2);
 root.updateMatrixWorld(true);const noteUp=note.getWorldPosition(new T.Vector3()).normalize();
 return {root,noteUp,obstacle:{up:CAMP.up.clone(),radius:1.9}};
}
