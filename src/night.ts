import * as T from 'three';
import {normalAt,sample} from './terrain.ts';
import {surfaceOrientation} from './environment.ts';
export function nightStrength(up:T.Vector3,sun:T.Vector3){return 1-T.MathUtils.smoothstep(up.dot(sun),-.18,.12);}
export function createNight(scene:T.Scene){
 const windows:{mesh:T.Mesh;material:T.MeshStandardMaterial;up:T.Vector3}[]=[];
 const lamps:{up:T.Vector3;glow:T.MeshBasicMaterial}[]=[];
 const wood=new T.MeshStandardMaterial({color:0x584735,roughness:1});
 for(const [x,z] of [[5,2.2],[15.5,2.2]]){
  const up=normalAt(x,z),g=new T.Group();g.position.copy(up).multiplyScalar(sample(up).height);g.quaternion.copy(surfaceOrientation(up));scene.add(g);
  const post=new T.Mesh(new T.CylinderGeometry(.065,.09,2,6),wood);post.position.y=1;g.add(post);post.castShadow=true;
  const glow=new T.MeshBasicMaterial({color:0xffd397});lamps.push({up,glow});
  const pane=new T.Mesh(new T.BoxGeometry(.24,.36,.24),glow);pane.position.y=2.05;g.add(pane);
  for(const y of [1.83,2.28]){const cap=new T.Mesh(new T.BoxGeometry(.4,.09,.4),wood);cap.position.y=y;g.add(cap);}
 }
 const count=32,positions=new Float32Array(count*3),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
 const flyMat=new T.PointsMaterial({color:0xf7eaa2,size:.11,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
 const flies=new T.Points(geometry,flyMat);flies.frustumCulled=false;scene.add(flies);const lakeUp=normalAt(25,29);
 return {addWindow(mesh:T.Mesh,up:T.Vector3){
  const material=(mesh.material as T.MeshStandardMaterial).clone();material.emissive.set(0xffbc66);mesh.material=material;scene.attach(mesh);windows.push({mesh,material,up:up.clone()});
 },update(seconds:number,sun:T.Vector3){
  for(const w of windows){const strength=nightStrength(w.up,sun);w.material.color.set(0x8fbcc0).lerp(new T.Color(0xffd49a),strength);w.material.emissiveIntensity=strength*1.6;}
  for(const lamp of lamps)lamp.glow.color.set(0x80755e).lerp(new T.Color(0xffd397),nightStrength(lamp.up,sun));
  flyMat.opacity=nightStrength(lakeUp,sun)*.85;flies.visible=flyMat.opacity>.01;
  if(flies.visible){for(let i=0;i<count;i++){
   const a=i*2.399+seconds*.07,n=normalAt(24+Math.cos(a)*(2+i%5),29+Math.sin(a)*(3+i%4));
   n.multiplyScalar(sample(n).height+.55+(Math.sin(seconds*.9+i)+1)*.65);n.toArray(positions,i*3);
  }geometry.getAttribute('position').needsUpdate=true;}
 }};
}
