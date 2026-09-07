import * as T from 'three';
import type {Obstacle} from './simulation.ts';
/** A separate wooden amber frame. Its open centre and front approach remain walkable. */
export function buildTravelFrame(parent:T.Object3D,up:T.Vector3,height:number){
 const root=new T.Group();root.position.copy(up).multiplyScalar(height);root.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),up);parent.add(root);
 const wood=new T.MeshStandardMaterial({color:0x96542d,roughness:.8,flatShading:true});
 const amber=new T.MeshStandardMaterial({color:0xe9a63d,roughness:.4,emissive:0x9a3d08,emissiveIntensity:.25});
 const solid=(w:number,h:number,d:number,x:number,y:number,mat:T.Material)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,0);m.castShadow=true;root.add(m);return m;};
 for(const x of [-1.8,1.8]){solid(.48,4,.55,x,2,wood);solid(.15,3.5,.59,x,2,amber);}
 solid(4.1,.5,.65,0,4.05,wood);solid(3.5,.12,.69,0,4.05,amber);
 const pedestal=solid(.65,.75,.7,2.65,.375,wood);pedestal.position.z=-.6;
 const socket=new T.Mesh(new T.TorusGeometry(.2,.065,5,8),amber);socket.rotation.x=-Math.PI/2;socket.position.set(2.65,.79,-.6);root.add(socket);
 const stone=new T.Mesh(new T.IcosahedronGeometry(.19,0),amber);stone.position.set(2.65,.82,-.6);root.add(stone);
 const veil=new T.Mesh(new T.PlaneGeometry(3.1,3.7),new T.MeshBasicMaterial({color:0xe5a14e,transparent:true,opacity:.42,side:T.DoubleSide,depthWrite:false}));veil.position.set(0,2.05,.03);root.add(veil);
 const specks=new T.Group();root.add(specks);for(let i=0;i<15;i++){const m=new T.Mesh(new T.IcosahedronGeometry(.045,0),amber);m.position.set(Math.sin(i*3.7)*1.4,.4+(i/15)*3.2,.09);specks.add(m);}
 root.updateMatrixWorld(true);
 const obstacles:Obstacle[]=[-1.8,1.8].map(x=>({up:root.localToWorld(new T.Vector3(x,0,0)).normalize(),radius:.32}));obstacles.push({up:pedestal.getWorldPosition(new T.Vector3()).normalize(),radius:.48});
 const approach=root.localToWorld(new T.Vector3(0,0,-2.5)).normalize();
 return {root,obstacles,approach,setOpen(open:boolean){veil.visible=open;stone.visible=open;specks.visible=open;amber.emissiveIntensity=open?.65:.12;},update(time:number){veil.material.opacity=.35+Math.sin(time*1.5)*.07;specks.rotation.y=Math.sin(time*.3)*.06;}};
}
