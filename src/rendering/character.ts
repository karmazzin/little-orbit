import * as T from 'three';
import {mesh,box,ball,cylinder} from './primitives.ts';
export type CharacterActivity='walk'|'home'|'letters'|'water'|'inspect'|'notes'|'observe'|'rest'|'tell'|'sit'|'greet';

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
 return {root,body,torso,hat,arms,legs,animate(time:number,moving:boolean,swimming=false,activity?:CharacterActivity){
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
