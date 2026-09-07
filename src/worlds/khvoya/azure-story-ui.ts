import {AZURE_STORY_KEY,AZURE_PAGES,AZURE_ENTRIES,azureReady,azureEnding,azureObjective,restoreAzureStory,reduceAzureStory,type AzureStory,type AzureAction,type AzureEntry} from './azure-story.ts';
type Host={near:(id:string)=>boolean;lit:()=>boolean;dialog:(title:string,text:string)=>void;choice:(label:string,action:()=>void)=>void;journal:(s:AzureStory,objective:string)=>void;toast:(text:string)=>void;load:()=>string|null;save:(raw:string)=>void};
export function createAzureStoryUI(h:Host){
 let state:AzureStory;try{state=restoreAzureStory(h.load());}catch{state=restoreAzureStory(null);}
 function refresh(){h.journal(state,azureObjective(state,h.lit()));}
 function change(action:AzureAction){const next=reduceAzureStory(state,action);if(next===state)return;state=next;try{h.save(JSON.stringify(state));}catch{h.toast('История сохранится только до закрытия вкладки.');}refresh();}
 function hasPage(id:string){return id==='old-shelter'?state.map:id==='azure-cove'?state.bottle:state.marks.includes(id);}
 function read(id:string){const page=AZURE_PAGES[id];if(!page||!hasPage(id))return;h.dialog(page.title,page.text);h.choice('Следующий шаг',()=>h.dialog('Свет для следующего',azureObjective(state,h.lit())));}
 function unread(id:string){return !!AZURE_PAGES[id]&&!hasPage(id);}
 function discover(id:string,prefix=''){if(!unread(id)||!h.near(id))return false;change({type:'read',id});const page=AZURE_PAGES[id];h.dialog(page.title,(prefix?prefix+'\n\n':'')+page.text);h.choice('Следующий шаг',()=>h.dialog('Свет для следующего',azureObjective(state,h.lit())));return true;}
 function ending(){const text=azureEnding(state);if(text)h.dialog('Свет для следующего · Завершено',text);}
 function write(){
  if(!h.near('azure-beacon')||!h.lit()||!azureReady(state)||state.complete)return;
  h.dialog('Чистая страница','Фонарь горит. У лестницы лежит путевой журнал, открытый на чистой странице. Чужая карта довела тебя сюда. Теперь можно оставить несколько слов тому, кто придёт после. Что ты напишешь?');
  for(const [entry,text] of Object.entries(AZURE_ENTRIES))h.choice('«'+text+'»',()=>{
   if(!h.near('azure-beacon')||!h.lit()||state.complete)return;
   change({type:'finish',entry:entry as AzureEntry,lit:h.lit()});ending();
  });
 }
 function choices(id:string){
  const page=AZURE_PAGES[id];
  if(page)h.choice(hasPage(id)?'Перечитать: '+page.title:page.action,()=>{if(!h.near(id))return;const wasKnown=hasPage(id);change({type:'read',id});read(id);if(!wasKnown)h.toast('Свет для следующего · Запись добавлена в журнал');});
  if(id==='azure-beacon'){
   if(state.complete)h.choice('Перечитать свою запись',ending);
   else if(azureReady(state)&&h.lit())h.choice('Оставить запись для следующего путника',write);
   else if(state.map)h.choice('Свериться с картой пути',()=>h.dialog('Свет для следующего',azureObjective(state,h.lit())));
  }
 }
 refresh();return {get state(){return state;},reset(){state=restoreAzureStory(null);refresh();},choices,read,ending,refresh,unread,discover};
}
export {AZURE_STORY_KEY};
