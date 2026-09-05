export function joystickInput(x:number,y:number){
 const length=Math.hypot(x,y),strength=Math.min(length/48,1);
 if(length<7)return {forward:0,right:0,run:false};
 return {forward:-y/length*strength,right:x/length*strength,run:strength>.85};
}
/** Each finger owns its gesture until release, cancellation, or a mode change. */
export function createTouchControls(options:{canvas:HTMLCanvasElement;stick:HTMLElement;knob:HTMLElement;enabled:()=>boolean;overview:()=>boolean;look:(x:number,y:number)=>void;globe:(from:{x:number;y:number},to:{x:number;y:number})=>void;zoom:(ratio:number)=>void}){
 const {canvas,stick,knob}=options;
 let owner:number|null=null,origin={x:0,y:0},input=joystickInput(0,0);
 const fingers=new Map<number,{x:number;y:number}>();
 function reset(){owner=null;fingers.clear();input=joystickInput(0,0);knob.style.transform='';}
 stick.addEventListener('pointerdown',e=>{
  if(!options.enabled()||options.overview()||owner!==null)return;
  e.preventDefault();owner=e.pointerId;const rect=stick.getBoundingClientRect();origin={x:rect.left+rect.width/2,y:rect.top+rect.height/2};stick.setPointerCapture(e.pointerId);moveStick(e);
 });
 function moveStick(e:PointerEvent){if(owner!==e.pointerId)return;e.preventDefault();const x=e.clientX-origin.x,y=e.clientY-origin.y;input=joystickInput(x,y);const scale=Math.min(1,48/(Math.hypot(x,y)||1));knob.style.transform=`translate(${x*scale}px,${y*scale}px)`;}
 stick.addEventListener('pointermove',moveStick);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if((e as PointerEvent).pointerId===owner){owner=null;input=joystickInput(0,0);knob.style.transform='';}});
 canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||!options.enabled())return;e.preventDefault();fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{
  const previous=fingers.get(e.pointerId);if(!previous)return;
  if(!options.enabled()){reset();return;}e.preventDefault();
  const next={x:e.clientX,y:e.clientY};
  if(fingers.size===1){if(options.overview())options.globe(previous,next);else options.look(next.x-previous.x,next.y-previous.y);}
  else {const other=[...fingers.entries()].find(([id])=>id!==e.pointerId)![1];const before=Math.hypot(previous.x-other.x,previous.y-other.y),after=Math.hypot(next.x-other.x,next.y-other.y);if(before>4&&after>4)options.zoom(before/after);}
  fingers.set(e.pointerId,next);
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>fingers.delete((e as PointerEvent).pointerId));
 for(const type of ['blur','resize'])window.addEventListener(type,reset);
 document.addEventListener('visibilitychange',reset);
 return {reset,read:()=>input};
}
