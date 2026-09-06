import {SAVVA_HOME} from './frontier.ts';
import {Quaternion,Vector3} from 'three';
import {normalAt,coordinates,sample,RADIUS} from './terrain.ts';
import {DAY_SECONDS} from './sky.ts';
import {surfaceOrientation} from './environment.ts';
import type {Obstacle} from './simulation.ts';

export type PersonId='mira'|'lev'|'ada'|'noah'|'savva';
export type Activity='walk'|'home'|'letters'|'water'|'inspect'|'notes'|'observe'|'rest'|'tell'|'sit'|'greet';
export const WALK_SPEED=1.65;
const ARRIVAL_DISTANCE=.12;
export const PEOPLE=[
 {id:'mira' as const,name:'Мира',role:'ХРАНИТЕЛЬНИЦА ПИСЕМ',color:0xd59169,start:normalAt(-4,-8)},
 {id:'lev' as const,name:'Лев',role:'САДОВНИК',color:0x799d68,start:normalAt(23,5)},
 {id:'ada' as const,name:'Ада',role:'ИССЛЕДОВАТЕЛЬНИЦА ЗВЁЗД',color:0x899aca,start:normalAt(27,21)},
 {id:'noah' as const,name:'Ной',role:'СТРАНСТВУЮЩИЙ РАССКАЗЧИК',color:0x7e839d,start:normalAt(13,-51)},
 {id:'savva' as const,name:'Савва',role:'ХРАНИТЕЛЬ ГОРНОГО ПРИЮТА',color:0xb18c57,start:normalAt(SAVVA_HOME.x,SAVVA_HOME.z)},
];
function home(x:number,z:number,angle:number){
 const up=normalAt(x,z),q=surfaceOrientation(up,angle),base=up.clone().multiplyScalar(sample(up).height);
 const offset=(z:number)=>new Vector3(0,0,z).applyQuaternion(q).add(base).normalize();
 return {up,angle,porch:offset(-3.6),door:offset(-1.78)};
}
export const HOMES={mira:home(-7,-14,Math.PI),lev:home(29,8,1.2),ada:home(48,39,0),
 savva:home(SAVVA_HOME.x,SAVVA_HOME.z,0),
 noah:{up:normalAt(13,-51),angle:0,porch:normalAt(13,-51),door:normalAt(14.7,-50.4)}};
PEOPLE.find(p=>p.id==='savva')!.start.copy(HOMES.savva.porch);
export const FIRE_UP=normalAt(-10,-4);
export const OBSERVE_UP=normalAt(42,49);
// Exact seating coordinates are installed by the hearth renderer at world construction.
export const SEATS:Record<PersonId,Vector3>={mira:normalAt(-13,-4),lev:normalAt(-10,-7),ada:normalAt(-7,-4),noah:normalAt(-10,-1),savva:HOMES.savva.porch.clone()};
export function setResidentSeats(seats:Vector3[]){PEOPLE.forEach((p,i)=>{if(seats[i])SEATS[p.id].copy(seats[i]);});}
export const ACTIVITY_POINTS={
 mira:[normalAt(-4,-8),normalAt(-4,-11),normalAt(-2,-1)],
 lev:[normalAt(23,5),normalAt(24,9),normalAt(20,5)],
 ada:[normalAt(27,21),HOMES.ada.porch,OBSERVE_UP],
 noah:[normalAt(13,-51),normalAt(18,-46),normalAt(-1,-6)],
 savva:[HOMES.savva.porch.clone(),HOMES.savva.porch.clone().addScaledVector(new Vector3(1,0,0).applyQuaternion(surfaceOrientation(HOMES.savva.up)),1.2/RADIUS).normalize(),HOMES.savva.porch.clone().addScaledVector(new Vector3(-1,0,0).applyQuaternion(surfaceOrientation(HOMES.savva.up)),1.2/RADIUS).normalize()],
};
export function localHour(seconds:number,up:Vector3){return ((seconds/DAY_SECONDS*24+Math.atan2(up.x,up.y)*12/Math.PI)%24+24)%24;}
export function storyEvening(seconds:number){const h=localHour(seconds,FIRE_UP);return h>=18&&h<22;}
export function residentIntent(id:PersonId,seconds:number,party:boolean,storytelling=false):{target:Vector3;activity:Activity}{
 const h=localHour(seconds,id==='ada'?OBSERVE_UP:HOMES[id].up),day=Math.floor(seconds/DAY_SECONDS),v=(Math.floor(seconds/23)+PEOPLE.findIndex(p=>p.id===id)+day)%3;
 if(id==='savva')return h<6.5||h>=21?{target:HOMES.savva.porch,activity:'home'}:{target:ACTIVITY_POINTS.savva[v],activity:v===0?'notes':v===1?'inspect':'rest'};
 const fh=localHour(seconds,FIRE_UP);
 // Noah can arrive early, but the performance starts only in the local evening.
 if(id==='noah'&&fh>=15.5&&fh<22)return {target:SEATS.noah,activity:storyEvening(seconds)?'tell':'rest'};
 const invited=id==='mira'||id==='lev'||(id==='ada'&&(party||day%2===0));
 if(invited&&storytelling&&storyEvening(seconds))return {target:SEATS[id],activity:'sit'};
 // Listeners finish their afternoon at home; the actual performance calls them out.
 if(invited&&fh>=16.5&&fh<22)return {target:HOMES[id].porch,activity:'home'};
 if(id==='ada'){
  if(h>=18||h<5.8)return {target:OBSERVE_UP,activity:'observe'};
  if(h<14.5)return {target:HOMES.ada.porch,activity:'home'};
  return {target:ACTIVITY_POINTS.ada[0],activity:'notes'};
 }
 if(h<6.5||h>=21.5)return {target:HOMES[id].porch,activity:'home'};
 if(id==='mira')return {target:ACTIVITY_POINTS.mira[v],activity:v===2?'rest':'letters'};
 if(id==='lev')return {target:ACTIVITY_POINTS.lev[v],activity:v===1?'inspect':'water'};
 return {target:ACTIVITY_POINTS.noah[day%2===0?v%2:2],activity:day%2===0?'notes':'rest'};
}

/** Cached graph on the inhabited hemisphere. Edges are checked along their whole length. */
export class ResidentNavigation {
 private nodes=new Map<string,Vector3>();
 private edges=new Map<string,boolean>();
 private paths=new Map<string,Vector3[]|null>();
 constructor(readonly obstacles:readonly Obstacle[],private frame?:Quaternion){}
 clear(up:Vector3){return sample(up).waterDepth<.001&&!this.obstacles.some(o=>up.distanceToSquared(o.up)*RADIUS*RADIUS<(o.radius+.28)**2);}
 safeEdge(a:Vector3,b:Vector3){
  const length=a.angleTo(b)*RADIUS,n=Math.max(1,Math.ceil(length/.28));let prev=sample(a).height;
  for(let i=0;i<=n;i++){
   const up=a.clone().lerp(b,i/n).normalize(),s=sample(up);
   if(!this.clear(up)||(i>0&&Math.abs(s.height-prev)>Math.max(.12,length/n*1.04)))return false;
   prev=s.height;
  }return true;
 }
 private node(x:number,z:number){const key=`${x},${z}`;let n=this.nodes.get(key);if(!n){n=normalAt(x,z);if(this.frame)n.applyQuaternion(this.frame);this.nodes.set(key,n);}return n;}
 route(from:Vector3,to:Vector3):Vector3[]|null{
  if(!this.clear(from)||!this.clear(to))return null;
  if(this.safeEdge(from,to))return [to.clone()];
  const local=(up:Vector3)=>coordinates(this.frame?up.clone().applyQuaternion(this.frame.clone().invert()):up);
  const a=local(from),b=local(to);
  if(!this.frame&&[a,b].some(p=>p.x< -32||p.x>58||p.z< -60||p.z>59)){const center=from.clone().add(to).normalize();return new ResidentNavigation(this.obstacles,new Quaternion().setFromUnitVectors(new Vector3(0,1,0),center)).route(from,to);}
  const cacheKey=`${a.x.toFixed(2)},${a.z.toFixed(2)}:${b.x.toFixed(2)},${b.z.toFixed(2)}`;
  if(this.paths.has(cacheKey))return this.paths.get(cacheKey)?.map(p=>p.clone())??null;
  const nearest=(p:Vector3)=>{const c=local(p),options:{x:number;z:number;d:number}[]=[];for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
   const x=Math.round(c.x)+dx,z=Math.round(c.z)+dz,n=this.node(x,z);if(this.safeEdge(p,n))options.push({x,z,d:n.distanceToSquared(p)});
  }return options.sort((a,b)=>a.d-b.d)[0];};
  const start=nearest(from),end=nearest(to);if(!start||!end)return null;
  const remote=[start,end].some(p=>p.x< -32||p.x>58||p.z< -60||p.z>59);
  const bounds=remote?{minX:Math.min(start.x,end.x)-8,maxX:Math.max(start.x,end.x)+8,minZ:Math.min(start.z,end.z)-8,maxZ:Math.max(start.z,end.z)+8}:{minX:-32,maxX:58,minZ:-60,maxZ:59};
  const key=(x:number,z:number)=>`${x},${z}`,sk=key(start.x,start.z),ek=key(end.x,end.z);
  const open=[{x:start.x,z:start.z,k:sk,f:0}],cost=new Map([[sk,0]]),parent=new Map<string,string>(),closed=new Set<string>();
  let found=false;
  while(open.length){
   let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
   const cur=open.splice(best,1)[0];if(closed.has(cur.k))continue;if(cur.k===ek){found=true;break;}closed.add(cur.k);
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const x=cur.x+dx,z=cur.z+dz,k=key(x,z);if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ||closed.has(k))continue;
    const edge=[cur.k,k].sort().join(':');let safe=this.edges.get(edge);
    const n=this.node(x,z),source=this.node(cur.x,cur.z);
    if(safe===undefined){safe=this.safeEdge(source,n);this.edges.set(edge,safe);}if(!safe)continue;
    const g=cost.get(cur.k)!+source.angleTo(n)*RADIUS;
    if(g>=(cost.get(k)??Infinity))continue;cost.set(k,g);parent.set(k,cur.k);
    open.push({x,z,k,f:g+n.angleTo(this.node(end.x,end.z))*RADIUS});
   }
  }
  if(!found){this.paths.set(cacheKey,null);return null;}
  const path:Vector3[]=[to.clone()];let cur=ek;
  while(true){const [x,z]=cur.split(',').map(Number);path.unshift(this.node(x,z).clone());if(cur===sk)break;cur=parent.get(cur)!;}
  // Keep short verified edges. This avoids long smoothing work and preserves narrow crossings.
  if(this.paths.size>=256)this.paths.delete(this.paths.keys().next().value!);this.paths.set(cacheKey,path);return path.map(p=>p.clone());
 }
}
export type ResidentState={id:PersonId;up:Vector3;heading:Vector3;target:Vector3;activity:Activity;intent:Activity;inside:boolean;transition:number;visit:number;greeting:number;greetCooldown:number;route:Vector3[];routeIndex:number;blocked:boolean;moving:boolean;retry:number};
export function createResident(id:PersonId):ResidentState{
 const up=PEOPLE.find(p=>p.id===id)!.start.clone();return {id,up,heading:new Vector3(0,0,-1).projectOnPlane(up).normalize(),target:up.clone(),activity:'rest',intent:'rest',inside:false,transition:0,visit:0,greeting:0,greetCooldown:0,route:[],routeIndex:0,blocked:false,moving:false,retry:0};
}
export function knockResident(r:ResidentState){r.inside=false;r.transition=-1.5;r.visit=22;r.route=[];r.activity='rest';r.target.copy(HOMES[r.id].porch);}
export function advanceResident(r:ResidentState,nav:ResidentNavigation,f:{dt:number;seconds:number;paused:boolean;player:Vector3;party:boolean;storytelling?:boolean}){
 if(f.paused)return;r.moving=false;
 const dt=Math.max(0,Math.min(f.dt,.1));r.visit=Math.max(0,r.visit-dt);r.greetCooldown=Math.max(0,r.greetCooldown-dt);
 const desired=r.visit>0?{target:HOMES[r.id].porch,activity:'rest' as Activity}:residentIntent(r.id,f.seconds,f.party,f.storytelling);
 const changed=r.target.distanceToSquared(desired.target)>1e-9;
 if(changed||r.intent!==desired.activity){
  r.target.copy(desired.target);r.intent=desired.activity;if(r.inside)r.transition=-1.5;r.inside=false;
  if(changed||!r.route.length){r.route=nav.route(r.up,r.target)??[];r.routeIndex=0;r.blocked=!r.route.length&&r.up.distanceTo(r.target)*RADIUS>=ARRIVAL_DISTANCE;}
 }
 if(r.blocked&&(r.retry-=dt)<=0){r.retry=.5;const path=nav.route(r.up,r.target);if(path){r.route=path;r.routeIndex=0;r.blocked=false;}}
 if(r.inside){r.activity='home';return;}
 if(r.transition<0){r.transition=Math.min(0,r.transition+dt);r.activity='walk';return;}
 const performing=(r.intent==='tell'||r.intent==='sit')&&r.up.distanceTo(r.target)*RADIUS<ARRIVAL_DISTANCE;
 if(performing)r.greeting=0;
 const nearby=!performing&&r.up.distanceTo(f.player)*RADIUS<3.5;
 if(nearby&&r.greetCooldown<=0){r.greeting=1.3;r.greetCooldown=24;}
 if(r.greeting>0){r.greeting-=dt;r.activity='greet';const face=f.player.clone().projectOnPlane(r.up);if(face.lengthSq()>.00001)r.heading.copy(face).normalize();return;}
 let remaining=WALK_SPEED*dt;
 while(r.routeIndex<r.route.length&&remaining>0){
  const next=r.route[r.routeIndex],d=r.up.angleTo(next)*RADIUS;
  if(d<1e-7){r.routeIndex++;continue;}
  const move=Math.min(d,remaining),previous=r.up.clone();r.up.lerp(next,move/d).normalize();r.heading.copy(r.up).sub(previous).projectOnPlane(r.up).normalize();r.moving=true;remaining-=move;
  if(move>=d-.0001)r.routeIndex++;
 }
 const arrived=r.up.distanceTo(r.target)*RADIUS<ARRIVAL_DISTANCE;
 r.activity=r.moving?'walk':arrived?r.intent:'rest';
 if(arrived&&r.intent==='home'){r.transition+=dt;if(r.transition>=1.5){r.inside=true;r.transition=0;}}
 else r.transition=0;
}
/** One source of truth for story choices, summoned listeners, flame and crackle. */
export function noahIsTelling(seconds:number,noah:ResidentState){
 return storyEvening(seconds)&&noah.id==='noah'&&!noah.inside&&!noah.moving&&noah.transition===0&&noah.activity==='tell'&&noah.up.distanceTo(SEATS.noah)*RADIUS<ARRIVAL_DISTANCE;
}
export function advanceResidents(residents:ResidentState[],nav:ResidentNavigation,f:{dt:number;seconds:number;paused:boolean;player:Vector3;party:boolean}){
 const noah=residents.find(r=>r.id==='noah');
 if(noah)advanceResident(noah,nav,f);
 const storytelling=!!noah&&noahIsTelling(f.seconds,noah);
 for(const r of residents)if(r!==noah)advanceResident(r,nav,{...f,storytelling});
 return storytelling;
}
export const RESIDENT_SAVE_KEY='little-orbit-residents-v1';
export function serializeResidents(residents:ResidentState[]){return JSON.stringify({version:1,residents:residents.map(r=>({id:r.id,up:r.up.toArray(),heading:r.heading.toArray(),target:r.target.toArray(),intent:r.intent,inside:r.inside,visit:r.visit}))});}
const activities:Activity[]=['walk','home','letters','water','inspect','notes','observe','rest','tell','sit','greet'];
export function restoreResidents(raw:string|null,nav:ResidentNavigation){
 const result=PEOPLE.map(p=>createResident(p.id));
 try{const data=JSON.parse(raw??'null');if(data?.version!==1||!Array.isArray(data.residents))return result;
  const vector=(v:unknown)=>Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n))&&Math.abs(new Vector3().fromArray(v).length()-1)<.001?new Vector3().fromArray(v).normalize():null;
  for(const r of result){const s=data.residents.find((s:{id?:string})=>s?.id===r.id);if(!s)continue;const up=vector(s.up),target=vector(s.target),heading=vector(s.heading);
   if(!up||!target||!nav.clear(up)||!nav.clear(target)||!activities.includes(s.intent))continue;
   r.up.copy(up);r.target.copy(target);r.intent=s.intent;r.activity=s.intent;
   if(heading&&Math.abs(heading.dot(up))<.01)r.heading.copy(heading);
   r.inside=s.inside===true&&up.distanceTo(HOMES[r.id].porch)*RADIUS<.15&&s.intent==='home';
   r.visit=typeof s.visit==='number'&&Number.isFinite(s.visit)?Math.max(0,Math.min(22,s.visit)):0;
   r.route=nav.route(up,target)??[];r.blocked=!r.route.length&&up.distanceTo(target)*RADIUS>=ARRIVAL_DISTANCE;
  }
 }catch{}return result;
}
export const ACTIVITY_LABEL:Record<Activity,string>={walk:'В пути',home:'Дома',letters:'Разбирает письма',water:'Поливает сад',inspect:'Осматривает растения',notes:'Делает записи',observe:'Наблюдает звёзды',rest:'Отдыхает',tell:'Рассказывает истории',sit:'У костра',greet:'Приветствует тебя'};

export function homeLit(id:PersonId,seconds:number,inside:boolean){const h=localHour(seconds,HOMES[id].up);return inside&&h>=18&&h<23;}
