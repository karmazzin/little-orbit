import {createAtmosphere} from './atmosphere.ts';
import * as T from 'three';
import {resizeShadow} from './shadows.ts';
export const DAY_SECONDS=360;
export const YEAR_SECONDS=DAY_SECONDS*16;
const TAU=Math.PI*2;
const Z=new T.Vector3(0,0,1);
export function solarState(seconds:number){
 const orbitAngle=seconds/YEAR_SECONDS*TAU;
 const planetPosition=new T.Vector3(Math.cos(orbitAngle),Math.sin(orbitAngle),0).multiplyScalar(1800);
 // Render in a planet-centred, co-rotating frame to keep character physics stable.
 const spinAngle=orbitAngle+Math.PI*1.5-seconds/DAY_SECONDS*TAU;
 const sunDirection=planetPosition.clone().negate().normalize().applyAxisAngle(Z,-spinAngle);
 return {planetPosition,sunDirection,spinAngle,orbitAngle};
}
export function localSky(sunDirection:T.Vector3,up:T.Vector3){
 const altitude=T.MathUtils.clamp(sunDirection.dot(up),-1,1);
 const daylight=T.MathUtils.smoothstep(altitude,-.1,.28);
 const twilight=(1-T.MathUtils.smoothstep(Math.abs(altitude),.02,.32))*T.MathUtils.smoothstep(altitude,-.3,-.08);
 const zenith=new T.Color(0x02040c).lerp(new T.Color(0x489ada),daylight);
 zenith.lerp(new T.Color(0x526782),twilight*.65);
 const horizon=new T.Color(0x070c1b).lerp(new T.Color(0xb4dff2),daylight);
 horizon.lerp(new T.Color(0xb3b0bc),twilight*.6);
 return {altitude,daylight,twilight,zenith,horizon,stars:1-T.MathUtils.smoothstep(altitude,-.2,.08)};
}
export function localPhase(seconds:number,up:T.Vector3){
 const altitude=solarState(seconds).sunDirection.dot(up);
 if(altitude<-.15)return 'Ночь';
 if(altitude>.2)return 'День';
 return solarState(seconds+.2).sunDirection.dot(up)>altitude?'Рассвет':'Закат';
}
export function createSky(scene:T.Scene,stars:T.Points<T.BufferGeometry,T.PointsMaterial>){
 const atmosphere=createAtmosphere(scene);
 const ambient=new T.AmbientLight(0xb5c9ee,.25);
 const fill=new T.HemisphereLight(0xb8dfff,0x324b60,.6);
 const sun=new T.DirectionalLight(0xffedcf,3);
 sun.castShadow=true;resizeShadow(sun,1024);
 Object.assign(sun.shadow.camera,{left:-76,right:76,top:76,bottom:-76,near:1,far:500});
 sun.shadow.camera.up.set(0,0,1);sun.position.copy(solarState(DAY_SECONDS*.43).sunDirection).multiplyScalar(220);
 sun.shadow.normalBias=.06;sun.shadow.bias=-.0001;scene.add(ambient,fill,sun);
 const disk=new T.Mesh(new T.SphereGeometry(10,24,16),new T.MeshBasicMaterial({color:0xffe7a0,fog:false,toneMapped:false}));scene.add(disk);
 const domeMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:false,toneMapped:false,
  uniforms:{zenith:{value:new T.Color()},horizon:{value:new T.Color()},up:{value:new T.Vector3(0,1,0)},sunDirection:{value:new T.Vector3()},warm:{value:0}},
  vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec3 vDirection; uniform vec3 zenith; uniform vec3 horizon; uniform vec3 up; uniform vec3 sunDirection; uniform float warm;
  void main(){vec3 d=normalize(vDirection);float height=dot(d,up);vec3 color=mix(horizon,zenith,smoothstep(-0.2,0.35,height));float towardSun=pow(max(0.0,dot(d,sunDirection)),3.0);float band=exp(-pow((height+0.06)/0.3,2.0));color=mix(color,vec3(0.86,0.52,0.32),towardSun*band*warm*0.65);float glow=pow(max(0.0,dot(d,sunDirection)),48.0);color+=vec3(0.12,0.08,0.035)*glow*warm;gl_FragColor=vec4(color,1.0);
  #include <colorspace_fragment>
  }`});
 const dome=new T.Mesh(new T.SphereGeometry(850,32,16),domeMat);dome.renderOrder=-100;dome.frustumCulled=false;scene.add(dome);
 return {sun,syncSun(direction:T.Vector3){sun.position.copy(direction).multiplyScalar(220);},followCamera(camera:T.PerspectiveCamera,space:boolean){atmosphere.updateView(camera,space);dome.position.copy(camera.position);dome.visible=!space;},update(seconds:number,camera:T.PerspectiveCamera,up:T.Vector3,space:boolean){
  const state=solarState(seconds),sky=localSky(state.sunDirection,up);
  atmosphere.updateSun(state.sunDirection);atmosphere.updateView(camera,space);
  sun.color.set(0xffedcf).lerp(new T.Color(0xffc391),space?0:sky.twilight*.6);
  sun.intensity=3.2;
  ambient.intensity=space?.16:.28+sky.daylight*.26;
  fill.intensity=space?.45:.36+sky.daylight*.66;
  fill.position.copy(up);fill.color.copy(sky.zenith).lerp(new T.Color(0xb8dfff),.45);
  disk.position.copy(state.sunDirection).multiplyScalar(560);
  disk.material.color.set(space?0xffe7a0:sky.twilight>.3?0xff9354:0xfff1bd);
  stars.material.opacity=space?.9:sky.stars*.95;stars.rotation.z=-state.spinAngle;
  dome.visible=!space;dome.position.copy(camera.position);
  domeMat.uniforms.zenith.value.copy(sky.zenith);domeMat.uniforms.horizon.value.copy(sky.horizon);domeMat.uniforms.up.value.copy(up);domeMat.uniforms.sunDirection.value.copy(state.sunDirection);domeMat.uniforms.warm.value=sky.twilight;
  (scene.background as T.Color).set(0x02040a);
  const fog=scene.fog as T.FogExp2;fog.color.copy(space?new T.Color(0x02040a):sky.horizon);fog.density=space?.00025:.0018;
  return {state,sky};
 }};
}
