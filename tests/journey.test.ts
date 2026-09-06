import {test} from 'node:test';import assert from 'node:assert/strict';
import {journeyEntries,journeySummary,type JourneySnapshot} from '../src/journey.ts';
import {initialStory} from '../src/story.ts';import {initialContent} from '../src/content.ts';import {initialAdventures} from '../src/adventures.ts';import {initialExploration} from '../src/landmarks.ts';import {initialAzureStory} from '../src/azure-story.ts';
const snapshot=():JourneySnapshot=>({story:initialStory(),content:initialContent(),adventures:initialAdventures(),exploration:initialExploration(),azure:initialAzureStory(),seconds:0,beaconLit:false,noahTelling:false});
test('unreceived stories and activities never appear or contribute to totals',()=>{const rows=journeyEntries(snapshot());assert.deepEqual(rows,[]);assert.equal(journeySummary(rows).total,0);});
test('collected items and observations still require their hand-in, while early beacon remains usable',()=>{
 const s=snapshot();s.story={phase:'active',letters:['bridge','lake','hill']};s.content={...s.content,postcards:'active',cards:['arch','grove','lookout'],iris:'observed',clues:['camp','arch','grove']};s.adventures.meteor='sample';s.adventures.bell='found';s.adventures.tracks=2;s.azure={version:1,map:true,marks:['azure-pass','birch-trail'],bottle:true,entry:null,complete:false};s.beaconLit=true;
 const rows=journeyEntries(s);for(const id of ['letters','postcards','iris','meteor','bell','azure']){const r=rows.find(r=>r.id===id)!;assert.equal(r.status,'ready',id);assert.ok(r.done<r.total,id);}assert.equal(journeySummary(rows).complete,0);
});
test('completed finite stories do not include optional meetings or repeatable fireside stories',()=>{
 const s=snapshot();s.known=['fireside'];s.story.phase='complete';s.content.postcards='complete';s.content.iris='complete';s.adventures={...s.adventures,meteor:'complete',bell:'complete',cave:true,runes:3,bottles:['bottle-1','bottle-2','bottle-3'],tales:['amber','azure','ruby'],festival:true};s.azure={version:1,map:true,marks:['azure-pass','birch-trail'],bottle:true,entry:'home',complete:true};const rows=journeyEntries(s);assert.equal(journeySummary(rows).complete,10);assert.equal(rows.find(r=>r.id==='fireside')!.group,'repeat');for(const r of rows.filter(r=>r.group==='story'))assert.equal(r.done,r.total);
});

test('manual tracking survives completion and invalid saved selections choose a useful task',async()=>{
 const {resolveJourneySelection}=await import('../src/journey.ts');const s=snapshot();s.adventures.meteor='sample';const rows=journeyEntries(s);assert.equal(resolveJourneySelection(rows,'azure'),'meteor');assert.equal(resolveJourneySelection(rows,'obsolete'),'meteor');s.adventures.meteor='complete';assert.equal(resolveJourneySelection(journeyEntries(s),'meteor'),'meteor');
});
test('festival distinguishes missing prerequisite stories from waiting for the evening',()=>{
 const s=snapshot();s.known=['festival'];assert.match(journeyEntries(s).find(r=>r.id==='festival')!.next,/ещё 2/);s.story.phase='complete';s.content.postcards='complete';const row=journeyEntries(s).find(r=>r.id==='festival')!;assert.ok(!row.next.includes('ещё 2'));assert.ok(['ready','waiting'].includes(row.status));
});

test('the Azure story counts toward the same two-story festival requirement shown in the tracker',()=>{
 const s=snapshot();s.known=['festival'];s.story.phase='complete';s.azure={version:1,map:true,marks:['azure-pass','birch-trail'],bottle:true,entry:'home',complete:true};const row=journeyEntries(s).find(r=>r.id==='festival')!;assert.ok(!row.next.includes('ещё'),row.next);
});

test('eligibility and clock do not reveal unencountered activities',()=>{
 const s=snapshot();s.story.phase='complete';s.content.postcards='complete';s.seconds=900;s.noahTelling=true;
 const ids=journeyEntries(s).map(r=>r.id);for(const id of ['festival','fireside','ada-night'])assert.ok(!ids.includes(id));
 s.known=['festival','fireside','ada-night','cave','tales'];const known=journeyEntries(s).map(r=>r.id);for(const id of s.known)assert.ok(known.includes(id));
});
test('existing progress acquires stories without explicit known records',()=>{
 const s=snapshot();s.adventures.runes=1;s.adventures.bottles=['bottle-1'];s.adventures.tales=['amber'];s.azure.marks=['azure-pass'];s.exploration.nightMeeting=true;
 const ids=journeyEntries(s).map(r=>r.id);for(const id of ['cave','bottles','tales','azure','ada-night'])assert.ok(ids.includes(id));
});
test('exploration lists only discovered places without a world total',()=>{
 const s=snapshot();s.exploration.places=['arch'];const place=journeyEntries(s).find(r=>r.id==='places')!;
 assert.equal(place.done,1);assert.equal(place.total,0);assert.ok(!place.next.includes('Ещё не открыты'));assert.ok(!place.next.includes('Звёздный'));assert.equal(journeySummary(journeyEntries(s)).total,0);
});

test('mountain quests stay hidden until accepted or found and retain hand-in objectives',async()=>{
 const {initialFrontier}=await import('../src/frontier.ts');const s=snapshot();s.frontier=initialFrontier();assert.deepEqual(journeyEntries(s),[]);
 s.frontier.wind='accepted';assert.deepEqual(journeyEntries(s).map(r=>r.id),['wind']);
 s.frontier.wind='repaired';s.frontier.diary='searching';s.frontier.pages=['old-station','weather-ridge'];
 for(const r of journeyEntries(s)){assert.equal(r.status,'ready');assert.ok(r.done<r.total);}
 s.frontier.wind='complete';s.frontier.diary='complete';assert.equal(journeySummary(journeyEntries(s)).complete,2);
});
