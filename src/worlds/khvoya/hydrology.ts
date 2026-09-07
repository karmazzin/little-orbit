import {CatmullRomCurve3,Quaternion,Vector3} from 'three';
import {normalAt,RADIUS,WATER_LEVEL,riverX} from '../../geography.ts';

/** Authored watersheds. All coordinates are unit directions, without a map seam. */
export type RiverNode={up:Vector3;level:number;width:number};
export type River={name:string;nodes:RiverNode[]};
export type RiverSegment={a:Vector3;b:Vector3;delta:Vector3;lengthSq:number;levelA:number;levelB:number;widthA:number;widthB:number;name:string;speed:number};
export type Basin={name:string;up:Vector3;radius:number;level:number;depth:number};
const node=(x:number,z:number,level:number,width:number):RiverNode=>({up:normalAt(x,z),level,width});
const westRotation=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(-.88,-.4,-.25).normalize());
const eastRotation=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(.86,-.4,-.3).normalize());
function remote(q:Quaternion,x:number,z:number,level:number,width:number){const n=node(x,z,level,width);n.up.applyQuaternion(q);return n;}
const junction=node(riverX(-37),-37,65.05,1.85);
const valley:RiverNode[]=[junction];
for(let z=-34;z<=26;z+=3)valley.push(node(riverX(z),z,WATER_LEVEL+.8*(26-z)/63,1.85+(z+37)/63*.4));
valley.push(node(12,30,WATER_LEVEL,2.4));
const westJoin=remote(westRotation,2,-8,66.6,2.2),westLake=remote(westRotation,7,20,64.7,2.7),westSea=remote(westRotation,-7,58,63.05,3.8);
const eastJoin=remote(eastRotation,-3,-8,66.8,2.1),eastLake=remote(eastRotation,4,27,63.6,3.2);
export const RIVERS:River[]=[
 {name:'Серебряный исток',nodes:[node(22,-88,75,1),node(30,-75,71.5,1.15),node(27,-61,68.4,1.3),node(23,-47,66.7,1.5),junction]},
 {name:'Хвойный ручей',nodes:[node(-37,-75,72.2,.85),node(-29,-61,69.5,1),node(-15,-47,67,1.1),junction]},
 {name:'Каменный ручей',nodes:[node(69,-45,72.5,.85),node(52,-35,69.3,1),node(34,-38,66.7,1.15),junction]},
 {name:'Река Тихая',nodes:valley},
 {name:'Озёрная',nodes:[node(12,30,64.25,2.4),node(20,41,64.25,2.5),node(32,53,63.95,2.6),node(28,66,63.7,2.8),node(37,80,63.2,3.2),node(35,95,63.2,3.2)]},
 {name:'Западный исток',nodes:[remote(westRotation,-25,-55,75.5,.9),remote(westRotation,-15,-38,71,1.2),remote(westRotation,-18,-22,68.5,1.5),westJoin]},
 {name:'Папоротниковый ручей',nodes:[remote(westRotation,38,-43,73.5,.9),remote(westRotation,29,-24,69.4,1.3),westJoin]},
 {name:'Река Медная',nodes:[westJoin,remote(westRotation,-4,5,65.6,2.5),westLake]},
 {name:'Нижняя Медная',nodes:[westLake,remote(westRotation,0,36,64.1,3),remote(westRotation,-15,44,63.4,3.5),westSea]},
 {name:'Восточный исток',nodes:[remote(eastRotation,-29,-53,75,.9),remote(eastRotation,-19,-34,70.8,1.2),remote(eastRotation,-22,-20,68.4,1.4),eastJoin]},
 {name:'Вересковый ручей',nodes:[remote(eastRotation,36,-40,73.5,.9),remote(eastRotation,27,-26,70.5,1.2),remote(eastRotation,18,-16,68.3,1.4),eastJoin]},
 {name:'Река Лазурная',nodes:[eastJoin,remote(eastRotation,6,5,65.4,2.5),remote(eastRotation,-3,16,64.4,2.9),eastLake]},
];
export const BASINS:Basin[]=[
 {name:'Озеро Тихое',up:normalAt(12,30),radius:10.8,level:64.25,depth:2.2},
 {name:'Южное море',up:normalAt(35,95),radius:23,level:63.2,depth:4.2},
 {name:'Медное озеро',up:westLake.up,radius:10,level:64.7,depth:2.6},
 {name:'Залив заката',up:westSea.up,radius:22,level:63.05,depth:4.5},
 {name:'Лазурное море',up:eastLake.up,radius:24,level:63.6,depth:4.3},
];
const basinFrames=BASINS.map(b=>{
 const east=new Vector3().crossVectors(new Vector3(0,1,0),b.up).normalize();
 return {basin:b,east,north:new Vector3().crossVectors(b.up,east).normalize()};
});
function basinRadius(n:Vector3,frame:typeof basinFrames[number]){
 const {basin,east,north}=frame;
 const angle=Math.atan2(n.dot(north),n.dot(east));
 return basin.radius*(basin.radius>15?1+.13*Math.sin(angle*3+.7)+.07*Math.cos(angle*5-.4):1);
}
export const RIVER_SEGMENTS:RiverSegment[]=[];
for(const river of RIVERS){
 const curve=new CatmullRomCurve3(river.nodes.map(n=>n.up),false, 'centripetal');
 // Subdivide at authored stations so levels match exactly at tributary joins.
 for(let i=0;i<river.nodes.length-1;i++){
  const a=river.nodes[i],b=river.nodes[i+1],count=Math.max(2,Math.ceil(a.up.distanceTo(b.up)*RADIUS/1.4));
  for(let j=0;j<count;j++){
   const t=j/count,u=(j+1)/count;
   const start=curve.getPoint((i+t)/(river.nodes.length-1)).normalize(),end=curve.getPoint((i+u)/(river.nodes.length-1)).normalize();
   const delta=end.clone().sub(start),lengthSq=delta.lengthSq(),levelA=a.level+(b.level-a.level)*t,levelB=a.level+(b.level-a.level)*u;
   RIVER_SEGMENTS.push({a:start,b:end,delta,lengthSq,levelA,levelB,widthA:a.width+(b.width-a.width)*t,widthB:a.width+(b.width-a.width)*u,name:river.name,speed:.16+Math.min(.45,(levelA-levelB)/(Math.sqrt(lengthSq)*RADIUS)*1.4)});
  }
 }
}
// Match the full river width to the receiving water level before it crosses
// the lake shoreline. Cap the approach gradient, preserving broad flat deltas.
for(const river of RIVERS){
 const segments=RIVER_SEGMENTS.filter(s=>s.name===river.name);
 const points=[...segments.map(s=>s.a),segments.at(-1)!.b];
 const levels=[...segments.map(s=>s.levelA),segments.at(-1)!.levelB];
 const pinned=points.map((up,i)=>{
  let best=Infinity,value:number|null=null;
  const width=i<segments.length?segments[i].widthA:segments.at(-1)!.widthB;
  for(const frame of basinFrames){
   const d=Math.acos(Math.max(-1,Math.min(1,up.dot(frame.basin.up))))*RADIUS-basinRadius(up,frame);
   if(d<=width+1&&d<best){best=d;value=frame.basin.level;}
  }
  if(value!==null)levels[i]=value;
  return value!==null;
 });
 for(let i=levels.length-2;i>=0;i--)if(!pinned[i])levels[i]=Math.min(levels[i],levels[i+1]+.65*points[i].distanceTo(points[i+1])*RADIUS);
 for(let i=1;i<levels.length;i++)if(!pinned[i])levels[i]=Math.max(levels[i],levels[i-1]-.65*points[i].distanceTo(points[i-1])*RADIUS);
 segments.forEach((s,i)=>{s.levelA=levels[i];s.levelB=levels[i+1];s.speed=.16+Math.min(.45,Math.max(0,s.levelA-s.levelB)/(Math.sqrt(s.lengthSq)*RADIUS)*1.4);});
}
// Static spatial index avoids testing hundreds of segments at every terrain vertex/frame.
const grid=new Map<string,RiverSegment[]>(),CELL=12;
const key=(x:number,y:number,z:number)=>`${x},${y},${z}`;
for(const s of RIVER_SEGMENTS){
 const pad=(Math.max(s.widthA,s.widthB)+10)/RADIUS;
 for(let x=Math.floor((Math.min(s.a.x,s.b.x)-pad)*CELL);x<=Math.floor((Math.max(s.a.x,s.b.x)+pad)*CELL);x++)
 for(let y=Math.floor((Math.min(s.a.y,s.b.y)-pad)*CELL);y<=Math.floor((Math.max(s.a.y,s.b.y)+pad)*CELL);y++)
 for(let z=Math.floor((Math.min(s.a.z,s.b.z)-pad)*CELL);z<=Math.floor((Math.max(s.a.z,s.b.z)+pad)*CELL);z++){
  const k=key(x,y,z),bucket=grid.get(k);if(bucket)bucket.push(s);else grid.set(k,[s]);
 }
}
export type WaterSample={distance:number;width:number;level:number;depth:number;flow:Vector3;name:string};
const zero=new Vector3();
/** Signed distance is negative inside a channel/basin, positive up its bank. */
export function waterAt(n:Vector3):WaterSample|null{
 let best=Infinity,width=1,level=WATER_LEVEL,depth=1.5,name='',winner:RiverSegment|undefined;
 for(const s of grid.get(key(Math.floor(n.x*CELL),Math.floor(n.y*CELL),Math.floor(n.z*CELL)))??[]){
  const t=Math.max(0,Math.min(1,((n.x-s.a.x)*s.delta.x+(n.y-s.a.y)*s.delta.y+(n.z-s.a.z)*s.delta.z)/s.lengthSq));
  const w=s.widthA+(s.widthB-s.widthA)*t;
  const d=Math.hypot(n.x-s.a.x-s.delta.x*t,n.y-s.a.y-s.delta.y*t,n.z-s.a.z-s.delta.z*t)*RADIUS-w;
  if(d<best){best=d;width=w;level=s.levelA+(s.levelB-s.levelA)*t;depth=Math.min(2.4,.75+w*.45);name=s.name;winner=s;}
 }
 for(const {basin,east,north} of basinFrames){
  const arc=Math.acos(Math.max(-1,Math.min(1,n.dot(basin.up))))*RADIUS;
  if(arc>basin.radius*1.23+10)continue;
  const radius=basinRadius(n,{basin,east,north});
  const d=arc-radius;
  if(d<best){best=d;width=radius;level=basin.level;depth=basin.depth;name=basin.name;winner=undefined;}
 }
 if(best>10)return null;
 const flow=winner?winner.delta.clone().projectOnPlane(n).normalize().multiplyScalar(winner.speed):zero;
 return {distance:best,width,level,depth,flow,name};
}
export const WATER_SOUND_SOURCES=[...RIVER_SEGMENTS.filter((_,i)=>i%5===0).map(s=>({up:s.a,gain:.3})),...BASINS.flatMap(b=>{
 const q=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),b.up);
 return Array.from({length:24},(_,i)=>({up:normalAt(Math.cos(i*Math.PI/12)*b.radius,Math.sin(i*Math.PI/12)*b.radius).applyQuaternion(q),gain:.16}));
})];
