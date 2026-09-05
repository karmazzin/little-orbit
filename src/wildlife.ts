import * as T from 'three';
import {normalAt,sample,RADIUS} from './terrain.ts';
import {surfaceOrientation} from './environment.ts';
import type {Obstacle} from './simulation.ts';
export function createWildlife(scene:T.Scene,obstacles:Obstacle[]){
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:true,side:T.DoubleSide});
 const meshes:T.InstancedMesh[]=[];
 function instanced(geometry:T.BufferGeometry,count:number,color:number){const mesh=new T.InstancedMesh(geometry,material,count);mesh.frustumCulled=false;for(let i=0;i<count;i++)mesh.setColorAt(i,new T.Color(color));scene.add(mesh);meshes.push(mesh);return mesh;}
 const body=instanced(new T.IcosahedronGeometry(1,1),3,0xc4b6a0),head=instanced(new T.IcosahedronGeometry(1,0),3,0xd8cbbb),ears=instanced(new T.BoxGeometry(1,1,1),6,0xd8cbbb),tail=instanced(new T.IcosahedronGeometry(1,0),3,0xf0e7d5);
 const wings=instanced(new T.PlaneGeometry(1,1),24,0xe3b874);
 for(let i=0;i<24;i++)wings.setColorAt(i,new T.Color([0xe3b874,0xcb94b0,0xadc9d3][Math.floor(i/2)%3]));
 const birdGeo=new T.BufferGeometry();birdGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,-.14, .65,0,.08, 0,0,.2],3));birdGeo.computeVertexNormals();const birds=instanced(birdGeo,12,0x68695b);
 const passable=(up:T.Vector3)=>sample(up).waterDepth<=.1&&!obstacles.some(o=>up.distanceTo(o.up)*RADIUS<o.radius+.32);
 const rabbits=[[-15,6],[-45,36],[-80,107]].map(([x,z])=>{
  let up=normalAt(x,z);for(let i=0;!passable(up)&&i<100;i++){const a=i*2.399;up=normalAt(x+Math.cos(a)*(1+i*.08),z+Math.sin(a)*(1+i*.08));}
  return {up,home:up.clone(),forward:new T.Vector3(0,0,-1).projectOnPlane(up).normalize(),moving:false};
 });
 const frame=new T.Object3D(),part=new T.Object3D(),matrix=new T.Matrix4();
 function begin(up:T.Vector3,height:number,yaw=0){frame.position.copy(up).multiplyScalar(height);frame.quaternion.copy(surfaceOrientation(up,yaw));frame.updateMatrix();}
 function put(mesh:T.InstancedMesh,index:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,rx=0,rz=0){part.position.set(x,y,z);part.scale.set(sx,sy,sz);part.rotation.set(rx,0,rz,'ZYX');part.updateMatrix();matrix.multiplyMatrices(frame.matrix,part.matrix);mesh.setMatrixAt(index,matrix);}
 return {rabbits,count:21,update(seconds:number,dt:number,player:T.Vector3,sun:T.Vector3){
  dt=Math.min(dt,.1);
  rabbits.forEach((rabbit,i)=>{
   const scared=rabbit.up.distanceTo(player)*RADIUS<4,farHome=rabbit.up.distanceTo(rabbit.home)*RADIUS>8;
   const target=farHome?rabbit.home:scared?rabbit.up.clone().multiplyScalar(2).sub(player).normalize():rabbit.home.clone().add(new T.Vector3(Math.sin(seconds*.3+i)*.02,0,Math.cos(seconds*.3+i)*.02)).normalize();
   let direction=target.clone().sub(rabbit.up).projectOnPlane(rabbit.up);rabbit.moving=false;
   if(direction.lengthSq()>1e-8&&(scared||farHome||Math.sin(seconds*.7+i)>.3)){
    direction.normalize();for(let attempt=0;attempt<3;attempt++){
     const next=rabbit.up.clone().addScaledVector(direction,(scared?2.3:.65)*dt/RADIUS).normalize();
     if(passable(next)){rabbit.up.copy(next);rabbit.forward.copy(direction).projectOnPlane(next).normalize();rabbit.moving=true;break;}
     direction.applyAxisAngle(rabbit.up,attempt? -Math.PI:Math.PI/2);
    }
   }
   const localForward=rabbit.forward.clone().applyQuaternion(surfaceOrientation(rabbit.up).invert());
   begin(rabbit.up,sample(rabbit.up).height+(rabbit.moving?Math.max(0,Math.sin(seconds*14+i))*.16:0),Math.atan2(-localForward.x,-localForward.z));
   put(body,i,0,.25,0,.28,.23,.4);put(head,i,0,.43,-.31,.2,.18,.2);put(tail,i,0,.31,.38,.12,.12,.12);
   for(let j=0;j<2;j++)put(ears,i*2+j,(j-.5)*.18,.69,-.29,.075,.38,.08,scared?-.25:0,(j-.5)*.15);
  });
  for(let i=0;i<12;i++){
   const x=i<6?-48:-11,z=i<6?35:5,a=seconds*.35+i*2.399,up=normalAt(x+Math.cos(a)*(2+i%3),z+Math.sin(a)*(2+i%3));
   begin(up,sample(up).height+.9+Math.sin(seconds*1.5+i)*.35,a);const scale=up.dot(sun)>-.05?1:0;
   for(let j=0;j<2;j++){const side=j?1:-1,angle=side*Math.sin(seconds*15+i)*.85;put(wings,i*2+j,side*.11*Math.cos(angle),side*.11*Math.sin(angle),0,.25*scale,.2*scale,scale,Math.PI/2,angle);}
  }
  for(let i=0;i<6;i++){
   const a=seconds*.12+i*1.1,up=normalAt((i<3?12:-40)+Math.cos(a)*9,(i<3?30:-37)+Math.sin(a)*9);begin(up,sample(up).height+7+i%3,a);
   for(let j=0;j<2;j++)put(birds,i*2+j,0,0,0,1,1,1,0,(j?0:Math.PI)+(j?1:-1)*Math.sin(seconds*4+i)*.45);
  }
  for(const mesh of meshes)mesh.instanceMatrix.needsUpdate=true;
 }};
}
