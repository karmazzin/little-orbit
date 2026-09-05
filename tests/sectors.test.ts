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
