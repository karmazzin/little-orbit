/** Preserve wall-frame timing for audio/stats and bounded time for simulation. */
export class FrameClock{
 private last=0;
 reset(){this.last=0;}
 next(ms:number,hidden:boolean){
  if(hidden){this.reset();return null;}
  const previousDelta=this.last?Math.min((ms-this.last)/1000,.05):0;
  const frameMs=this.last?ms-this.last:1000/60;
  this.last=ms;
  return {frameMs,dt:Math.min(frameMs/1000,.05),previousDelta};
 }
}
export class FixedStepper{
 private accumulator=0;
 reset(){this.accumulator=0;}
 advance(dt:number,paused:boolean,step:()=>void,canStep:()=>boolean=()=>true){
  if(paused){this.reset();return;}
  this.accumulator+=dt;
  while(this.accumulator>=1/60&&canStep()){step();this.accumulator-=1/60;}
 }
}

/** A single animation-loop owner; world callbacks preserve their local update order. */
export function startGameLoop(renderer:{setAnimationLoop:(callback:((ms:number)=>void)|null)=>void},clock:FrameClock,update:(frame:{frameMs:number;dt:number;previousDelta:number;cpuStart:number})=>void){
 renderer.setAnimationLoop(ms=>{
  const cpuStart=performance.now(),frame=clock.next(ms,document.hidden);
  if(frame)update({...frame,cpuStart});
 });
}
