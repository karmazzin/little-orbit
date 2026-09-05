import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSky,solarState,DAY_SECONDS} from '../src/sky.ts';
function setup(){const scene=new T.Scene();scene.background=new T.Color();scene.fog=new T.FogExp2();const stars=new T.Points(new T.BufferGeometry(),new T.PointsMaterial());scene.add(stars);return {scene,sky:createSky(scene,stars),camera:new T.PerspectiveCamera()};}
test('shadow projection does not flip its axes when the sun crosses noon',()=>{
 const {scene,sky,camera}=setup(),directions:T.Vector3[]=[];
 for(const t of [DAY_SECONDS/2-.01,DAY_SECONDS/2+.01]){sky.update(t,camera,new T.Vector3(0,1,0),false);sky.syncSun(solarState(t).sunDirection);scene.updateMatrixWorld(true);sky.sun.shadow.updateMatrices(sky.sun);directions.push(new T.Vector3().setFromMatrixColumn(sky.sun.shadow.camera.matrixWorld,0));}
 assert.ok(directions[0].dot(directions[1])>.999,'shadow texel axes must remain continuous at noon');
});
test('sky updates keep the rendered sunlight direction frozen until its shadow is refreshed',()=>{
 const {sky,camera}=setup();sky.update(140,camera,new T.Vector3(0,1,0),false);
 assert.equal(typeof sky.syncSun,'function');sky.syncSun(solarState(140).sunDirection);const position=sky.sun.position.clone();
 sky.update(140.05,camera,new T.Vector3(0,1,0),false);assert.ok(sky.sun.position.equals(position));
 sky.syncSun(solarState(140.05).sunDirection);assert.ok(sky.sun.position.clone().normalize().distanceTo(solarState(140.05).sunDirection)<1e-10);
});
test('changing shadow quality releases both the depth and filtered render targets',async()=>{
 const {resizeShadow}=await import('../src/shadows.ts');const sun=new T.DirectionalLight();
 const map=new T.WebGLRenderTarget(512,512),pass=new T.WebGLRenderTarget(512,512);sun.shadow.map=map;sun.shadow.mapPass=pass;
 let disposed=0;map.addEventListener('dispose',()=>disposed++);pass.addEventListener('dispose',()=>disposed++);
 resizeShadow(sun,1024);assert.equal(disposed,2);assert.equal(sun.shadow.map,null);assert.equal(sun.shadow.mapPass,null);assert.equal(sun.shadow.mapSize.x,1024);
});
