import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Smaller than the minimum solid surface, so a visible shore is never culled.
const OCCLUDER_RADIUS=62;
export function hiddenByPlanet(camera:T.Vector3,bounds:T.Sphere){
 const d=camera.length(),relative=bounds.center.clone().sub(camera),distance=relative.length();
 if(d<=OCCLUDER_RADIUS||distance<=bounds.radius)return false;
 const angle=relative.angleTo(camera.clone().negate());
 return distance-bounds.radius>Math.sqrt(d*d-OCCLUDER_RADIUS**2)
  &&angle+Math.asin(bounds.radius/distance)<Math.asin(OCCLUDER_RADIUS/d)-.15/d;
}
export function hiddenFromSun(direction:T.Vector3,bounds:T.Sphere){
 const along=bounds.center.dot(direction);
 const perpendicular=bounds.center.clone().addScaledVector(direction,-along).length();
 // Parallel sunlight: the complete bounding sphere must lie in the planet's cylinder of shadow.
 return along+bounds.radius<0&&perpendicular+bounds.radius<OCCLUDER_RADIUS-.15;
}
function sectorKey(position:T.Vector3){
 const v=position.toArray(),a=v.map(Math.abs);const axis=a.indexOf(Math.max(...a));
 const cell=(value:number)=>Math.min(2,Math.floor((value/a[axis]+1)*1.5));
 return `${axis}:${v[axis]>=0?1:0}:${cell(v[(axis+1)%3])}:${cell(v[(axis+2)%3])}`;
}
export function buildSectors(root:T.Group){
 root.updateMatrixWorld(true);const batches=new Map<string,{near:T.BufferGeometry[];far:T.BufferGeometry[]}>();let sourceMeshes=0;
 function bake(input:T.BufferGeometry,o:T.Mesh){
  const source=input.index?input.toNonIndexed():input.clone();source.applyMatrix4(o.matrixWorld);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',source.getAttribute('position').clone());geometry.setAttribute('normal',source.getAttribute('normal').clone());
  const count=geometry.getAttribute('position').count,color=(o.material as T.MeshStandardMaterial).color,colors=new Float32Array(count*3);
  for(let i=0;i<count;i++)color.toArray(colors,i*3);
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));source.dispose();return geometry;
 }
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;sourceMeshes++;
  const key=sectorKey(o.getWorldPosition(new T.Vector3())),list=batches.get(key)??{near:[],far:[]};
  list.near.push(bake(o.geometry,o));list.far.push(bake(o.userData.farGeometry??o.geometry,o));batches.set(key,list);
 });
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.92,flatShading:true});
 const group=new T.Group();group.name='Static terrain sectors';
 const sectors=Array.from(batches,([key,geos])=>{
  const geometry=mergeGeometries(geos.near,false)!,farGeometry=mergeGeometries(geos.far,false)!;geometry.computeBoundingSphere();farGeometry.computeBoundingSphere();for(const g of [...geos.near,...geos.far])g.dispose();
  const mesh=new T.Mesh(geometry,material);mesh.name=`Sector ${key}`;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  return {mesh,nearGeometry:geometry,farGeometry,far:false,bounds:geometry.boundingSphere!.clone().union(farGeometry.boundingSphere!)};
 });
 root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();o.userData.farGeometry?.dispose();}});
 const stats={total:sectors.length,visible:sectors.length,far:0,sourceMeshes};
 return {group,sectors,stats,update(camera:T.Vector3,sunDirection:T.Vector3){
  // Keep any sector that may cast a sunlight shadow.
  stats.visible=0;stats.far=0;let changed=false;
  for(const sector of sectors){
   const distance=Math.max(0,camera.distanceTo(sector.bounds.center)-sector.bounds.radius),far=distance>(sector.far?65:80);
   if(far!==sector.far){sector.far=far;sector.mesh.geometry=far?sector.farGeometry:sector.nearGeometry;changed=true;}
   const visible=!(hiddenByPlanet(camera,sector.bounds)&&hiddenFromSun(sunDirection,sector.bounds));
   if(visible!==sector.mesh.visible)changed=true;sector.mesh.visible=visible;if(visible){stats.visible++;if(far)stats.far++;}
  }return changed;
 }};
}
