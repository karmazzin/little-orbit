import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clearProgress} from '../src/progress-reset.ts';
import {journalFindings,journalStories} from '../src/journal.ts';
import {journeyEntries,type JourneySnapshot} from '../src/journey.ts';
import {initialStory} from '../src/story.ts';
import {initialContent} from '../src/content.ts';
import {initialAdventures} from '../src/adventures.ts';
import {initialExploration} from '../src/landmarks.ts';
import {initialAzureStory} from '../src/azure-story.ts';
import {initialFrontier} from '../src/frontier.ts';
const fresh=():JourneySnapshot=>({story:initialStory(),content:initialContent(),adventures:initialAdventures(),exploration:initialExploration(),azure:initialAzureStory(),frontier:initialFrontier(),seconds:0,beaconLit:false,noahTelling:false});
const progress=['story','world','residents','exploration','camp','content','adventures','azure-story','azure-beacon','frontier','known-journeys','tracked-journey'].map(id=>`little-orbit-${id}-v1`);
function storage(){const data=new Map([...progress.map(k=>[k,'saved'] as const),['little-orbit-music-v1','music'],['little-orbit-journey-collapsed-v1','true'],['other-app','untouched']]);return {data,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};}
test('new game removes every saved story, finding and world snapshot, preserving preferences',()=>{const s=storage();clearProgress(s);for(const k of progress)assert.equal(s.getItem(k),null,k);assert.deepEqual([...s.data.values()],['music','true','untouched']);});
test('failed reset restores removed saves and reports failure',()=>{const s=storage(),before=[...s.data].sort();s.removeItem=k=>{if(k.includes('content'))throw Error('denied');s.data.delete(k);};assert.throws(()=>clearProgress(s));assert.deepEqual([...s.data].sort(),before);});
test('fresh journal contains no prewritten discoveries or stories',()=>{const s=fresh();assert.deepEqual(journalFindings(s,false),[]);assert.deepEqual(journalStories(journeyEntries(s),'active'),[]);});
test('only acquired notes appear and completed stories move out of active list',()=>{const s=fresh();s.story.phase='active';s.adventures.meteor='complete';s.adventures.bottles=['bottle-1'];s.exploration.places=['arch'];s.azure.map=true;s.frontier!.pages=['old-station'];const rows=journeyEntries(s);assert.ok(journalStories(rows,'active').some(r=>r.id==='letters'));assert.ok(!journalStories(rows,'active').some(r=>r.id==='meteor'));assert.deepEqual(journalStories(rows,'complete').map(r=>r.id),['meteor']);const notes=journalFindings(s,false);for(const id of ['place:arch','bottle:bottle-1','azure:old-shelter','frontier:old-station'])assert.ok(notes.some(n=>n.id===id),id);assert.ok(!notes.some(n=>n.id==='place:grove'||n.id==='camp'||n.id==='bottle:bottle-2'));});
