import * as T from 'three';
import {Vector3} from 'three';
import {createAtlasPlanet} from './system-planet.ts';
import {createAtlasStar} from './system-star.ts';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {HOME_PLANET,NEIGHBORS,neighborPosition} from './planets.ts';
import {solarState,YEAR_SECONDS,DAY_SECONDS} from './sky.ts';
export function systemBodies(seconds:number){
 return [
  {name:HOME_PLANET.name,color:0x9fc894,radius:1800,period:YEAR_SECONDS,phase:0,tilt:0,home:true,position:solarState(seconds).planetPosition},
  ...NEIGHBORS.map((p,i)=>({...p,home:false,position:neighborPosition(i,seconds)})),
 ];
}
export type SystemBody=ReturnType<typeof systemBodies>[number];
export function orbitPoint(body:Pick<SystemBody,'radius'|'tilt'>,angle:number){
 return new Vector3(Math.cos(angle)*body.radius,Math.sin(angle)*Math.cos(body.tilt)*body.radius,Math.sin(angle)*Math.sin(body.tilt)*body.radius);
}
const color=(hex:number)=>`#${hex.toString(16).padStart(6,'0')}`;
export function createSystemScene(){
 const scene=new T.Scene();scene.background=new T.Color(0x080f1d);const scale=.06,bodies=systemBodies(0);
 const starPositions:number[]=[],starColors:number[]=[],starSizes:number[]=[];
 let seed=18273;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<850;i++){
  const z=random()*2-1,angle=random()*Math.PI*2,r=Math.sqrt(1-z*z),distance=850+random()*180;
  starPositions.push(Math.cos(angle)*r*distance,Math.sin(angle)*r*distance,z*distance);
  const brightness=.12+Math.pow(random(),4)*.38,warm=random();starColors.push(brightness*(.88+warm*.12),brightness*.94,brightness*(1-warm*.12));starSizes.push(.8+random()*1.2);
 }
 const starGeometry=new T.BufferGeometry();starGeometry.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));starGeometry.setAttribute('color',new T.Float32BufferAttribute(starColors,3));starGeometry.setAttribute('pointSize',new T.Float32BufferAttribute(starSizes,1));
 const stars=new T.Points(starGeometry,new T.ShaderMaterial({vertexColors:true,transparent:true,depthWrite:false,
  vertexShader:`attribute float pointSize;varying vec3 tint;void main(){tint=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=pointSize;}`,
  fragmentShader:`varying vec3 tint;void main(){float radius=length(gl_PointCoord-vec2(.5));float alpha=(1.0-smoothstep(.08,.5,radius))*.55;gl_FragColor=vec4(tint,alpha);
#include <colorspace_fragment>
}`
 }));stars.name='atlas-stars';scene.add(stars);
 scene.add(new T.AmbientLight(0xc5d3ee,1.05));const sunlight=new T.PointLight(0xffe4bd,4,0,0);scene.add(sunlight);
 const sun=createAtlasStar();scene.add(sun);
 const orbits=bodies.map(b=>{const points=Array.from({length:129},(_,i)=>orbitPoint(b,i/128*Math.PI*2).multiplyScalar(scale));
  const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:b.color,transparent:true,opacity:.3}));scene.add(line);return line;});
 const planets=bodies.map((b,i)=>{const planet=createAtlasPlanet(i,b.home,b.color);scene.add(planet);return planet;});
 return {scene,scale,planets,orbits,update(seconds:number){sun.rotation.z=seconds*.008;systemBodies(seconds).forEach((b,i)=>{planets[i].position.copy(b.position).multiplyScalar(scale);planets[i].getObjectByName('surface')!.rotation.y=seconds*(.025+i*.007);});}};
}
/** A separate lightweight scene is rendered only while the atlas is open. */
export function createSystemMap(container:HTMLElement,currentPlanet:string=HOME_PLANET.name){
 const bodies=systemBodies(0);let selected=Math.max(0,bodies.findIndex(b=>b.name===currentPlanet)),closeup=false,preview=false,speed=1,previewSeconds=0,actualSeconds=0,lastFrame=0;
 container.innerHTML=`<div class="system-viewport"><canvas aria-label="Трёхмерная карта системы Ореола" tabindex="0"></canvas><div class="system-labels">${bodies.map((b,i)=>`<button type="button" data-body="${i}" style="color:${color(b.color)}">${b.name}</button>`).join('')}<span class="system-sun-label">Ореол</span></div></div><div class="system-legend">${bodies.map((b,i)=>`<button type="button" data-select="${i}" aria-pressed="${i===selected}"><i style="background:${color(b.color)}"></i>${b.name}${b.name===currentPlanet?' · ты здесь':''}</button>`).join('')}</div><div class="system-tools"><button type="button" data-view="planet" aria-pressed="false">Рассмотреть планету</button><button type="button" data-view="all">Вся система</button><div class="system-speed" role="group" aria-label="Скорость просмотра">${[0,1,20,100].map(v=>`<button type="button" data-speed="${v}" aria-pressed="${v===1}">${v===0?'Ⅱ Пауза':'×'+v}</button>`).join('')}</div><button type="button" data-now>Сейчас</button></div><p class="system-time">Сейчас · положения из мира</p><p class="system-detail" aria-live="polite"></p><small class="system-caption">Потяни мышью — вращать · Колёсико — масштаб · Двойной клик — исходный вид.<br>Орбиты в едином масштабе, размеры планет условные. Ускорение меняет только просмотр карты. «Сейчас» возвращает положения из мира.</small>`;
 const canvas=container.querySelector('canvas')!,viewport=container.querySelector<HTMLElement>('.system-viewport')!;
 const labels=Array.from(container.querySelectorAll<HTMLButtonElement>('[data-body]'));
 const buttons=Array.from(container.querySelectorAll<HTMLButtonElement>('[data-select]'));
 const sunLabel=container.querySelector<HTMLElement>('.system-sun-label')!;
 let view:ReturnType<typeof createSystemScene>|undefined,renderer:T.WebGLRenderer|undefined,controls:OrbitControls|undefined;
 const camera=new T.PerspectiveCamera(45,1,1,2000);camera.up.set(0,0,1);
 const reset=()=>{closeup=false;container.querySelector('[data-view=planet]')!.setAttribute('aria-pressed','false');if(controls)controls.minDistance=35;camera.position.set(0,-540,450);camera.lookAt(0,0,0);if(controls){controls.target.set(0,0,0);controls.update();}};reset();
 function ensureView(){if(view)return;
  view=createSystemScene();renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.toneMapping=T.ACESFilmicToneMapping;
  controls=new OrbitControls(camera,canvas);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=35;controls.maxDistance=1200;controls.rotateSpeed=.7;controls.zoomSpeed=.8;
  canvas.addEventListener('dblclick',reset);select(selected);
 }
 function select(i:number){selected=i;const body=bodies[i];
  buttons.forEach((b,k)=>b.setAttribute('aria-pressed',String(i===k)));labels.forEach((b,k)=>b.classList.toggle('selected',i===k));
  view?.orbits.forEach((line,k)=>line.material.opacity=k===i?.85:.25);
  if(closeup&&view&&controls)focusPlanet();
  container.querySelector('.system-detail')!.textContent=`${body.name} · Год: ${(body.period/DAY_SECONDS).toLocaleString('ru',{maximumFractionDigits:1})} суток Хвои${body.home?' · Наш дом':body.name==='Ирис'?' · Планета с кольцами':''}`;
 }
 function focusPlanet(){if(!view||!controls)return;const planet=view.planets[selected];const direction=camera.position.clone().sub(controls.target).normalize();controls.minDistance=planet.userData.radius*2.5;controls.target.copy(planet.position);camera.position.copy(planet.position).addScaledVector(direction,planet.userData.radius*4.5);controls.update();}
 container.querySelector<HTMLButtonElement>('[data-view=planet]')!.onclick=()=>{ensureView();closeup=true;container.querySelector('[data-view=planet]')!.setAttribute('aria-pressed','true');focusPlanet();};
 container.querySelector<HTMLButtonElement>('[data-view=all]')!.onclick=reset;
 function refreshTime(){const text=preview?`Просмотр · ${speed===0?'пауза':'×'+speed} · ${((previewSeconds-actualSeconds)/DAY_SECONDS).toFixed(1)} суток от настоящего`:'Сейчас · положения из мира';const label=container.querySelector('.system-time')!;if(label.textContent!==text)label.textContent=text;container.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===speed)));}
 container.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(b=>b.onclick=()=>{if(!preview)previewSeconds=actualSeconds;preview=true;speed=Number(b.dataset.speed);lastFrame=performance.now();refreshTime();});
 container.querySelector<HTMLButtonElement>('[data-now]')!.onclick=()=>{preview=false;speed=1;refreshTime();};
 buttons.forEach((b,i)=>b.onclick=()=>select(i));labels.forEach((b,i)=>b.onclick=()=>select(i));select(selected);
 return {update(seconds:number){ensureView();actualSeconds=seconds;if(!preview)view!.update(seconds);},render(){if(!view||!renderer)return;
  const width=viewport.clientWidth,height=viewport.clientHeight;if(!width||!height)return;
  const size=renderer.getSize(new T.Vector2());if(size.x!==width||size.y!==height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  const now=performance.now(),dt=lastFrame?Math.min((now-lastFrame)/1000,.1):0;lastFrame=now;
  if(preview){previewSeconds+=dt*speed;view.update(previewSeconds);}
  if(closeup){const target=view.planets[selected].position;camera.position.add(target.clone().sub(controls!.target));controls!.target.copy(target);}
  refreshTime();controls!.update();renderer.render(view.scene,camera);
  const occupied:{x:number;y:number;width:number}[]=[];
  const place=(label:HTMLElement,position:T.Vector3)=>{
   const point=position.clone().project(camera);label.hidden=point.z< -1||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;if(label.hidden)return;
   const labelWidth=label.offsetWidth,x=T.MathUtils.clamp((point.x*.5+.5)*width,labelWidth/2,width-labelWidth/2);
   let y=(-point.y*.5+.5)*height;
   for(let attempt=0;attempt<6&&occupied.some(r=>Math.abs(r.x-x)<(r.width+labelWidth)/2+4&&Math.abs(r.y-y)<22);attempt++)y+=22;
   y=Math.min(y,height-36);occupied.push({x,y,width:labelWidth});label.style.left=`${x}px`;label.style.top=`${y}px`;
  };
  if(closeup){sunLabel.hidden=true;labels.forEach(label=>label.hidden=true);}else{place(sunLabel,new T.Vector3());labels.forEach((label,i)=>place(label,view!.planets[i].position));}
 }};
}
