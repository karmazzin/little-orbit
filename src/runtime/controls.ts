import * as T from 'three';
import {trackballPoint,dragGlobe,globePosition} from '../camera.ts';
import {createTouchControls} from '../touch.ts';
import type {Player} from '../simulation.ts';
import {clearMovementInput,type SessionState} from './session.ts';
import type {PlanetOrbit} from './camera.ts';

type Actions={movement:()=>void;postcard:()=>void;systemMap:()=>void;observe:()=>void;interact:()=>void;journal:()=>void;debug:()=>void;escape:()=>void};
type Options={session:SessionState;canvas:HTMLCanvasElement;camera:T.PerspectiveCamera;player:()=>Player;planetOrbit:PlanetOrbit;radius:number;touchMode:boolean;isPaused:()=>boolean;toast:(text:string)=>void;cameraLook:()=>T.Vector3;actions:Actions;onVisibilityReset:()=>void};
/** One page-scoped control owner; planets supply actions, never duplicate handlers. */
export function createGameControls(options:Options){
 const {session:s,canvas,camera,planetOrbit,isPaused,actions}=options;
 const $=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;
 let grabPoint=new T.Vector3();
 let touch:ReturnType<typeof createTouchControls>;
 function globePointer(x:number,y:number){
  const rect=canvas.getBoundingClientRect();
  const radius=rect.height*.5*options.radius/Math.sqrt(planetOrbit.distance**2-options.radius**2)/Math.tan(T.MathUtils.degToRad(camera.fov*.5));
  return trackballPoint((x-rect.left-rect.width*.5)/radius,(rect.top+rect.height*.5-y)/radius);
 }
 function releaseMouse(){touch.reset();s.drag=false;s.softMouse=false;if(document.pointerLockElement===canvas)document.exitPointerLock();}
 async function captureMouse(){
  if(options.touchMode||!s.started||s.overview||isPaused()||document.pointerLockElement===canvas)return;
  try{await canvas.requestPointerLock();}catch{enableSoftMouse();}
 }
 function enableSoftMouse(){if(s.started&&!s.overview&&!isPaused()){s.softMouse=true;options.toast('Камера следует за мышью над игровым полем · Esc — освободить');}}
 function toggleOverview(relock=true){
  if(!s.started||isPaused())return;s.overview=!s.overview;s.trackingPlanet=false;clearMovementInput(s);releaseMouse();document.body.classList.toggle('overview',s.overview);$('overview-label').hidden=!s.overview;$('interact').hidden=true;if(!s.overview&&relock)void captureMouse();
 }
 // Bind at the same point as the original bootstraps, after their action setup.
 function bind(){
  window.addEventListener('keydown',e=>{
   if(e.target instanceof HTMLSelectElement||e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
   if(e.target instanceof HTMLButtonElement&&['Space','Enter'].includes(e.code))return;
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&s.started&&!isPaused())e.preventDefault();
   if(e.repeat)return;
   if(e.code==='Backquote'||e.key==='~'){e.preventDefault();actions.debug();return;}
   if(e.code==='Escape'){actions.escape();return;}
   if(isPaused()||!s.started)return;
   if(e.code==='KeyF'&&!s.overview){e.preventDefault();actions.movement();}else if(e.code==='KeyP'&&!s.overview)actions.postcard();else if(e.code==='KeyK')actions.systemMap();else if(e.code==='KeyN')actions.observe();else if(e.code==='KeyE')actions.interact();else if(e.code==='KeyM')toggleOverview();else if(e.code==='KeyJ')actions.journal();else if(!s.overview){s.keys.add(e.code);if(e.code==='Space')s.jumpQueued=true;}
  });
  window.addEventListener('keyup',e=>s.keys.delete(e.code));
  window.addEventListener('blur',()=>{clearMovementInput(s);releaseMouse();});
  document.addEventListener('visibilitychange',()=>{clearMovementInput(s);options.onVisibilityReset();});
  document.addEventListener('pointerlockchange',()=>{clearMovementInput(s);if(document.pointerLockElement===canvas&&(s.overview||isPaused()||!s.started))releaseMouse();});
  document.addEventListener('pointerlockerror',enableSoftMouse);
  canvas.addEventListener('pointerdown',e=>{
   if(e.pointerType==='touch'||!s.started||isPaused()||e.button!==0)return;
   if(!s.overview){void captureMouse();return;}
   s.drag=true;camera.position.copy(globePosition(planetOrbit.orientation,planetOrbit.distance));camera.up.set(0,1,0).applyQuaternion(planetOrbit.orientation);const look=options.cameraLook();look.set(0,0,0);camera.lookAt(look);grabPoint=globePointer(e.clientX,e.clientY);canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');
  });
  document.addEventListener('mousemove',e=>{
   if(!s.started||s.overview||isPaused())return;
   if(document.pointerLockElement!==canvas&&!(s.softMouse&&e.target===canvas))return;
   if(e.movementX||e.movementY)s.trackingPlanet=false;
   const player=options.player();player.forward.applyAxisAngle(player.up,-e.movementX*.003).normalize();s.elevation=T.MathUtils.clamp(s.elevation+e.movementY*.003,-1.42,1.15);
  });
  canvas.addEventListener('pointermove',e=>{
   if(e.pointerType==='touch'||!s.drag||!s.overview||isPaused())return;
   const point=globePointer(e.clientX,e.clientY);dragGlobe(planetOrbit.orientation,grabPoint,point);grabPoint=point;
  });
  const endDrag=()=>{s.drag=false;canvas.classList.remove('dragging');};
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag);canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('wheel',e=>{
   if(!s.started||isPaused())return;e.preventDefault();
   if(s.overview)planetOrbit.distance=T.MathUtils.clamp(planetOrbit.distance+e.deltaY*.08,160,360);
   else s.distance=T.MathUtils.clamp(s.distance+e.deltaY*.015,7,27);
  },{passive:false});
  touch=createTouchControls({canvas,stick:$('touch-stick'),knob:$('touch-knob'),enabled:()=>s.started&&!isPaused(),overview:()=>s.overview,
   look:(x,y)=>{s.trackingPlanet=false;const player=options.player();player.forward.applyAxisAngle(player.up,-x*.004).normalize();s.elevation=T.MathUtils.clamp(s.elevation+y*.004,-1.42,1.15);},
   globe:(from,to)=>dragGlobe(planetOrbit.orientation,globePointer(from.x,from.y),globePointer(to.x,to.y)),
   zoom:ratio=>{if(s.overview)planetOrbit.distance=T.MathUtils.clamp(planetOrbit.distance*ratio,160,360);else s.distance=T.MathUtils.clamp(s.distance*ratio,7,27);}});
  return touch;
 }
 return {bind,releaseMouse,captureMouse,toggleOverview};
}
