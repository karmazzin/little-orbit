import * as T from 'three';
import {QUALITY,type Quality,type FrameStats} from '../performance.ts';
import {resizeShadow} from '../shadows.ts';
export function createGameRenderer(canvas:HTMLCanvasElement,initialPixelRatio?:number){
 let renderer:T.WebGLRenderer;
 try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch{
  document.getElementById('loading')!.textContent='Не удалось запустить 3D. Открой игру в браузере с поддержкой WebGL 2 и включённым аппаратным ускорением.';throw new Error('WebGL2 unavailable');
 }
 if(initialPixelRatio!==undefined)renderer.setPixelRatio(Math.min(devicePixelRatio,initialPixelRatio));
 renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=T.VSMShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 return renderer;
}
export function resizeGameView(renderer:T.WebGLRenderer,camera:T.PerspectiveCamera){
 renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
}
export function applyRenderQuality(renderer:T.WebGLRenderer,sun:T.DirectionalLight,stats:FrameStats,quality:Quality){
 const preset=QUALITY[quality];renderer.setPixelRatio(Math.min(devicePixelRatio,preset.pixelRatio));resizeShadow(sun,preset.shadowSize);renderer.shadowMap.needsUpdate=true;stats.reset();
}
export function bindContextLoss(canvas:HTMLCanvasElement,renderer:T.WebGLRenderer,save:()=>unknown,message:string){
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();save();const loading=document.getElementById('loading')!;loading.hidden=false;loading.textContent=message;renderer.setAnimationLoop(null);});
}
