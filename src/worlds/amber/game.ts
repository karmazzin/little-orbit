import {gameStorage as localStorage} from '../../runtime/storage.ts';
import {createDebugPanel,createDialogs,updateMovementControl,setupMobileMenu} from '../../runtime/hud.ts';
import {createGameControls} from '../../runtime/controls.ts';
import {updateGameCamera} from '../../runtime/camera.ts';
import {FrameClock,FixedStepper,startGameLoop} from '../../runtime/loop.ts';
import {createGameRenderer,resizeGameView,applyRenderQuality,bindContextLoss} from '../../runtime/renderer.ts';
import {setupGameAudio} from '../../runtime/audio.ts';
import {createSessionState,readMovementInput} from '../../runtime/session.ts';
import * as T from 'three';
import {AMBER_RADIUS as RADIUS,AMBER_SPAWN,AMBER_PLACES,amberSample as sample,buildAmberWorld} from './world.ts';
import {character} from '../../rendering/character.ts';
import {createPlayer,step,movementAction,type MovementEnvironment,type MovementMode} from '../../simulation.ts';
import {restoreWorld,serializeWorld} from '../../persistence.ts';
import {AMBER_SAVE_KEY} from '../../travel.ts';
import {buildTravelFrame} from '../../travel-view.ts';
import {createJourneyUI} from '../../journey-ui.ts';
import {JOURNEY_STATUS,type JourneyEntry} from '../../journey.ts';
import {clearProgress} from '../../progress-reset.ts';
import {createSystemMap} from '../../system-map.ts';
import {FrameStats,QUALITY,type Quality} from '../../performance.ts';
import {DAY_SECONDS,localHours,secondsAtLocalHour} from '../../sky.ts';
import {createAmberSky,amberSolarState} from './sky.ts';

export function startAmberGame(){
const session=createSessionState();
const clock=new FrameClock(),fixedSteps=new FixedStepper();
const $=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;
document.title='Маленькая орбита — Янтарь';
document.querySelector('.world-status')!.childNodes[1].textContent=' ОСЕННИЕ ТРОПЫ ';
document.querySelector('.world-status span')!.textContent='ПЛАНЕТА ЯНТАРЬ';
$('planet-label').children[1].childNodes[0].textContent='ЯНТАРЬ';
$('overview-label').childNodes[0].textContent='ЯНТАРЬ';
$('time-place').textContent='ВРЕМЯ НА ЯНТАРЕ';
document.querySelector('.solar-diagram p')!.innerHTML='Планета вращается вокруг Ореола.<br>Сутки — 6 минут, год — около 4,2 суток.';
const waterHelp=document.querySelector('#help > dl + p');if(waterHelp)waterHelp.textContent='Небольшие ручьи соединяют озёра Янтаря. На тропах через воду проложены деревянные мостки. По пологому берегу можно войти в воду: F на компьютере или «Плавать» на телефоне. В воде герой плывёт; у берега тем же действием можно выйти на сушу.';
const canvas=$<HTMLCanvasElement>('world'),touchMode=matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch-mode',touchMode);
const renderer=createGameRenderer(canvas);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.1,1000);
const world=buildAmberWorld(scene),portal=buildTravelFrame(scene,AMBER_SPAWN,sample(AMBER_SPAWN).height);portal.setOpen(true);world.obstacles.push(...portal.obstacles);
const skySystem=createAmberSky(scene);
const environment:MovementEnvironment={radius:RADIUS,sample};
let player=createPlayer(portal.approach,environment),solarSeconds=DAY_SECONDS*.43,timeSpeed=1,timeStopped=false;
let places=new Set<string>(),met=new Set<string>(),cards=new Set<string>(),tracked:string|null=null,worldRestored=false,resetting=false;
const arrival=new URL(location.href).searchParams.has('arrival');
try{const saved=JSON.parse(localStorage.getItem(AMBER_SAVE_KEY)??'null');if(saved){const restored=restoreWorld(saved.world,environment);if(restored){solarSeconds=restored.solarSeconds;timeSpeed=restored.timeSpeed;timeStopped=restored.timeStopped;if(!arrival){player=restored.player;session.distance=restored.distance;session.elevation=restored.elevation;worldRestored=true;}}if(Array.isArray(saved.places))places=new Set(AMBER_PLACES.filter(p=>saved.places.includes(p.id)).map(p=>p.id));if(Array.isArray(saved.met))met=new Set(world.residents.filter(r=>saved.met.includes(r.id)).map(r=>r.id));if(Array.isArray(saved.cards))cards=new Set(AMBER_PLACES.filter(p=>saved.cards.includes(p.id)).map(p=>p.id));if(typeof saved.tracked==='string')tracked=saved.tracked;}}catch{}
if(arrival){
 // Commit arrival before removing the URL marker: reloading the welcome screen must keep the portal spawn.
 try{localStorage.setItem(AMBER_SAVE_KEY,JSON.stringify({world:serializeWorld({player,solarSeconds,timeSpeed,timeStopped,distance: session.distance,elevation: session.elevation}),places:[...places],met:[...met],cards:[...cards],tracked}));const url=new URL(location.href);url.searchParams.delete('arrival');history.replaceState(null,'',url.href);}catch{}
}
const hero=character(0xd3af66,true);scene.add(hero.root);
let time=0,worldSaveTick=0,uiTick=0,toastUntil=0,saveWarning=false;

const hud=createDialogs({session,canvas,releaseMouse:()=>releaseMouse(),refreshJournal:()=>refreshJournal(),closePanelsOnOpen:true});
const {dialogs,isPaused,openDialog,closeMobileMenu}=hud;
function toast(text:string){$('toast').textContent=text;$('toast').hidden=false;toastUntil=time+5;}
function saveWorld(){if(!session.started||resetting)return false;try{localStorage.setItem(AMBER_SAVE_KEY,JSON.stringify({world:serializeWorld({player,solarSeconds,timeSpeed,timeStopped,distance: session.distance,elevation: session.elevation}),places:[...places],met:[...met],cards:[...cards],tracked}));return true;}catch{if(!saveWarning){saveWarning=true;toast('Не удалось сохранить мир. После закрытия вкладки последние изменения могут потеряться.');}return false;}}

function show(name:string,text:string,role='ИСТОРИИ ЯНТАРЯ',choices:{text:string;action:()=>void}[]=[]){$('speaker').textContent=name;$('speaker-role').textContent=role;$('portrait').textContent=name[0];$('speech').textContent=text;$('choices').replaceChildren();for(const c of [...choices,{text:'Продолжить прогулку',action:()=>$<HTMLDialogElement>('conversation').close()}]){const b=document.createElement('button');b.textContent=c.text;b.onclick=c.action;$('choices').append(b);}openDialog('conversation');}
const journeyUI=createJourneyUI({focusControls:()=>{releaseMouse();session.keys.clear();session.jumpQueued=false;session.modeQueued=false;},openJournal:()=>openDialog('journal'),load:()=>tracked,save:id=>{tracked=id;saveWorld();}});
function journeys():JourneyEntry[]{return [
 {id:'amber-places',title:'Тропами Янтаря',group:'discovery',status:places.size===AMBER_PLACES.length?'complete':'active',done:places.size,total:AMBER_PLACES.length,next:places.size===AMBER_PLACES.length?'Все места Янтаря записаны в журнале.':'Следуй тропам и открывай места. Карта планеты — M.'},
 {id:'amber-residents',title:'Знакомые осеннего леса',group:'story',status:met.size===world.residents.length?'complete':met.size?'active':'available',done:met.size,total:world.residents.length,next:met.size===world.residents.length?'Ты познакомился со всеми жителями Янтаря.':'Поговори с жителями в Листопадной деревне и у Дома под липами.'},
 {id:'amber-cards',title:'Осенний альбом',group:'story',status:cards.size===AMBER_PLACES.length?'complete':cards.size?'active':'available',done:cards.size,total:AMBER_PLACES.length,next:cards.size===AMBER_PLACES.length?'Все виды Янтаря сохранены в альбоме.':'Нажми P у открытого места, чтобы зарисовать его для открытки.'}
 ];}
let journalSection='active';
const expanded=new Set<string>();
function postcard(id:string){const p=AMBER_PLACES.find(p=>p.id===id)!;return `<article class="postcard"><svg viewBox="0 0 240 150" role="img" aria-label="Зарисовка: ${p.name}"><rect width="240" height="150" fill="#9bc3bf"/><path d="M0 108Q60 73 120 105T240 100V150H0Z" fill="#968a60"/><path d="M65 110V73M117 110V58M169 110V74" stroke="#715744" stroke-width="7"/><circle cx="65" cy="63" r="25" fill="#b9744f"/><circle cx="117" cy="50" r="29" fill="#d4a15b"/><circle cx="169" cy="67" r="25" fill="#c58560"/></svg><strong>${p.name}</strong><small>Янтарь · путевые зарисовки</small></article>`;}
function refreshJournal(){
 const rows=journeys(),worldFindings=[...AMBER_PLACES.filter(p=>places.has(p.id)).map(p=>({id:p.id,title:p.name,text:p.text,card:false})),...world.residents.filter(r=>met.has(r.id)).map(r=>({id:r.id,title:r.name+' · '+r.role,text:r.text,card:false}))],findings=[...AMBER_PLACES.filter(p=>cards.has(p.id)).map(p=>({id:p.id,title:'Открытка · '+p.name,text:'Зарисовка сохранена в осеннем альбоме.',card:true}))];
 const lists:Record<string,JourneyEntry[]>={active:rows.filter(r=>r.status==='active'),unstarted:rows.filter(r=>r.status==='available'),complete:rows.filter(r=>r.status==='complete')};const labels:Record<string,string>={active:'В процессе',unstarted:'Не начато',findings:'Находки',world:'Мир',complete:'Завершённые'};
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-journal-section]')){const id=b.dataset.journalSection!;b.textContent=labels[id]+' · '+(id==='findings'?findings.length:id==='world'?worldFindings.length:(lists[id]?.length??0));b.setAttribute('aria-pressed',String(journalSection===id));b.onclick=()=>{journalSection=id;refreshJournal();};}
 const body=$('journal-body');body.replaceChildren();body.setAttribute('aria-label',labels[journalSection]);
 const para=(text:string)=>{const p=document.createElement('p');p.textContent=text;return p;};
 if(journalSection==='findings'||journalSection==='world'){const entries=journalSection==='world'?worldFindings:findings;if(!entries.length)body.append(para('Здесь появятся открытые места, записи о жителях и твои открытки.'));else body.append(para('Открой запись, чтобы перечитать её.'));for(const f of entries){const d=document.createElement('details');d.className='journal-entry';const key=f.title+f.id;d.open=expanded.has(key);d.ontoggle=()=>{if(d.isConnected){if(d.open)expanded.add(key);else expanded.delete(key);}};const s=document.createElement('summary');s.textContent=f.title;d.append(s,para(f.text));if(f.card)d.insertAdjacentHTML('beforeend',postcard(f.id));body.append(d);}return;}
 if(!lists[journalSection].length)body.append(para(journalSection==='complete'?'Здесь будут храниться завершённые истории.':journalSection==='unstarted'?'Все истории уже начаты или завершены.':'Пока нет начатых историй. Гуляй по тропам и знакомься с жителями.'));
 for(const row of lists[journalSection]){const article=document.createElement('article');article.className='journey-row';const h=document.createElement('h3');h.textContent=row.title;article.append(h,para(JOURNEY_STATUS[row.status]+` · ${row.done} / ${row.total}`),para((journalSection==='unstarted'?'Как начать: ':'')+row.next));if(journalSection==='active'){const b=document.createElement('button');b.textContent=journeyUI.selected===row.id?'✓ Отслеживается':'Отслеживать';b.disabled=journeyUI.selected===row.id;b.onclick=()=>{journeyUI.track(row.id);refreshJournal();};article.append(b);}body.append(article);}
}
function drawPostcard(){const p=AMBER_PLACES.find(p=>player.up.angleTo(p.up)*RADIUS<9);if(!p){toast('Для зарисовки подойди к интересному месту. Открой карту M.');return;}if(cards.has(p.id)){toast('Этот вид уже есть в твоём альбоме.');return;}places.add(p.id);cards.add(p.id);saveWorld();show('Открытка готова',`Зарисовка сохранена в журнале · ${cards.size} / ${AMBER_PLACES.length}.`);$('choices').insertAdjacentHTML('afterbegin',postcard(p.id));}
let target:{kind:'portal'|'resident'|'place';id:string;name:string}|null=null;
function interact(){if(!session.started||isPaused()||session.overview||!target)return;if(target.kind==='portal'){show('Янтарная рамка','За рамкой — Медная роща на Хвое. Прогресс на обеих планетах сохранится.','ДОРОГА ДОМОЙ',[{text:'Вернуться на Хвою',action:()=>{if(!saveWorld()){toast('Переход отложен: не удалось сохранить Янтарь. Попробуй ещё раз.');return;}const url=new URL(location.href);url.searchParams.delete('planet');url.searchParams.delete('arrival');location.assign(url.href);}}]);}else if(target.kind==='resident'){const r=world.residents.find(r=>r.id===target!.id)!;met.add(r.id);saveWorld();show(r.name,r.text,r.role);}else{const p=AMBER_PLACES.find(p=>p.id===target!.id)!;places.add(p.id);saveWorld();show(p.name,p.text,'ЗАПИСКИ О МЕСТЕ',[{text:'Зарисовать вид для открытки',action:drawPostcard}]);}}
const planetOrbit={orientation:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(new T.Vector3(100,155,143),new T.Vector3(),new T.Vector3(0,1,0))),distance:Math.hypot(100,155,143)};
const lockHint=document.createElement('div');lockHint.className='mouse-hint';lockHint.hidden=true;lockHint.textContent='Клик по миру — управлять камерой · Esc — освободить мышь';document.body.append(lockHint);
const systemMap=createSystemMap($('system-map'),'Янтарь');

const frameStats=new FrameStats();let quality:Quality='balanced',debugVisible=false,debugTick=0,shadowTick=1;
const debugPanel=createDebugPanel(applyQuality);
function applyQuality(value:Quality){
 quality=value;applyRenderQuality(renderer,skySystem.sun,frameStats,value);
}

applyQuality(touchMode?'economy':'balanced');
const controls=createGameControls({session,canvas,camera,player:()=>player,planetOrbit,radius:RADIUS,touchMode,isPaused,toast,cameraLook:()=>cameraLook,
 actions:{movement:requestMovementChange,postcard:drawPostcard,systemMap:openSystemMap,observe:observePlanet,interact,journal:()=>openDialog('journal'),
  debug:()=>{debugVisible=!debugVisible;debugPanel.hidden=!debugVisible;if(debugVisible){releaseMouse();session.keys.clear();session.jumpQueued=false;session.modeQueued=false;}},
  escape:()=>{session.keys.clear();session.jumpQueued=false;session.modeQueued=false;releaseMouse();closeMobileMenu();if(!$('time-panel').hidden)$('time-panel').hidden=true;else if(session.overview)toggleOverview(false);}},
 onVisibilityReset:()=>{clock.reset();fixedSteps.reset();frameStats.reset();}});
const {releaseMouse,captureMouse,toggleOverview}=controls;
$('start').onclick=()=>{if(!gameAudio.soundChosen)toggleSound();session.started=true;document.body.classList.add('playing');$('hud').hidden=false;canvas.focus();void captureMouse();toast(worldRestored?'Прогулка продолжается с сохранённого места.':'Добро пожаловать на Янтарь. Тропы ведут к деревне; рамка за спиной — домой.');};
$('overview').onclick=()=>toggleOverview();
function openSystemMap(){if(!session.started)return;$('time-panel').hidden=true;systemMap.update(solarSeconds);openDialog('system-map-dialog');}
$('system-toggle').onclick=openSystemMap;
$('journal-toggle').onclick=$('journal-bottom').onclick=()=>openDialog('journal');
$('help-toggle').onclick=()=>openDialog('help');
let observedPlanet=-1;
function observePlanet(){if(!session.started||session.overview||dialogs.some(d=>d.open))return;for(let j=1;j<=skySystem.names.length;j++){const i=(observedPlanet+j)%skySystem.names.length,aim=skySystem.aim(i,solarSeconds,player.up,player.forward);if(!aim)continue;observedPlanet=i;session.trackingPlanet=true;player.forward.copy(aim.forward);session.elevation=aim.elevation;$('time-panel').hidden=true;toast(`Слежение: ${skySystem.names[i]} · N — следующая · мышь — ручная камера`);return;}toast('Соседние планеты сейчас за горизонтом. Попробуй другое время суток.');}
$('observe-planets').onclick=observePlanet;
$('time-toggle').onclick=()=>{releaseMouse();session.keys.clear();session.jumpQueued=false;session.modeQueued=false;$('time-panel').hidden=!$('time-panel').hidden;};
$('time-pause').textContent=timeStopped?'▶ Продолжить':'Ⅱ Пауза';
$('time-pause').setAttribute('aria-pressed',String(timeStopped));
$('time-speed').textContent=`Скорость ×${timeSpeed}`;
$('time-pause').onclick=()=>{timeStopped=!timeStopped;$('time-pause').textContent=timeStopped?'▶ Продолжить':'Ⅱ Пауза';$('time-pause').setAttribute('aria-pressed',String(timeStopped));saveWorld();};
$('time-speed').onclick=()=>{timeSpeed=timeSpeed===1?5:timeSpeed===5?20:1;$('time-speed').textContent=`Скорость ×${timeSpeed}`;saveWorld();};
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-hour]'))button.onclick=()=>{
 solarSeconds=secondsAtLocalHour(solarSeconds,Number(button.dataset.hour),player.up);shadowTick=1;saveWorld();
};

$('reset').onclick=()=>{$('reset-error').hidden=true;openDialog('reset-dialog');$('reset-cancel').focus();};
$('reset-cancel').onclick=()=>openDialog('journal');
$('reset-confirm').onclick=()=>{try{clearProgress(localStorage);}catch{$('reset-error').textContent='Не удалось сбросить сохранение в браузере. Новая игра не начата. Попробуй ещё раз.';$('reset-error').hidden=false;return;}resetting=true;session.started=false;const url=new URL(location.href);url.searchParams.delete('planet');url.searchParams.delete('arrival');location.assign(url.href);};
hud.bindCloseButtons();
const touch=controls.bind();
window.addEventListener('resize',()=>resizeGameView(renderer,camera));
$('interact').onclick=interact;
function requestMovementChange(){
 if(!session.started||session.overview||isPaused())return;
 if(movementAction(player,world.obstacles,environment)){session.modeQueued=true;session.trackingPlanet=false;}
 else toast(player.mode==='swim'?'Подплыви к пологому берегу, чтобы выйти из воды.':'Подойди к воде по пологому берегу, чтобы поплыть.');
}
$('movement-action').onclick=requestMovementChange;
let shoreTick=0,shoreAction:MovementMode|null=null;
setupMobileMenu({session,touchMode,player:()=>player,isPaused,releaseMouse,toast,closeMobileMenu,toggleOverview:()=>toggleOverview(),openSystemMap,openDialog,drawPostcard,getQuality:()=>quality,applyQuality});
const gameAudio=setupGameAudio(import.meta.env.BASE_URL);
const {music,worldAudio,toggleSound,renderMusicTransition}=gameAudio;

const facing=player.forward.clone(),right=new T.Vector3(),matrix=new T.Matrix4(),cameraLook=new T.Vector3(-25,0,0);
let announcedLocation='',locationVisibleUntil=0;
const locationBanner=document.querySelector<HTMLElement>('.location')!;
const markers=[...AMBER_PLACES.map(p=>({id:p.id,name:p.name,up:p.up,resident:false})),...world.residents.map(r=>({id:r.id,name:r.name,up:r.up,resident:true}))].map(p=>{const el=document.createElement('div');el.className=p.resident?'resident-label':'camp-marker';el.hidden=true;document.body.append(el);return {p,el};});
function nearby(){target=null;let best=4;const pd=player.up.angleTo(AMBER_SPAWN)*RADIUS;if(pd<4.8){target={kind:'portal',id:'portal',name:'Янтарная рамка'};best=pd;}for(const r of world.residents){const d=player.up.angleTo(r.up)*RADIUS;if(d<3.4&&d<best){target={kind:'resident',id:r.id,name:'Поговорить · '+r.name};best=d;}}let name=sample(player.up).region;for(const p of AMBER_PLACES){const d=player.up.angleTo(p.up)*RADIUS;if(d<9){name=p.name;if(!places.has(p.id)&&!isPaused()&&!session.overview){places.add(p.id);saveWorld();toast('Новое место: '+p.name+' · записано в журнал');}}if(d<3.5&&d<best){target={kind:'place',id:p.id,name:'Осмотреть · '+p.name};best=d;}}
$('interact').hidden=!target||isPaused()||session.overview;if(target)$('interact').querySelector('span')!.textContent=target.name;
if(!session.overview&&!isPaused()&&name!==announcedLocation){announcedLocation=name;locationVisibleUntil=performance.now()+4500;$('location-name').textContent=name;$('location-sub').textContent=sample(player.up).wet?'Остановись. Послушай воду.':'За каждым холмом — что-то новое';}locationBanner.classList.toggle('location-visible',!session.overview&&!isPaused()&&performance.now()<locationVisibleUntil);journeyUI.update(journeys().filter(r=>r.status!=='available'));}
window.addEventListener('pagehide',saveWorld);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveWorld();});
camera.position.set(100,155,143);camera.lookAt(cameraLook);
let foot=0;
startGameLoop(renderer,clock,({frameMs,dt,cpuStart})=>{time+=dt;
if(!timeStopped&&!dialogs.some(d=>d.open&&d.id!=='system-map-dialog'))solarSeconds+=dt*timeSpeed;
const paused=!session.started||isPaused()||session.overview;$('touch-controls').hidden=!touchMode||paused;$('mobile-menu').hidden=!touchMode||!session.started||dialogs.some(d=>d.open);$('rotate-hint').hidden=!touchMode||!session.started||isPaused();if(paused){touch.reset();session.jumpQueued=false;session.modeQueued=false;}
fixedSteps.advance(dt,paused,()=>{const finger=touch.read(),old=player.up.clone();step(player,readMovementInput(session,finger),1/60,world.obstacles,environment);session.jumpQueued=false;session.modeQueued=false;facing.applyQuaternion(new T.Quaternion().setFromUnitVectors(old,player.up)).projectOnPlane(player.up).normalize();if(player.moving)facing.lerp(player.up.clone().sub(old).projectOnPlane(player.up).normalize(),.18).normalize();});
right.crossVectors(facing,player.up).normalize();matrix.makeBasis(right,player.up,facing.clone().negate());hero.root.quaternion.setFromRotationMatrix(matrix);hero.root.position.copy(player.position);hero.animate(time,!paused&&player.moving,player.mode==='swim');world.update(time,paused?0:dt);portal.update(time);
if((shoreTick+=dt)>=.2){shoreTick=0;shoreAction=paused?null:movementAction(player,world.obstacles,environment);}updateMovementControl(paused,shoreAction,player.mode);
if(session.trackingPlanet&&!paused){const aim=skySystem.aim(observedPlanet,solarSeconds,player.up,player.forward);if(aim){player.forward.copy(aim.forward);session.elevation=aim.elevation;}else{session.trackingPlanet=false;toast('Планета скрылась за горизонтом.');}}
updateGameCamera({session,camera,player,planetOrbit,dt,sample,welcomeRotation:-time*.025,trackedPosition:session.trackingPlanet&&!paused?skySystem.neighborPosition(observedPlanet,solarSeconds):undefined},cameraLook);
skySystem.followCamera(camera,session.overview||!session.started);const solar=skySystem.update(solarSeconds,camera,player.up,session.overview||!session.started);
if((uiTick+=dt)>.1){uiTick=0;if(session.started)nearby();for(const {p,el} of markers){const at=p.up.clone().multiplyScalar(sample(p.up).height+(p.resident?2.8:4)),v=at.clone().project(camera);el.hidden=!session.started||isPaused()||(!session.overview&&(!p.resident||player.up.angleTo(p.up)*RADIUS>24))||camera.position.dot(p.up)<RADIUS||v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1;if(!el.hidden){el.textContent=(p.resident?'':places.has(p.id)?'✓ ':'◇ ')+p.name+(session.overview?' · '+Math.round(player.up.angleTo(p.up)*RADIUS)+' м':'');el.style.left=`${(v.x*.5+.5)*innerWidth}px`;el.style.top=`${(-v.y*.5+.5)*innerHeight}px`;}}const hours=localHours(solarSeconds,player.up);$('time-clock').textContent=`${Math.floor(hours).toString().padStart(2,'0')}:${Math.floor(hours%1*60).toString().padStart(2,'0')}`;const altitude=solar.sunDirection.dot(player.up);$('time-phase').textContent=altitude<-.15?'Ночь':altitude>.2?'День':amberSolarState(solarSeconds+.2).sunDirection.dot(player.up)>altitude?'Рассвет':'Закат';const a=solar.orbitAngle;$('orbit-dot').setAttribute('cx',String(50+39*Math.cos(a)));$('orbit-dot').setAttribute('cy',String(35+23*Math.sin(a)));}
if((worldSaveTick+=dt)>1){worldSaveTick=0;saveWorld();}if(time>toastUntil)$('toast').hidden=true;
lockHint.hidden=touchMode||!session.started||session.overview||isPaused()||document.pointerLockElement===canvas||session.softMouse;
music.setDucked($<HTMLDialogElement>('conversation').open);music.update(frameMs/1000);renderMusicTransition();worldAudio.setActive(session.started&&!session.overview);let shots:{id:string;gain:number;pan:number}[]=[];if(!paused&&player.moving&&player.grounded&&player.mode==='walk'){foot+=dt;if(foot>.43){foot=0;shots=[{id:`step-grass-${1+Math.floor(time*10)%3}`,gain:.65,pan:0}];}}worldAudio.update({loops:[{id:'wind',gain:.15,pan:0},{id:'leaves',gain:.4,pan:0},...(sample(player.up).biome==='shore'?[{id:'river',gain:.4,pan:0}]:[])],shots});
if((shadowTick+=dt)>=1/QUALITY[quality].shadowHz){renderer.shadowMap.needsUpdate=true;shadowTick=0;}if($<HTMLDialogElement>('system-map-dialog').open){systemMap.update(solarSeconds);systemMap.render();}else renderer.render(scene,camera);frameStats.record(frameMs,performance.now()-cpuStart);if(debugVisible&&(debugTick+=dt)>.25){debugTick=0;const s=frameStats.snapshot();$('debug-stats').textContent=`FPS          ${s.fps.toFixed(1)}\nКадр         ${s.meanMs.toFixed(1)} мс\nCPU          ${s.cpuMs.toFixed(1)} мс\nDraw calls   ${renderer.info.render.calls}\nТреугольники ${renderer.info.render.triangles.toLocaleString('ru')}\nDPR          ${renderer.getPixelRatio().toFixed(2)}`;}
});
$('loading').hidden=true;
bindContextLoss(canvas,renderer,saveWorld,'3D-контекст потерян. Обнови страницу — прогресс сохранён.');

}
