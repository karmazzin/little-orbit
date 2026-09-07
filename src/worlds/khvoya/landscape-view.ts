import * as T from 'three';
import {stitchTerrain} from './terrain-seams.ts';
import {sample} from './terrain.ts';
import {waterAt} from './hydrology.ts';

type Vertex={up:T.Vector3;height:number;distance:number;level:number;flow:T.Vector3};
/** One shared spherical grid prevents separate river tiles leaving cracks in the banks. */
export function buildLandscape(){
 const base=new T.IcosahedronGeometry(1,48),positions=base.getAttribute('position');
 const groundPoints:number[]=[],groundColors:number[]=[],waterPoints:number[]=[],flows:number[]=[];
 const cache=new Map<string,Vertex>();
 function vertex(up:T.Vector3):Vertex{
  const key=up.toArray().map(x=>x.toFixed(7)).join(',');const saved=cache.get(key);if(saved)return saved;
  const s=sample(up),w=waterAt(up),v={up,height:s.height,distance:w?.distance??100,level:w?.level??s.waterLevel,flow:w?.flow??new T.Vector3()};cache.set(key,v);return v;
 }
 function midway(a:Vertex,b:Vertex){return vertex(a.up.clone().add(b.up).normalize());}
 function shore(a:Vertex,b:Vertex){
  let lo=a,hi=b;for(let i=0;i<12;i++){const m=midway(lo,hi);if((m.distance<=0)===(lo.distance<=0))lo=m;else hi=m;}
  return lo.distance<=0?lo:hi;
 }
 const color=new T.Color();
 function triangle(a:Vertex,b:Vertex,c:Vertex,depth=0){
  if(depth<1&&Math.min(a.distance,b.distance,c.distance)<.08&&Math.max(a.distance,b.distance,c.distance)>-.08){
   const ab=midway(a,b),bc=midway(b,c),ca=midway(c,a);triangle(a,ab,ca,depth+1);triangle(ab,b,bc,depth+1);triangle(ca,bc,c,depth+1);triangle(ab,bc,ca,depth+1);return;
  }
  const center=a.up.clone().add(b.up).add(c.up).normalize(),s=sample(center);
  const height=(a.height+b.height+c.height)/3;
  color.setHex(s.path?0xd0bb88:s.biome==='shore'?0xc0be8b:height>79?0xe4e9e3:height>75?0x989f99:height>71?0x858e7c:s.biome==='hill'?0x89a974:0x96b77d);
  color.multiplyScalar(.97+.04*Math.sin(center.z*23+center.x*14));
  const polygon:Vertex[]=[],dry:Vertex[]=[];let previous=c;
  for(const current of [a,b,c]){
   if((current.distance<=0)!==(previous.distance<=0)){const edge=shore(previous,current);polygon.push(edge);dry.push(edge);}
   (current.distance<=0?polygon:dry).push(current);previous=current;
  }
  // Concave coves can put a dry sliver inside an otherwise clipped polygon.
  // Refine only those cells whose rendered centroid crosses the actual coast.
  if(depth<5&&polygon.length>=3){
   let bendsAcrossLand=false;
   for(let i=1;i<polygon.length-1;i++){
    const midpoint=new T.Vector3();for(const v of [polygon[0],polygon[i],polygon[i+1]])midpoint.addScaledVector(v.up,v.level+.025);
    if((waterAt(midpoint.normalize())?.distance??100)>.025){bendsAcrossLand=true;break;}
   }
   if(bendsAcrossLand){const ab=midway(a,b),bc=midway(b,c),ca=midway(c,a);triangle(a,ab,ca,depth+1);triangle(ab,b,bc,depth+1);triangle(ca,bc,c,depth+1);triangle(ab,bc,ca,depth+1);return;}
  }
  // Cut the ground at the same shoreline vertices: bank triangles cannot project
  // across the water and hide a shallow stream behind an interpolated slope.
  for(const part of [polygon,dry])for(let i=1;i<part.length-1;i++)for(const v of [part[0],part[i],part[i+1]]){
   groundPoints.push(v.up.x*v.height,v.up.y*v.height,v.up.z*v.height);color.toArray(groundColors,groundColors.length);
  }
  for(let i=1;i<polygon.length-1;i++)for(const v of [polygon[0],polygon[i],polygon[i+1]]){
   const r=v.level+.025;waterPoints.push(v.up.x*r,v.up.y*r,v.up.z*r);flows.push(v.flow.x,v.flow.y,v.flow.z);
  }
 }
 for(let i=0;i<positions.count;i+=3){
  const a=vertex(new T.Vector3().fromBufferAttribute(positions,i).normalize()),b=vertex(new T.Vector3().fromBufferAttribute(positions,i+1).normalize()),c=vertex(new T.Vector3().fromBufferAttribute(positions,i+2).normalize());
  // Submeter cells around channels resolve even the narrow mountain headwaters.
  if(Math.min(a.distance,b.distance,c.distance)<2&&Math.max(a.distance,b.distance,c.distance)>-2){const ab=midway(a,b),bc=midway(b,c),ca=midway(c,a);triangle(a,ab,ca);triangle(ab,b,bc);triangle(ca,bc,c);triangle(ab,bc,ca);}else triangle(a,b,c);
 }
 base.dispose();
 const stitched=stitchTerrain(groundPoints,groundColors);
 const groundGeometry=new T.BufferGeometry();groundGeometry.setAttribute('position',new T.Float32BufferAttribute(stitched.points,3));groundGeometry.setAttribute('color',new T.Float32BufferAttribute(stitched.colours,3));groundGeometry.computeVertexNormals();
 const ground=new T.Mesh(groundGeometry,new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1}));ground.receiveShadow=true;ground.castShadow=true;
 const waterGeometry=new T.BufferGeometry();waterGeometry.setAttribute('position',new T.Float32BufferAttribute(waterPoints,3));waterGeometry.setAttribute('flow',new T.Float32BufferAttribute(flows,3));waterGeometry.computeVertexNormals();
 const waterMaterial=new T.MeshStandardMaterial({color:0x5cbbbc,roughness:.25,metalness:.12,transparent:true,opacity:.88,side:T.DoubleSide});
 const waveTime={value:0};
 waterMaterial.onBeforeCompile=shader=>{
  shader.uniforms.uTime=waveTime;
  shader.vertexShader='attribute vec3 flow;\nvarying vec3 waterPoint;\nvarying vec3 waterFlow;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwaterPoint = (modelMatrix * vec4(position, 1.0)).xyz;\nwaterFlow = mat3(modelMatrix) * flow;');
  shader.fragmentShader='uniform float uTime;\nvarying vec3 waterPoint;\nvarying vec3 waterFlow;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 radial = normalize(waterPoint);
   float speed = length(waterFlow);
   vec3 fallback = normalize(cross(radial, abs(radial.y) < 0.9 ? vec3(0.,1.,0.) : vec3(1.,0.,0.)));
   vec3 downstream = speed > 0.01 ? waterFlow / speed : fallback;

   vec3 advected = waterPoint - downstream * uTime * max(speed, 0.08);
   // World anchored noise advects downstream; no view-space swimming of the texture.
   float ripple = sin(dot(advected, vec3(3.7,2.3,4.1))) * sin(dot(advected, vec3(-2.1,4.7,1.3)));
   float streak = pow(max(0.0, sin(dot(advected, vec3(9.7,7.1,11.3)) + ripple)), 12.0);
   diffuseColor.rgb += ripple * 0.018 + streak * (speed > 0.01 ? 0.065 : 0.018);
  `);
 };
 const water=new T.Mesh(waterGeometry,waterMaterial);water.receiveShadow=true;
 // VSM submits receivers too; translucent water must not become an opaque caster.
 water.customDepthMaterial=new T.MeshDepthMaterial({depthWrite:false,colorWrite:false});
 return {ground,water,waveTime};
}
