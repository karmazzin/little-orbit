import {Quaternion,Vector3} from 'three';
import {coordinates,normalAt,RADIUS,WATER_LEVEL,riverX} from '../../geography.ts';
import {azureUp} from './wilderness.ts';
import {waterAt} from './hydrology.ts';
export {coordinates,normalAt,RADIUS,WATER_LEVEL,riverX} from '../../geography.ts';
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
const ridge=(x:number,z:number,amplitude:number,spread:number,q?:Quaternion)=>({up:normalAt(x,z).applyQuaternion(q??new Quaternion()),amplitude,spread});
const west=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(-.88,-.4,-.25).normalize());
const east=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(.86,-.4,-.3).normalize());
const mountains=[
 ridge(20,-99,17,19),ridge(42,-87,14,19),ridge(-39,-84,13,18),ridge(71,-50,15,20),ridge(81,-21,12,17),
 ridge(-32,-65,17,20,west),ridge(-6,-71,14,17,west),ridge(39,-55,16,20,west),
 ridge(-34,-65,17,21,east),ridge(-8,-72,14,18,east),ridge(43,-51,16,21,east),
];
const hills=[ridge(-55,-5,5.2,24),ridge(54,61,5.5,24),ridge(-24,79,5,24),ridge(-55,60,4.5,24,west),ridge(43,19,4.7,23,east)];
export type TerrainSample={height:number;waterDepth:number;waterLevel:number;flow:Vector3;bridge:boolean;ford:boolean;wet:boolean;path:boolean;biome:'meadow'|'hill'|'mountain'|'shore';region:string};
const zero=new Vector3();
const coveShore=azureUp(31,23);
export function sample(n:Vector3):TerrainSample{
 const small=.65*Math.sin(n.x*7+n.z*3)+.45*Math.sin(n.z*9-n.y*4)+.22*Math.cos(n.x*16+n.y*8);
 let mountain=0,hill=0;
 for(const p of mountains){const d2=n.distanceToSquared(p.up)*RADIUS*RADIUS;mountain=Math.max(mountain,p.amplitude*Math.exp(-d2/(p.spread*p.spread)));}
 for(const p of hills){const d2=n.distanceToSquared(p.up)*RADIUS*RADIUS;hill=Math.max(hill,p.amplitude*Math.exp(-d2/(p.spread*p.spread)));}
 // Lower shoulders and softer crest outcrops, retaining the mountain biome footprint.
 const crags=mountain>5?Math.sin(n.x*36+n.y*18)*Math.sin(n.z*31-n.y*13)*smooth((mountain-5)/8)*.65:0;
 const base=RADIUS+2.5+small+Math.max(mountain*.85,hill)+crags;
 let height=base,bridge=false,ford=false,path=false;
 const water=waterAt(n),waterLevel=water?.level??WATER_LEVEL;
 if(water){
  const d=water.distance;
  if(d<=0){const cross=Math.max(0,1+d/water.width);height=water.level-water.depth*(1-cross*cross);}
  else{
   const bank=water.level+Math.max(1.5,base-water.level)*smooth(d/3.2);
   height=bank+(base-bank)*smooth((d-3.2)/6.8);
  }
 }
 // A shallow cove provides a continuous walking ramp into the remote sea.
 const coveDistance=n.distanceTo(coveShore)*RADIUS;
 if(water&&water.distance>0&&coveDistance<12){const blend=1-smooth((coveDistance-5)/7);height+=(Math.min(height,water.level+water.distance*.65)-height)*blend;}
 if(n.y>.45){
  const {x,z}=coordinates(n);
  bridge=Math.abs(z)<1.65&&x>5.2&&x<15.2;
  ford=Math.abs(z+26)<.65&&x>4&&x<17;
  if(ford)height=Math.max(height,waterLevel+.2);
  // Approach ramps make the old raised deck traversable by the slope-aware walker.
  if(Math.abs(z)<1.65&&x>1.2&&x<19.2){
   const deck=WATER_LEVEL+1.3,t=smooth(Math.min((x-1.2)/4,(19.2-x)/4));
   height=height+(deck-height)*t;
  }
  // A small footbridge connects Noah's northern cart to the village across the tributary.
  if(Math.abs(x+4)<1.05&&z> -49&&z< -36){
   const t=smooth(Math.min((z+49)/2.5,(-36-z)/2.5));height+=(67.7-height)*t;
   if(z> -46.5&&z< -38.5)bridge=true;
  }
  path=(Math.abs(z)<1.6&&x>-9&&x<28)||(Math.abs(x+4)<1.4&&z>-15&&z<7)||(Math.abs(x-25)<1.15&&z>0&&z<25);
 }
 const waterDepth=water&&water.distance<0&&!bridge&&!ford?Math.max(0,waterLevel-height):0;
 const biome=water&&water.distance<2.5?'shore':mountain>5?'mountain':hill>1.4||mountain>1.8?'hill':'meadow';
 const region=water&&water.distance<4?water.name:mountain>5?'Серебряные вершины':hill>1.4||mountain>1.8?'Высокие луга':'Тихие равнины';
 return {height,waterDepth,waterLevel,flow:waterDepth>0?water!.flow:zero,bridge,ford,wet:waterDepth>0,path,biome,region};
}
