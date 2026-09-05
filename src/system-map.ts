import * as T from 'three';
import {Vector3} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {NEIGHBORS,neighborPosition} from './planets.ts';
import {solarState,YEAR_SECONDS,DAY_SECONDS} from './sky.ts';
export function systemBodies(seconds:number){
 return [
  {name:'Тихая долина',color:0x9fc894,radius:1800,period:YEAR_SECONDS,phase:0,tilt:0,home:true,position:solarState(seconds).planetPosition},
  ...NEIGHBORS.map((p,i)=>({...p,home:false,position:neighborPosition(i,seconds)})),
 ];
}
export type SystemBody=ReturnType<typeof systemBodies>[number];
export function orbitPoint(body:Pick<SystemBody,'radius'|'tilt'>,angle:number){
 return new Vector3(Math.cos(angle)*body.radius,Math.sin(angle)*Math.cos(body.tilt)*body.radius,Math.sin(angle)*Math.sin(body.tilt)*body.radius);
}
const color=(hex:number)=>`#${hex.toString(16).padStart(6,'0')}`;
export function createSystemScene(){
 const scene=new T.Scene();scene.background=new T.Color(0x101b29);const scale=.06,bodies=systemBodies(0);
 scene.add(new T.AmbientLight(0xc5d3ee,1.4));const sunlight=new T.PointLight(0xffe4bd,3,0,0);scene.add(sunlight);
 const sun=new T.Mesh(new T.SphereGeometry(12,24,16),new T.MeshBasicMaterial({color:0xffd28b}));scene.add(sun);
 const orbits=bodies.map(b=>{const points=Array.from({length:129},(_,i)=>orbitPoint(b,i/128*Math.PI*2).multiplyScalar(scale));
  const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:b.color,transparent:true,opacity:.3}));scene.add(line);return line;});
 const planets=bodies.map((b,i)=>{const mesh=new T.Mesh(new T.IcosahedronGeometry(b.home?5.5:4.5+i*.35,2),new T.MeshStandardMaterial({color:b.color,roughness:1,flatShading:true}));scene.add(mesh);
  if(b.name==='Ирис'){const ring=new T.Mesh(new T.RingGeometry(8,11,48),new T.MeshBasicMaterial({color:0xcbbad8,transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=.3;mesh.add(ring);}return mesh;});
 return {scene,scale,planets,orbits,update(seconds:number){systemBodies(seconds).forEach((b,i)=>{planets[i].position.copy(b.position).multiplyScalar(scale);planets[i].rotation.z=seconds*(.025+i*.007);});}};
}
/** A separate lightweight scene is rendered only while the atlas is open. */
export function createSystemMap(container:HTMLElement){
 const bodies=systemBodies(0);let selected=0;
 container.innerHTML=`<div class="system-viewport"><canvas aria-label="Трёхмерная солнечная система" tabindex="0"></canvas><div class="system-labels">${bodies.map((b,i)=>`<button type="button" data-body="${i}" style="color:${color(b.color)}">${b.name}</button>`).join('')}<span class="system-sun-label">Солнце</span></div></div><div class="system-legend">${bodies.map((b,i)=>`<button type="button" data-select="${i}" aria-pressed="${i===selected}"><i style="background:${color(b.color)}"></i>${b.name}${b.home?' · ты здесь':''}</button>`).join('')}</div><p class="system-detail" aria-live="polite"></p><small class="system-caption">Потяни мышью — вращать · Колёсико — масштаб · Двойной клик — исходный вид.<br>Орбиты в едином масштабе, размеры планет условные. Время продолжает идти.</small>`;
 const canvas=container.querySelector('canvas')!,viewport=container.querySelector<HTMLElement>('.system-viewport')!;
 const labels=Array.from(container.querySelectorAll<HTMLButtonElement>('[data-body]'));
 const buttons=Array.from(container.querySelectorAll<HTMLButtonElement>('[data-select]'));
 const sunLabel=container.querySelector<HTMLElement>('.system-sun-label')!;
 let view:ReturnType<typeof createSystemScene>|undefined,renderer:T.WebGLRenderer|undefined,controls:OrbitControls|undefined;
 const camera=new T.PerspectiveCamera(45,1,1,2000);camera.up.set(0,0,1);
 const reset=()=>{camera.position.set(0,-540,450);camera.lookAt(0,0,0);if(controls){controls.target.set(0,0,0);controls.update();}};reset();
 function ensureView(){if(view)return;
  view=createSystemScene();renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.toneMapping=T.ACESFilmicToneMapping;
  controls=new OrbitControls(camera,canvas);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=200;controls.maxDistance=1200;controls.rotateSpeed=.7;controls.zoomSpeed=.8;
  canvas.addEventListener('dblclick',reset);select(selected);
 }
 function select(i:number){selected=i;const body=bodies[i];
  buttons.forEach((b,k)=>b.setAttribute('aria-pressed',String(i===k)));labels.forEach((b,k)=>b.classList.toggle('selected',i===k));
  view?.orbits.forEach((line,k)=>line.material.opacity=k===i?.85:.25);
  container.querySelector('.system-detail')!.textContent=`${body.name} · Год: ${(body.period/DAY_SECONDS).toLocaleString('ru',{maximumFractionDigits:1})} суток Тихой долины${body.home?' · Наш дом':body.name==='Ирис'?' · Планета с кольцами':''}`;
 }
 buttons.forEach((b,i)=>b.onclick=()=>select(i));labels.forEach((b,i)=>b.onclick=()=>select(i));select(selected);
 return {update(seconds:number){ensureView();view!.update(seconds);},render(){if(!view||!renderer)return;
  const width=viewport.clientWidth,height=viewport.clientHeight;if(!width||!height)return;
  const size=renderer.getSize(new T.Vector2());if(size.x!==width||size.y!==height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  controls!.update();renderer.render(view.scene,camera);
  const occupied:{x:number;y:number;width:number}[]=[];
  const place=(label:HTMLElement,position:T.Vector3)=>{
   const point=position.clone().project(camera);label.hidden=point.z< -1||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;if(label.hidden)return;
   const labelWidth=label.offsetWidth,x=T.MathUtils.clamp((point.x*.5+.5)*width,labelWidth/2,width-labelWidth/2);
   let y=(-point.y*.5+.5)*height;
   for(let attempt=0;attempt<6&&occupied.some(r=>Math.abs(r.x-x)<(r.width+labelWidth)/2+4&&Math.abs(r.y-y)<22);attempt++)y+=22;
   y=Math.min(y,height-36);occupied.push({x,y,width:labelWidth});label.style.left=`${x}px`;label.style.top=`${y}px`;
  };
  place(sunLabel,new T.Vector3());labels.forEach((label,i)=>place(label,view!.planets[i].position));
 }};
}
