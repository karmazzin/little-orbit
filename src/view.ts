import {buildFrontier} from './frontier-view.ts';
import {FRONTIER_PLACES,SAVVA_HOME} from './frontier.ts';
import {buildHearth} from './hearth.ts';
import {PEOPLE,HOMES,ACTIVITY_POINTS,FIRE_UP,setResidentSeats,type Activity} from './resident-life.ts';
import {buildWilderness} from './wilderness-view.ts';
import {trailDistance} from './wilderness.ts';
import {buildLandscape} from './landscape-view.ts';
import {ADVENTURE_POINTS} from './adventures.ts';
import {buildAdventures} from './adventure-view.ts';
import * as T from 'three';
import {surfaceOrientation,cloudNormal,CLOUD_BASE_RADIUS} from './environment.ts';
import {LANDMARKS,buildLandmarks} from './landmarks.ts';
import {CAMP,createCamp} from './discoveries.ts';
import {createNight} from './night.ts';
import {buildSectors} from './sectors.ts';
import {normalAt,sample,coordinates,RADIUS,WATER_LEVEL} from './terrain.ts';
import {LETTERS,RESIDENTS} from './story.ts';
import type {Obstacle} from './simulation.ts';
const Y=new T.Vector3(0,1,0);
const materials=new Map<number,T.MeshStandardMaterial>();
function material(color:number){let m=materials.get(color);if(!m){m=new T.MeshStandardMaterial({color,roughness:.92,flatShading:true});materials.set(color,m);}return m;}
function mesh(g:T.BufferGeometry,c:number,parent:T.Object3D,x=0,y=0,z=0){const m=new T.Mesh(g,material(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent:T.Object3D,c:number,w:number,h:number,d:number,x=0,y=0,z=0){return mesh(new T.BoxGeometry(w,h,d),c,parent,x,y,z);}
function ball(parent:T.Object3D,c:number,r:number,x=0,y=0,z=0,detail=0){return mesh(new T.IcosahedronGeometry(r,detail),c,parent,x,y,z);}
function cylinder(parent:T.Object3D,c:number,r:number,h:number,x=0,y=0,z=0){return mesh(new T.CylinderGeometry(r,r,h,7),c,parent,x,y,z);}
function anchor(parent:T.Object3D,n:T.Vector3,height=sample(n).height){const g=new T.Group();g.position.copy(n).multiplyScalar(height);g.quaternion.setFromUnitVectors(Y,n);parent.add(g);return g;}
let seed=21874;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
export function character(color:number,backpack=false,appearance:'male'|'mira'|'ada'='male',gardener=false){
 const female=appearance!=='male';
 const root=new T.Group(),body=new T.Group();root.add(body);
 const torso=mesh(new T.CylinderGeometry(female?.235:.27,female?.21:.33,.62,8),color,body,0,.94,0);
 cylinder(body,0xdcb08c,.11,.18,0,1.32);
 ball(body,0xf0cba2,.275,0,1.58,0,1);
 const hairColor=appearance==='mira'?0x723d2d:appearance==='ada'?0x302c3a:0x49392f;
 const hair=ball(body,hairColor,.29,0,1.68,.025,1);hair.scale.set(1,.65,1);
 box(body,0x332b29,.045,.05,.035,-.1,1.6,-.25);box(body,0x332b29,.045,.05,.035,.1,1.6,-.25);
 const hat=mesh(new T.CylinderGeometry(.34,.36,.095,10),0xd7bd88,body,0,1.85,0);
 const hatTop=cylinder(body,0xd7bd88,.245,.17,0,1.95,0);
 if(female){
  hat.visible=false;hatTop.visible=false;
  for(const x of [-.235,.235]){const side=ball(body,hairColor,.15,x,1.54,.06,1);side.scale.set(.65,1.65,.85);}
  const back=ball(body,hairColor,.27,0,1.53,.15,1);back.scale.set(1,1.1,.5);
  if(appearance==='mira'){
   ball(body,hairColor,.16,0,1.77,.24,1);
   mesh(new T.CylinderGeometry(.21,.4,.48,10),0xa96950,body,0,.59,0);
   box(body,0xf0d6aa,.09,.5,.035,0,1.03,-.23);
   box(body,0x73513a,.28,.3,.18,.33,.81,.06);
   for(let i=0;i<4;i++)ball(body,0xe8c68a,.025,0,.86+i*.095,-.25);
  }else{
   for(let i=0;i<5;i++)ball(body,hairColor,.095-i*.01,.23,1.5-i*.12,.18,1);
   mesh(new T.TorusGeometry(.13,.055,5,12),0xc7b77a,body,0,1.29,-.015).rotation.x=Math.PI/2;
   box(body,0xc7b77a,.12,.27,.04,.09,1.15,-.25);
   box(body,0x4f526d,.22,.22,.06,-.12,.96,-.24);
  }
 }

 if(backpack){box(body,0xb36643,.52,.55,.25,0,1.03,.3);box(body,0xd49e6b,.37,.22,.06,0,.88,.45);cylinder(body,0x93aaa1,.09,.35,.35,1.02,.28);for(const x of [-.19,.19])box(body,0x76503d,.07,.6,.04,x,1.0,-.28);}
 const paper=box(body,0xf1dcad,.34,.25,.025,0,1.04,-.48);paper.visible=false;
 const can=new T.Group();body.add(can);can.position.set(.38,.75,-.3);if(gardener)cylinder(can,0x739b91,.13,.24);if(gardener){const spout=cylinder(can,0x739b91,.04,.3,0,.06,-.18);spout.rotation.x=1;}can.visible=false;
 const drops=new T.Group();can.add(drops);for(let i=0;i<(gardener?5:0);i++)ball(drops,0xa5d5df,.022,(i%2)*.05,-.12-i*.09,-.32-i*.025);
 const legs:T.Group[]=[],arms:T.Group[]=[];
 for(const sign of [-1,1]){
  const leg=new T.Group();leg.position.set(sign*(female?.125:.15),.65,0);body.add(leg);box(leg,0x455357,female?.17:.21,.42,.24,0,-.2,0);box(leg,0x584633,.24,.17,.38,0,-.53,-.055);legs.push(leg);
  const arm=new T.Group();arm.position.set(sign*(female?.29:.36),1.18,0);body.add(arm);box(arm,color,.19,.32,.21,0,-.14,0);ball(arm,0xf0cba2,.105,0,-.4,0,1);arms.push(arm);
 }
 return {root,body,torso,hat,arms,legs,animate(time:number,moving:boolean,swimming=false,activity?:Activity){
  paper.visible=!moving&&(activity==='letters'||activity==='notes'||activity==='tell');can.visible=!moving&&activity==='water';
  body.rotation.x=swimming?-1.25:0;body.position.y=swimming?-.22:0;body.position.z=swimming?.65:0;
  if(swimming){const stroke=time*4;for(let i=0;i<2;i++){arms[i].rotation.x=Math.sin(stroke+i*Math.PI)*1.1-1.4;arms[i].rotation.z=(i?1:-1)*.35;legs[i].rotation.x=Math.sin(stroke*1.6+i*Math.PI)*.22;}torso.scale.y=1;return;}
  for(const arm of arms)arm.rotation.z=0;const wave=moving?Math.sin(time*10)*.65:Math.sin(time*1.8)*.035;legs[0].rotation.x=wave;legs[1].rotation.x=-wave;arms[0].rotation.x=-wave;arms[1].rotation.x=wave;torso.scale.y=1+Math.sin(time*2)*.012;
  if(!moving){
   if(activity==='sit'||activity==='tell'){body.position.y=-.1;body.position.z=.8;for(const leg of legs)leg.rotation.x=1.3;arms[0].rotation.x=-.7;arms[1].rotation.x=activity==='tell'?-.8+Math.sin(time*2)*.3:-.7;}
   if(activity==='greet'){arms[1].rotation.z=-2.3+Math.sin(time*6)*.15;arms[1].rotation.x=-.4;}
   if(activity==='letters'||activity==='notes'){arms[0].rotation.x=-.8;arms[1].rotation.x=-.9+Math.sin(time*3)*.12;body.rotation.x=.12;}
   if(activity==='water'){body.rotation.x=.22;arms[1].rotation.x=-.6;can.rotation.x=-.3+Math.sin(time)*.08;drops.position.y=-(time*.3% .12);}
   if(activity==='inspect'){body.rotation.x=.5;arms[0].rotation.x=-.65;}
   if(activity==='observe'){body.rotation.x=.25;arms[0].rotation.x=-1.4;arms[1].rotation.x=-1.4;}
  }
 }};
}
function tree(parent:T.Object3D,n:T.Vector3,scale:number,kind:number){
 const g=anchor(parent,n);g.quaternion.copy(surfaceOrientation(n,random()*6.28));g.scale.setScalar(scale);
 cylinder(g,0x745443,.18,1.8,0,.9).userData.farGeometry=new T.CylinderGeometry(.18,.18,1.8,4);
 if(kind>.25){
  for(let j=0;j<3;j++)mesh(new T.ConeGeometry(1.25-j*.23,2.1-j*.25,7),[0x42795a,0x568966,0x719c6c][j],g,0,2+j*.65).userData.farGeometry=new T.ConeGeometry(1.25-j*.23,2.1-j*.25,4);
 }else{
  cylinder(g,0x745443,.1,1.3,.3,1.5).rotation.z=-.5;
  ball(g,0x88a763,1.2,0,2.3,0,1).userData.farGeometry=new T.IcosahedronGeometry(1.2,0);ball(g,0xa4b975,.8,.65,2.4,0,0);ball(g,0x79985f,.75,-.65,2.2,.2,0);
 }
}
function house(parent:T.Object3D,n:T.Vector3,color:number,angle:number){
 const g=anchor(parent,n);g.rotateY(angle);
 box(g,0x9d8d71,4.3,.35,3.8,0,.12);
 box(g,0xe2d4ad,3.8,2.7,3.3,0,1.5);
 const roof=mesh(new T.CylinderGeometry(0,3.18,2,4),color,g,0,3.75);roof.rotation.y=Math.PI/4;roof.scale.z=.94;
 box(g,0xbeb492,.5,1.4,.5,.9,4,.3);
 box(g,0x252624,.85,1.65,.025,0,.96,-1.668);
 const doorway=new T.Group();doorway.name='home-door';doorway.position.set(-.425,.96,-1.7);g.add(doorway);const swing=new T.Group();doorway.add(swing);
 box(swing,0x644f3f,.85,1.65,.1,.425,0,0);cylinder(swing,0xe4c377,.04,.06,.665,.06,-.08).rotation.x=Math.PI/2;
 for(const x of [-1.16,1.16]){box(g,0x766146,.86,.95,.1,x,1.8,-1.7);box(g,0x8fbcc0,.64,.72,.12,x,1.8,-1.77).name='night-window';box(g,0xe9dbb5,.055,.78,.14,x,1.8,-1.79);box(g,0xe9dbb5,.7,.045,.14,x,1.8,-1.79);box(g,0xb2875b,1,.17,.36,x,1.23,-1.85);for(let k=0;k<3;k++)ball(g,0x779b5d,.17,x-.27+k*.27,1.4,-1.88);}
 box(g,0xa89878,1.35,.18,.65,0,.2,-1.95);
 return g;
}
export function buildWorld(scene:T.Scene){
 seed=21874;
 const obstacles:Obstacle[]=[];const soundTrees:T.Vector3[]=[];const doors:{id:string;swing:T.Object3D}[]=[];
 const {ground,water,waveTime}=buildLandscape();scene.add(ground,water);
 const statics=new T.Group();const hearth=buildHearth(scene,statics,FIRE_UP);setResidentSeats(hearth.seats);obstacles.push(...hearth.obstacles);const adventures=buildAdventures(scene,statics);obstacles.push(...adventures.obstacles);const landmarks=buildLandmarks(statics);const frontier=buildFrontier(scene,statics);landmarks.places.push(...frontier.places);obstacles.push(...frontier.obstacles);soundTrees.push(...frontier.soundTrees);const wilderness=buildWilderness(scene,statics);landmarks.places.push(...wilderness.places);obstacles.push(...wilderness.obstacles);soundTrees.push(...wilderness.soundTrees);obstacles.push(...landmarks.obstacles);soundTrees.push(...landmarks.soundTrees);const night=createNight(scene);const camp=createCamp(scene);obstacles.push(camp.obstacle);
 for(let i=0;i<600;i++){
  const n=i<250?normalAt((random()-.5)*105,(random()-.5)*105):new T.Vector3(random()-.5,random()-.5,random()-.5).normalize();
  const s=sample(n),{x,z}=coordinates(n);
  if(Object.values(HOMES).some(h=>n.distanceTo(h.up)*RADIUS<7)||Object.values(ACTIVITY_POINTS).flat().some(p=>n.distanceTo(p)*RADIUS<2)||n.distanceTo(FIRE_UP)*RADIUS<8)continue;
  if(FRONTIER_PLACES.some(p=>n.distanceTo(p.up)*RADIUS<9)||trailDistance(n)<2.1||wilderness.places.some(p=>n.distanceTo(p.up)*RADIUS<17)||ADVENTURE_POINTS.some(p=>n.distanceTo(p.up)*RADIUS<(p.id==='cave'?9:4))||n.distanceTo(CAMP.up)*RADIUS<7||LANDMARKS.some(p=>n.distanceTo(p.up)*RADIUS<9))continue;
  if(Math.abs(x+4)<2.2&&z> -50&&z< -35)continue;
  if(s.waterDepth>0||s.bridge||s.ford||s.path||s.height<WATER_LEVEL+.25||s.height>73)continue;
  const tangent=new T.Vector3().crossVectors(n,Math.abs(n.y)<.9?Y:new T.Vector3(1,0,0)).normalize();
  const across=new T.Vector3().crossVectors(n,tangent);
  if([tangent,across].some(t=>Math.abs(sample(n.clone().addScaledVector(t,.008).normalize()).height-sample(n.clone().addScaledVector(t,-.008).normalize()).height)>1))continue;
  if(n.y>.5&&(RESIDENTS.some(r=>Math.hypot(r.x-x,r.z-z)<5)||LETTERS.some(l=>Math.hypot(l.x-x,l.z-z)<3)||Math.hypot(x+4,z-4)<5||Math.hypot(x+7,z+14)<6||Math.hypot(x-29,z-8)<6))continue;
  const scale=.8+random()*.8;
  if(i%5){tree(statics,n,scale,random());soundTrees.push(n.clone());obstacles.push({up:n.clone(),radius:.23*scale});}
  else{const g=anchor(statics,n);const rock=ball(g,0x9baba1,.6*scale,0,.25);rock.scale.set(1.3,.8,1);rock.userData.farGeometry=new T.OctahedronGeometry(.6*scale);obstacles.push({up:n.clone(),radius:.7*scale});}
 }
 for(const [x,z,col,rot] of [[-7,-14,0xba7555,Math.PI],[29,8,0x788e95,1.2],[48,39,0xb29769,0],[6,-50,0xbb826c,.3],[SAVVA_HOME.x,SAVVA_HOME.z,0x9a8d70,0]] as number[][]){const up=normalAt(x,z),home=house(statics,up,col,rot);statics.updateMatrixWorld(true);const panes:T.Mesh[]=[];home.traverse(o=>{if(o instanceof T.Mesh&&o.name==='night-window')panes.push(o);});const owner=Object.entries(HOMES).find(([,h])=>h.up.distanceTo(up)<.001)?.[0];if(owner){const door=home.getObjectByName('home-door')!;scene.attach(door);doors.push({id:owner,swing:door.children[0]});}for(const pane of panes)night.addWindow(pane,up,Object.entries(HOMES).find(([,h])=>h.up.distanceTo(up)<.001)?.[0]);obstacles.push({up:normalAt(x,z),radius:2.8});}
 // Northern footbridge: timber deck and low posts match the traversable terrain ramp.
 for(let z=-46.4;z< -38.5;z+=.3){const g=anchor(statics,normalAt(-4,z));box(g,0xbda076,2,.14,.28,0,-.07);}
 for(const x of [-5.12,-2.88])for(let z=-46;z<=-39;z+=1.4){const n=normalAt(x,z),g=anchor(statics,n,sample(normalAt(-4,z)).height);box(g,0x8d7152,.1,.7,.1,0,.3);obstacles.push({up:n,radius:.07});}
 // Bridge deck follows the exact radial surface used by the controller.
 for(let x=5.3;x<15.2;x+=.32){const g=anchor(statics,normalAt(x,0));box(g,Math.floor(x*10)%2?0xc1a176:0xb38d61,.3,.17,3.25,0,-.09);}
 for(const z of [-1.62,1.62]){
  for(let x=5.5;x<=15;x+=1.2){const n=normalAt(x,z),g=anchor(statics,n,sample(normalAt(x,0)).height);box(g,0x92714d,.12,.9,.12,0,.42);obstacles.push({up:n,radius:.09});}
  for(let x=5.4;x<15;x+=.4){const g=anchor(statics,normalAt(x,z),sample(normalAt(x,0)).height+.8);box(g,0xb6996c,.43,.09,.12);}
 }
 const sign=anchor(statics,normalAt(18,1));cylinder(sign,0x806245,.09,1.5,0,.75);box(sign,0xcab081,1.15,.36,.13,0,1.4);box(sign,0xd7bf94,.85,.31,.13,.05,.98).rotation.z=.08;
 const mailbox=anchor(statics,normalAt(-4,-12));cylinder(mailbox,0x80674c,.1,1.2,0,.6);box(mailbox,0xc8855f,.63,.45,.55,0,1.3);box(mailbox,0x493c32,.37,.07,.01,0,1.33,-.285);
 for(let x=4.15;x<17;x+=.46){const g=anchor(statics,normalAt(x,-26));box(g,Math.floor(x*10)%2?0xb8b9a8:0xc4c4af,.51,.17,1.22,0,-.07);}
 for(let i=0;i<260;i++){
  const x=(random()-.5)*75,z=(random()-.5)*85,n=normalAt(x,z),s=sample(n);
  if(s.wet||s.path||s.bridge||s.ford||s.height>73)continue;
  const g=anchor(statics,n);for(let k=0;k<3;k++){const a=random()*.5,b=random()*.5;box(g,0x799454,.035,.28,.035,a,.14,b);ball(g,[0xe4c37c,0xedddc2,0xc9a1aa][i%3],.085,a,.3,b);}
 }
 // Reeds, lily pads, and stones make the shore readable at walking height.
 for(let i=0;i<60;i++){const a=random()*Math.PI*2,x=12+Math.cos(a)*12.6,z=30+Math.sin(a)*11.3,n=normalAt(x,z),s=sample(n);if(s.waterDepth>.8)continue;const g=anchor(statics,n);for(let k=0;k<3;k++){const stalk=box(g,0x889658,.04,.7+random()*.4,.04,k*.14,.4);stalk.rotation.z=.12;}}
 // Small planted beds give Lev's gardening gestures an actual subject.
 for(const point of ACTIVITY_POINTS.lev){const up=point.clone().addScaledVector(new T.Vector3(0,0,-1).projectOnPlane(point).normalize(),1.1/RADIUS).normalize(),bed=anchor(statics,up);
  box(bed,0x745d40,1.1,.08,.65,0,.02);for(const x of [-.35,0,.35]){box(bed,0x73935a,.04,.35,.04,x,.2);for(const sign of [-1,1]){const leaf=ball(bed,0x8cac65,.13,x+sign*.09,.25,0,0);leaf.scale.set(1,.35,.7);}}
 }
 const decor=buildSectors(statics);scene.add(decor.group);
 const residents=PEOPLE.map(r=>{const model=character(r.color,false,r.id==='mira'||r.id==='ada'?r.id:'male',r.id==='lev'),up=r.start.clone();scene.add(model.root);return {...r,model,up,phase:random()*6.28};});
 adventures.traveler=residents.find(r=>r.id==='noah')!.model.root;
 const letters=LETTERS.map(l=>{
  const n=normalAt(l.x,l.z),g=anchor(scene,n);const envelope=box(g,0xffedc1,.55,.36,.07,0,.8,0);box(envelope,0xc68560,.1,.1,.012,.12,.06,-.04);const seal=ball(g,0xc78658,.055,0,.81,-.045);seal.scale.z=.3;
  const ring=mesh(new T.TorusGeometry(.44,.018,5,28),0xf3d88e,g,0,.16);ring.rotation.x=Math.PI/2;
  const light=new T.PointLight(0xffd792,.6,3);light.position.y=1;g.add(light);
  return {...l,root:g,up:n,envelope,ring};
 });
 const cloudMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.78});
 const cloudCount=36,puffsPerCloud=4;
 const clouds=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),cloudMat,cloudCount*puffsPerCloud);
 clouds.frustumCulled=false;cloudMat.depthWrite=false;
 const cloudPuffs=Array.from({length:cloudCount*puffsPerCloud},()=>({size:1.8+random(),y:random()*.25}));
 const cloudTransform=new T.Object3D(),puffTransform=new T.Object3D(),cloudMatrix=new T.Matrix4();
 const cloudColor=new T.Color(),cloudDay=new T.Color(0xf2efd4),cloudNight=new T.Color(0x26364c),cloudDusk=new T.Color(0xecc7b0);
 function updateClouds(seconds:number,sunDirection=Y){
  for(let i=0;i<cloudCount;i++){
   const n=cloudNormal(i,cloudCount,seconds),altitude=n.dot(sunDirection);
   cloudColor.copy(cloudNight).lerp(cloudDay,T.MathUtils.smoothstep(altitude,-.12,.28)).lerp(cloudDusk,(1-T.MathUtils.smoothstep(Math.abs(altitude),.02,.18))*.2);
   cloudTransform.position.copy(n).multiplyScalar(CLOUD_BASE_RADIUS+(i%4)*.5);cloudTransform.quaternion.copy(surfaceOrientation(n));cloudTransform.updateMatrix();
   for(let j=0;j<puffsPerCloud;j++){
    const k=i*puffsPerCloud+j,p=cloudPuffs[k];puffTransform.position.set((j-1.5)*1.9,p.y,0);puffTransform.scale.set(p.size*1.2,p.size*.35,p.size*.75);puffTransform.updateMatrix();
    cloudMatrix.multiplyMatrices(cloudTransform.matrix,puffTransform.matrix);clouds.setMatrixAt(k,cloudMatrix);clouds.setColorAt(k,cloudColor);
   }
  }
  clouds.instanceMatrix.needsUpdate=true;if(clouds.instanceColor)clouds.instanceColor.needsUpdate=true;
 }
 updateClouds(0);scene.add(clouds);
 const starGeo=new T.BufferGeometry(),starPos=[];for(let i=0;i<1200;i++){const n=new T.Vector3(random()-.5,random()-.5,random()-.5).normalize().multiplyScalar(450+random()*250);starPos.push(n.x,n.y,n.z);}starGeo.setAttribute('position',new T.Float32BufferAttribute(starPos,3));const stars=new T.Points(starGeo,new T.PointsMaterial({color:0xd7e9ff,size:1.8,sizeAttenuation:true,transparent:true,opacity:.7,fog:false,depthWrite:false}));scene.add(stars);
 return {frontier,wilderness,doors,hearth,adventures,landmarks,night,camp,decor,obstacles,soundTrees,ground,water,clouds,residents,letters,waveTime,stars,cloudMaterial:cloudMat,updateClouds};
}
