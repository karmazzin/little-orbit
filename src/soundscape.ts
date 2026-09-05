import {Vector3} from 'three';
import {normalAt,coordinates,sample,riverX,RADIUS} from './terrain.ts';

export type Sound={id:string;gain:number;pan:number;rate?:number};
export type SoundMix={loops:Sound[];shots:Sound[]};
export type SoundFrame={up:Vector3;forward:Vector3;sun:Vector3;active:boolean;walking:boolean;moving:boolean;grounded:boolean;bell:Vector3|null;bellInterval?:number};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const distance=(a:Vector3,b:Vector3)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;

/** Distance is along the surface, so sources never bleed through the planet. */
export function spatialMix(up:Vector3,forward:Vector3,source:Vector3,range:number){
 const d=distance(up,source),t=clamp(1-d/range);
 const direction=source.clone().projectOnPlane(up).normalize();
 const right=new Vector3().crossVectors(forward,up).normalize();
 return {gain:t*t*(3-2*t),pan:Math.max(-1,Math.min(1,direction.dot(right)))};
}
export function footSurface(up:Vector3):'grass'|'stone'|'wood'{
 if(sample(up).bridge)return 'wood';
 const {x,z}=coordinates(up);
 if(up.y>.45&&Math.abs(z+26)<2&&Math.abs(x-riverX(z))<4)return 'stone';
 if(distance(up,normalAt(44,48))<4)return 'stone';
 return 'grass';
}

const waterSources=[
 ...Array.from({length:34},(_,i)=>{const z=-37+i*2;return {up:normalAt(riverX(z),z),gain:.3};}),
 ...Array.from({length:32},(_,i)=>{const a=i*Math.PI/16;return {up:normalAt(12+12.32*Math.cos(a),30+11*Math.sin(a)),gain:.15};}),
];

/** Pure scheduler: game time acceleration does not accelerate recordings or calls. */
export class Soundscape {
 private previous:Vector3|undefined;
 private travelled=0;
 private birdIn:number;
 private insectIn:number;
 private insectLeft=0;
 private bellIn=2;
 private lastVariant=new Map<string,number>();
 constructor(private trees:readonly Vector3[],private random= Math.random){
  this.birdIn=this.between(12,24);this.insectIn=this.between(8,18);
 }
 private between(min:number,max:number){return min+(max-min)*this.random();}
 private variant(group:string,count=3){
  const last=this.lastVariant.get(group);
  const next=last===undefined?Math.floor(this.random()*count):(last+1+Math.floor(this.random()*(count-1)))%count;
  this.lastVariant.set(group,next);return `${group}-${next+1}`;
 }
 update(dt:number,f:SoundFrame):SoundMix{
  dt=Math.max(0,Math.min(.25,dt));
  const moved=this.previous?distance(this.previous,f.up):0;
  this.previous=f.up.clone();
  const shots:Sound[]=[];
  if(!f.active){this.travelled=0;return {loops:[],shots};}
  let water={gain:0,pan:0};
  for(const source of waterSources){
   const mix=spatialMix(f.up,f.forward,source.up,18);mix.gain*=source.gain;
   if(mix.gain>water.gain)water=mix;
  }
  let leaves={gain:0,pan:0};
  const birdTrees:Vector3[]=[];
  for(const tree of this.trees){
   // Cheap chord rejection avoids acos for the hundreds of far-away trees.
   if(tree.distanceToSquared(f.up)*RADIUS*RADIUS>25*25)continue;
   const mix=spatialMix(f.up,f.forward,tree,9);mix.gain*=.2;
   if(mix.gain>leaves.gain)leaves=mix;
   birdTrees.push(tree);
  }
  const sunlight=f.sun.dot(f.up),night=clamp((-sunlight-.03)/.2);
  if(night===0){this.insectLeft=0;this.insectIn=Math.max(8,this.insectIn);}
  else if(f.walking){
   if(this.insectLeft>0)this.insectLeft=Math.max(0,this.insectLeft-dt);
   else if((this.insectIn-=dt)<=0){this.insectLeft=this.between(6,11);this.insectIn=this.between(20,40);}
  }
  const loops=[{id:'wind',gain:.055,pan:0},{id:'river',...water},{id:'leaves',...leaves},
   {id:'crickets',gain:this.insectLeft>0?.12*night:0,pan:-.2}];

  if(f.walking&&sunlight>.1&&birdTrees.length&&(this.birdIn-=dt)<=0){
   this.birdIn=this.between(18,42);
   const tree=birdTrees[Math.floor(this.random()*birdTrees.length)],mix=spatialMix(f.up,f.forward,tree,28);
   shots.push({id:this.variant('bird'),gain:.24*mix.gain,pan:mix.pan});
  }
  if(f.walking&&f.bell){
   const mix=spatialMix(f.up,f.forward,f.bell,16);
   if(mix.gain>0&&(this.bellIn-=dt)<=0){
    this.bellIn=this.between((f.bellInterval??5)*.8,(f.bellInterval??5)*1.4);shots.push({id:'bell',gain:.3*mix.gain,pan:mix.pan});
   }
  }
  if(f.walking&&f.moving&&f.grounded&&moved>0&&moved<1.5){
   this.travelled+=moved;
   const stride=moved/Math.max(dt,.001)>3.5?1.6:1.2;
   if(this.travelled>=stride){
    this.travelled%=stride;
    shots.push({id:this.variant(`step-${footSurface(f.up)}`),gain:this.between(.1955,.2645),pan:0,rate:this.between(.98,1.02)});
   }
  }else this.travelled=0;
  return {loops,shots};
 }
}
