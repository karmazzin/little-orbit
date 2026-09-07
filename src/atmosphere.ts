import {ATMOSPHERE_RADIUS} from './environment.ts';
import * as T from 'three';
import {RADIUS} from './worlds/khvoya/terrain.ts';

/** A single transparent shell, lit by the same sun as the world. No shadow pass. */
export function createAtmosphere(scene:T.Scene,radius=RADIUS){
 const outerRadius=radius+(ATMOSPHERE_RADIUS-RADIUS);
 const material=new T.ShaderMaterial({
  transparent:true,side:T.BackSide,depthWrite:false,depthTest:true,
  blending:T.AdditiveBlending,toneMapped:false,
  uniforms:{sunDirection:{value:new T.Vector3(0,1,0)},strength:{value:0},surfaceRadius:{value:radius+4},outerRadius:{value:outerRadius}},
  vertexShader:`varying vec3 worldPoint;
   void main(){worldPoint=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(worldPoint,1.0);}`,
  fragmentShader:`varying vec3 worldPoint;
   uniform vec3 sunDirection;
   uniform float strength;
   uniform float surfaceRadius;
   uniform float outerRadius;
   void main(){
    vec3 ray=normalize(worldPoint-cameraPosition);
    vec3 closest=cameraPosition-ray*dot(cameraPosition,ray);
    float impact=length(closest);
    // Optical density falls continuously into space, with no hard outer contour.
    float altitude=max(impact-surfaceRadius,0.0);
    float density=exp(-altitude/3.2);
    float edge=1.0-smoothstep(outerRadius-2.0,outerRadius,impact);
    float limb=smoothstep(surfaceRadius-3.0,surfaceRadius,impact);
    vec3 normal=closest/max(impact,0.0001);
    float sunHeight=dot(normal,sunDirection);
    float daylight=smoothstep(-0.18,0.35,sunHeight);
    float twilight=(1.0-smoothstep(0.0,0.28,abs(sunHeight)));
    vec3 blue=vec3(0.18,0.46,0.85);
    vec3 color=mix(blue,vec3(0.72,0.46,0.32),twilight*0.38);
    float opacity=density*edge*limb*strength*(0.025+0.70*daylight+0.10*twilight);
    gl_FragColor=vec4(color,opacity);
    #include <colorspace_fragment>
   }`,
 });
 const shell=new T.Mesh(new T.SphereGeometry(outerRadius,64,32),material);
 shell.name='Planet atmosphere';shell.renderOrder=3;shell.visible=false;scene.add(shell);
 return {shell,material,updateSun(direction:T.Vector3){material.uniforms.sunDirection.value.copy(direction).normalize();},
  updateView(camera:T.Camera,space:boolean){
   const strength=space?T.MathUtils.smoothstep(camera.position.length(),radius+16,radius+55):0;
   material.uniforms.strength.value=strength;shell.visible=strength>0;
  }};
}
