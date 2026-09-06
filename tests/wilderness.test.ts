import {test} from 'node:test';import assert from 'node:assert/strict';
import {WILDERNESS,TRAIL} from '../src/wilderness.ts';
import {sample,RADIUS} from '../src/terrain.ts';
import {ResidentNavigation} from '../src/resident-life.ts';
test('six remote discoveries form a dry walkable route from camp to the Azure coast',()=>{
 assert.equal(WILDERNESS.length,6);assert.equal(new Set(WILDERNESS.map(p=>p.id)).size,6);
 const nav=new ResidentNavigation([]);
 for(const p of WILDERNESS){assert.equal(sample(p.up).waterDepth,0,p.name);assert.ok(p.up.y<.3,p.name);}
 for(let i=1;i<TRAIL.length;i++)assert.ok(nav.safeEdge(TRAIL[i-1],TRAIL[i]),`trail segment ${i}`);
 for(const p of WILDERNESS)assert.ok(TRAIL.some(up=>up.distanceTo(p.up)*RADIUS<.1),p.name);
});

test('built trail corridors and rest approaches remain clear of all world obstacles',async()=>{
 const {Scene}=await import('three'),{buildWorld}=await import('../src/view.ts');const world=buildWorld(new Scene());
 const nav=new ResidentNavigation(world.obstacles.map(o=>({...o,radius:o.radius+.06})));
 for(let i=1;i<TRAIL.length;i++){
  const a=i===1?TRAIL[0].clone().lerp(TRAIL[1],.12).normalize():TRAIL[i-1];
  assert.ok(nav.safeEdge(a,TRAIL[i]),`built segment ${i}`);
 }
 for(const p of world.wilderness.places)assert.ok(nav.clear(p.inspectUp),p.name);
});

test('the cove has a gentle approach to a working swimming entry',async()=>{
 const {azureUp}=await import('../src/wilderness.ts'),{createPlayer,movementAction}=await import('../src/simulation.ts');const nav=new ResidentNavigation([]);
 const shore=azureUp(30.5,23);assert.ok(nav.safeEdge(WILDERNESS.find(p=>p.id==='azure-cove')!.up,shore));assert.equal(movementAction(createPlayer(shore),[]),'swim');
});
test('remote discoveries survive saves without becoming postcard quest destinations',async()=>{
 const {initialExploration,discoverPlace,restoreExploration}=await import('../src/landmarks.ts');const {initialContent,reduceContent}=await import('../src/content.ts');
 let s=initialExploration();for(const p of WILDERNESS)s=discoverPlace(s,p.id);assert.deepEqual(restoreExploration(JSON.stringify(s)),s);
 let album=reduceContent(initialContent(),{type:'accept'});for(const p of WILDERNESS)album=reduceContent(album,{type:'card',id:p.id});assert.equal(album.cards.length,0);
});

test('remote logs can be reached from behind, walking around their ends',async()=>{
 const {Scene}=await import('three'),{buildWorld}=await import('../src/view.ts');const {createPlayer}=await import('../src/simulation.ts');const {createFireSeat,beginFireSeat,advanceFireSeat}=await import('../src/campfire-seat.ts');const world=buildWorld(new Scene()),nav=new ResidentNavigation(world.obstacles.map(o=>({...o,radius:o.radius+.06})));
 for(const site of world.wilderness.places.filter(p=>p.restUp&&!p.climbHeight)){
  const start=site.restUp!.clone().addScaledVector(site.restFacing,-2.5/RADIUS).normalize();assert.ok(nav.clear(start));const p=createPlayer(start),seat=createFireSeat();assert.ok(beginFireSeat(seat,p,true,site.restUp!));
  for(let i=0;i<900&&seat.phase!=='seated';i++)advanceFireSeat(seat,p,nav,world.obstacles,1/60,true,site.restUp!);
  assert.equal(seat.phase,'seated',site.name);
 }
});
