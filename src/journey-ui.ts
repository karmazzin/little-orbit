import {JOURNEY_STATUS,journeySummary,resolveJourneySelection,type JourneyEntry} from './journey.ts';
export function createJourneyUI(h:{focusControls:()=>void;openJournal:()=>void;load:()=>string|null;save:(id:string)=>void}){
 const get=(id:string)=>document.getElementById(id)!;
 const summary=document.createElement('p');summary.id='journey-summary';
 const label=document.createElement('label');label.htmlFor='journey-select';label.textContent='Отслеживать';label.className='journey-label';
 const select=document.createElement('select');select.id='journey-select';select.onfocus=h.focusControls;
 const status=document.createElement('span');status.id='journey-status';
 get('quest-title').before(summary,label,select,status);
 const all=document.createElement('button');all.id='journey-all';all.textContent='Мои истории и находки';all.onclick=h.openJournal;get('quest-count').after(all);
 const card=get('quest-title').closest<HTMLElement>('.quest-card')!;
 const top=card.querySelector<HTMLElement>('.quest-top')!;
 const details=document.createElement('div');details.id='journey-details';
 for(const child of Array.from(card.children))if(child!==top)details.append(child);
 card.append(details);
 const toggle=document.createElement('button');toggle.id='journey-collapse';toggle.type='button';toggle.setAttribute('aria-controls',details.id);
 top.querySelector('span')!.replaceWith(toggle);
 let compactTitle='ТВОЁ ПУТЕШЕСТВИЕ',idleSeconds=0,lastUpdate=performance.now(),hovered=false;
 card.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')hovered=true;});
 card.addEventListener('pointerleave',()=>{hovered=false;idleSeconds=0;});
 for(const event of ['pointerdown','keydown','input','change'])card.addEventListener(event,()=>{idleSeconds=0;});
 let collapsed=false;try{collapsed=localStorage.getItem('little-orbit-journey-collapsed-v1')==='true';}catch{}
 function setCollapsed(){details.hidden=collapsed;card.classList.toggle('is-collapsed',collapsed);toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Развернуть путешествие':'Свернуть путешествие');toggle.textContent=(collapsed?'▸  '+compactTitle:'▾  ТВОЁ ПУТЕШЕСТВИЕ');toggle.title=collapsed?'Развернуть путешествие':'Свернуть путешествие';}
 toggle.onclick=()=>{h.focusControls();collapsed=!collapsed;idleSeconds=0;setCollapsed();try{localStorage.setItem('little-orbit-journey-collapsed-v1',String(collapsed));}catch{}};
 setCollapsed();
 let selected:string|null=null;try{selected=h.load();}catch{}
 let rows:JourneyEntry[]=[],key='';
 function track(id:string){selected=id;try{h.save(id);}catch{}render();}
 select.onchange=()=>track(select.value);
 function render(){
  selected=resolveJourneySelection(rows,selected);const active=rows.find(r=>r.id===selected);
  compactTitle=active?.title??'ТВОЁ ПУТЕШЕСТВИЕ';setCollapsed();
  select.hidden=!active;label.hidden=!active;status.hidden=!active;
  if(!active){summary.textContent='Твоё путешествие начинается';select.replaceChildren();status.textContent='';get('quest-title').textContent='Пока нет полученных историй';get('quest-summary').textContent='Гуляй, знакомься с жителями и исследуй мир. Полученные истории и находки появятся здесь.';get('quest-count').textContent='';get('progress-fill').style.width='0%';get('progress-fill').parentElement!.hidden=true;return;}
  const stats=journeySummary(rows);summary.textContent=`Получено историй: ${stats.total} · Завершено: ${stats.complete} · В процессе: ${stats.active}`;
  select.replaceChildren();for(const group of ['story','discovery','repeat'] as const){if(!rows.some(r=>r.group===group))continue;const optgroup=document.createElement('optgroup');optgroup.label=group==='story'?'Истории':group==='discovery'?'Открытия':'Повторяемые занятия';for(const row of rows.filter(r=>r.group===group)){const option=document.createElement('option');option.value=row.id;option.textContent=`${row.status==='complete'?'✓ ':''}${row.title} · ${JOURNEY_STATUS[row.status]}`;optgroup.append(option);}select.append(optgroup);}select.value=selected;
  status.textContent=JOURNEY_STATUS[active.status];status.dataset.status=active.status;
  get('quest-title').textContent=active.title;get('quest-summary').textContent=active.next;
  get('quest-count').textContent=active.total?`Этапы: ${active.done} / ${active.total}${active.status==='ready'?' · Осталось завершить на месте':''}`:active.group==='discovery'?`Открыто мест: ${active.done}`:'Свободное занятие';
  get('progress-fill').style.width=active.total?`${active.done/active.total*100}%`:'0%';get('progress-fill').parentElement!.hidden=!active.total;

 }
 return {track,get selected(){return selected??'';},reset(){selected=null;key='';},update(next:JourneyEntry[]){
  const now=performance.now(),elapsed=Math.min((now-lastUpdate)/1000,.25);lastUpdate=now;
  if(!collapsed&&document.body.classList.contains('playing')&&!document.body.classList.contains('overview')&&!document.hidden&&!document.querySelector('dialog[open]')&&!hovered&&!details.contains(document.activeElement)){
   idleSeconds+=elapsed;if(idleSeconds>=10){collapsed=true;setCollapsed();}
  }
  rows=next;const nextKey=JSON.stringify(rows);if(nextKey===key)return;key=nextKey;render();}};
}
