import {test} from 'node:test';import assert from 'node:assert/strict';
import {initialFrontier,reduceFrontier,restoreFrontier,FRONTIER_PLACES} from '../src/frontier.ts';import {sample} from '../src/terrain.ts';
test('remote quests require receiving them, collecting their objects and returning to Savva',()=>{
 let s=initialFrontier();assert.equal(reduceFrontier(s,{type:'page',id:'old-station'}),s);assert.equal(reduceFrontier(s,{type:'finish-wind'}),s);
 for(const type of ['accept-wind','take-cord','repair-wind','finish-wind'] as const)s=reduceFrontier(s,{type});assert.equal(s.wind,'complete');
 s=reduceFrontier(s,{type:'start-diary'});s=reduceFrontier(s,{type:'page',id:'old-station'});assert.equal(reduceFrontier(s,{type:'finish-diary'}),s);s=reduceFrontier(s,{type:'page',id:'weather-ridge'});s=reduceFrontier(s,{type:'finish-diary'});assert.equal(s.diary,'complete');assert.deepEqual(restoreFrontier(JSON.stringify(s)),s);
});
test('remote places are dry and corrupted quest completion is rejected',()=>{for(const p of FRONTIER_PLACES)assert.equal(sample(p.up).waterDepth,0,p.name);assert.equal(restoreFrontier('{"version":1,"diary":"complete","pages":[]}').diary,'searching');});

test('dialogue requires acceptance and proximity; found pages persist and can be reread',async()=>{
 const {createFrontierUI}=await import('../src/frontier-ui.ts');let near=true,raw:string|null=null;const actions=new Map<string,()=>void>();
 const ui=createFrontierUI({near:()=>near,nearSavva:()=>near,dialog:()=>actions.clear(),choice:(label,fn)=>actions.set(label,fn),journal:()=>{},toast:()=>{},load:()=>raw,save:s=>{raw=s;}});
 ui.talk();assert.equal(ui.state.wind,'new');const accept=actions.get('Помочь восстановить ветровой сигнал')!;near=false;accept();assert.equal(ui.state.wind,'new');near=true;accept();assert.equal(ui.state.wind,'accepted');
 ui.choices('old-station');actions.get('Взять прочный шнур')!();ui.choices('wind-saddle');actions.get('Подвесить медные трубки')!();assert.equal(ui.state.wind,'repaired');ui.talk();actions.get('Сигнал снова работает')!();assert.equal(ui.state.wind,'complete');
 assert.equal(ui.discover('old-station'),false);assert.equal(ui.discover('lost-cove'),true);ui.discover('old-station');ui.discover('weather-ridge');ui.talk();actions.get('Показать найденный дневник')!();assert.equal(ui.state.diary,'complete');assert.deepEqual(restoreFrontier(raw),ui.state);const saved=raw;ui.readPage('old-station');assert.equal(raw,saved);
});
