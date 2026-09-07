import {sketchPlace} from './sketch-places.ts';
import type {JourneyEntry,JourneySnapshot} from '../../journey.ts';
import {ALL_LANDMARKS} from './landmarks.ts';
import {LETTERS} from '../../story.ts';
import {CLUE_TEXT,IRIS_ENDING} from './content.ts';
import {BOTTLE_LETTERS,TRAVELER_TALES,METEOR_END,BELL_END,CAVE_END} from './adventure-text.ts';
import {AZURE_PAGES,azureEnding} from './azure-story.ts';
import {PAGES,WIND_END,DIARY_END} from './frontier-ui.ts';
import {CAMP} from './discoveries.ts';
export type JournalFinding={id:string;title:string;text:string;card?:string};
export function journalFindings(s:JourneySnapshot,campFound:boolean):JournalFinding[]{
 const notes:JournalFinding[]=[];
 const add=(id:string,title:string,text:string,card?:string)=>notes.push({id,title,text,card});
 for(const place of ALL_LANDMARKS)if(s.exploration.places.includes(place.id))add('place:'+place.id,place.name,place.text);
 if(s.exploration.nightMeeting)add('ada-night','Вечер у телескопа','Ночная встреча с Адой состоялась. Пять миров и одна будущая дорога.');

 for(const letter of LETTERS)if(s.story.letters.includes(letter.id))add('letter:'+letter.id,letter.name,letter.hint);
 if(campFound)add('camp','Записка астронома',CAMP.text);
 for(const id of s.content.clues)if(id!=='camp'&&CLUE_TEXT[id])add('clue:'+id,'Знаки · '+(ALL_LANDMARKS.find(p=>p.id===id)?.name??id),CLUE_TEXT[id]);
 for(const id of s.adventures.bottles){const p=BOTTLE_LETTERS[id];if(p)add('bottle:'+id,p.title,p.text);}
 for(const id of s.adventures.tales){const p=TRAVELER_TALES[id];if(p)add('tale:'+id,p.title,p.text);}
 for(const [id,p] of Object.entries(AZURE_PAGES))if(id==='old-shelter'?s.azure.map:id==='azure-cove'?s.azure.bottle:s.azure.marks.includes(id))add('azure:'+id,p.title,p.text);
 for(const id of s.frontier?.pages??[])if(PAGES[id])add('frontier:'+id,'Страница · '+(ALL_LANDMARKS.find(p=>p.id===id)?.name??id),PAGES[id]);

 return notes;
}
export function journalWorld(s:JourneySnapshot):JournalFinding[]{
 const notes:JournalFinding[]=[];
 for(const id of new Set([...s.content.cards,...s.content.sketches??[]])){const p=sketchPlace(id);if(p)notes.push({id:'card:'+id,title:p.name,text:'',card:id});}
 return notes;
}
export function journalStories(rows:JourneyEntry[],section:'active'|'complete'){
 return rows.filter(r=>r.group!=='discovery'&&(section==='complete'?r.status==='complete':r.status!=='complete'));
}
export function journalEnding(id:string,s:JourneySnapshot):string|undefined{
 switch(id){
  case 'meteor':return s.adventures.meteor==='complete'?METEOR_END:undefined;
  case 'bell':return s.adventures.bell==='complete'?BELL_END:undefined;
  case 'cave':return s.adventures.cave?CAVE_END:undefined;
  case 'iris':return s.content.iris==='complete'?IRIS_ENDING:undefined;
  case 'azure':return azureEnding(s.azure)??undefined;
  case 'wind':return s.frontier?.wind==='complete'?WIND_END:undefined;
  case 'diary':return s.frontier?.diary==='complete'?DIARY_END:undefined;
 }
}
