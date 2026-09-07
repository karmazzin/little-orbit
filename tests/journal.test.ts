import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clearProgress} from '../src/progress-reset.ts';
import {journalFindings,journalWorld,journalStories} from '../src/journal.ts';
import {journeyEntries,type JourneySnapshot} from '../src/journey.ts';
import {initialStory,reduceStory,restoreStory,LETTERS} from '../src/story.ts';
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
test('only acquired notes appear and completed stories move out of active list',()=>{const s=fresh();s.story.phase='active';s.adventures.meteor='complete';s.adventures.bottles=['bottle-1'];s.exploration.places=['arch'];s.azure.map=true;s.frontier!.pages=['old-station'];const rows=journeyEntries(s);assert.ok(journalStories(rows,'active').some(r=>r.id==='letters'));assert.ok(!journalStories(rows,'active').some(r=>r.id==='meteor'));assert.deepEqual(journalStories(rows,'complete').map(r=>r.id),['meteor']);const notes=journalFindings(s,false);assert.ok(notes.some(n=>n.id==='place:arch'));for(const id of ['bottle:bottle-1','azure:old-shelter','frontier:old-station'])assert.ok(notes.some(n=>n.id===id),id);assert.ok(!notes.some(n=>n.id==='place:grove'||n.id==='camp'||n.id==='bottle:bottle-2'));});
test('unstarted catalog includes unknown missions and removes them on starting',()=>{
 const s=fresh();
 const available=journeyEntries(s,'unstarted');
 assert.equal(available.length,12);
 assert.ok(available.every(r=>r.status==='available'&&r.group==='story'));
 assert.match(available.find(r=>r.id==='meteor')!.next,/Ад/);
 assert.match(available.find(r=>r.id==='diary')!.next,/облож/);
 s.known=['meteor'];
 assert.ok(journeyEntries(s,'unstarted').some(r=>r.id==='meteor'));
 s.adventures.meteor='searching';s.frontier!.wind='accepted';
 assert.ok(!journeyEntries(s,'unstarted').some(r=>['meteor','wind'].includes(r.id)));
 s.adventures.meteor='complete';
 assert.ok(!journeyEntries(s,'unstarted').some(r=>r.id==='meteor'));
});

test('finished letters stay only in completed journal after saving and reloading',()=>{
 const s=fresh();
 s.story=reduceStory(s.story,{type:'accept'});
 for(const letter of LETTERS)s.story=reduceStory(s.story,{type:'collect',id:letter.id});
 s.story=reduceStory(s.story,{type:'finish'});
 s.story=restoreStory(JSON.stringify(s.story));
 assert.equal(s.story.phase,'complete');
 assert.ok(!journeyEntries(s,'unstarted').some(r=>r.id==='letters'));
 assert.ok(!journalStories(journeyEntries(s),'active').some(r=>r.id==='letters'));
 assert.ok(journalStories(journeyEntries(s),'complete').some(r=>r.id==='letters'));
});

test('world displays only drawn postcards including the original album without duplicates',()=>{
 const s=fresh();s.content.cards=['arch','grove','lookout'];s.content.sketches=['cave','traveler','lookout'];s.exploration.places=['lookout'];s.exploration.nightMeeting=true;s.story.letters=['bridge'];
 assert.deepEqual(journalWorld(s).map(n=>n.card),['arch','grove','lookout','cave','traveler']);
 assert.ok(journalWorld(s).every(n=>n.card));
 assert.ok(journalFindings(s,false).some(n=>n.id==='letter:bridge'));
 assert.ok(!journalFindings(s,false).some(n=>n.card));
 const empty=fresh();empty.exploration.places=['lookout'];assert.deepEqual(journalWorld(empty),[]);
});
