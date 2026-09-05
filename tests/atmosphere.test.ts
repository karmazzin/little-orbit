import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera,Vector3,BackSide} from 'three';
import {createAtmosphere} from '../src/atmosphere.ts';

test('atmosphere is one lightweight shell without shadows or depth writes',()=>{
 const scene=new Scene(),a=createAtmosphere(scene);
 assert.equal(scene.children.length,1);assert.equal(a.shell.castShadow,false);assert.equal(a.shell.receiveShadow,false);
 assert.equal(a.material.depthWrite,false);assert.equal(a.material.depthTest,true);assert.equal(a.material.side,BackSide);
 assert.ok(a.shell.geometry.index!.count/3<5000);
});
test('atmosphere appears only in space and fades when approaching the surface',()=>{
 const a=createAtmosphere(new Scene()),camera=new PerspectiveCamera();
 camera.position.set(0,200,0);a.updateView(camera,true);assert.equal(a.shell.visible,true);assert.equal(a.material.uniforms.strength.value,1);
 a.updateView(camera,false);assert.equal(a.shell.visible,false);
 camera.position.set(0,95,0);a.updateView(camera,true);assert.ok(a.material.uniforms.strength.value>0&&a.material.uniforms.strength.value<1);
 camera.position.set(0,70,0);a.updateView(camera,true);assert.equal(a.shell.visible,false);
});
test('atmosphere follows sun direction without retaining a mutable external reference',()=>{
 const a=createAtmosphere(new Scene()),direction=new Vector3(1,2,3);
 a.updateSun(direction);const expected=direction.clone().normalize();direction.negate();
 assert.ok(a.material.uniforms.sunDirection.value.distanceTo(expected)<1e-10);
});

test('the dense rim clears the terrain rather than disappearing underneath it',()=>{
 const a=createAtmosphere(new Scene());
 // Terrain base reaches radius 68: placing the density peak at 65 hid the visible rim.
 assert.ok(a.material.uniforms.surfaceRadius.value>=68);
 assert.ok(a.material.uniforms.outerRadius.value-a.material.uniforms.surfaceRadius.value>=6);
 assert.equal(a.shell.geometry.parameters.radius,a.material.uniforms.outerRadius.value);
});
