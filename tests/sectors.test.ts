import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Sphere,Vector3} from 'three';
import {hiddenByPlanet,hiddenFromSun} from '../src/sectors.ts';
test('occlusion keeps front, horizon and elevated geometry and hides the far side',()=>{
 const camera=new Vector3(0,80,0);
 assert.equal(hiddenByPlanet(camera,new Sphere(new Vector3(0,-64,0),5)),true);
 for(const sphere of [new Sphere(new Vector3(0,64,0),5),new Sphere(new Vector3(40,50,0),5),new Sphere(new Vector3(100,-10,0),20)])assert.equal(hiddenByPlanet(camera,sphere),false);
 assert.equal(hiddenByPlanet(new Vector3(0,250,0),new Sphere(new Vector3(0,-64,0),5)),true);
 assert.equal(hiddenByPlanet(new Vector3(0,60,0),new Sphere(new Vector3(0,-64,0),5)),false);
});

test('directional shadows retain sectors crossing the cylindrical shadow boundary',()=>{
 const sun=new Vector3(0,1,0);
 assert.equal(hiddenFromSun(sun,new Sphere(new Vector3(0,-64,0),5)),true);
 assert.equal(hiddenFromSun(sun,new Sphere(new Vector3(60,-64,0),5)),false);
 assert.equal(hiddenFromSun(sun,new Sphere(new Vector3(0,64,0),5)),false);
});
test('distant decor switches to fewer triangles with hysteresis and restores nearby detail',async()=>{
 const T=await import('three'),{buildSectors}=await import('../src/sectors.ts');const root=new T.Group();
 const tree=new T.Mesh(new T.SphereGeometry(1,16,12),new T.MeshStandardMaterial({color:0x77aa55}));tree.position.set(0,70,0);tree.userData.farGeometry=new T.IcosahedronGeometry(1,0);root.add(tree);
 const decor=buildSectors(root),sun=new T.Vector3(0,1,0),mesh=decor.sectors[0].mesh;
 decor.update(new T.Vector3(0,100,0),sun);const full=mesh.geometry.getAttribute('position').count;
 decor.update(new T.Vector3(0,300,0),sun);const reduced=mesh.geometry.getAttribute('position').count;assert.ok(reduced<full/2);
 decor.update(new T.Vector3(0,144,0),sun);assert.equal(mesh.geometry.getAttribute('position').count,reduced);
 decor.update(new T.Vector3(0,125,0),sun);assert.equal(mesh.geometry.getAttribute('position').count,full);
});

test('static batching preserves procedural vertex colours',async()=>{
 const {Group,Mesh,BoxGeometry,Float32BufferAttribute,MeshStandardMaterial}=await import('three');
 const {buildSectors}=await import('../src/sectors.ts');
 const root=new Group(),g=new BoxGeometry(1,1,1),count=g.getAttribute('position').count;
 const colors=new Float32Array(count*3);for(let i=0;i<count;i++)colors.set([.2,.4,.6],i*3);
 g.setAttribute('color',new Float32BufferAttribute(colors,3));const mesh=new Mesh(g,new MeshStandardMaterial({vertexColors:true}));mesh.position.y=65;root.add(mesh);
 const decor=buildSectors(root),c=decor.sectors[0].nearGeometry.getAttribute('color');
 assert.ok(Math.abs(c.getX(0)-.2)<1e-6);assert.ok(Math.abs(c.getY(0)-.4)<1e-6);assert.ok(Math.abs(c.getZ(0)-.6)<1e-6);
});
