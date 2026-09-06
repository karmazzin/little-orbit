import {clearProgress} from './progress-reset.ts';
import {createJournalUI} from './journal-ui.ts';
import {setupFullscreen} from './fullscreen.ts';
import {createFrontierUI,FRONTIER_SAVE_KEY} from './frontier-ui.ts';
import {journeyEntries} from './journey.ts';
import {createJourneyUI} from './journey-ui.ts';
import {nextDiscoveryReading} from './discovery-reading.ts';
import {createAzureStoryUI,AZURE_STORY_KEY} from './azure-story-ui.ts';
import {createFireSeat,beginFireSeat,advanceFireSeat,leaveFireSeat} from './campfire-seat.ts';
import {ResidentNavigationClient} from './resident-navigation-client.ts';
import {PEOPLE,HOMES,FIRE_UP,OBSERVE_UP,ACTIVITY_LABEL,RESIDENT_SAVE_KEY,ResidentNavigation,restoreResidents,serializeResidents,advanceResidents,noahIsTelling,knockResident,localHour,homeLit,type PersonId} from './resident-life.ts';
import {Soundscape} from './soundscape.ts';
import {WorldAudio} from './world-audio.ts';
import {MusicPlayer,MUSIC_TRACKS} from './music.ts';
import {createTouchControls} from './touch.ts';
import {createAdventureUI} from './adventure-ui.ts';
import {initialContent,restoreContent,reduceContent,contentObjective,irisCanBeObserved,IRIS_ENDING,CLUE_TEXT,type ContentAction} from './content.ts';
import {postcardMarkup} from './postcards.ts';
import {createWildlife} from './wildlife.ts';
import {resizeShadow} from './shadows.ts';
import {ALL_LANDMARKS,LANDMARKS,initialExploration,restoreExploration,discoverPlace,atObservatoryNight} from './landmarks.ts';
import {CAMP} from './discoveries.ts';
import {hiddenByPlanet} from './sectors.ts';
import {createSystemMap} from './system-map.ts';
import {FrameStats,QUALITY,type Quality} from './performance.ts';
import {createNeighbors,HOME_PLANET,NEIGHBORS,neighborDirection,planetAim,neighborSkyPosition} from './planets.ts';
import {trackballPoint,dragGlobe,globePosition} from './camera.ts';
import {createSky,localPhase,localHours,secondsAtLocalHour,solarState,DAY_SECONDS,YEAR_SECONDS} from './sky.ts';
import * as T from 'three';
import {buildWorld,character} from './view.ts';
import {createPlayer,step,movementAction,type MovementMode} from './simulation.ts';
import {WORLD_SAVE_KEY,restoreWorld,serializeWorld} from './persistence.ts';
import {coordinates,normalAt,sample,RADIUS} from './terrain.ts';
import {initialStory,restoreStory,reduceStory,dialogue,LETTERS,type ResidentId,type Action,type Dialogue} from './story.ts';
const $=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;
const canvas=$<HTMLCanvasElement>('world');
const touchMode=matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch-mode',touchMode);
let renderer:T.WebGLRenderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch{
 $('loading').textContent='Не удалось запустить 3D. Открой игру в браузере с поддержкой WebGL 2 и включённым аппаратным ускорением.';throw new Error('WebGL2 unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=T.VSMShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new T.Scene();scene.background=new T.Color(0x15252f);scene.fog=new T.FogExp2(0x182c35,.0009);
const camera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.1,1000);
const world=buildWorld(scene),hero=character(0xd3af66,true);scene.add(hero.root);
const wildlife=createWildlife(scene,world.obstacles);wildlife.update(0,0,normalAt(-4,4),new T.Vector3(0,1,0));
const skySystem=createSky(scene,world.stars);const neighbors=createNeighbors(scene);
const frameStats=new FrameStats();let quality:Quality='balanced',debugVisible=false,debugTick=0,shadowTick=1,cloudTick=1,skyTick=1,hudTick=0,sectorTick=1,wildlifeTick=0,wildlifeTime=0;
const debugPanel=document.createElement('section');debugPanel.id='debug-panel';debugPanel.hidden=true;
debugPanel.innerHTML='<div class="debug-title">ОТЛАДКА <span>~ закрыть</span></div><pre id="debug-stats"></pre><label>Графика <select id="quality-select"><option value="economy">Экономная</option><option value="balanced" selected>Сбалансированная</option><option value="high">Высокая</option></select></label><small>CPU — отправка кадра, не время GPU.<br>FPS измеряется по реальным кадрам.</small>';document.body.append(debugPanel);
function applyQuality(value:Quality){
 quality=value;const preset=QUALITY[value];renderer.setPixelRatio(Math.min(devicePixelRatio,preset.pixelRatio));
 resizeShadow(skySystem.sun,preset.shadowSize);renderer.shadowMap.needsUpdate=true;frameStats.reset();
}
$('quality-select').onchange=()=>applyQuality(($('quality-select') as HTMLSelectElement).value as Quality);
const renderSize=new T.Vector2();
let solar=skySystem.update(DAY_SECONDS*.43,camera,new T.Vector3(0,1,0),true);

let solarSeconds=DAY_SECONDS*.43,timeSpeed=1,timeStopped=false;
let player=createPlayer(),story=initialStory();
try{story=restoreStory(localStorage.getItem('little-orbit-story-v1'));}catch{}
let started=false,overview=false,distance=15,elevation=.55,time=0,accumulator=0,last=0,toastUntil=0;
let worldRestored=false,worldSaveTick=0,worldSaveWarning=false;
try{
 const saved=restoreWorld(localStorage.getItem(WORLD_SAVE_KEY));
 if(saved){({player,solarSeconds,timeSpeed,timeStopped,distance,elevation}=saved);worldRestored=true;}
}catch{}
solar=skySystem.update(solarSeconds,camera,player.up,true);neighbors.update(solarSeconds);
const residentNavigation=new ResidentNavigationClient(world.obstacles);
let residentStates=restoreResidents(null,residentNavigation);
try{residentStates=restoreResidents(localStorage.getItem(RESIDENT_SAVE_KEY),residentNavigation);}catch{}
const residentState=(id:PersonId)=>residentStates.find(r=>r.id===id)!;
for(const r of world.residents)r.up.copy(residentState(r.id).up);
let fireBurning=false,residentAnimationTime=0;
let beaconLit=false;try{beaconLit=localStorage.getItem('little-orbit-azure-beacon-v1')==='on';}catch{}
world.wilderness.setBeacon(beaconLit);
const trailSeat=createFireSeat();let restingPlace:string|null=null;let lookoutLift=0;
const fireSeat=createFireSeat();let guestNavigation:ResidentNavigationClient|undefined;
function saveWorld(){
 if(!started)return;
 try{localStorage.setItem(WORLD_SAVE_KEY,serializeWorld({player,solarSeconds,timeSpeed,timeStopped,distance,elevation}));localStorage.setItem(RESIDENT_SAVE_KEY,serializeResidents(residentStates));}
 catch{if(!worldSaveWarning){worldSaveWarning=true;toast('Не удалось сохранить мир. После закрытия вкладки последние изменения могут потеряться.');}}
}
window.addEventListener('pagehide',saveWorld);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveWorld();});
let exploration=initialExploration();try{exploration=restoreExploration(localStorage.getItem('little-orbit-exploration-v1'));}catch{}
let campFound=false;try{campFound=localStorage.getItem('little-orbit-camp-v1')==='found';}catch{}
let contentState=initialContent();try{contentState=restoreContent(localStorage.getItem('little-orbit-content-v1'));}catch{}
if(campFound)contentState=reduceContent(contentState,{type:'clue',id:'camp'});
let interactTarget:{kind:'adventure';id:string;name:string}|{kind:'place';id:string;name:string}|{kind:'camp';name:string}|{kind:'resident';id:PersonId;name:string}|{kind:'home';id:PersonId;name:string}|{kind:'letter';id:string;name:string}|null=null;
const keys=new Set<string>();let jumpQueued=false,modeQueued=false,drag=false,softMouse=false;
const planetOrbit={orientation:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(new T.Vector3(100,155,143),new T.Vector3(),new T.Vector3(0,1,0))),distance:Math.hypot(100,155,143)};
let grabPoint=new T.Vector3();
function globePointer(x:number,y:number){
 const rect=canvas.getBoundingClientRect();
 const radius=rect.height*.5*RADIUS/Math.sqrt(planetOrbit.distance**2-RADIUS**2)/Math.tan(T.MathUtils.degToRad(camera.fov*.5));
 return trackballPoint((x-rect.left-rect.width*.5)/radius,(rect.top+rect.height*.5-y)/radius);
}
const lockHint=document.createElement('div');lockHint.className='mouse-hint';lockHint.hidden=true;lockHint.textContent='Клик по миру — управлять камерой · Esc — освободить мышь';document.body.append(lockHint);
const systemMap=createSystemMap($('system-map'));
const dialogs=['conversation','journal','help','system-map-dialog','reset-dialog'].map(id=>$<HTMLDialogElement>(id));
const isPaused=()=>dialogs.some(d=>d.open)||!$('time-panel').hidden||!$('mobile-actions').hidden;
function toast(message:string){$('toast').textContent=message;$('toast').hidden=false;toastUntil=time+4;}
function save(){try{localStorage.setItem('little-orbit-story-v1',JSON.stringify(story));}catch{toast('Прогресс сохранён только до закрытия этой вкладки.');}}
function updateStory(action?:Action){if(action){story=reduceStory(story,action);save();}
 for(const l of world.letters)l.root.visible=story.phase==='active'&&!story.letters.includes(l.id);
}
updateStory();
const campMarker=document.createElement('div');campMarker.className='camp-marker';campMarker.hidden=true;document.body.append(campMarker);
const placeMarkers=ALL_LANDMARKS.map(place=>{const el=document.createElement('div');el.className='camp-marker';el.hidden=true;document.body.append(el);return {place,el};});
const nameTags=world.residents.map(r=>{
 const el=document.createElement('div');el.className='resident-label';el.hidden=true;el.textContent=r.name;document.body.append(el);return {r,el};
});
const homeMarkers=PEOPLE.map(p=>{const el=document.createElement('div');el.className='camp-marker';el.hidden=true;document.body.append(el);return {p,el};});
function openDialog(id:string){if(id==='journal')refreshJournal();releaseMouse();keys.clear();jumpQueued=false;modeQueued=false;drag=false;for(const d of dialogs)if(d.open)d.close();$<HTMLDialogElement>(id).showModal();}
function talk(id:PersonId,topic='greeting'){
 if(id==='savva'){frontierUI.talk();return;}
 if(id==='noah'){adventureUI.interact('traveler');return;}
 const r=world.residents.find(r=>r.id===id)!;
 const nightTalk=id==='ada'&&!residentState('ada').inside&&residentState('ada').up.distanceTo(OBSERVE_UP)*RADIUS<3&&atObservatoryNight(solarSeconds);
 const line:Dialogue=nightTalk?(topic==='iris'?{text:'Ирис — тот лиловый мир с тонким кольцом. Он обращается вокруг Ореола медленнее нашего. Иногда он прячется за горизонтом: попробуй N, чтобы следить за доступными планетами, или K, чтобы рассмотреть всю систему.',choices:[{text:'Попробую найти его'}]}:{text:'Ты всё-таки пришёл! Отсюда лучше видно небо. Я видела в старом лагере ту же схему, что выбита на Арке ветров: пять миров вокруг Ореола. Когда-нибудь мы доберёмся до каждого. А сегодня начнём с наблюдений.',choices:[{text:'Расскажи об Ирисе',next:'iris'},{text:'Спасибо за этот вечер'}]}):dialogue(id,story,topic);
 if(nightTalk&&!exploration.nightMeeting){exploration={...discoverPlace(exploration,'lookout'),nightMeeting:true};saveExploration();toast('Открытие: вечер у телескопа с Адой.');}
 $('speaker').textContent=r.name;$('speaker-role').textContent=r.role;$('portrait').textContent=r.name[0];$('speech').textContent=(topic==='greeting'&&!nightTalk?(id==='lev'&&adventureUI.state.bell==='complete'?'Слышишь? Твой колокольчик снова бережёт мой сад. Рад тебя видеть! ':id==='ada'&&adventureUI.state.meteor==='complete'?'Рада тебя видеть. Твой образец лежит на почётном месте у окна. ':''):'')+line.text;
 $('choices').replaceChildren(...line.choices.map(choice=>{const button=document.createElement('button');button.textContent=choice.text;button.onclick=()=>{if(choice.next){talk(id,choice.next);return;}if(choice.action){updateStory({type:choice.action});toast(choice.action==='accept'?'Новая история: «Письма на ветру»':'История завершена. В Тихой долине стало на одного друга больше.');}$<HTMLDialogElement>('conversation').close();canvas.focus();};return button;}));
 if(id==='mira')addContentChoice('Открытки для долины',postcardConversation);
 if(id==='ada'&&contentState.iris!=='dormant')addContentChoice('Знаки из старого лагеря',irisConversation);
 adventureUI.residentChoices(id);
 if(!$<HTMLDialogElement>('conversation').open)openDialog('conversation');
}
function readCamp(){
 updateContent({type:'clue',id:'camp'});
 campFound=true;try{localStorage.setItem('little-orbit-camp-v1','found');}catch{toast('Открытие сохранено только до закрытия вкладки.');}
 $('speaker').textContent='Записка астронома';$('speaker-role').textContent=CAMP.name;$('portrait').textContent='✧';$('speech').textContent=CAMP.text+' На полях нарисованы каменная арка, лист и телескоп. Похоже, автор оставил ещё несколько отметок. Следующий шаг записан в журнале.';
 const close=document.createElement('button');close.textContent='Сохранить в памяти';close.onclick=()=>{$<HTMLDialogElement>('conversation').close();};$('choices').replaceChildren(close);openDialog('conversation');
}

function saveExploration(){try{localStorage.setItem('little-orbit-exploration-v1',JSON.stringify(exploration));}catch{toast('Открытия сохранятся только до закрытия вкладки.');}}
function markPlace(id:string){const next=discoverPlace(exploration,id);if(next===exploration)return;exploration=next;saveExploration();toast(`Новое место: ${ALL_LANDMARKS.find(p=>p.id===id)!.name} · записано в журнал`);}
const azureStory=createAzureStoryUI({near:atPlace,lit:()=>beaconLit,dialog:contentDialog,choice:addContentChoice,toast,
 load:()=>localStorage.getItem(AZURE_STORY_KEY),save:raw=>localStorage.setItem(AZURE_STORY_KEY,raw),journal:()=>{}});
const frontierUI=createFrontierUI({near:atPlace,nearSavva:()=>started&&!overview&&!residentState('savva').inside&&residentState('savva').up.distanceTo(player.up)*RADIUS<3.2,dialog:contentDialog,choice:addContentChoice,toast,load:()=>localStorage.getItem(FRONTIER_SAVE_KEY),save:raw=>localStorage.setItem(FRONTIER_SAVE_KEY,raw),journal:()=>{}});
function inspectPlace(id:string){const place=ALL_LANDMARKS.find(p=>p.id===id);if(!place)return;markPlace(id);
 if(frontierUI.discover(id)){addContentChoice('Осмотреть место',()=>inspectPlace(id));return;}
 if(azureStory.discover(id,place.text)){addContentChoice('Осмотреть место',()=>inspectPlace(id));return;}
 $('speaker').textContent=place.name;$('speaker-role').textContent='ЗАПИСКИ О МЕСТЕ';$('portrait').textContent='◇';$('speech').textContent=place.text;
 const close=document.createElement('button');close.textContent='Продолжить прогулку';close.onclick=()=>{$<HTMLDialogElement>('conversation').close();};$('choices').replaceChildren(close);
 if(atPlace(id)){updateContent({type:'clue',id});if(contentState.clues.includes(id)&&CLUE_TEXT[id])$('speech').textContent=place.text+' '+CLUE_TEXT[id];if(LANDMARKS.some(p=>p.id===id)&&contentState.postcards==='active'&&!contentState.cards.includes(id))addContentChoice('Зарисовать вид для открытки',()=>drawPostcard(id));
 if(id==='lookout'&&contentState.iris==='searching'&&contentState.clues.length===3)addContentChoice('Наблюдать Ирис в телескоп',observeIris);}
 if(atPlace(id)){
  if(id==='azure-beacon')addContentChoice(beaconLit?'Погасить маяк':'Зажечь маяк',()=>{if(!atPlace(id))return;beaconLit=!beaconLit;world.wilderness.setBeacon(beaconLit);azureStory.refresh();try{localStorage.setItem('little-orbit-azure-beacon-v1',beaconLit?'on':'off');}catch{toast('Свет сохранится только до закрытия вкладки.');}inspectPlace(id);});
  azureStory.choices(id);frontierUI.choices(id);
  const rest=world.wilderness.places.find(p=>p.id===id);if(rest?.restUp)addContentChoice(rest.climbHeight?(trailSeat.phase==='seated'&&restingPlace===id?'Спуститься с маяка':'Подняться на маяк'):'Посидеть на бревне',()=>{if(rest.climbHeight&&trailSeat.phase==='seated'&&restingPlace===id){leaveFireSeat(trailSeat);$<HTMLDialogElement>('conversation').close();return;}if(beginFireSeat(trailSeat,player,true,rest.restUp!)){restingPlace=id;guestNavigation??=new ResidentNavigationClient(world.obstacles.map(o=>({...o,radius:o.radius+.06})));$<HTMLDialogElement>('conversation').close();keys.clear();toast(rest.climbHeight?'Подходим к лестнице · движение или Esc — спуститься':'Подходим к бревну · движение или Esc — встать');}});
 }
 openDialog('conversation');
}

function addContentChoice(text:string,action:()=>void){const button=document.createElement('button');button.textContent=text;button.onclick=action;$('choices').append(button);}
function contentDialog(speaker:string,text:string){
 $('speaker').textContent=speaker;$('speaker-role').textContent='ИСТОРИИ ТИХОЙ ДОЛИНЫ';$('portrait').textContent=speaker[0];$('speech').textContent=text;$('choices').replaceChildren();
 addContentChoice('Продолжить прогулку',()=>{$<HTMLDialogElement>('conversation').close();});openDialog('conversation');
}
function updateContent(action?:ContentAction){
 if(action){const next=reduceContent(contentState,action);if(next!==contentState){contentState=next;try{localStorage.setItem('little-orbit-content-v1',JSON.stringify(contentState));}catch{toast('Истории сохранятся только до закрытия вкладки.');}}}

}
function postcardConversation(){
 if(contentState.postcards==='new'){
  contentDialog('Мира','Сегодня пришло письмо от моей сестры. Она спрашивает, всё ли у нас по-прежнему. Я уже написала: «Всё как всегда». А потом посмотрела на пустой конверт и подумала — разве это правда? Ты вот появился. И сама я уже не помню, когда последний раз уходила дальше моста.');
  addContentChoice('Что бы ты хотела ей показать?',()=>{contentDialog('Мира','Арку — мы прятались там от дождя детьми. Медную рощу: сестра уверяет, что я выдумала цвет её листьев. И небо со Звёздного уступа. Я привыкла к этим местам, а ты увидишь их впервые. Может, сделаешь три зарисовки? Одну копию я отправлю ей, другую оставлю здесь. Чтобы и самой не забывать выходить за порог.');addContentChoice('Давай соберём такой альбом',()=>{updateContent({type:'accept'});contentDialog('Мира','Вот плотная бумага и карандаши. Не старайся рисовать «правильно». Нарисуй то, из-за чего тебе захотелось остановиться. А письмо я пока перепишу. Начну с того, что у нас появился новый друг.');toast('У арки, рощи и телескопа: P — зарисовать. Готовые открытки — в J.');});});
 }else if(contentState.postcards==='active'&&contentState.cards.length===3){
  contentDialog('Мира','Можно посмотреть? Подожди… У арки всё ещё тот кривой камень. А я была уверена, что он упал. Как странно: ты сходил туда, а будто я сама вернулась. Оставишь мне альбом? Я аккуратно сделаю копии для сестры.');
  addContentChoice('Передать альбом Мире',()=>{updateContent({type:'deliver'});contentDialog('Мира','На письме теперь написано: «У нас многое по-прежнему. Но я снова это замечаю». Мира кладёт рядом с открытками два конверта. «Второй — для тебя. Копии на память. А завтра я закрою почту на час и сама дойду до рощи. Если кто спросит, виноват наш летописец». Она улыбается и убирает табличку «Не отходить далеко» в ящик.');});
 }else contentDialog('Мира',contentState.postcards==='complete'?'Сестра ещё не ответила, а я уже придумываю, куда поведу её, если приедет. Твой альбом лежит у окна. Иногда заходят за письмами, а остаются рассматривать рисунки.':contentState.cards.length===0?'Я нашла старое письмо сестры: там целая страница о том, как пахнет роща после дождя. Вот что я хочу ей вернуть — не список достопримечательностей, а ощущение дома. Начни с любого из трёх мест.':`Ты уже зарисовал ${contentState.cards.length===1?'одно место':'два места'}? Я поймала себя на том, что жду эти рисунки больше, чем вечернюю почту. Ещё остались ${LANDMARKS.filter(p=>!contentState.cards.includes(p.id)).map(p=>p.name).join(' и ')}. Если устанешь — просто посиди там. Бумага подождёт.`);
}
function atPlace(id:string){const place=ALL_LANDMARKS.find(p=>p.id===id);return started&&!overview&&!!place&&place.up.distanceTo(player.up)*RADIUS<7;}
function drawPostcard(id?:string){
 id??=LANDMARKS.find(p=>atPlace(p.id))?.id;
 if(!id||!LANDMARKS.some(p=>p.id===id)||!atPlace(id)){toast('Для зарисовки подойди к арке, Медной роще или телескопу.');return;}
 if(contentState.postcards==='new'){toast('Сначала поговори с Мирой об альбоме открыток.');return;}
 if(contentState.cards.includes(id)){toast('Этот вид уже есть в твоём альбоме.');return;}
 markPlace(id);updateContent({type:'card',id});contentDialog('Открытка готова',`Зарисовка сохранена в журнале · ${contentState.cards.length} / 3.`);$('choices').insertAdjacentHTML('afterbegin',postcardMarkup(id));
}
function observeIris(){
 if(!atPlace('lookout')||contentState.clues.length!==3)return;
 if(!irisCanBeObserved(solarSeconds)){contentDialog('Телескоп',atObservatoryNight(solarSeconds)?'Ирис пока за горизонтом. Подожди: мир вращается, и нужная планета появится. Можно ускорить время в меню часов.':'Знаки совпали, но для наблюдения нужна ночь на этом уступе. Дождись темноты или используй меню часов.');return;}
 updateContent({type:'observe'});observedPlanet=NEIGHBORS.findIndex(p=>p.name==='Ирис');trackingPlanet=true;contentDialog('Сигнал у кольца','В окуляре — бледно-лиловый Ирис. У края кольца повторяются три короткие вспышки и одна длинная. На схеме из рощи тот же ритм. Ты записываешь последовательность: теперь нужно показать её Аде.');
}
function irisConversation(){
 if(contentState.iris==='observed'){updateContent({type:'decode'});contentDialog('Ада',IRIS_ENDING);}
 else contentDialog('Ада',contentState.iris==='complete'?IRIS_ENDING:'Это не просто украшения: метки похожи на старый наблюдательный шифр. '+contentObjective(contentState));
}

const knownJourneys=new Set<string>();
try{const ids=JSON.parse(localStorage.getItem('little-orbit-known-journeys-v1')??'[]');if(Array.isArray(ids))for(const id of ids)if(['cave','tales','festival','fireside'].includes(id))knownJourneys.add(id);}catch{}
function knowJourney(id:string){knownJourneys.add(id);try{localStorage.setItem('little-orbit-known-journeys-v1',JSON.stringify([...knownJourneys]));}catch{}}
const adventureUI=createAdventureUI({known:knowJourney,dialog:contentDialog,choice:addContentChoice,toast,
 near:id=>{if(id==='traveler')return started&&!overview&&!residentState('noah').inside&&residentState('noah').up.distanceTo(player.up)*RADIUS<3.2;const p=world.adventures.points.find(p=>p.id===id);return started&&!overview&&!!p&&p.inspectUp.distanceTo(player.up)*RADIUS<3.2;},
 residentNear:id=>started&&!overview&&world.residents.some(r=>r.id===id&&!residentState(r.id).inside&&r.up.distanceTo(player.up)*RADIUS<3.2),
 seconds:()=>solarSeconds,completed:()=>Number(story.phase==='complete')+Number(contentState.postcards==='complete')+Number(contentState.iris==='complete')+Number(azureStory.state.complete)+Number(frontierUI.state.wind==='complete')+Number(frontierUI.state.diary==='complete'),travelerPresent:()=>!residentState('noah').inside,storytelling:()=>noahIsTelling(solarSeconds,residentState('noah')),seatedByFire:()=>fireSeat.phase==='seated',
 beginFireSeat:()=>{if(beginFireSeat(fireSeat,player,noahIsTelling(solarSeconds,residentState('noah')))){guestNavigation??=new ResidentNavigationClient(world.obstacles.map(o=>({...o,radius:o.radius+.06})));$<HTMLDialogElement>('conversation').close();keys.clear();toast('Подходим к свободному месту · движение или Esc — отменить');}else toast('Чтобы сесть, подойди к Ною на суше, когда он рассказывает у костра.');},
 leaveFireSeat:()=>{leaveFireSeat(fireSeat);$<HTMLDialogElement>('conversation').close();toast('Ты встал с бревна.');}});
const journeyUI=createJourneyUI({focusControls:()=>{releaseMouse();keys.clear();jumpQueued=false;modeQueued=false;},openJournal:()=>{openDialog('journal');$('journal').scrollTop=0;},load:()=>localStorage.getItem('little-orbit-tracked-journey-v1'),save:id=>localStorage.setItem('little-orbit-tracked-journey-v1',id)});
const journalUI=createJournalUI({track:id=>journeyUI.track(id)});
function journeySnapshot(){return {story,content:contentState,adventures:adventureUI.state,exploration,azure:azureStory.state,frontier:frontierUI.state,known:[...knownJourneys],seconds:solarSeconds,beaconLit,noahTelling:noahIsTelling(solarSeconds,residentState('noah'))};}
function refreshJournal(){const snapshot=journeySnapshot(),rows=journeyEntries(snapshot);journeyUI.update(rows);journalUI.update(snapshot,rows,journeyUI.selected,campFound);}
const adventureMarkers=world.adventures.points.filter(p=>p.id!=='traveler').map(place=>{const el=document.createElement('div');el.className='camp-marker';el.hidden=true;document.body.append(el);return {place,el};});

function interact(){if(!started||overview||isPaused())return;if(fireSeat.phase==='seated'){adventureUI.fireside();return;}if(!interactTarget)return;if(interactTarget.kind==='home'){knockResident(residentState(interactTarget.id));toast(`${interactTarget.name}: сейчас выйду!`);return;}if(interactTarget.kind==='adventure'){adventureUI.interact(interactTarget.id);return;}if(interactTarget.kind==='place'){inspectPlace(interactTarget.id);return;}if(interactTarget.kind==='camp'){readCamp();return;}if(interactTarget.kind==='resident')talk(interactTarget.id);else{updateStory({type:'collect',id:interactTarget.id});toast(`Найдено: ${interactTarget.name} · ${story.letters.length}/3`);}}
function releaseMouse(){touch.reset();drag=false;softMouse=false;if(document.pointerLockElement===canvas)document.exitPointerLock();}
async function captureMouse(){
 if(touchMode||!started||overview||isPaused()||document.pointerLockElement===canvas)return;
 try{await canvas.requestPointerLock();}catch{enableSoftMouse();}
}
function enableSoftMouse(){if(started&&!overview&&!isPaused()){softMouse=true;toast('Камера следует за мышью над игровым полем · Esc — освободить');}}
function toggleOverview(relock=true){if(!started||isPaused())return;overview=!overview;trackingPlanet=false;keys.clear();jumpQueued=false;modeQueued=false;releaseMouse();document.body.classList.toggle('overview',overview);$('overview-label').hidden=!overview;$('interact').hidden=true;if(!overview&&relock)void captureMouse();}
$('start').onclick=()=>{if(!soundChosen)toggleSound();started=true;document.body.classList.add('playing');$('hud').hidden=false;canvas.focus();void captureMouse();toast(worldRestored?'Прогулка продолжается с сохранённого места.':'Добро пожаловать! Мира ждёт у почтового домика.');};
$('overview').onclick=()=>toggleOverview();
function openSystemMap(){if(!started)return;$('time-panel').hidden=true;systemMap.update(solarSeconds);openDialog('system-map-dialog');}
$('system-toggle').onclick=openSystemMap;
$('journal-toggle').onclick=$('journal-bottom').onclick=()=>openDialog('journal');
$('help-toggle').onclick=()=>openDialog('help');
let observedPlanet=-1,trackingPlanet=false;
function observePlanet(){
 if(!started||overview||dialogs.some(d=>d.open))return;
 for(let j=1;j<=NEIGHBORS.length;j++){const i=(observedPlanet+j)%NEIGHBORS.length,dir=neighborDirection(i,solarSeconds),altitude=dir.dot(player.up);if(altitude<.05)continue;
 observedPlanet=i;trackingPlanet=true;player.forward.copy(dir).projectOnPlane(player.up).normalize();elevation=-Math.asin(altitude);$('time-panel').hidden=true;toast(`Слежение: ${NEIGHBORS[i].name} · N — следующая · мышь — ручная камера`);return;}
 toast('Соседние планеты сейчас за горизонтом. Попробуй другое время суток.');
}
$('observe-planets').onclick=observePlanet;
$('time-place').textContent=`ВРЕМЯ НА ${HOME_PLANET.locative.toUpperCase()}`;
$('time-toggle').onclick=()=>{releaseMouse();keys.clear();jumpQueued=false;modeQueued=false;$('time-panel').hidden=!$('time-panel').hidden;};
$('time-pause').textContent=timeStopped?'▶ Продолжить':'Ⅱ Пауза';
$('time-pause').setAttribute('aria-pressed',String(timeStopped));
$('time-speed').textContent=`Скорость ×${timeSpeed}`;
$('time-pause').onclick=()=>{timeStopped=!timeStopped;$('time-pause').textContent=timeStopped?'▶ Продолжить':'Ⅱ Пауза';$('time-pause').setAttribute('aria-pressed',String(timeStopped));saveWorld();};
$('time-speed').onclick=()=>{timeSpeed=timeSpeed===1?5:timeSpeed===5?20:1;$('time-speed').textContent=`Скорость ×${timeSpeed}`;saveWorld();};
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-hour]'))button.onclick=()=>{
 solarSeconds=secondsAtLocalHour(solarSeconds,Number(button.dataset.hour),player.up);skyTick=1;shadowTick=1;saveWorld();
};

$('reset').onclick=()=>{$('reset-error').hidden=true;openDialog('reset-dialog');$('reset-cancel').focus();};
$('reset-cancel').onclick=()=>openDialog('journal');
$('reset-confirm').onclick=()=>{
 try{clearProgress(localStorage);}catch{$('reset-error').textContent='Не удалось сбросить сохранение в браузере. Новая игра не начата. Попробуй ещё раз.';$('reset-error').hidden=false;return;}
 story=initialStory();exploration=initialExploration();contentState=initialContent();campFound=false;beaconLit=false;knownJourneys.clear();
 adventureUI.reset();azureStory.reset();frontierUI.reset();journeyUI.reset();journalUI.reset();
 player=createPlayer();lookoutLift=0;leaveFireSeat(fireSeat);leaveFireSeat(trailSeat);restingPlace=null;
 solarSeconds=DAY_SECONDS*.43;timeSpeed=1;timeStopped=false;distance=15;elevation=.55;
 residentStates=restoreResidents(null,residentNavigation);for(const r of world.residents)r.up.copy(residentState(r.id).up);
 world.wilderness.setBeacon(false);trackingPlanet=false;observedPlanet=-1;overview=false;worldRestored=false;
 document.body.classList.remove('overview');$('overview-label').hidden=true;$('time-panel').hidden=true;
 $('time-pause').textContent='Ⅱ Пауза';$('time-pause').setAttribute('aria-pressed','false');$('time-speed').textContent='Скорость ×1';
 keys.clear();jumpQueued=false;modeQueued=false;interactTarget=null;$('interact').hidden=true;
 skyTick=1;shadowTick=1;announcedLocation='';updateStory();refreshJournal();saveWorld();
 $<HTMLDialogElement>('reset-dialog').close();canvas.focus();toast('Новая игра началась. Журнал очищен. Мира ждёт у почтового домика.');
};
for(const el of document.querySelectorAll<HTMLButtonElement>('[data-close]'))el.onclick=()=>{$<HTMLDialogElement>(el.dataset.close!).close();canvas.focus();};
for(const d of dialogs)d.addEventListener('close',()=>{keys.clear();canvas.focus();});
window.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLSelectElement||e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
 if(e.target instanceof HTMLButtonElement&&['Space','Enter'].includes(e.code))return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&started&&!isPaused())e.preventDefault();
 if(e.repeat)return;
 if(e.code==='Backquote'||e.key==='~'){e.preventDefault();debugVisible=!debugVisible;debugPanel.hidden=!debugVisible;if(debugVisible){releaseMouse();keys.clear();jumpQueued=false;modeQueued=false;}return;}
 if(e.code==='Escape'){if(!isPaused()){leaveFireSeat(fireSeat);leaveFireSeat(trailSeat);}keys.clear();jumpQueued=false;modeQueued=false;releaseMouse();if(!$('time-panel').hidden)$('time-panel').hidden=true;else if(overview)toggleOverview(false);return;}
 if(isPaused()||!started)return;
 if(e.code==='KeyF'&&!overview){e.preventDefault();requestMovementChange();}else if(e.code==='KeyP'&&!overview)drawPostcard();else if(e.code==='KeyK')openSystemMap();else if(e.code==='KeyN')observePlanet();else if(e.code==='KeyE')interact();else if(e.code==='KeyM')toggleOverview();else if(e.code==='KeyJ')openDialog('journal');else if(!overview){keys.add(e.code);if(e.code==='Space')jumpQueued=true;}
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();jumpQueued=false;modeQueued=false;releaseMouse();});document.addEventListener('visibilitychange',()=>{keys.clear();jumpQueued=false;modeQueued=false;last=0;accumulator=0;frameStats.reset();});
document.addEventListener('pointerlockchange',()=>{
 keys.clear();jumpQueued=false;modeQueued=false;
 if(document.pointerLockElement===canvas&&(overview||isPaused()||!started))releaseMouse();
});
document.addEventListener('pointerlockerror',enableSoftMouse);
canvas.addEventListener('pointerdown',e=>{
 if(e.pointerType==='touch'||!started||isPaused()||e.button!==0)return;
 if(!overview){void captureMouse();return;}
 drag=true;camera.position.copy(globePosition(planetOrbit.orientation,planetOrbit.distance));camera.up.set(0,1,0).applyQuaternion(planetOrbit.orientation);cameraLook.set(0,0,0);camera.lookAt(cameraLook);grabPoint=globePointer(e.clientX,e.clientY);canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');
});
document.addEventListener('mousemove',e=>{
 if(!started||overview||isPaused())return;
 if(document.pointerLockElement!==canvas&&!(softMouse&&e.target===canvas))return;
 if(e.movementX||e.movementY)trackingPlanet=false;
 player.forward.applyAxisAngle(player.up,-e.movementX*.003).normalize();
 elevation=T.MathUtils.clamp(elevation+e.movementY*.003,-1.42,1.15);
});
canvas.addEventListener('pointermove',e=>{
 if(e.pointerType==='touch'||!drag||!overview||isPaused())return;
 const point=globePointer(e.clientX,e.clientY);dragGlobe(planetOrbit.orientation,grabPoint,point);grabPoint=point;
});
function endDrag(){drag=false;canvas.classList.remove('dragging');}
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag);canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{
 if(!started||isPaused())return;e.preventDefault();
 if(overview)planetOrbit.distance=T.MathUtils.clamp(planetOrbit.distance+e.deltaY*.08,160,360);
 else distance=T.MathUtils.clamp(distance+e.deltaY*.015,7,27);
},{passive:false});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
const touch=createTouchControls({canvas,stick:$('touch-stick'),knob:$('touch-knob'),enabled:()=>started&&!isPaused(),overview:()=>overview,
 look:(x,y)=>{trackingPlanet=false;player.forward.applyAxisAngle(player.up,-x*.004).normalize();elevation=T.MathUtils.clamp(elevation+y*.004,-1.42,1.15);},
 globe:(from,to)=>{dragGlobe(planetOrbit.orientation,globePointer(from.x,from.y),globePointer(to.x,to.y));},
 zoom:ratio=>{if(overview)planetOrbit.distance=T.MathUtils.clamp(planetOrbit.distance*ratio,160,360);else distance=T.MathUtils.clamp(distance*ratio,7,27);}});
$('interact').onclick=interact;
function requestMovementChange(){
 if(!started||overview||isPaused())return;
 if(movementAction(player,world.obstacles)){modeQueued=true;trackingPlanet=false;}
 else toast(player.mode==='swim'?'Подплыви к пологому берегу, чтобы выйти из воды.':'Подойди к воде по пологому берегу, чтобы поплыть.');
}
$('movement-action').onclick=requestMovementChange;
let shoreTick=0,shoreAction:MovementMode|null=null;
function updateMovementControl(paused:boolean){
 const button=$<HTMLButtonElement>('movement-action');
 button.hidden=paused||!shoreAction;
 const text=shoreAction==='swim'?'Плавать':'На берег';
 button.setAttribute('aria-label',text);
 if(button.querySelector('span')!.textContent!==text)button.querySelector('span')!.textContent=text;
 $('movement-status').hidden=paused||player.mode!=='swim';
 $('touch-jump').hidden=player.mode==='swim';
}

$('touch-jump').addEventListener('pointerdown',e=>{e.preventDefault();if(started&&!overview&&!isPaused()&&player.mode==='walk')jumpQueued=true;});
setupFullscreen($('mobile-fullscreen'),toast,()=>{closeMobileMenu();releaseMouse();keys.clear();jumpQueued=false;modeQueued=false;});
function closeMobileMenu(){$('mobile-actions').hidden=true;$('mobile-menu').setAttribute('aria-expanded','false');}
$('mobile-menu').onclick=()=>{const open=$('mobile-actions').hidden;releaseMouse();keys.clear();jumpQueued=false;modeQueued=false;$('mobile-actions').hidden=!open;$('mobile-menu').setAttribute('aria-expanded',String(open));};
for(const [id,action] of Object.entries({'mobile-overview':()=>toggleOverview(),'mobile-system':openSystemMap,'mobile-journal':()=>openDialog('journal'),'mobile-postcard':()=>{if(!overview)drawPostcard();},'mobile-help':()=>openDialog('help')}))$(id).onclick=()=>{closeMobileMenu();action();};
$('mobile-quality').onclick=()=>{const next=quality==='economy'?'balanced':quality==='balanced'?'high':'economy';applyQuality(next);$<HTMLSelectElement>('quality-select').value=next;$('mobile-quality').textContent=`Графика: ${QUALITY[next].label.toLowerCase()}`;};
if(touchMode){applyQuality('economy');$<HTMLSelectElement>('quality-select').value='economy';$('overview-label').querySelector('small')!.textContent='Потяни планету для вращения · Два пальца — масштаб · Меню — назад';}
let soundChosen=false;
let audioOn=false;
const soundscape=new Soundscape(world.soundTrees);
const worldAudio=new WorldAudio(import.meta.env.BASE_URL,()=>{$('sound-status').textContent='Часть звуков не загрузилась. Выключи и включи звук, чтобы повторить.';});
const hiddenBell=world.adventures.points.find(p=>p.id==='bell')!.up;
const gardenBell=normalAt(23,5);
const MUSIC_SAVE_KEY='little-orbit-music-v1';
let savedMusic:string|null=null;
try{savedMusic=localStorage.getItem(MUSIC_SAVE_KEY);}catch{}
const music=new MusicPlayer(new Audio(),MUSIC_TRACKS,import.meta.env.BASE_URL,
 track=>{$('music-current').textContent=track.title;},
 ()=>{$('music-current').textContent='Трек не загрузился. Попробуй следующий или включи звук снова.';},savedMusic);
$('music-current').textContent=music.current.title;
function saveMusic(){try{localStorage.setItem(MUSIC_SAVE_KEY,music.snapshot());}catch{}}
window.addEventListener('pagehide',saveMusic);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveMusic();});
window.setInterval(saveMusic,1000);
for(const track of MUSIC_TRACKS){
 const item=document.createElement('li'),link=document.createElement('a');
 link.href=`https://incompetech.com/music/royalty-free/index.html?isrc=${track.isrc}`;
 link.textContent=track.title;link.target='_blank';link.rel='noopener noreferrer';item.append(link);$('music-credits').append(item);
}
function toggleSound(){
 soundChosen=true;
 audioOn=!audioOn;music.setEnabled(audioOn);worldAudio.setEnabled(audioOn);
 if(audioOn)$('sound-status').textContent='';
 $('sound').style.background=audioOn?'#738568':'#24363555';
 for(const id of ['sound','music-toggle']){
  $(id).setAttribute('aria-label',audioOn?'Выключить музыку и звуки':'Включить музыку и звуки');
  $(id).setAttribute('aria-pressed',String(audioOn));
 }
 $('music-toggle').textContent=audioOn?'♫ Звук включён':'♫ Включить звук';

}
$('sound').onclick=toggleSound;
$('music-toggle').onclick=toggleSound;
function renderMusicTransition(){
 const state=music.status,busy=state==='switching'||state==='loading';
 const button=$<HTMLButtonElement>('music-next');
 const label=state==='switching'?'Переключаем…':state==='loading'?'Загружаем трек…':'Следующий трек →';
 if(button.textContent!==label)button.textContent=label;
 button.disabled=state==='switching';button.setAttribute('aria-busy',String(busy));
 $('music-transition').hidden=!busy;
 const description=state==='switching'?'Плавно приглушаем текущую мелодию…':'Загружаем: '+music.current.title;
 if(busy&&$('music-transition-label').textContent!==description)$('music-transition-label').textContent=description;
 const progress=$<HTMLProgressElement>('music-transition-progress');
 if(state==='switching')progress.value=music.switchProgress;
 else if(progress.hasAttribute('value'))progress.removeAttribute('value');
}
$('music-next').onclick=()=>{music.next();renderMusicTransition();};
$('music-volume').oninput=()=>music.setVolume(Number($<HTMLInputElement>('music-volume').value)/100);
const updateMixVolumes=()=>worldAudio.setVolumes(Number($<HTMLInputElement>('ambience-volume').value)/100,Number($<HTMLInputElement>('effects-volume').value)/100);
$('ambience-volume').oninput=updateMixVolumes;$('effects-volume').oninput=updateMixVolumes;
music.setHidden(document.hidden);worldAudio.setHidden(document.hidden);
document.addEventListener('visibilitychange',()=>{music.setHidden(document.hidden);worldAudio.setHidden(document.hidden);});

const facing=player.forward.clone(),right=new T.Vector3(),matrix=new T.Matrix4(),desiredCamera=new T.Vector3(),desiredUp=new T.Vector3(),look=new T.Vector3(),cameraLook=new T.Vector3(-25,0,0);
function pose(object:T.Object3D,up:T.Vector3,heading:T.Vector3,height:number){right.crossVectors(heading,up).normalize();matrix.makeBasis(right,up,heading.clone().negate());object.quaternion.setFromRotationMatrix(matrix);object.position.copy(up).multiplyScalar(height);}
let announcedLocation='',locationVisibleUntil=0;
const locationBanner=document.querySelector<HTMLElement>('.location')!;
function nearby(){
 const newReading=nextDiscoveryReading([
  ...world.landmarks.places.map(p=>({id:p.id,distance:p.up.distanceTo(player.up)*RADIUS,radius:7,unread:!exploration.places.includes(p.id)||azureStory.unread(p.id)||frontierUI.unread(p.id)})),
  {id:'astronomer-note',distance:world.camp.noteUp.distanceTo(player.up)*RADIUS,radius:3.2,unread:!campFound},
 ],!started||overview||isPaused());
 if(newReading){if(newReading==='astronomer-note')readCamp();else inspectPlace(newReading);}


 interactTarget=null;let best=3.2;
 for(const r of world.residents){if(residentState(r.id).inside)continue;const d=r.up.distanceTo(player.up)*RADIUS;if(d<best){best=d;interactTarget={kind:'resident',id:r.id,name:r.name};}}
 for(const p of PEOPLE){const h=HOMES[p.id],d=h.porch.distanceTo(player.up)*RADIUS;if(residentState(p.id).inside&&d<best){best=d;interactTarget={kind:'home',id:p.id,name:p.name};}}
 for(const l of world.letters){if(!l.root.visible)continue;const d=l.up.distanceTo(player.up)*RADIUS;if(d<best){best=d;interactTarget={kind:'letter',id:l.id,name:l.name};}}
 const campDistance=world.camp.noteUp.distanceTo(player.up)*RADIUS;if(campDistance<best){best=campDistance;interactTarget={kind:'camp',name:CAMP.name};}
 for(const place of world.landmarks.places){const d=place.inspectUp.distanceTo(player.up)*RADIUS;if(d<best){best=d;interactTarget={kind:'place',id:place.id,name:place.name};}}
 for(const p of world.adventures.points){if(p.id==='traveler'||!adventureUI.available(p.id))continue;const d=p.inspectUp.distanceTo(player.up)*RADIUS;if(d<best){best=d;interactTarget={kind:'adventure',id:p.id,name:p.name};}}
 $('interact').hidden=!interactTarget||overview||isPaused();if(interactTarget)$('interact').querySelector('span')!.textContent=interactTarget.kind==='home'?`Постучать · ${interactTarget.name}`:interactTarget.kind==='resident'?`Поговорить · ${interactTarget.name}`:interactTarget.kind==='camp'?'Прочитать записку':(interactTarget.kind==='place'||interactTarget.kind==='adventure')?`Осмотреть · ${interactTarget.name}`:'Подобрать письмо';
 if(fireSeat.phase==='seated'&&!overview&&!isPaused()){$('interact').hidden=false;$('interact').querySelector('span')!.textContent='Послушать у костра · Ной';}
 const surface=sample(player.up);const {x,z}=coordinates(player.up);let name=surface.region,sub=surface.biome==='mountain'?'Ищи пологие склоны и проходы между вершинами':surface.biome==='hill'?'Выше луга — дальше горизонт':'За каждым холмом — что-то новое';
 if(player.up.distanceTo(CAMP.up)*RADIUS<8){name=CAMP.name;sub='Кто-то тоже смотрел на далёкие миры.';}
 else if(surface.wet){name=surface.region;sub='Река несёт тебя дальше · выходи у пологого берега';}
 else if(player.up.y>.45&&Math.hypot(x-12,z-30)<18){name='Озеро Тихое';sub='Остановись. Послушай воду.';}
 else if(sample(player.up).bridge){name='Старый мост';sub='Два берега одной истории';}
 else if(player.up.y>.45&&z< -21&&z> -32&&x>3&&x<16){name='Каменистый брод';sub='Сухие камни соединяют берега';}
 else if(player.up.y>.45&&Math.hypot(x+7,z+14)<13){name='Почтовая поляна';sub='Каждое письмо кого-то ждёт';}
 else if(player.up.y>.45&&Math.abs(x)<10&&Math.abs(z)<10){name='Луговая тропа';sub='Всё большое начинается с малого';}
 const place=ALL_LANDMARKS.find(p=>p.up.distanceTo(player.up)*RADIUS<9);if(place){name=place.name;sub=place.id==='lookout'?(atObservatoryNight(solarSeconds)?'Ночь открывает соседние миры.':'Здесь ждут наступления ночи.'):'Остановись и осмотрись · E рядом с находкой';}
 if(!overview&&!isPaused()&&name!==announcedLocation){
  announcedLocation=name;locationVisibleUntil=performance.now()+4500;
  $('location-name').textContent=name;$('location-sub').textContent=sub;
 }
 locationBanner.classList.toggle('location-visible',!overview&&!isPaused()&&performance.now()<locationVisibleUntil);
 journeyUI.update(journeyEntries(journeySnapshot()));

}
let uiTick=0;
const welcomeSpinOrigin=solarState(solarSeconds).spinAngle,welcomeAxis=new T.Vector3(0,0,1);
camera.position.set(100,155,143);camera.lookAt(cameraLook);
renderer.setAnimationLoop((ms:number)=>{
 if(document.hidden){last=0;return;}
 if(started&&(worldSaveTick+=last?Math.min((ms-last)/1000,.05):0)>=1){worldSaveTick=0;saveWorld();}
 const cpuStart=performance.now();const frameMs=last?ms-last:1000/60;
 const dt=Math.min(frameMs/1000,.05);last=ms;time+=dt;
 if(!timeStopped&&!dialogs.some(d=>d.open&&d.id!=='system-map-dialog'))solarSeconds+=dt*timeSpeed;
 const paused=isPaused()||overview||!started;
 $('touch-controls').hidden=!touchMode||paused;
 $('mobile-menu').hidden=!touchMode||!started||dialogs.some(d=>d.open);
 $('rotate-hint').hidden=!touchMode||!started||isPaused();
 if(isPaused()||!started){touch.reset();jumpQueued=false;modeQueued=false;}
 if(!paused)wildlifeTime+=dt;
 if((wildlifeTick+=dt)>=.05){wildlife.update(wildlifeTime,paused?0:wildlifeTick,player.up,solar.state.sunDirection);wildlifeTick=0;}
 if(!paused){accumulator+=dt;while(accumulator>=1/60&&!isPaused()){
  const finger=touch.read();
  const input={forward:finger.forward+Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),right:finger.right+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),run:finger.run||keys.has('ShiftLeft')||keys.has('ShiftRight'),jump:jumpQueued,toggleMode:modeQueued};
  const old=player.up.clone(),oldMode=player.mode;
  if(input.forward||input.right||input.jump||input.toggleMode){leaveFireSeat(fireSeat);leaveFireSeat(trailSeat);}
  if(lookoutLift>0&&trailSeat.phase==='idle'){player.moving=false;}else if(trailSeat.phase!=='idle'&&guestNavigation){
   const rest=world.wilderness.places.find(p=>p.id===restingPlace)!;const result=advanceFireSeat(trailSeat,player,guestNavigation,world.obstacles,1/60,true,rest.restUp!);if(result==='arrived')toast(rest.climbHeight?'Поднимаемся на площадку · движение или Esc — спуститься':'Можно отдохнуть · движение или Esc — встать');if(result==='cancelled')toast('Не удалось подойти к бревну. Попробуй с другой стороны.');
  }else if(fireSeat.phase!=='idle'&&guestNavigation){
   const result=advanceFireSeat(fireSeat,player,guestNavigation,world.obstacles,1/60,noahIsTelling(solarSeconds,residentState('noah')));
   if(result==='arrived'){toast('Ты сидишь у костра · WASD или прыжок — встать');adventureUI.fireside();}
   else if(result==='cancelled')toast('Посиделки закончились или к месту нет свободного подхода.');
  }else step(player,input,1/60,world.obstacles);
  if(oldMode!==player.mode){shoreTick=1;toast(player.mode==='swim'?(touchMode?'Плывёшь · у берега появится «На берег»':'Плывёшь · F у пологого берега — выйти на сушу'):'Ты на берегу · можно идти дальше');}jumpQueued=false;modeQueued=false;
  facing.applyQuaternion(new T.Quaternion().setFromUnitVectors(old,player.up)).projectOnPlane(player.up).normalize();
  if(player.moving){const direction=player.up.clone().sub(old).projectOnPlane(player.up).normalize();facing.lerp(direction,.18).normalize();}
  accumulator-=1/60;
 }}else accumulator=0;
 if(fireSeat.phase==='seated')facing.copy(FIRE_UP).projectOnPlane(player.up).normalize();
 const liftTarget=trailSeat.phase==='seated'?(world.wilderness.places.find(p=>p.id===restingPlace)?.climbHeight??0):0;
 if(!paused)lookoutLift+=T.MathUtils.clamp(liftTarget-lookoutLift,-dt*1.8,dt*1.8);
 if(lookoutLift>0)player.position.copy(player.up).multiplyScalar(player.groundHeight+player.jumpHeight+lookoutLift);
 if(trailSeat.phase==='seated')facing.copy(world.wilderness.places.find(p=>p.id===restingPlace)!.restFacing).projectOnPlane(player.up).normalize();
 pose(hero.root,player.up,facing,player.position.length());hero.animate(time,!paused&&player.moving,player.mode==='swim',fireSeat.phase==='seated'||(trailSeat.phase==='seated'&&restingPlace!=='azure-beacon')?'sit':undefined);
 world.frontier.update(frontierUI.state.wind==='repaired'||frontierUI.state.wind==='complete',time);
 if((shoreTick+=dt)>=.2){shoreTick=0;shoreAction=paused?null:movementAction(player,world.obstacles);}
 updateMovementControl(paused);
 const listeningToNoah=$<HTMLDialogElement>('conversation').open&&$('speaker').textContent==='Ной'&&noahIsTelling(solarSeconds,residentState('noah'));
 const residentPaused=!started||dialogs.some(d=>d.open&&d.id!=='system-map-dialog'&&!(d.id==='conversation'&&listeningToNoah));
 if(!residentPaused)residentAnimationTime+=dt;
 fireBurning=advanceResidents(residentStates,residentNavigation,{dt,seconds:solarSeconds,paused:residentPaused,player:player.up,party:adventureUI.party()});
 for(const r of world.residents){
  const state=residentState(r.id);
  r.up.copy(state.up);r.model.root.visible=!state.inside;
  const heading=state.heading.clone();
  if(state.activity==='sit'||state.activity==='tell')heading.copy(FIRE_UP).projectOnPlane(state.up).normalize();
  else if(state.activity==='water'||state.activity==='inspect')heading.set(0,0,-1).projectOnPlane(state.up).normalize();
  else if(state.activity==='observe')heading.copy(LANDMARKS[2].up).projectOnPlane(state.up).normalize();
  else if($<HTMLDialogElement>('conversation').open&&state.up.distanceTo(player.up)*RADIUS<3.5)heading.copy(player.up).projectOnPlane(state.up).normalize();
  const visualUp=state.up.clone();
  if(state.transition!==0)visualUp.lerp(HOMES[r.id].door,Math.min(1,Math.abs(state.transition)/1.5)).normalize();
  pose(r.model.root,visualUp,heading.lengthSq()>.001?heading:state.heading,sample(visualUp).height);
  r.model.animate(residentAnimationTime+r.phase,state.moving||state.transition!==0,false,state.activity);
 }
 for(const door of world.doors){const r=residentState(door.id as PersonId),angle=r.transition!==0||r.visit>0?-1.3:0;door.swing.rotation.y+=(angle-door.swing.rotation.y)*Math.min(1,dt*7);}
 world.hearth.update(time,fireBurning);
 world.adventures.update(adventureUI.state,solarSeconds,time,player.up,adventureUI.party(),homeLit('noah',solarSeconds,residentState('noah').inside));
 music.setDucked($<HTMLDialogElement>('conversation').open);
 music.update(frameMs/1000);
 renderMusicTransition();
 worldAudio.setActive(started&&!overview);
 worldAudio.update(soundscape.update(dt,{up:player.up,forward:player.forward,sun:solar.state.sunDirection,
  active:audioOn&&started&&!overview,walking:!paused,moving:player.moving,grounded:player.grounded&&player.mode==='walk',
  bell:adventureUI.state.bell==='complete'?gardenBell:adventureUI.state.bell==='searching'&&adventureUI.state.tracks===2?hiddenBell:null,
  bellInterval:adventureUI.state.bell==='complete'?35:5,fire:fireBurning?FIRE_UP:null}));
 for(const l of world.letters){l.envelope.position.y=.95+Math.sin(time*2+l.x)*.12;l.envelope.rotation.y=time*.6;l.ring.scale.setScalar(1+Math.sin(time*2)*.08);}
 world.waveTime.value=time;world.water.material.opacity=.87+Math.sin(time*.6)*.025;if((cloudTick+=dt)>=1/20){world.updateClouds(time,solar.state.sunDirection);cloudTick=0;}
 if(trackingPlanet&&!paused){const aim=planetAim(observedPlanet,solarSeconds,player.up,player.forward);
  if(aim){player.forward.copy(aim.forward);elevation=aim.elevation;neighbors.update(solarSeconds);}else{trackingPlanet=false;toast(`${NEIGHBORS[observedPlanet].name} скрывается за горизонтом.`);}
 }
 if(overview){
  desiredCamera.copy(globePosition(planetOrbit.orientation,planetOrbit.distance));desiredUp.set(0,1,0).applyQuaternion(planetOrbit.orientation);look.set(0,0,0);
 }else if(!started){
  const rotation=welcomeSpinOrigin-solarState(solarSeconds).spinAngle;
  desiredCamera.set(100,155,143).applyAxisAngle(welcomeAxis,rotation);desiredUp.set(0,1,0).applyAxisAngle(welcomeAxis,rotation);look.set(-27,0,0).applyAxisAngle(welcomeAxis,rotation);
 }else{
  const swimming=player.mode==='swim';
  look.copy(player.position).addScaledVector(player.up,swimming?.45:1.25);
  desiredCamera.copy(player.position).addScaledVector(player.forward,-distance*Math.cos(elevation)).addScaledVector(player.up,distance*Math.sin(elevation)+(swimming?.65:1.5));
  // Keep the orbit camera above hills even at its lowest angle.
  const n=desiredCamera.clone().normalize(),surface=sample(n);const min=Math.max(surface.height,surface.wet?surface.waterLevel:0)+1.5;
  if(desiredCamera.length()<min)desiredCamera.copy(n).multiplyScalar(min);
  look.copy(desiredCamera).addScaledVector(player.forward,distance*Math.cos(elevation)).addScaledVector(player.up,-distance*Math.sin(elevation));
  desiredUp.copy(player.up);
 }
 if(trackingPlanet&&!paused)look.copy(neighborSkyPosition(observedPlanet,solarSeconds));
 const ease=overview&&drag?1:1-Math.exp(-dt*3.8);camera.position.lerp(desiredCamera,ease);camera.up.lerp(desiredUp,ease).normalize();if(trackingPlanet&&!paused)cameraLook.copy(look);else cameraLook.lerp(look,ease);camera.lookAt(cameraLook);
 camera.updateMatrixWorld();
 if(started&&(uiTick+=dt)>.1){nearby();uiTick=0;}
 if(time>toastUntil)$('toast').hidden=true;
 if((hudTick+=dt)>=.1){hudTick=0;
 for(const {place,el} of adventureMarkers){
  const p=place.up.clone().multiplyScalar(sample(place.up).height+3),v=p.clone().project(camera);
  const s=adventureUI.state,show=['meteor','cave','traveler'].includes(place.id)||(place.id==='festival'&&adventureUI.party())||(s.bell==='searching'&&place.id===(s.tracks===0?'track-1':s.tracks===1?'track-2':'bell'));
  el.hidden=!show||!overview||isPaused()||hiddenByPlanet(camera.position,new T.Sphere(p,1))||v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1;
  if(!el.hidden){el.style.left=`${(v.x*.5+.5)*innerWidth}px`;el.style.top=`${(-v.y*.5+.5)*innerHeight}px`;el.textContent=`◇ ${place.name} · ${Math.round(player.up.angleTo(place.up)*RADIUS)} м`;}
 }
 for(const {place,el} of placeMarkers){const position=place.up.clone().multiplyScalar(sample(place.up).height+4),point=position.clone().project(camera);
  el.hidden=!overview||isPaused()||hiddenByPlanet(camera.position,new T.Sphere(position,1))||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;
  if(!el.hidden){el.style.left=`${(point.x*.5+.5)*innerWidth}px`;el.style.top=`${(-point.y*.5+.5)*innerHeight}px`;el.textContent=`${exploration.places.includes(place.id)?'✓ '+place.name:'◇ Неизведанное место'} · ${Math.round(player.up.angleTo(place.up)*RADIUS)} м`;}
 }
 const campPosition=CAMP.up.clone().multiplyScalar(sample(CAMP.up).height+2.5),campPoint=campPosition.clone().project(camera);
 campMarker.hidden=!overview||isPaused()||hiddenByPlanet(camera.position,new T.Sphere(campPosition,.5))||campPoint.z>1||Math.abs(campPoint.x)>1||Math.abs(campPoint.y)>1;
 if(!campMarker.hidden){campMarker.style.left=`${(campPoint.x*.5+.5)*innerWidth}px`;campMarker.style.top=`${(-campPoint.y*.5+.5)*innerHeight}px`;campMarker.textContent=`⌂ ${campFound?CAMP.name:'Одинокая палатка'} · ${Math.round(player.up.angleTo(CAMP.up)*RADIUS)} м`;}

 }
 for(const {p,el} of homeMarkers){const up=HOMES[p.id].up,position=up.clone().multiplyScalar(sample(up).height+4),point=position.clone().project(camera);el.hidden=!started||!overview||point.z>1||hiddenByPlanet(camera.position,new T.Sphere(position,1));if(!el.hidden){el.style.left=`${(point.x*.5+.5)*innerWidth}px`;el.style.top=`${(-point.y*.5+.5)*innerHeight}px`;el.textContent=`⌂ ${p.id==='noah'?'Повозка Ноя':'Дом · '+p.name}${residentState(p.id).inside?' · дома':''}`;}}
 // Screen-space names follow the same camera frame as the rendered residents.
 for(const {r,el} of nameTags){
  const distanceTo=r.up.distanceTo(player.up)*RADIUS;
  const point=r.up.clone().multiplyScalar(sample(r.up).height+2.8).project(camera);
  el.hidden=!started||residentState(r.id).inside||isPaused()||(!overview&&distanceTo>24)||hiddenByPlanet(camera.position,new T.Sphere(r.up.clone().multiplyScalar(sample(r.up).height+2),1))||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;
  if(!el.hidden){el.style.left=`${(point.x*.5+.5)*innerWidth}px`;el.style.top=`${(-point.y*.5+.5)*innerHeight}px`;el.textContent=(r.id==='mira'&&story.phase!=='complete'?'◇ ':'')+r.name+' · '+ACTIVITY_LABEL[residentState(r.id).activity];}
 }
 lockHint.hidden=touchMode||!started||overview||isPaused()||document.pointerLockElement===canvas||softMouse;
 skySystem.followCamera(camera,overview||!started);
 if((skyTick+=dt)>=.05){skyTick=0;world.night.update(time,solar.state.sunDirection,Object.fromEntries(residentStates.map(r=>[r.id,homeLit(r.id,solarSeconds,r.inside)])));if($<HTMLDialogElement>('system-map-dialog').open)systemMap.update(solarSeconds);neighbors.update(solarSeconds);solar=skySystem.update(solarSeconds,camera,player.up,overview||!started);
 const hours=localHours(solarSeconds,player.up);
 $('time-clock').textContent=`${Math.floor(hours).toString().padStart(2,'0')}:${Math.floor(hours%1*60).toString().padStart(2,'0')}`;
 $('time-phase').textContent=localPhase(solarSeconds,player.up);

 const orbitAngle=solarSeconds/YEAR_SECONDS*Math.PI*2;
 $('orbit-dot').setAttribute('cx',String(50+39*Math.cos(orbitAngle)));$('orbit-dot').setAttribute('cy',String(35+23*Math.sin(orbitAngle)));
 }
 if((shadowTick+=dt)>=1/QUALITY[quality].shadowHz){renderer.shadowMap.needsUpdate=true;shadowTick%=1/QUALITY[quality].shadowHz;}
 if((sectorTick+=dt)>=.1||drag){sectorTick=0;if(world.decor.update(camera.position,solar.state.sunDirection))renderer.shadowMap.needsUpdate=true;}
 if(renderer.shadowMap.needsUpdate)skySystem.syncSun(solar.state.sunDirection);
 if($<HTMLDialogElement>('system-map-dialog').open)systemMap.render();else renderer.render(scene,camera);
 frameStats.record(frameMs,performance.now()-cpuStart);
 if(debugVisible&&(debugTick+=dt)>=.25){debugTick=0;const stats=frameStats.snapshot();renderer.getDrawingBufferSize(renderSize);
 $('debug-stats').textContent=`FPS          ${stats.fps.toFixed(1)}
Кадр         ${stats.meanMs.toFixed(1)} мс
P95 / макс   ${stats.p95Ms.toFixed(1)} / ${stats.maxMs.toFixed(1)} мс
CPU          ${stats.cpuMs.toFixed(1)} мс
Draw calls   ${renderer.info.render.calls}
Треугольники ${renderer.info.render.triangles.toLocaleString('ru')}
Секторы      ${world.decor.stats.visible} / ${world.decor.stats.total}
Дальний LOD  ${world.decor.stats.far}
Геометрии    ${renderer.info.memory.geometries}
Текстуры     ${renderer.info.memory.textures}
Буфер        ${renderSize.x} × ${renderSize.y}
DPR          ${renderer.getPixelRatio().toFixed(2)}
Тени         ${QUALITY[quality].shadowSize}px · ${QUALITY[quality].shadowHz} Гц`;
 }

});
$('loading').hidden=true;
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();saveWorld();$('loading').hidden=false;$('loading').textContent='3D-контекст потерян. Обнови страницу — найденные письма сохранены.';renderer.setAnimationLoop(null);});
