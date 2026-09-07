import * as T from 'three';
import {WILDERNESS,TRAIL,trailDistance,azureUp} from './wilderness.ts';
import {sample,RADIUS} from './terrain.ts';
import {surfaceOrientation} from '../../environment.ts';
import type {Obstacle} from '../../simulation.ts';
export function buildWilderness(scene:T.Scene,statics:T.Group){
 const obstacles:Obstacle[]=[],soundTrees:T.Vector3[]=[],materials=new Map<number,T.MeshStandardMaterial>();
 function anchor(up:T.Vector3){const g=new T.Group();g.position.copy(up).multiplyScalar(sample(up).height);g.quaternion.copy(surfaceOrientation(up));statics.add(g);return g;}
 function mesh(g:T.Group,geo:T.BufferGeometry,color:number,x=0,y=0,z=0){let mat=materials.get(color);if(!mat){mat=new T.MeshStandardMaterial({color,roughness:.95,flatShading:true});materials.set(color,mat);}const m=new T.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;}
 const box=(g:T.Group,c:number,w:number,h:number,d:number,x=0,y=0,z=0)=>mesh(g,new T.BoxGeometry(w,h,d),c,x,y,z);
 function offset(up:T.Vector3,x:number,z:number){return up.clone().addScaledVector(new T.Vector3(x,0,z).applyQuaternion(surfaceOrientation(up)),1/RADIUS).normalize();}
 function solid(up:T.Vector3,radius:number){obstacles.push({up,radius});}
 function stone(up:T.Vector3,size:number){const g=anchor(up),m=mesh(g,new T.IcosahedronGeometry(size,0),0x939d91,0,size*.35);m.scale.set(1.3,.7,1);if(size>.4)solid(up,size*.8);}
 function tree(up:T.Vector3,i:number,birch:boolean){
  if(sample(up).wet||trailDistance(up)<2.1||WILDERNESS.some(p=>p.up.distanceTo(up)*RADIUS<3))return;
  const g=anchor(up),s=.8+(i%7)*.1;g.scale.setScalar(s);
  mesh(g,new T.CylinderGeometry(.14,.22,birch?3.8:2.5,6),birch?0xe5e0cb:0x6c5141,0,birch?1.9:1.25);
  if(birch){for(let j=0;j<5;j++)box(g,0x514c43,.19,.07,.025,0,.6+j*.61,-.17);for(let j=0;j<3;j++){const c=mesh(g,new T.IcosahedronGeometry(1.3,1),[0xa8ba71,0x8fa75f,0xb8c989][j],(j-1)*.6,3.4+j*.35,0);c.scale.y=.8;}}
  else for(let j=0;j<4;j++)mesh(g,new T.ConeGeometry(1.6-j*.27,2.4-j*.25,7),[0x315c49,0x3f7054,0x518364,0x6a9772][j],0,2+j*.7);
  solid(up,.24*s);soundTrees.push(up);
 }
 const places=WILDERNESS.map(p=>{
  const g=anchor(p.up);
  const index=WILDERNESS.indexOf(p),across=new T.Vector3().crossVectors(p.up,TRAIL[Math.max(0,index)]).normalize();
  const candidates=[-1,1].map(sign=>p.up.clone().addScaledVector(across,sign*3/RADIUS).normalize());
  const restUp=candidates.sort((a,b)=>trailDistance(b)-trailDistance(a))[0],restFacing=p.up.clone().projectOnPlane(restUp).normalize();
  if(p.id==='spruce-trail'||p.id==='birch-trail'){
   for(let i=0;i<48;i++){const a=i*2.39996,r=4+Math.sqrt(i/48)*12;tree(offset(p.up,Math.cos(a)*r,Math.sin(a)*r),i,p.id==='birch-trail');}
   for(let i=0;i<55;i++){const a=i*2.39996,r=3+Math.sqrt(i/55)*13,up=offset(p.up,Math.cos(a)*r,Math.sin(a)*r);if(sample(up).wet||trailDistance(up)<1)continue;const plant=anchor(up);for(let j=0;j<3;j++){const leaf=mesh(plant,new T.ConeGeometry(.12,.55,3),0x789264,Math.cos(j*2.1)*.12,.18,Math.sin(j*2.1)*.12);leaf.rotation.z=.6;leaf.rotation.y=j*2.1;}if(p.id==='birch-trail')mesh(plant,new T.IcosahedronGeometry(.1,0),i%2?0xe8d6a6:0xc8a9bc,0,.4,0);}
  }
  if(p.id==='spruce-trail'||p.id==='old-shelter'||p.id==='birch-trail'){
   const bench=anchor(restUp);bench.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3().crossVectors(restFacing,restUp).normalize(),restUp,restFacing.clone().negate()));
   const log=mesh(bench,new T.CylinderGeometry(.35,.35,2.8,9),0x71543e,0,.38,.85);log.rotation.z=Math.PI/2;
   for(const x of [-1.41,1.41]){const end=mesh(bench,new T.CylinderGeometry(.29,.29,.025,9),0xc1a377,x,.38,.85);end.rotation.z=Math.PI/2;}
   // Row of small trunk colliders leaves the feet free in front of the seat.
   for(const x of [-1,-.5,0,.5,1]){bench.updateMatrixWorld(true);solid(bench.localToWorld(new T.Vector3(x,0,.95)).normalize(),.26);}
  }
  if(p.id==='old-shelter'){
   const shelter=anchor(offset(p.up,-6,0));
   for(const x of [-2,2])for(const z of [2,4.5]){box(shelter,0x776044,.16,2.6,.16,x,1.3,z);solid(offset(p.up,x-6,z),.13);}
   const roof=box(shelter,0x8e8060,4.8,.18,3.4,0,2.75,3.2);roof.rotation.x=.12;
   for(let i=0;i<9;i++){const a=i/9*Math.PI*2;stone(offset(p.up,4+Math.cos(a)*.8,Math.sin(a)*.8),.22);}
   box(g,0x403c33,1,.025,.7,4,.02,0);box(shelter,0xb6a07a,.8,.35,.65,-1,.18,3.2);box(shelter,0xeee1b7,.4,.025,.28,-1,.37,3.2);
   mesh(shelter,new T.CylinderGeometry(.12,.12,.21,8),0xb2c1b3,.7,.13,2.2);
  }
  if(p.id==='birch-trail'){
   box(g,0x9a805d,.48,.66,.08,1.6,.72,0);box(g,0x84b5bd,.08,1.1,.04,1.6,1.42,0);
   mesh(g,new T.TorusGeometry(.15,.018,4,16,5.4),0xe6d7a9,1.6,.76,-.052);box(g,0xe7d7ab,.3,.18,.025,1.6,.45,-.054);
  }
  if(p.id==='azure-pass'){
   for(const x of [-3,3])for(let j=0;j<4;j++)mesh(g,new T.IcosahedronGeometry(.6-j*.11,0),0xa4aaa1,x,.25+j*.4,0);
   for(const x of [-3,3])solid(offset(p.up,x,0),.65);
   box(g,0x71583e,.12,1.8,.12,2,.9,-2);box(g,0xd1b98c,1.5,.3,.12,2,1.65,-2);box(g,0xbda579,1.1,.25,.12,2,1.2,-2);mesh(g,new T.TorusGeometry(.11,.018,4,16,5.4),0x605643,2,1.65,-2.075);box(g,0xe6d9b5,.4,.08,.2,2,.08,-2);
  }
  if(p.id==='azure-cove'){
   for(let i=0;i<14;i++){const up=offset(p.up,Math.cos(i*2.4)*(2+i%3),Math.sin(i*2.4)*(2+i%3));if(sample(up).wet)continue;const shell=mesh(anchor(up),new T.SphereGeometry(.16,6,3,0,Math.PI*2,0,Math.PI/2),i%2?0xf2dec3:0xd4ada0,0,.04);shell.scale.set(1,.35,.7);}
   mesh(g,new T.CylinderGeometry(.12,.17,.55,7),0x79a89c,1,.3,0);box(g,0xe9dab2,.13,.25,.05,1,.3,-.17);
   const drift=mesh(g,new T.CylinderGeometry(.12,.25,3,6),0xaaa18a,2,.18,2);drift.rotation.z=1.3;
  }
  if(p.id==='azure-beacon'){
   // Open hilltop forecourt: the lookout follows real terrain and stays walkable.
   mesh(g,new T.CylinderGeometry(1.15,1.65,4.6,10),0xd4cdb6,0,2.3,5);solid(offset(p.up,0,5),1.7);
   mesh(g,new T.CylinderGeometry(1.19,1.4,.5,10),0xa57354,0,3.1,5);
   mesh(g,new T.CylinderGeometry(2.6,2.6,.22,12),0x827b68,0,4.7,5);
   for(let i=0;i<6;i++){const a=i*Math.PI/3;box(g,0x5e685f,.09,1.2,.09,Math.cos(a)*.9,5.35,5+Math.sin(a)*.9);}
   mesh(g,new T.ConeGeometry(1.5,.9,10),0x64827d,0,6.3,5);
   for(const x of [-.4,.4])box(g,0x7b644b,.1,4.9,.1,x,2.45,2.6);for(let j=0;j<13;j++)box(g,0xb49a6e,.85,.08,.13,0,.2+j*.36,2.6);
   box(g,0x615647,.65,1.3,.1,0,.65,3.38);box(g,0xad9370,.5,.7,.35,1,.4,1);
   box(g,0x7f6749,.9,.65,.65,-1,.32,1);box(g,0x786047,.65,.05,.48,-1,.68,1);box(g,0xe9dcad,.58,.02,.41,-1,.72,1);
   for(let i=0;i<8;i++){const a=Math.PI*i/7;stone(offset(p.up,Math.cos(a)*5,Math.sin(a)*2-3),.25);}
  }
  const canRest=['spruce-trail','old-shelter','birch-trail'].includes(p.id),climbUp=p.id==='azure-beacon'?offset(p.up,0,2.6):null;
  const climbHeight=climbUp?(sample(p.up).height+4.82)/climbUp.dot(p.up)-sample(climbUp).height:0;
  return {...p,inspectUp:canRest?restUp.clone():climbUp??p.up.clone(),restUp:canRest?restUp:climbUp,restFacing,climbHeight};
 });
 // Uneven woodland pockets belong to the landscape, rather than outlining a route.
 for(const [x,z] of [[113,12],[86,-5],[78,-28],[60,0],[40,12],[43,43]]){
  const center=azureUp(x,z);
  for(let i=0;i<9;i++){const angle=i*2.39996,r=2+Math.sqrt(i)*2.1;tree(offset(center,Math.cos(angle)*r,Math.sin(angle)*r),i,false);}
 }
 const beacon=places.find(p=>p.id==='azure-beacon')!,lamp=new T.Group();lamp.position.copy(beacon.up).multiplyScalar(sample(beacon.up).height);lamp.quaternion.copy(surfaceOrientation(beacon.up));scene.add(lamp);
 const bulb=new T.Mesh(new T.SphereGeometry(.48,10,6),new T.MeshBasicMaterial({color:0xffde8d}));bulb.position.set(0,5.35,5);lamp.add(bulb);
 const light=new T.PointLight(0xffd493,0,28,2);light.position.copy(bulb.position);lamp.add(light);
 return {places,obstacles,soundTrees,setBeacon(lit:boolean){bulb.visible=lit;light.intensity=lit?9:0;},lamp};
}
