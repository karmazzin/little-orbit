import {createAtmosphere} from '../src/atmosphere.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Mesh,Vector3,Matrix4} from 'three';
import {buildWorld} from '../src/view.ts';
import {normalAt,sample,RADIUS} from '../src/terrain.ts';
import {ADA_OBSERVATORY_UP} from '../src/landmarks.ts';
import {LETTERS,RESIDENTS} from '../src/story.ts';
const scene=new Scene(),world=buildWorld(scene);
test('world geometry is finite and static props are batched',()=>{
 let meshes=0;
 scene.traverse(object=>{if(object instanceof Mesh){meshes++;const positions=object.geometry.getAttribute('position');for(let i=0;i<positions.count;i++){assert.ok(Number.isFinite(positions.getX(i)));assert.ok(Number.isFinite(positions.getY(i)));assert.ok(Number.isFinite(positions.getZ(i)));}}});
 assert.ok(meshes<250,`Expected batching, got ${meshes} meshes`);
});
test('residents, letters and all landmark inspection points are reachable without swimming',()=>{
 const spacing=.7,minX=-203,minZ=-203,width=580,height=580;
 const passable=new Uint8Array(width*height),visited=new Uint8Array(width*height);
 const normals:Vector3[]=[],heights:number[]=[];
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const n=normalAt(minX+i*spacing,minZ+j*spacing),index=j*width+i;normals[index]=n;
  heights[index]=sample(n).height;
  passable[index]=Number(sample(n).waterDepth===0&&!world.obstacles.some(o=>n.distanceTo(o.up)*RADIUS<o.radius+.34));
 }
 const start=Math.round((4-minZ)/spacing)*width+Math.round((-4-minX)/spacing);assert.equal(passable[start],1);
 const queue=[start];visited[start]=1;
 for(let q=0;q<queue.length;q++){
  const index=queue[q],i=index%width,j=Math.floor(index/width);
  for(const [di,dj] of [[-1,0],[1,0],[0,-1],[0,1]]){
   const a=i+di,b=j+dj,k=b*width+a;if(a<0||a>=width||b<0||b>=height||visited[k]||!passable[k])continue;
   const distance=normals[index].distanceTo(normals[k])*RADIUS;
   if((heights[k]-heights[index])/distance>1.05)continue;
   visited[k]=1;queue.push(k);
  }
 }
 for(const target of [...[...RESIDENTS,...LETTERS].map(p=>({name:p.name,up:normalAt(p.x,p.z)})),...world.adventures.points.map(p=>({name:p.name,up:p.inspectUp})),...world.landmarks.places.map(p=>({name:p.name,up:p.inspectUp})),{name:'Ада у телескопа',up:ADA_OBSERVATORY_UP}]){
  const up=target.up;
  assert.ok(queue.some(i=>normals[i].distanceTo(up)*RADIUS<2.5),`${target.name} is unreachable`);
 }
});
test('bridge has an unblocked walking lane from bank to bank',()=>{
 for(let x=4;x<=17;x+=.1){const n=normalAt(x,0);assert.ok(sample(n).waterDepth<=.48);assert.ok(!world.obstacles.some(o=>n.distanceTo(o.up)*RADIUS<o.radius+.34));}
});
test('daytime sectors reduce rendered geometry and remain available for sunlight shadows',()=>{
 const camera=new Vector3(0,80,0),sun=new Vector3(0,1,0);
 world.decor.update(camera,sun);assert.ok(world.decor.stats.visible<world.decor.stats.total);
 let hidden=0;for(const s of world.decor.sectors)if(!s.mesh.visible)hidden+=s.mesh.geometry.getAttribute('position').count;
 assert.ok(hidden>0);assert.ok(world.decor.stats.sourceMeshes>world.decor.stats.total*50);
 world.decor.update(camera,sun.negate());
 for(const s of world.decor.sectors)if(s.bounds.center.y< -50)assert.equal(s.mesh.visible,true);
});
test('water receives soft shadows without writing opaque depth into their map',()=>{
 assert.equal(world.water.receiveShadow,true);assert.equal(world.water.castShadow,false);
 assert.ok(world.water.customDepthMaterial);assert.equal(world.water.customDepthMaterial.depthWrite,false);assert.equal(world.water.customDepthMaterial.colorWrite,false);
});

test('landmark plaques and the observatory resident position have clear collision space',()=>{
 for(const up of [...world.landmarks.places.map(p=>p.inspectUp),ADA_OBSERVATORY_UP]){
  assert.ok(sample(up).waterDepth<=.48);assert.ok(!world.obstacles.some(o=>o.up.distanceTo(up)*RADIUS<o.radius+.34));
 }
});

test('adventure props have visible geometry and all inspection points are dry and clear',()=>{
 for(const root of [world.adventures.traveler,world.adventures.festival]){
  let visibleGeometry=false;root.traverse(o=>{if(o instanceof Mesh&&o.geometry.getAttribute('position').count>30)visibleGeometry=true;});assert.ok(visibleGeometry);
 }
 for(const p of world.adventures.points){
  assert.ok(sample(p.inspectUp).waterDepth<=.48,`${p.id} is in deep water`);
  if(p.id==='meteor')continue; // The player inspects the rock from its edge.
  assert.ok(!world.obstacles.some(o=>o.up.distanceTo(p.inspectUp)*RADIUS<o.radius+.34),`${p.id} is inside a collider`);
 }
});

test('whole cloud puffs stay inside the atmosphere throughout their orbit',()=>{
 const atmosphere=createAtmosphere(new Scene()),outer=atmosphere.material.uniforms.outerRadius.value;
 const matrix=new Matrix4(),point=new Vector3(),vertices=world.clouds.geometry.getAttribute('position');
 for(const seconds of [0,150,700]){
  world.updateClouds(seconds);
  for(let i=0;i<world.clouds.count;i++){
   world.clouds.getMatrixAt(i,matrix);
   for(let j=0;j<vertices.count;j++)assert.ok(point.fromBufferAttribute(vertices,j).applyMatrix4(matrix).length()<outer-3,'cloud protrudes through the fading atmosphere');
  }
 }
});
