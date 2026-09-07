import * as T from 'three';
import {character} from '../../rendering/character.ts';
import {surfaceOrientation} from '../../environment.ts';
import type {TerrainSample} from '../khvoya/terrain.ts';
import type {Obstacle} from '../../simulation.ts';

export const AMBER_RADIUS=51.2;
export const AMBER_WATER_LEVEL=AMBER_RADIUS+.65;
const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z).normalize();
export const AMBER_SPAWN=v(0,1,0);
export const AMBER_PLACES=[
 {id:'arrival',name:'Поляна возвращения',text:'В янтарной оправе тихо светится путь на Хвою. Отсюда тропы расходятся по всему маленькому миру.',up:AMBER_SPAWN,kind:'portal'},
 {id:'village',name:'Листопадная деревня',text:'Три тёплых дома среди клёнов. На крыльцах сушатся яблоки, а жители собирают семена для далёких планет.',up:v(1,0,0),kind:'village'},
 {id:'yard',name:'Дом под липами',text:'На обратной стороне Янтаря живёт хранительница леса. Она оставляет калитку открытой для путников.',up:v(0,-1,0),kind:'home'},
 {id:'meadow',name:'Медовый луг',text:'Здесь лес расступается, и низкие травянистые холмы ловят последние тёплые лучи.',up:v(-1,0,0),kind:'meadow'},
 {id:'redwood',name:'Багряный лес',text:'Красные кроны похожи на деревья Медной рощи. Именно отсюда когда-то привезли первые саженцы на Хвою.',up:v(0,0,-1),kind:'forest'},
 {id:'lakes',name:'Золотая роща',text:'Золотые листья светятся над мягкой травой. От этой тихой развилки тропинки ведут к деревне и к далёкому лесному дому.',up:v(0,0,1),kind:'forest'},
];
const p=AMBER_PLACES.map(p=>p.up);
const trailEndpoints:[T.Vector3,T.Vector3][]=[[p[0],p[1]],[p[0],p[3]],[p[0],p[4]],[p[0],p[5]],[p[2],p[1]],[p[2],p[3]],[p[2],p[4]],[p[2],p[5]],[p[1],p[4]],[p[1],p[5]],[p[3],p[4]],[p[3],p[5]]];
export const AMBER_LAKES=[{up:v(-.45,.7,.55),radius:4.5},{up:v(.5,.6,.62),radius:4},{up:v(.7,-.5,.5),radius:4.7}];
const streamEdges:[T.Vector3,T.Vector3][]=[[AMBER_LAKES[0].up,AMBER_LAKES[1].up],[AMBER_LAKES[1].up,AMBER_LAKES[2].up]];
const shore=AMBER_LAKES[2].up.clone().lerp(p[1],.2).normalize();
AMBER_PLACES.push({id:'shore',name:'Золотой берег',text:'Деревянная скамья смотрит на воду. Вдоль берега можно дойти до истока ручья.',up:shore,kind:'shore'});
trailEndpoints.push([p[5],shore]);
const smooth=(x:number)=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
// Great-circle segment distance, including endpoints, never an infinite plane distance.
function edge(a:T.Vector3,b:T.Vector3){const normal=new T.Vector3().crossVectors(a,b).normalize(),mid=a.clone().add(b).normalize();return {a,b,normal,mid,reach:a.distanceTo(mid),tangent:new T.Vector3().crossVectors(normal,a),angle:a.angleTo(b)};}
// The same gently winding polyline drives collision samples and visible ribbons.
// Leave the first and last nine metres straight to protect the village approaches.
function meander(routes:[T.Vector3,T.Vector3][],amplitude:number):[T.Vector3,T.Vector3][]{
 const segments:[T.Vector3,T.Vector3][]=[];
 routes.forEach(([a,b],index)=>{const e=edge(a,b),length=e.angle*AMBER_RADIUS,steps=Math.ceil(length/4);let previous=a;
  for(let i=1;i<=steps;i++){const d=length*i/steps,t=i/steps,envelope=smooth((d-9)/8)*smooth((length-d-9)/8),bend=amplitude*envelope*(.65*Math.sin(d*.19+index*1.71)+.35*Math.sin(d*.31-index*.83));
   const point=i===steps?b:a.clone().multiplyScalar(Math.cos(e.angle*t)).addScaledVector(e.tangent,Math.sin(e.angle*t)).addScaledVector(e.normal,bend/AMBER_RADIUS).normalize();segments.push([previous,point]);previous=point;
  }
 });return segments;
}
export const AMBER_TRAILS=meander(trailEndpoints,2.5);
export const AMBER_STREAMS=meander(streamEdges,3);
const trails=AMBER_TRAILS.map(([a,b])=>edge(a,b)),streams=AMBER_STREAMS.map(([a,b])=>edge(a,b));
function distance(n:T.Vector3,e:ReturnType<typeof edge>){const angle=Math.atan2(n.dot(e.tangent),n.dot(e.a));return angle>=0&&angle<=e.angle?Math.asin(Math.min(1,Math.abs(n.dot(e.normal))))*AMBER_RADIUS:Math.min(n.distanceTo(e.a),n.distanceTo(e.b))*AMBER_RADIUS;}
export function amberTrailDistance(n:T.Vector3){let d=6;for(const e of trails){if(n.distanceToSquared(e.mid)>(d/AMBER_RADIUS+e.reach)**2)continue;d=Math.min(d,distance(n,e));}return d;}
const zero=new T.Vector3();
export function amberSample(n:T.Vector3):TerrainSample{
 const wave=.65*Math.sin(n.x*6+n.y*2)+.42*Math.sin(n.z*7-n.y*3)+.22*Math.cos(n.x*11+n.z*4);
 const base=AMBER_RADIUS+2+wave;
 let bank=Infinity,height=base,flow=zero;
 const carve=(d:number,width:number,depth:number)=>d<0?AMBER_WATER_LEVEL-depth*smooth(-d/width):d<5?AMBER_WATER_LEVEL+(base-AMBER_WATER_LEVEL)*smooth(d/5):base;
 for(const l of AMBER_LAKES){const d=n.distanceTo(l.up)*AMBER_RADIUS-l.radius;bank=Math.min(bank,d);height=Math.min(height,carve(d,l.radius,1.8));}
 for(const e of streams){if(n.distanceToSquared(e.mid)>(5.65/AMBER_RADIUS+e.reach)**2)continue;const d=distance(n,e)-.65,h=carve(d,.65,.36);bank=Math.min(bank,d);if(h<height){height=h;flow=e.b.clone().sub(e.a).projectOnPlane(n).normalize();}}
 const path=amberTrailDistance(n)<1.05;
 const bridge=path&&bank<.9;
 if(path&&bank<2)height=Math.max(height,AMBER_WATER_LEVEL+.16*(1-smooth(Math.max(0,bank)/2)));
 const waterDepth=Math.max(0,AMBER_WATER_LEVEL-height);
 return {height,waterDepth,waterLevel:AMBER_WATER_LEVEL,flow:waterDepth>0?flow:zero,path,ford:false,bridge,wet:waterDepth>0,biome:bank<2?'shore':wave>.5?'hill':'meadow',region:bank<4?'Тихие воды':n.z<-.45?'Багряный лес':n.x<-.45?'Медовые луга':'Янтарный лес'};
}

export function buildAmberWorld(scene:T.Scene){
 let seed=78219;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const materials=new Map<number,T.MeshStandardMaterial>();
 const mat=(color:number)=>{let m=materials.get(color);if(!m){m=new T.MeshStandardMaterial({color,flatShading:true,roughness:.91});materials.set(color,m);}return m;};
 const root=new T.Group();root.name='Янтарь';scene.add(root);
 const obstacles:Obstacle[]=[];
 const anchor=(up:T.Vector3)=>{const g=new T.Group();g.position.copy(up).multiplyScalar(amberSample(up).height);g.quaternion.copy(surfaceOrientation(up));root.add(g);return g;};
 const mesh=(parent:T.Object3D,geo:T.BufferGeometry,color:number,x=0,y=0,z=0)=>{const m=new T.Mesh(geo,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const box=(parent:T.Object3D,c:number,w:number,h:number,d:number,x=0,y=0,z=0)=>mesh(parent,new T.BoxGeometry(w,h,d),c,x,y,z);
 const offset=(up:T.Vector3,x:number,z:number)=>new T.Vector3(x,0,z).applyQuaternion(surfaceOrientation(up)).addScaledVector(up,AMBER_RADIUS).normalize();
 const groundGeo=new T.SphereGeometry(1,256,128),positions=groundGeo.attributes.position,colors=new Float32Array(positions.count*3),n=new T.Vector3(),color=new T.Color();
 for(let i=0;i<positions.count;i++){n.fromBufferAttribute(positions,i).normalize();const s=amberSample(n);color.setHex(s.path?0xbba16b:s.biome==='shore'?0xb4a36a:0x84994f);if(!s.path&&s.biome!=='shore')color.lerp(new T.Color(0xb2ac61),.25+.2*Math.sin(n.x*25+n.z*19));positions.setXYZ(i,n.x*s.height,n.y*s.height,n.z*s.height);color.toArray(colors,i*3);}
 groundGeo.setAttribute('color',new T.BufferAttribute(colors,3));groundGeo.computeVertexNormals();const ground=new T.Mesh(groundGeo,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));ground.name='Amber rolling terrain';ground.receiveShadow=true;root.add(ground);
 // Batch the winding ribbons so their extra bends do not add draw calls.
 const ribbonData=[{positions:[] as number[],indices:[] as number[]},{positions:[] as number[],indices:[] as number[]}];
 // Thin surface ribbons make the narrow trails continuous between terrain vertices.
 function ribbon(a:T.Vector3,b:T.Vector3,width:number,water:boolean){const e=edge(a,b),steps=Math.ceil(e.angle*AMBER_RADIUS/.45),vertices:number[]=[],indices:number[]=[];
  for(let i=0;i<=steps;i++){const u=a.clone().multiplyScalar(Math.cos(e.angle*i/steps)).addScaledVector(e.tangent,Math.sin(e.angle*i/steps));for(const sign of [-1,1]){const q=u.clone().addScaledVector(e.normal,sign*width/AMBER_RADIUS).normalize(),r=water?AMBER_WATER_LEVEL+.015:amberSample(q).height+.025;vertices.push(q.x*r,q.y*r,q.z*r);}if(i<steps){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const data=ribbonData[water?1:0],start=data.positions.length/3;data.positions.push(...vertices);data.indices.push(...indices.map(i=>i+start));
 }
 const waterMaterial=new T.MeshStandardMaterial({color:0x619c9b,roughness:.28,metalness:.12,side:T.DoubleSide});
 const trailMaterial=new T.MeshStandardMaterial({color:0xbba16b,roughness:1,side:T.DoubleSide});
 for(const [a,b] of AMBER_TRAILS)ribbon(a,b,.88,false);
 for(const [a,b] of AMBER_STREAMS)ribbon(a,b,.63,true);
 for(let i=0;i<ribbonData.length;i++){const data=ribbonData[i],geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));geo.setIndex(data.indices);geo.computeVertexNormals();root.add(new T.Mesh(geo,i?waterMaterial:trailMaterial));}
 for(const lake of AMBER_LAKES){const g=new T.CircleGeometry(lake.radius,64);const pos=g.attributes.position;for(let i=0;i<pos.count;i++){const q=offset(lake.up,pos.getX(i),pos.getY(i));pos.setXYZ(i,q.x*(AMBER_WATER_LEVEL+.012),q.y*(AMBER_WATER_LEVEL+.012),q.z*(AMBER_WATER_LEVEL+.012));}g.computeVertexNormals();root.add(new T.Mesh(g,waterMaterial));}
 const treePoints:{up:T.Vector3;scale:number;yaw:number;tint:number}[]=[];
 for(let i=0;i<3400;i++){const y=1-2*(i+.5)/3400,a=i*2.399963229728653+random()*.16,r=Math.sqrt(1-y*y),up=v(Math.cos(a)*r,y,Math.sin(a)*r),s=amberSample(up);
  if(s.wet||s.biome==='shore'||amberTrailDistance(up)<2.3||AMBER_PLACES.some(p=>up.distanceTo(p.up)*AMBER_RADIUS<(p.kind==='meadow'?15:p.kind==='forest'?4:9)))continue;
  // Deliberate lighter grassland opposite the village, dense forest elsewhere.
  if(up.x<-.75&&random()<.65)continue;
  const scale=.77+random()*.58;treePoints.push({up,scale,yaw:random()*Math.PI*2,tint:random()});obstacles.push({up:up.clone(),radius:.26*scale});
 }
 const treeCount=treePoints.length,transform=new T.Object3D(),matrix=new T.Matrix4(),local=new T.Object3D();
 const trunks=new T.InstancedMesh(new T.CylinderGeometry(.17,.24,2.5,6),mat(0x735244),treeCount);
 const crowns=new T.InstancedMesh(new T.IcosahedronGeometry(1.5,1),mat(0xffffff),treeCount);
 const lobes=new T.InstancedMesh(new T.IcosahedronGeometry(.86,0),mat(0xffffff),treeCount);
 function instance(batch:T.InstancedMesh,index:number,x:number,y:number,z:number,sx:number,sy:number,sz:number){local.position.set(x,y,z);local.scale.set(sx,sy,sz);local.updateMatrix();matrix.multiplyMatrices(transform.matrix,local.matrix);batch.setMatrixAt(index,matrix);}
 for(let i=0;i<treeCount;i++){const t=treePoints[i];transform.position.copy(t.up).multiplyScalar(amberSample(t.up).height);transform.quaternion.copy(surfaceOrientation(t.up,t.yaw));transform.scale.setScalar(t.scale);transform.updateMatrix();instance(trunks,i,0,1.25,0,1,1,1);instance(crowns,i,0,3.05,0,1,1.2,1);instance(lobes,i,.75,2.7,.1,1,1.12,1);color.setHex(t.up.z<-.45?[0xb95236,0xa84432,0xcf6c37][i%3]:[0xd4a346,0xc77737,0xe0b950,0xb6573e][i%4]);crowns.setColorAt(i,color);lobes.setColorAt(i,color.clone().multiplyScalar(.88));}
 for(const batch of [trunks,crowns,lobes]){batch.name='Amber instanced forest';batch.castShadow=true;batch.receiveShadow=true;batch.computeBoundingSphere();root.add(batch);}
 // Planks follow the exact dry radial crossing surface used by the walker.
 const plankPoints:{up:T.Vector3;forward:T.Vector3}[]=[];
 for(const e of trails){const steps=Math.ceil(e.angle*AMBER_RADIUS/.3);for(let i=0;i<=steps;i++){const up=e.a.clone().multiplyScalar(Math.cos(e.angle*i/steps)).addScaledVector(e.tangent,Math.sin(e.angle*i/steps));if(amberSample(up).bridge)plankPoints.push({up,forward:new T.Vector3().crossVectors(e.normal,up).normalize()});}}
 const planks=new T.InstancedMesh(new T.BoxGeometry(2.1,.11,.29),mat(0xb88a54),plankPoints.length);planks.name='Amber dry footbridges';
 for(let i=0;i<plankPoints.length;i++){const {up,forward}=plankPoints[i],right=new T.Vector3().crossVectors(up,forward).normalize();transform.position.copy(up).multiplyScalar(amberSample(up).height-.04);transform.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward));transform.scale.setScalar(1);transform.updateMatrix();planks.setMatrixAt(i,transform.matrix);}planks.computeBoundingSphere();root.add(planks);
 const loneUp=offset(p[3],4,4),lone=anchor(loneUp);lone.name='Медовый клён';mesh(lone,new T.CylinderGeometry(.25,.4,3.2,7),0x735244,0,1.6);const loneCrown=mesh(lone,new T.IcosahedronGeometry(2.5,1),0xe0b950,0,4);loneCrown.scale.y=1.12;mesh(lone,new T.IcosahedronGeometry(1.3,1),0xc9913b,1.3,3.6,.2);obstacles.push({up:loneUp,radius:.45});
 // Small homesteads have open fronts facing the village paths.
 function house(up:T.Vector3,roofColor:number){const g=anchor(up);box(g,0x998163,4.4,.25,3.8,0,.08);box(g,0xe5cd98,3.8,2.5,3.2,0,1.4);const roof=mesh(g,new T.CylinderGeometry(0,3.1,1.9,4),roofColor,0,3.5);roof.rotation.y=Math.PI/4;roof.scale.z=.94;box(g,0x765040,.82,1.7,.12,0,.95,-1.65);box(g,0xd9b76d,.09,.09,.06,.24,1,-1.73);
  for(const x of [-1.15,1.15]){box(g,0x886549,.8,.85,.12,x,1.65,-1.65);box(g,0x9bbcb2,.62,.65,.14,x,1.65,-1.73);box(g,0xf1dcaf,.05,.69,.15,x,1.65,-1.75);box(g,0xf1dcaf,.65,.05,.15,x,1.65,-1.75);box(g,0xa77a47,.95,.15,.35,x,1.12,-1.83);for(let i=0;i<3;i++)mesh(g,new T.IcosahedronGeometry(.13,0),0xcf8b3b,x-.25+i*.25,1.27,-1.87);}
  box(g,0xc4ac80,1.4,.12,.6,0,.12,-1.9);box(g,0xb5a184,.45,1.2,.45,.9,3.75,.3);obstacles.push({up:up.clone(),radius:2.8});
 }
 for(const [x,z,c] of [[-5,5,0xa45036],[5,5,0xc38b48],[5,-5,0x8b6745]])house(offset(p[1],x,z),c);
 house(offset(p[2],4,5),0xa66440);
 // A low open fence and planted beds make the remote home an inhabited yard.
 const yard=anchor(p[2]);for(const x of [-3,-1,1,3,5,7]){box(yard,0x967048,.12,.8,.12,x,.4,8);if(x<7)box(yard,0xb4915c,1.9,.09,.1,x+1,.52,8);}for(let j=0;j<2;j++){box(yard,0x79583d,2,.1,.65,-3,.04,3+j);for(let i=0;i<5;i++)mesh(yard,new T.IcosahedronGeometry(.17,0),0xb4b458,-3.8+i*.38,.25,3+j);}
 for(const place of AMBER_PLACES){const g=anchor(offset(place.up,-2.8,-2.8));box(g,0x795a3d,.1,1.25,.1,0,.62);box(g,0xd7b979,1,.3,.12,0,1.1);box(g,0x846343,.5,.05,.13,0,1.11,-.07);}
 const bench=anchor(offset(shore,2,1));box(bench,0xb0834f,2,.14,.6,0,.55);for(const x of [-.7,.7])box(bench,0x735c3f,.14,.55,.45,x,.27);box(bench,0xc2985c,2,.4,.12,0,.95,.3);
 // Fallen leaves and meadow flowers share two small instanced batches.
 const leaves=new T.InstancedMesh(new T.OctahedronGeometry(.13,0),mat(0xd6a247),900),flowers=new T.InstancedMesh(new T.IcosahedronGeometry(.1,0),mat(0xf0d9a0),400);
 for(const [batch,count] of [[leaves,900],[flowers,400]] as const){for(let i=0;i<count;i++){let up:T.Vector3;do{up=v(random()-.5,random()-.5,random()-.5);}while(amberSample(up).wet);transform.position.copy(up).multiplyScalar(amberSample(up).height+(batch===leaves?.045:.22));transform.quaternion.copy(surfaceOrientation(up,random()*6.28));transform.scale.set(1,batch===leaves?.15:1,1);transform.updateMatrix();batch.setMatrixAt(i,transform.matrix);}batch.computeBoundingSphere();root.add(batch);}
 const residents=[
  {id:'taya',name:'Тая',role:'Собирательница семян',text:'Здравствуй! Деревья Медной рощи выросли из наших семян. Здесь можно идти куда угодно — все тропинки рано или поздно встретятся.',up:offset(p[1],-2,1),color:0xb77342,appearance:'mira' as const},
  {id:'tim',name:'Тим',role:'Мастер',text:'Я чиню домики и мостки. Озёра в разных концах леса соединены совсем узкими ручьями. У воды хорошо слушать ветер.',up:offset(p[1],2,-1),color:0x788b74,appearance:'male' as const},
  {id:'asya',name:'Ася',role:'Хранительница леса',text:'Ты нашёл мой дом! Я люблю эту дальнюю сторону Янтаря. За лугом начинается багряный лес, а дорога домой всегда ждёт на поляне возвращения.',up:offset(p[2],-1,2),color:0xae8249,appearance:'ada' as const},
 ].map(r=>{const model=character(r.color,false,r.appearance);root.add(model.root);model.root.position.copy(r.up).multiplyScalar(amberSample(r.up).height);model.root.quaternion.copy(surfaceOrientation(r.up));return {...r,model};});
 const homes=residents.map(r=>r.up.clone());let walkClock=0;
 return {obstacles,residents,treeCount,update(time:number,dt:number){
  if(dt<=0)return;walkClock+=Math.min(dt,.1);
  for(let i=0;i<residents.length;i++){const r=residents[i],phase=walkClock*.32+i*1.7,shift=Math.sin(phase)-Math.sin(i*1.7),next=offset(homes[i],shift*.65,shift*.2),previous=r.up.clone();
   if(!amberSample(next).wet&&obstacles.every(o=>o.up.distanceTo(next)*AMBER_RADIUS>o.radius+.4))r.up.copy(next);
   const forward=r.up.clone().sub(previous).projectOnPlane(r.up),moving=forward.lengthSq()>1e-12;
   r.model.root.position.copy(r.up).multiplyScalar(amberSample(r.up).height);
   if(moving){forward.normalize().negate();const right=new T.Vector3().crossVectors(r.up,forward).normalize();r.model.root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,r.up,forward));}
   r.model.animate(time+i*1.7,moving);
  }
 }};
}
