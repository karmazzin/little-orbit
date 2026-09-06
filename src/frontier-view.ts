import * as T from 'three';import {FRONTIER_PLACES,frontierUp} from './frontier.ts';import {sample,RADIUS} from './terrain.ts';import {surfaceOrientation} from './environment.ts';import {HOMES} from './resident-life.ts';import type {Obstacle} from './simulation.ts';
export function buildFrontier(scene:T.Scene,statics:T.Group){
 const obstacles:Obstacle[]=[],soundTrees:T.Vector3[]=[];const mats=new Map<number,T.MeshStandardMaterial>();
 function anchor(up:T.Vector3){const g=new T.Group();g.position.copy(up).multiplyScalar(sample(up).height);g.quaternion.copy(surfaceOrientation(up));statics.add(g);return g;}
 function part(g:T.Group,geo:T.BufferGeometry,c:number,x=0,y=0,z=0){let m=mats.get(c);if(!m){m=new T.MeshStandardMaterial({color:c,roughness:.95,flatShading:true});mats.set(c,m);}const p=new T.Mesh(geo,m);p.position.set(x,y,z);g.add(p);return p;}
 const box=(g:T.Group,c:number,w:number,h:number,d:number,x=0,y=0,z=0)=>part(g,new T.BoxGeometry(w,h,d),c,x,y,z);
 function block(g:T.Group,x:number,z:number,radius:number){g.updateMatrixWorld(true);obstacles.push({up:g.localToWorld(new T.Vector3(x,0,z)).normalize(),radius});}
 const places=FRONTIER_PLACES.map(p=>{const g=anchor(p.up);
  if(p.id==='wind-saddle'){
   for(const x of [-2,2]){box(g,0x766146,.22,3.6,.22,x,1.8,1);block(g,x,1,.2);}box(g,0x8f7752,4.4,.22,.25,0,3.5,1);
   for(let i=0;i<5;i++)part(g,new T.CylinderGeometry(.09,.09,1+i*.16,7),0xb29d70,-1.2+i*.6,2.5,1);
   box(g,0xdac998,.6,.06,.42,0,.45,-1.2);for(let i=0;i<6;i++){const a=i*1.047;part(g,new T.IcosahedronGeometry(.4,0),0x92998d,Math.cos(a)*4,.15,Math.sin(a)*3);}
  }else if(p.id==='old-station'){
   for(const x of [-2.8,2.8])for(const z of [1.5,4.5]){box(g,0x6d5b42,.17,2.6,.17,x,1.3,z);block(g,x,z,.14);}const roof=box(g,0x979176,6.2,.18,4,0,2.8,3);roof.rotation.x=.08;
   box(g,0x8d7855,2.4,.13,1.1,0,.9,3);for(const x of [-1,1])box(g,0x685b45,.12,.9,.12,x,.45,3);block(g,0,3,1.05);
   box(g,0xb2b4a2,.65,.4,.55,-.65,1.15,3);part(g,new T.TorusGeometry(.23,.08,6,12),0xc5ae7e,.4,1.08,3).rotation.x=Math.PI/2;box(g,0xe3d4a6,.4,.025,.3,.9,1,3);
  }else if(p.id==='lost-cove'){
   for(const x of [-2.5,2.5]){const log=part(g,new T.CylinderGeometry(.13,.22,3,6),0xa69d85,x,.18,1);log.rotation.z=1.3;}
   box(g,0x726856,.55,.07,.75,0,.1,0);box(g,0xd7c694,.47,.02,.65,0,.15,0);
   for(let i=0;i<9;i++){const rock=part(g,new T.IcosahedronGeometry(.17,0),0xcbbfa2,Math.cos(i*2.4)*3,.05,Math.sin(i*2.4)*2);rock.scale.y=.3;}
  }else if(p.id==='weather-ridge'){
   const trunk=part(g,new T.CylinderGeometry(.22,.42,4,7),0x6c5944,3,1.8,0);trunk.rotation.z=-.22;const leaves=part(g,new T.IcosahedronGeometry(1.9,1),0x84936a,3.6,4,0);leaves.scale.set(1.6,.65,1);block(g,3,0,.55);soundTrees.push(p.up.clone());box(g,0x889185,.7,.26,.4,1,.15,0);box(g,0xe6d3a5,.43,.02,.29,1,.3,0);
  }
  return {...p,inspectUp:p.id==='ranger-shelter'?HOMES.savva.porch.clone():p.up.clone()};
 });
 for(const [x,z] of [[21,-35],[43,-12],[-34,-9],[-44,43],[10,-65]])for(let i=0;i<16;i++){
  const a=i*2.399,r=2+Math.sqrt(i)*2,up=frontierUp(x+Math.cos(a)*r,z+Math.sin(a)*r);if(sample(up).wet||FRONTIER_PLACES.some(p=>p.up.distanceTo(up)*RADIUS<8))continue;
  const g=anchor(up),height=2.5+(i%4)*.4;part(g,new T.CylinderGeometry(.13,.21,height,6),0x705542,0,height/2);for(let j=0;j<3;j++)part(g,new T.ConeGeometry(1.15-j*.2,1.9,7),[0x406c50,0x557e5c,0x74946a][j],0,height*.7+j*.6);block(g,0,0,.23);soundTrees.push(up);
 }
 const signal=new T.Group(),at=FRONTIER_PLACES.find(p=>p.id==='wind-saddle')!.up;signal.position.copy(at).multiplyScalar(sample(at).height);signal.quaternion.copy(surfaceOrientation(at));scene.add(signal);
 const ribbon=new T.Mesh(new T.BoxGeometry(.12,1.2,.04),new T.MeshStandardMaterial({color:0xc5a468}));ribbon.position.set(0,2.9,.85);signal.add(ribbon);ribbon.visible=false;
 return {places,obstacles,soundTrees,update(repaired:boolean,time:number){ribbon.visible=repaired;if(repaired)ribbon.rotation.z=Math.sin(time*1.5)*.18;}};
}
