import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createScopedStorage} from '../src/runtime/storage.ts';
import {previewEnabled,selectPlayablePlanet,planetPreviewUrl,regularGameUrl,PLAYABLE_PLANETS} from '../src/worlds/catalog.ts';
import {clearProgress} from '../src/progress-reset.ts';

test('test URL bypasses the story gate only in development',()=>{
 assert.equal(previewEnabled('?planet=amber&test=1',true),true);
 assert.equal(previewEnabled('?planet=amber&test=1',false),false);
 assert.equal(previewEnabled('?test=0',true),false);
 assert.equal(selectPlayablePlanet('?planet=amber&test=1',false,false).id,'khvoya');
 assert.equal(selectPlayablePlanet('?planet=amber&test=1',false,true).id,'amber');
 assert.equal(selectPlayablePlanet('?planet=amber',false,true).id,'khvoya');
 assert.equal(selectPlayablePlanet('?planet=amber',true,false).id,'amber');
});
test('unknown and unimplemented planets fall back without importing a world',()=>{
 for(const id of ['azure','constructor','__proto__','bad'])assert.equal(selectPlayablePlanet('?planet='+id+'&test=1',true,true).id,'khvoya');
 assert.deepEqual(PLAYABLE_PLANETS.map(p=>p.id),['khvoya','amber']);
});
test('preview links retain deployment path, drop arrival marker, and exit to regular home',()=>{
 const base='http://127.0.0.1:5173/little-orbit/?arrival=1&planet=amber#x';
 const testUrl=new URL(planetPreviewUrl(base,'khvoya'));assert.equal(testUrl.pathname,'/little-orbit/');assert.equal(testUrl.searchParams.get('planet'),'khvoya');assert.equal(testUrl.searchParams.get('test'),'1');assert.equal(testUrl.searchParams.has('arrival'),false);
 const regular=new URL(regularGameUrl(testUrl.href));assert.equal(regular.search,'');assert.equal(regular.hash,'');
});
function storage(){const values=new Map<string,string>();return {values,getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}};}
test('preview reads and writes never use regular progress or preferences, even for reset',()=>{
 const raw=storage();raw.setItem('little-orbit-world-v1','original world');raw.setItem('little-orbit-travel-v1','original route');raw.setItem('little-orbit-music-v1','original music');
 const preview=createScopedStorage(()=>raw,'little-orbit-preview:');assert.equal(preview.getItem('little-orbit-world-v1'),null);
 preview.setItem('little-orbit-world-v1','test world');preview.setItem('little-orbit-travel-v1','test route');preview.setItem('little-orbit-music-v1','test music');
 clearProgress(preview);assert.equal(preview.getItem('little-orbit-world-v1'),null);assert.equal(preview.getItem('little-orbit-music-v1'),'test music');
 assert.equal(raw.getItem('little-orbit-world-v1'),'original world');assert.equal(raw.getItem('little-orbit-travel-v1'),'original route');assert.equal(raw.getItem('little-orbit-music-v1'),'original music');
});
test('regular storage preserves existing keys and propagates storage failures',()=>{
 const raw=storage(),regular=createScopedStorage(()=>raw,'');regular.setItem('little-orbit-world-v1','existing format');assert.equal(raw.getItem('little-orbit-world-v1'),'existing format');
 const blocked=createScopedStorage(()=>{throw new Error('storage blocked');},'test:');assert.throws(()=>blocked.getItem('world'),/storage blocked/);assert.throws(()=>blocked.setItem('world','data'),/storage blocked/);assert.throws(()=>blocked.removeItem('world'),/storage blocked/);
});
