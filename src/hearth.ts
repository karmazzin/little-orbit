import * as T from 'three';
import {RADIUS,sample} from './terrain.ts';
import {surfaceOrientation} from './environment.ts';
import type {Obstacle} from './simulation.ts';

/** Seat normals sit on the inner edge of each log, facing the center. */
export function hearthLayout(up:T.Vector3){
 const q=surfaceOrientation(up);
 const at=(x:number,z:number)=>new T.Vector3(x,RADIUS,z).normalize().applyQuaternion(q);
 const logs=Array.from({length:4},(_,i)=>{const angle=i*Math.PI/2+Math.PI/4;return {angle,up:at(Math.sin(angle)*3.2,Math.cos(angle)*3.2)};});
 const seats=logs.map(l=>at(Math.sin(l.angle)*2.35,Math.cos(l.angle)*2.35));
 const obstacles:Obstacle[]=[{up:up.clone(),radius:1.05}];
 for(const l of logs)for(const t of [-.72,0,.72])obstacles.push({up:at(Math.sin(l.angle)*3.2+Math.cos(l.angle)*t,Math.cos(l.angle)*3.2-Math.sin(l.angle)*t),radius:.35});
 return {logs,seats,obstacles,at};
}
export function buildHearth(scene:T.Scene,statics:T.Group,up:T.Vector3){
 const layout=hearthLayout(up);
 const anchor=(normal:T.Vector3,parent:T.Object3D=statics)=>{const g=new T.Group();g.position.copy(normal).multiplyScalar(sample(normal).height);g.quaternion.copy(surfaceOrientation(normal));parent.add(g);return g;};
 const material=(color:number)=>new T.MeshStandardMaterial({color,roughness:1});
 const bark=material(0x604333),cut=material(0xbc9566),stone=material(0x85857b),coal=material(0x302923);
 const mesh=(g:T.Object3D,geometry:T.BufferGeometry,mat:T.Material,x=0,y=0,z=0)=>{const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
 const log=(g:T.Object3D,length:number,radius:number,x=0,y=radius,z=0)=>{
  const wood=mesh(g,new T.CylinderGeometry(radius*.91,radius,length,9),bark,x,y,z);wood.rotation.z=Math.PI/2;
  for(const side of [-1,1]){const end=mesh(g,new T.CircleGeometry(radius*.88,9),cut,x+side*(length/2+.003),y,z);end.rotation.y=side*Math.PI/2;}
 };
 for(const l of layout.logs){const g=anchor(l.up);g.name='hearth-sitting-log';g.quaternion.copy(surfaceOrientation(l.up,l.angle));log(g,2.1,.29);
 }
 for(let i=0;i<13;i++){const a=i*Math.PI*2/13,g=anchor(layout.at(Math.sin(a)*.92,Math.cos(a)*.92));const m=mesh(g,new T.DodecahedronGeometry(.22+(i%3)*.015),stone,0,.13);m.scale.set(1.25,.7,1);m.rotation.y=a;}
 const base=anchor(up);base.name='hearth-coals';mesh(base,new T.CylinderGeometry(.77,.8,.05,16),coal,0,.02);
 for(let i=0;i<5;i++){const g=anchor(layout.at(Math.cos(i*2.4)*.35,Math.sin(i*2.4)*.35));g.quaternion.copy(surfaceOrientation(layout.at(Math.cos(i*2.4)*.35,Math.sin(i*2.4)*.35),i*1.7));const c=mesh(g,new T.CylinderGeometry(.09,.12,.85,7),coal,0,.13);c.rotation.z=Math.PI/2;}
 const stack=anchor(layout.at(4.7,0));stack.name='hearth-firewood';for(let i=0;i<5;i++)log(stack,.9,.12,0,i<3?.12:.34,(i<3?i-1:i-3.5)*.26);
 layout.obstacles.push({up:layout.at(4.7,0),radius:.65});
 const dynamic=anchor(up,scene),flames=new T.Group();flames.name='hearth-flames';dynamic.add(flames);
 for(let i=0;i<5;i++){const m=mesh(flames,new T.ConeGeometry(.19+(i===0?.12:0),.85+(i===0?.35:0),7),new T.MeshBasicMaterial({color:i%2?0xffba4a:0xf47d32,transparent:true,opacity:.85,depthWrite:false}),Math.sin(i*2.4)*.23,.55,Math.cos(i*2.4)*.23);m.castShadow=false;}
 const light=new T.PointLight(0xffa550,0,9,2);light.name='hearth-light';light.position.y=1.2;dynamic.add(light);
 const positions=new Float32Array(36),geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));
 const sparks=new T.Points(geo,new T.PointsMaterial({color:0xffce73,size:.045,transparent:true,opacity:.8,depthWrite:false}));sparks.name='hearth-sparks';sparks.frustumCulled=false;dynamic.add(sparks);
 const update=(time:number,burning:boolean)=>{flames.visible=sparks.visible=burning;light.intensity=burning?7+Math.sin(time*7)*.65+Math.sin(time*13)*.35:0;if(!burning)return;
  flames.children.forEach((f,i)=>{f.scale.set(1+Math.sin(time*5+i)*.12,1+Math.sin(time*8+i*2)*.18,1);f.rotation.z=Math.sin(time*4+i)*.12;});
  for(let i=0;i<12;i++){const life=(time*.35+i/12)%1,a=i*2.399+time*.25;positions[i*3]=Math.cos(a)*(.12+life*.4);positions[i*3+1]=.3+life*1.8;positions[i*3+2]=Math.sin(a)*(.12+life*.4);}geo.getAttribute('position').needsUpdate=true;
 };update(0,false);
 return {obstacles:layout.obstacles,seats:layout.seats,update};
}
/** Original synthesized noise and decaying impulses; no recordings or external assets. */
export function fireSamples(sampleRate:number){
 const out=new Float32Array(Math.floor(sampleRate*4));let seed=7519,low=0,pop=0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<out.length;i++){const noise=random()*2-1;low=low*.96+noise*.04;if(random()<14/sampleRate)pop=.12+random()*.22;pop*=Math.exp(-1/(sampleRate*.003));const fade=Math.min(1,i/(sampleRate*.03),(out.length-1-i)/(sampleRate*.03));out[i]=(low*.23+noise*pop)*fade;}
 out[0]=0;out[out.length-1]=0;return out;
}
export function createFireBuffer(context:BaseAudioContext){const samples=fireSamples(context.sampleRate),buffer=context.createBuffer(1,samples.length,context.sampleRate);buffer.copyToChannel(samples,0);return buffer;}
