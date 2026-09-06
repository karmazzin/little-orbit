import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ADVENTURE_POINTS,pointById,type Adventures} from './adventures.ts';
import {sample,RADIUS} from './terrain.ts';
import type {Obstacle} from './simulation.ts';
const Y=new T.Vector3(0,1,0);
const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.9,flatShading:true});
function part(root:T.Object3D,g:T.BufferGeometry,color:number,x=0,y=0,z=0){
 const c=new T.Color(color),a=new Float32Array(g.getAttribute('position').count*3);for(let i=0;i<a.length;i+=3)c.toArray(a,i);g.setAttribute('color',new T.BufferAttribute(a,3));
 const m=new T.Mesh(g,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;
}
const box=(r:T.Object3D,c:number,w:number,h:number,d:number,x=0,y=0,z=0)=>part(r,new T.BoxGeometry(w,h,d),c,x,y,z);
const rock=(r:T.Object3D,c:number,size:number,x=0,y=0,z=0)=>part(r,new T.IcosahedronGeometry(size,0),c,x,y,z);
function compact(root:T.Group){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),geos:T.BufferGeometry[]=[];
 root.traverse(o=>{if(o instanceof T.Mesh)geos.push((o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(inverse.clone().multiply(o.matrixWorld)));});
 const old:T.BufferGeometry[]=[];root.traverse(o=>{if(o instanceof T.Mesh)old.push(o.geometry);});root.clear();old.forEach(g=>g.dispose());const geometry=mergeGeometries(geos);geos.forEach(g=>g.dispose());if(geometry){const m=new T.Mesh(geometry,mat);m.castShadow=true;m.receiveShadow=true;root.add(m);}
}
export function buildAdventures(scene:T.Scene,statics:T.Group){
 const obstacles:Obstacle[]=[],points=ADVENTURE_POINTS.map(p=>({...p,inspectUp:(p.id==='festival'?p.up.clone().add(new T.Vector3(0,0,-.055)).normalize():p.up.clone())}));
 function anchor(parent:T.Object3D,id:string){const p=pointById(id),root=new T.Group();root.position.copy(p.up).multiplyScalar(sample(p.up).height);root.quaternion.setFromUnitVectors(Y,p.up);parent.add(root);return root;}
 function block(root:T.Group,x:number,z:number,radius:number){root.updateMatrixWorld(true);obstacles.push({up:root.localToWorld(new T.Vector3(x,0,z)).normalize(),radius});}
 const crater=anchor(statics,'meteor');
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;rock(crater,0x665c51,.5,Math.cos(a)*2.3,.05,Math.sin(a)*2.3);}
 const stone=rock(crater,0x4f5057,1.05,0,.5);stone.scale.set(1,.75,1);block(crater,0,0,1);
 const core=anchor(scene,'meteor');rock(core,0xe7bd8b,.23,.45,.96,-.6);compact(core);
 const cave=anchor(statics,'cave');
 for(const x of [-2.8,2.8])for(const z of [-1,1,3]){const m=rock(cave,0x7d857e,1.5,x,1.15,z);m.scale.y=1.4;block(cave,x,z,1.2);}
 for(const x of [-1.3,1.3]){rock(cave,0x717b76,1.55,x,1.3,4);block(cave,x,4,1.3);}
 box(cave,0x7b847d,6.3,.65,6.4,0,3.3,1.1);
 // The readable puzzle sits outside the walls, so neither collision nor the roof traps the camera.
 box(cave,0xbca67c,1.6,.75,.18,0,.8,-2.5);
 part(cave,new T.CylinderGeometry(.16,.16,.05,10),0xe2c174,-.48,.9,-2.61).rotation.x=Math.PI/2;
 part(cave,new T.ConeGeometry(.2,.35,3),0x6c825a,0,.9,-2.64);
 part(cave,new T.OctahedronGeometry(.16),0xdfd8b8,.48,.9,-2.64);
 // A shallow stone box and wall drawings make the written discovery visible in the world.
 box(cave,0x938d77,.8,.4,.55,.95,.2,-2.25);
 rock(cave,0xd5bd85,.12,.95,.43,-2.25);
 for(const [x,color] of [[-1,0xe0bd73],[0,0x9aae75],[1,0xd6d4b6]]){
  rock(cave,color,.16,x,2,2.7);box(cave,color,.06,.45,.04,x,1.65,2.7);
 }
 const lid=anchor(scene,'cave');box(lid,0xa8a18b,.88,.1,.63,.95,.45,-2.25);compact(lid);
 cave.updateMatrixWorld(true);points.find(p=>p.id==='cave')!.inspectUp.copy(cave.localToWorld(new T.Vector3(0,0,-3.8))).normalize();
 const bottles=points.filter(p=>p.id.startsWith('bottle')).map(p=>{const root=anchor(scene,p.id);part(root,new T.CylinderGeometry(.12,.17,.55,7),0x80b6a3,0,.3);part(root,new T.CylinderGeometry(.065,.065,.17,6),0xb99a65,0,.64);box(root,0xf0d8a4,.14,.27,.12,0,.3,-.12);compact(root);return {id:p.id,root};});
 for(const id of ['track-1','track-2']){const root=anchor(statics,id);for(let i=0;i<6;i++){const m=rock(root,0x867450,.11,(i%2)*.24,.04,-.7+i*.27);m.scale.set(.6,.2,1.3);}}
 const bell=anchor(scene,'bell');part(bell,new T.CylinderGeometry(.12,.29,.4,8),0xd7b35f,0,.55);rock(bell,0x936e39,.09,0,.31);compact(bell);
 const bush=anchor(statics,'bell');for(const x of [-.7,.7])rock(bush,0x658257,.6,x,.3,.4);
 const pulse=anchor(scene,'bell');const ring=new T.Mesh(new T.RingGeometry(.36,.4,24),new T.MeshBasicMaterial({color:0xf1d899,transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.18;pulse.add(ring);
 const festival=anchor(scene,'festival');
 for(let i=0;i<5;i++){const x=-4+i*2;box(festival,0x806143,.13,2.6,.13,x,1.3,5.4);rock(festival,0xffd995,.19,x,2.4,5.4);}
 compact(festival);
 const lights=new T.Points(new T.BufferGeometry().setFromPoints(Array.from({length:5},(_,i)=>new T.Vector3(-4+i*2,2.4,5.4))),new T.PointsMaterial({color:0xffd6a0,size:.38,sizeAttenuation:true,depthWrite:false,transparent:true}));festival.add(lights);
 const cart=anchor(statics,'traveler');
 box(cart,0xa4805c,1.8,.55,1.05,1.7,.6,.6);for(const x of [1,2.4])for(const z of [0,1.2])part(cart,new T.CylinderGeometry(.35,.35,.12,10),0x62503b,x,.35,z).rotation.x=Math.PI/2;
 box(cart,0xd9c9a0,1.7,.1,1.3,1.7,1.9,.6);for(const x of [1,2.4])box(cart,0x806348,.07,1.3,.07,x,1.2,.6);
 box(cart,0xc4b58d,1.7,1.18,.06,1.7,1.25,1.2);box(cart,0xc4b58d,.06,1.18,1.15,2.5,1.25,.6);
 block(cart,1.7,.6,.85);
 const cartLamp=anchor(scene,'traveler'),cartGlow=new T.MeshBasicMaterial({color:0x706750});const glass=new T.Mesh(new T.BoxGeometry(.14,.23,.14),cartGlow);glass.position.set(.8,1.6,.1);cartLamp.add(glass);
 const traveler=new T.Group();traveler.visible=false; // Legacy handle; Noah now belongs to the resident simulation.
 return {points,obstacles,traveler,festival,update(s:Adventures,seconds:number,time:number,playerUp:T.Vector3,party:boolean,cartOccupied=false){
  lid.children[0].position.x=s.cave?.65:0;
  core.visible=s.meteor==='new'||s.meteor==='searching';bottles.forEach(b=>b.root.visible=!s.bottles.includes(b.id));
  bell.visible=s.bell!=='found'&&s.bell!=='complete';pulse.visible=s.bell==='searching'&&s.tracks===2;
  ring.scale.setScalar(1+(time%2)*.7);(ring.material as T.MeshBasicMaterial).opacity=(1-time%2/2)*.7;
  lights.material.opacity=party?.85:.18;cartGlow.color.set(cartOccupied?0xffcf87:0x706750);

 }};
}
