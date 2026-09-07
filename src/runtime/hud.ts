import {setupFullscreen} from '../fullscreen.ts';
import {QUALITY,type Quality} from '../performance.ts';
import type {MovementMode,Player} from '../simulation.ts';
import {clearMovementInput,type SessionState} from './session.ts';
const $=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;

export function createDebugPanel(onQuality:(quality:Quality)=>void){
 const panel=document.createElement('section');panel.id='debug-panel';panel.hidden=true;
 panel.innerHTML='<div class="debug-title">ОТЛАДКА <span>~ закрыть</span></div><pre id="debug-stats"></pre><label>Графика <select id="quality-select"><option value="economy">Экономная</option><option value="balanced" selected>Сбалансированная</option><option value="high">Высокая</option></select></label><small>CPU — отправка кадра, не время GPU.<br>FPS измеряется по реальным кадрам.</small>';document.body.append(panel);
 $('quality-select').onchange=()=>onQuality(($('quality-select') as HTMLSelectElement).value as Quality);
 return panel;
}

export function createDialogs(options:{session:SessionState;canvas:HTMLCanvasElement;releaseMouse:()=>void;refreshJournal:()=>void;closePanelsOnOpen:boolean}){
 const {session,canvas}=options;
 const dialogs=['conversation','journal','help','system-map-dialog','reset-dialog'].map(id=>$<HTMLDialogElement>(id));
 const isPaused=()=>dialogs.some(d=>d.open)||!$('time-panel').hidden||!$('mobile-actions').hidden;
 function closeMobileMenu(){$('mobile-actions').hidden=true;$('mobile-menu').setAttribute('aria-expanded','false');}
 function openDialog(id:string){
  if(id==='journal')options.refreshJournal();options.releaseMouse();clearMovementInput(session);session.drag=false;
  if(options.closePanelsOnOpen){$('time-panel').hidden=true;closeMobileMenu();}
  for(const d of dialogs)if(d.open)d.close();$<HTMLDialogElement>(id).showModal();
 }
 function bindCloseButtons(){
  for(const el of document.querySelectorAll<HTMLButtonElement>('[data-close]'))el.onclick=()=>{$<HTMLDialogElement>(el.dataset.close!).close();canvas.focus();};
  for(const d of dialogs)d.addEventListener('close',()=>{session.keys.clear();canvas.focus();});
 }
 return {dialogs,isPaused,openDialog,closeMobileMenu,bindCloseButtons};
}

export function updateMovementControl(paused:boolean,shoreAction:MovementMode|null,mode:MovementMode){
 const button=$<HTMLButtonElement>('movement-action');button.hidden=paused||!shoreAction;
 const text=shoreAction==='swim'?'Плавать':'На берег';button.setAttribute('aria-label',text);
 if(button.querySelector('span')!.textContent!==text)button.querySelector('span')!.textContent=text;
 $('movement-status').hidden=paused||mode!=='swim';$('touch-jump').hidden=mode==='swim';
}

type MobileOptions={session:SessionState;touchMode:boolean;player:()=>Player;isPaused:()=>boolean;releaseMouse:()=>void;toast:(text:string)=>void;closeMobileMenu:()=>void;toggleOverview:()=>void;openSystemMap:()=>void;openDialog:(id:string)=>void;drawPostcard:()=>void;getQuality:()=>Quality;applyQuality:(quality:Quality)=>void};
export function setupMobileMenu(o:MobileOptions){
 const {session:s}=o;
 const release=()=>{o.releaseMouse();clearMovementInput(s);};
 $('touch-jump').addEventListener('pointerdown',e=>{e.preventDefault();if(s.started&&!s.overview&&!o.isPaused()&&o.player().mode==='walk')s.jumpQueued=true;});
 setupFullscreen($('mobile-fullscreen'),o.toast,()=>{o.closeMobileMenu();release();});
 $('mobile-menu').onclick=()=>{const open=$('mobile-actions').hidden;release();$('mobile-actions').hidden=!open;$('mobile-menu').setAttribute('aria-expanded',String(open));};
 for(const [id,action] of Object.entries({'mobile-overview':o.toggleOverview,'mobile-system':o.openSystemMap,'mobile-journal':()=>o.openDialog('journal'),'mobile-postcard':()=>{if(!s.overview)o.drawPostcard();},'mobile-help':()=>o.openDialog('help')}))$(id).onclick=()=>{o.closeMobileMenu();action();};
 $('mobile-quality').onclick=()=>{const quality=o.getQuality(),next=quality==='economy'?'balanced':quality==='balanced'?'high':'economy';o.applyQuality(next);$<HTMLSelectElement>('quality-select').value=next;$('mobile-quality').textContent=`Графика: ${QUALITY[next].label.toLowerCase()}`;};
 if(o.touchMode){o.applyQuality('economy');$<HTMLSelectElement>('quality-select').value='economy';$('overview-label').querySelector('small')!.textContent='Потяни планету для вращения · Два пальца — масштаб · Меню — назад';}
}
