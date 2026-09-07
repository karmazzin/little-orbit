import {PLAYABLE_PLANETS,planetPreviewUrl,regularGameUrl,type PlayablePlanetId} from '../worlds/catalog.ts';
/** Development UI only. All test progress is routed through the preview storage. */
export function showPlanetPreview(active:PlayablePlanetId,preview:boolean){
 const panel=document.createElement('details');panel.id='planet-preview';
 const summary=document.createElement('summary');summary.textContent=preview?'Тест: '+PLAYABLE_PLANETS.find(p=>p.id===active)!.name:'Тест планет';panel.append(summary);
 const note=document.createElement('p');note.textContent='Быстрый вход без заданий. Тестовый прогресс хранится отдельно.';panel.append(note);
 const nav=document.createElement('nav');nav.setAttribute('aria-label','Тестирование планет');
 for(const planet of PLAYABLE_PLANETS){const link=document.createElement('a');link.href=planetPreviewUrl(location.href,planet.id);link.textContent=planet.name;if(preview&&planet.id===active)link.setAttribute('aria-current','page');nav.append(link);}
 panel.append(nav);
 if(preview){const exit=document.createElement('a');exit.href=regularGameUrl(location.href);exit.textContent='Вернуться в обычную игру';exit.className='preview-exit';panel.append(exit);}
 panel.addEventListener('toggle',()=>{if(panel.open&&document.pointerLockElement)document.exitPointerLock();});
 const style=document.createElement('style');style.textContent=`
 #planet-preview{margin-top:18px;padding:9px 12px;border:1px solid #a5b58566;border-radius:12px;background:#182a2bef;color:#eff1de;font:13px/1.45 system-ui;box-shadow:0 4px 18px #0003}
 #planet-preview summary{cursor:pointer;font-weight:600;list-style:revert}
 #planet-preview p{margin:10px 0;color:#c9d2bd;font-size:12px}
 #planet-preview nav{display:flex;gap:8px;flex-wrap:wrap}
 #planet-preview a{display:inline-block;padding:7px 10px;border:1px solid #a5b58566;border-radius:7px;color:#eff1de;text-decoration:none}
 #planet-preview a:hover,#planet-preview a[aria-current]{background:#526843}
 #planet-preview .preview-exit{margin-top:10px;border:0;text-decoration:underline;padding-left:0}
 `;
 document.head.append(style);document.getElementById('help')!.append(panel);
}
