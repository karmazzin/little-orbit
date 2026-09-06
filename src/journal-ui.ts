import {JOURNEY_STATUS,type JourneyEntry,type JourneySnapshot} from './journey.ts';
import {journalFindings,journalStories,journalEnding} from './journal.ts';
import {postcardMarkup} from './postcards.ts';
export function createJournalUI(host:{track:(id:string)=>void}){
 const body=document.getElementById('journal-body')!;
 const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-journal-section]'));
 let section='active',rows:JourneyEntry[]=[],snapshot:JourneySnapshot,selected='',campFound=false;
 const expanded=new Set<string>();
 function text(value:string){const p=document.createElement('p');p.textContent=value;return p;}
 function disclosure(id:string,title:string,content:string,card?:string){
  const details=document.createElement('details');details.className='journal-entry';details.open=expanded.has(id);
  const summary=document.createElement('summary');summary.textContent=title;details.append(summary);
  details.append(text(content));
  if(card){const art=document.createElement('div');art.innerHTML=postcardMarkup(card);details.append(art);}
  details.ontoggle=()=>{if(details.isConnected){if(details.open)expanded.add(id);else expanded.delete(id);}};
  return details;
 }
 function render(){
  const findings=journalFindings(snapshot,campFound),active=journalStories(rows,'active'),complete=journalStories(rows,'complete');
  const counts:Record<string,number>={active:active.length,findings:findings.length,complete:complete.length};
  const labels:Record<string,string>={active:'В процессе',findings:'Находки',complete:'Завершённые'};
  for(const b of buttons){const id=b.dataset.journalSection!;b.textContent=`${labels[id]} · ${counts[id]}`;b.setAttribute('aria-pressed',String(section===id));}
  body.setAttribute('aria-label',labels[section]);body.replaceChildren();
  if(!counts[section]){body.append(text(section==='active'?'Пока нет начатых историй. Поговори с Мирой у почтового домика или отправляйся исследовать долину.':section==='findings'?'Здесь появятся открытые места, найденные записи и твои открытки.': 'Здесь будут храниться завершённые истории.'));return;}
  if(section==='findings'){body.append(text('Открой запись, чтобы перечитать её.'));for(const f of findings)body.append(disclosure(f.id,f.title,f.text,f.card));return;}
  for(const row of section==='active'?active:complete){
   if(section==='complete'){body.append(disclosure('ending:'+row.id,row.title,journalEnding(row.id,snapshot)??row.next));continue;}
   const article=document.createElement('article');article.className='journey-row';article.dataset.journeyId=row.id;article.tabIndex=-1;
   const title=document.createElement('h3');title.textContent=row.title;
   const status=document.createElement('small');status.textContent=JOURNEY_STATUS[row.status]+(row.total?` · ${row.done} / ${row.total}`:'');
   const button=document.createElement('button');button.textContent=row.id===selected?'✓ Отслеживается':'Отслеживать';button.disabled=row.id===selected;
   button.onclick=()=>{selected=row.id;host.track(row.id);render();body.querySelector<HTMLElement>(`[data-journey-id="${row.id}"]`)?.focus({preventScroll:true});};
   article.append(title,status,text(row.next),button);body.append(article);
  }
 }
 for(const button of buttons)button.onclick=()=>{section=button.dataset.journalSection!;render();body.scrollTop=0;};
 return {update(s:JourneySnapshot,r:JourneyEntry[],tracked:string,camp:boolean){snapshot=s;rows=r;selected=tracked;campFound=camp;render();},reset(){section='active';expanded.clear();}};
}
