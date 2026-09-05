import {MusicPlayer,MUSIC_TRACKS} from './music.ts';
import {createTouchControls} from './touch.ts';
import {createAdventureUI} from './adventure-ui.ts';
import {initialContent,restoreContent,reduceContent,contentObjective,irisCanBeObserved,IRIS_ENDING,CLUE_TEXT,type ContentAction} from './content.ts';
import {postcardMarkup} from './postcards.ts';
import {createWildlife} from './wildlife.ts';
import {resizeShadow} from './shadows.ts';
import {LANDMARKS,initialExploration,restoreExploration,discoverPlace,atObservatoryNight,ADA_OBSERVATORY_UP,canRelocateResident} from './landmarks.ts';
import {CAMP} from './discoveries.ts';
import {hiddenByPlanet} from './sectors.ts';
import {createSystemMap} from './system-map.ts';
import {FrameStats,QUALITY,type Quality} from './performance.ts';
import {createNeighbors,NEIGHBORS,neighborDirection,planetAim,neighborSkyPosition} from './planets.ts';
import {trackballPoint,dragGlobe,globePosition} from './camera.ts';
import {createSky,localPhase,DAY_SECONDS,YEAR_SECONDS} from './sky.ts';
import * as T from 'three';
import {buildWorld,character} from './view.ts';
import {createPlayer,step} from './simulation.ts';
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
function saveWorld(){
 if(!started)return;
 try{localStorage.setItem(WORLD_SAVE_KEY,serializeWorld({player,solarSeconds,timeSpeed,timeStopped,distance,elevation}));}
 catch{if(!worldSaveWarning){worldSaveWarning=true;toast('Не удалось сохранить мир. После закрытия вкладки последние изменения могут потеряться.');}}
}
window.addEventListener('pagehide',saveWorld);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveWorld();});
let exploration=initialExploration(),adaAtObservatory=false;try{exploration=restoreExploration(localStorage.getItem('little-orbit-exploration-v1'));}catch{}
let campFound=false;try{campFound=localStorage.getItem('little-orbit-camp-v1')==='found';}catch{}
let contentState=initialContent();try{contentState=restoreContent(localStorage.getItem('little-orbit-content-v1'));}catch{}
if(campFound)contentState=reduceContent(contentState,{type:'clue',id:'camp'});
let interactTarget:{kind:'adventure';id:string;name:string}|{kind:'place';id:string;name:string}|{kind:'camp';name:string}|{kind:'resident';id:ResidentId;name:string}|{kind:'letter';id:string;name:string}|null=null;
const keys=new Set<string>();let jumpQueued=false,drag=false,softMouse=false;
const planetOrbit={orientation:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(new T.Vector3(100,155,143),new T.Vector3(),new T.Vector3(0,1,0))),distance:Math.hypot(100,155,143)};
let grabPoint=new T.Vector3();
function globePointer(x:number,y:number){
 const rect=canvas.getBoundingClientRect();
 const radius=rect.height*.5*RADIUS/Math.sqrt(planetOrbit.distance**2-RADIUS**2)/Math.tan(T.MathUtils.degToRad(camera.fov*.5));
 return trackballPoint((x-rect.left-rect.width*.5)/radius,(rect.top+rect.height*.5-y)/radius);
}
const lockHint=document.createElement('div');lockHint.className='mouse-hint';lockHint.hidden=true;lockHint.textContent='Клик по миру — управлять камерой · Esc — освободить мышь';document.body.append(lockHint);
const systemMap=createSystemMap($('system-map'));
const dialogs=['conversation','journal','help','system-map-dialog'].map(id=>$<HTMLDialogElement>(id));
const isPaused=()=>dialogs.some(d=>d.open)||!$('time-panel').hidden||!$('mobile-actions').hidden;
function toast(message:string){$('toast').textContent=message;$('toast').hidden=false;toastUntil=time+4;}
function save(){try{localStorage.setItem('little-orbit-story-v1',JSON.stringify(story));}catch{toast('Прогресс сохранён только до закрытия этой вкладки.');}}
function updateStory(action?:Action){if(action){story=reduceStory(story,action);save();}
 $('quest-title').textContent=story.phase==='new'?'Первое знакомство':story.phase==='complete'?'Теперь ты здесь свой':'Письма на ветру';
 $('quest-summary').textContent=story.phase==='new'?'Поговори с Мирой у почтового домика.':story.phase==='complete'?'Письма доставлены. Продолжай исследовать маленький мир.':story.letters.length===3?'Все письма найдены! Вернись к Мире у почтового домика.':'Найди три письма: у моста, на берегу и на холме.';
 $('quest-count').textContent=story.phase==='new'?'Новая история ждёт тебя':story.phase==='complete'?'История завершена · спасибо тебе!':`${story.letters.length} / 3 писем найдено`;
 $('progress-fill').style.width=`${story.letters.length/3*100}%`;
 $('journal-text').textContent=$('quest-summary').textContent;
 $('letter-list').replaceChildren(...LETTERS.map(l=>{const row=document.createElement('div');row.className='letter-row';const icon=document.createElement('span');icon.textContent=story.letters.includes(l.id)?'✓':'✉';const info=document.createElement('span');info.textContent=l.name;const hint=document.createElement('small');hint.textContent=l.hint;info.append(hint);row.append(icon,info);return row;}));
 for(const l of world.letters)l.root.visible=story.phase==='active'&&!story.letters.includes(l.id);
}
updateStory();
const campMarker=document.createElement('div');campMarker.className='camp-marker';campMarker.hidden=true;document.body.append(campMarker);
const placeMarkers=LANDMARKS.map(place=>{const el=document.createElement('div');el.className='camp-marker';el.hidden=true;document.body.append(el);return {place,el};});
const nameTags=world.residents.map(r=>{
 const el=document.createElement('div');el.className='resident-label';el.hidden=true;el.textContent=r.name;document.body.append(el);return {r,el};
});
function openDialog(id:string){releaseMouse();keys.clear();jumpQueued=false;drag=false;for(const d of dialogs)if(d.open)d.close();$<HTMLDialogElement>(id).showModal();}
function talk(id:ResidentId,topic='greeting'){
 const r=world.residents.find(r=>r.id===id)!;
 const nightTalk=id==='ada'&&adaAtObservatory&&atObservatoryNight(solarSeconds);
 const line:Dialogue=nightTalk?(topic==='iris'?{text:'Ирис — тот лиловый мир с тонким кольцом. Он обращается вокруг солнца медленнее нашего. Иногда он прячется за горизонтом: попробуй N, чтобы следить за доступными планетами, или K, чтобы рассмотреть всю систему.',choices:[{text:'Попробую найти его'}]}:{text:'Ты всё-таки пришёл! Отсюда лучше видно небо. Я видела в старом лагере ту же схему, что выбита на Арке ветров: пять миров вокруг солнца. Когда-нибудь мы доберёмся до каждого. А сегодня начнём с наблюдений.',choices:[{text:'Расскажи об Ирисе',next:'iris'},{text:'Спасибо за этот вечер'}]}):dialogue(id,story,topic);
 if(nightTalk&&!exploration.nightMeeting){exploration={...discoverPlace(exploration,'lookout'),nightMeeting:true};saveExploration();updateExplorationJournal();toast('Открытие: вечер у телескопа с Адой.');}
 $('speaker').textContent=r.name;$('speaker-role').textContent=r.role;$('portrait').textContent=r.name[0];$('speech').textContent=line.text;
 $('choices').replaceChildren(...line.choices.map(choice=>{const button=document.createElement('button');button.textContent=choice.text;button.onclick=()=>{if(choice.next){talk(id,choice.next);return;}if(choice.action){updateStory({type:choice.action});toast(choice.action==='accept'?'Новая история: «Письма на ветру»':'История завершена. В Тихой долине стало на одного друга больше.');}$<HTMLDialogElement>('conversation').close();canvas.focus();};return button;}));
 if(id==='mira')addContentChoice('Открытки для долины',postcardConversation);
 if(id==='ada'&&contentState.iris!=='dormant')addContentChoice('Знаки из старого лагеря',irisConversation);
 adventureUI.residentChoices(id);
 if(!$<HTMLDialogElement>('conversation').open)openDialog('conversation');
}
function updateCampJournal(){
 $('camp-journal').textContent=campFound?'✓ Лагерь астронома · В записке упоминаются огни на кольцах Ириса.':'◇ На дальней стороне есть одинокая палатка. Ищи отметку в обзоре планеты (M).';
 $('camp-read').hidden=!campFound;
}
function readCamp(){
 updateContent({type:'clue',id:'camp'});
 campFound=true;try{localStorage.setItem('little-orbit-camp-v1','found');}catch{toast('Открытие сохранено только до закрытия вкладки.');}updateCampJournal();
 $('speaker').textContent='Записка астронома';$('speaker-role').textContent=CAMP.name;$('portrait').textContent='✧';$('speech').textContent=CAMP.text+' На полях нарисованы каменная арка, лист и телескоп. Похоже, автор оставил ещё несколько отметок. Следующий шаг записан в журнале.';
 const close=document.createElement('button');close.textContent='Сохранить в памяти';close.onclick=()=>{$<HTMLDialogElement>('conversation').close();};$('choices').replaceChildren(close);openDialog('conversation');
}
updateCampJournal();$('camp-read').onclick=readCamp;
function saveExploration(){try{localStorage.setItem('little-orbit-exploration-v1',JSON.stringify(exploration));}catch{toast('Открытия сохранятся только до закрытия вкладки.');}}
function updateExplorationJournal(){
 $('discovery-count').textContent=`Открытые места · ${exploration.places.length} / ${LANDMARKS.length}`;
 $('discovery-list').replaceChildren(...LANDMARKS.map(place=>{
  const found=exploration.places.includes(place.id),row=document.createElement('div');row.className='discovery-row';
  const title=document.createElement('strong');title.textContent=(found?'✓ ':'◇ ')+place.name;
  const hint=document.createElement('p');hint.textContent=place.hint;row.append(title,hint);
  if(found){const button=document.createElement('button');button.textContent='Перечитать';button.onclick=()=>inspectPlace(place.id);row.append(button);}return row;
 }));
 $('night-meeting').textContent=exploration.nightMeeting?'✓ Вечер с Адой · Пять миров и одна будущая дорога.':'✧ Ада приходит к телескопу, когда на Звёздном уступе наступает ночь.';
}
function markPlace(id:string){const next=discoverPlace(exploration,id);if(next===exploration)return;exploration=next;saveExploration();updateExplorationJournal();toast(`Новое место: ${LANDMARKS.find(p=>p.id===id)!.name} · записано в журнал`);}
function inspectPlace(id:string){const place=LANDMARKS.find(p=>p.id===id);if(!place)return;markPlace(id);
 $('speaker').textContent=place.name;$('speaker-role').textContent='ЗАПИСКИ О МЕСТЕ';$('portrait').textContent='◇';$('speech').textContent=place.text;
 const close=document.createElement('button');close.textContent='Продолжить прогулку';close.onclick=()=>{$<HTMLDialogElement>('conversation').close();};$('choices').replaceChildren(close);
 if(atPlace(id)){updateContent({type:'clue',id});if(contentState.clues.includes(id)&&CLUE_TEXT[id])$('speech').textContent=place.text+' '+CLUE_TEXT[id];if(contentState.postcards==='active'&&!contentState.cards.includes(id))addContentChoice('Зарисовать вид для открытки',()=>drawPostcard(id));
 if(id==='lookout'&&contentState.iris==='searching'&&contentState.clues.length===3)addContentChoice('Наблюдать Ирис в телескоп',observeIris);}
 openDialog('conversation');
}
updateExplorationJournal();
function addContentChoice(text:string,action:()=>void){const button=document.createElement('button');button.textContent=text;button.onclick=action;$('choices').append(button);}
function contentDialog(speaker:string,text:string){
 $('speaker').textContent=speaker;$('speaker-role').textContent='ИСТОРИИ ТИХОЙ ДОЛИНЫ';$('portrait').textContent=speaker[0];$('speech').textContent=text;$('choices').replaceChildren();
 addContentChoice('Продолжить прогулку',()=>{$<HTMLDialogElement>('conversation').close();});openDialog('conversation');
}
function updateContent(action?:ContentAction){
 if(action){const next=reduceContent(contentState,action);if(next!==contentState){contentState=next;try{localStorage.setItem('little-orbit-content-v1',JSON.stringify(contentState));}catch{toast('Истории сохранятся только до закрытия вкладки.');}}}
 $('postcard-status').textContent=contentState.postcards==='new'?'Мира собирает альбом красивых мест. Поговори с ней об открытках.':contentState.postcards==='complete'?'✓ Альбом передан Мире · звание «Летописец долины»':contentState.cards.length===3?'Три открытки готовы. Вернись к Мире и покажи альбом.':`Зарисовки: ${contentState.cards.length} / 3. У арки, рощи и телескопа нажми P или выбери зарисовку в осмотре по E.`;
 $('postcard-album').innerHTML=contentState.cards.map(postcardMarkup).join('');$('iris-objective').textContent=contentObjective(contentState);
 $('iris-clues').textContent=contentState.iris==='dormant'?'':[['camp','Записка'],['arch','Знаки арки'],['grove','Табличка рощи']].map(([id,title])=>`${contentState.clues.includes(id)?'✓':'◇'} ${title}`).join(' · ');
 $('iris-reread').hidden=contentState.iris!=='complete';
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
function atPlace(id:string){const place=LANDMARKS.find(p=>p.id===id);return started&&!overview&&!!place&&place.up.distanceTo(player.up)*RADIUS<7;}
function drawPostcard(id?:string){
 id??=LANDMARKS.find(p=>atPlace(p.id))?.id;
 if(!id||!atPlace(id)){toast('Для зарисовки подойди к арке, Медной роще или телескопу.');return;}
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
$('iris-reread').onclick=()=>contentDialog('Запись Ады',IRIS_ENDING);updateContent();
const adventureUI=createAdventureUI({dialog:contentDialog,choice:addContentChoice,toast,
 near:id=>{const p=world.adventures.points.find(p=>p.id===id);return started&&!overview&&!!p&&p.inspectUp.distanceTo(player.up)*RADIUS<3.2;},
 residentNear:id=>started&&!overview&&world.residents.some(r=>r.id===id&&r.up.distanceTo(player.up)*RADIUS<3.2),
 seconds:()=>solarSeconds,completed:()=>Number(story.phase==='complete')+Number(contentState.postcards==='complete')+Number(contentState.iris==='complete'),travelerPresent:()=>world.adventures.traveler.visible});
const adventureMarkers=world.adventures.points.map(place=>{const el=document.createElement('div');el.className='camp-marker';el.hidden=true;document.body.append(el);return {place,el};});

function interact(){if(!started||overview||isPaused()||!interactTarget)return;if(interactTarget.kind==='adventure'){adventureUI.interact(interactTarget.id);return;}if(interactTarget.kind==='place'){inspectPlace(interactTarget.id);return;}if(interactTarget.kind==='camp'){readCamp();return;}if(interactTarget.kind==='resident')talk(interactTarget.id);else{updateStory({type:'collect',id:interactTarget.id});toast(`Найдено: ${interactTarget.name} · ${story.letters.length}/3`);}}
function releaseMouse(){touch.reset();drag=false;softMouse=false;if(document.pointerLockElement===canvas)document.exitPointerLock();}
async function captureMouse(){
 if(touchMode||!started||overview||isPaused()||document.pointerLockElement===canvas)return;
 try{await canvas.requestPointerLock();}catch{enableSoftMouse();}
}
function enableSoftMouse(){if(started&&!overview&&!isPaused()){softMouse=true;toast('Камера следует за мышью над игровым полем · Esc — освободить');}}
function toggleOverview(relock=true){if(!started||isPaused())return;overview=!overview;trackingPlanet=false;keys.clear();jumpQueued=false;releaseMouse();document.body.classList.toggle('overview',overview);$('overview-label').hidden=!overview;$('interact').hidden=true;if(!overview&&relock)void captureMouse();}
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
$('time-toggle').onclick=()=>{releaseMouse();keys.clear();jumpQueued=false;$('time-panel').hidden=!$('time-panel').hidden;};
$('time-pause').textContent=timeStopped?'▶ Продолжить':'Ⅱ Пауза';
$('time-pause').setAttribute('aria-pressed',String(timeStopped));
$('time-speed').textContent=`Скорость ×${timeSpeed}`;
$('time-pause').onclick=()=>{timeStopped=!timeStopped;$('time-pause').textContent=timeStopped?'▶ Продолжить':'Ⅱ Пауза';$('time-pause').setAttribute('aria-pressed',String(timeStopped));saveWorld();};
$('time-speed').onclick=()=>{timeSpeed=timeSpeed===1?5:timeSpeed===5?20:1;$('time-speed').textContent=`Скорость ×${timeSpeed}`;saveWorld();};
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-hour]'))button.onclick=()=>{
 solarSeconds=Math.floor(solarSeconds/DAY_SECONDS)*DAY_SECONDS+Number(button.dataset.hour)/24*DAY_SECONDS;skyTick=1;shadowTick=1;saveWorld();
};

$('reset').onclick=()=>{if($('reset').dataset.confirm!=='yes'){$('reset').dataset.confirm='yes';$('reset').textContent='Подтвердить: сбросить найденные письма?';return;}story=initialStory();player=createPlayer();updateStory();save();saveWorld();$('reset').dataset.confirm='';$('reset').textContent='Начать историю заново';$<HTMLDialogElement>('journal').close();toast('Новая прогулка начинается.');};
for(const el of document.querySelectorAll<HTMLButtonElement>('[data-close]'))el.onclick=()=>{$<HTMLDialogElement>(el.dataset.close!).close();canvas.focus();};
for(const d of dialogs)d.addEventListener('close',()=>{keys.clear();canvas.focus();});
window.addEventListener('keydown',e=>{
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&started&&!isPaused())e.preventDefault();
 if(e.repeat)return;
 if(e.code==='Backquote'||e.key==='~'){e.preventDefault();debugVisible=!debugVisible;debugPanel.hidden=!debugVisible;if(debugVisible){releaseMouse();keys.clear();jumpQueued=false;}return;}
 if(e.code==='Escape'){keys.clear();jumpQueued=false;releaseMouse();if(!$('time-panel').hidden)$('time-panel').hidden=true;else if(overview)toggleOverview(false);return;}
 if(isPaused()||!started||e.target instanceof HTMLSelectElement)return;
 if(e.code==='KeyP'&&!overview)drawPostcard();else if(e.code==='KeyK')openSystemMap();else if(e.code==='KeyN')observePlanet();else if(e.code==='KeyE')interact();else if(e.code==='KeyM')toggleOverview();else if(e.code==='KeyJ')openDialog('journal');else if(!overview){keys.add(e.code);if(e.code==='Space')jumpQueued=true;}
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();jumpQueued=false;releaseMouse();});document.addEventListener('visibilitychange',()=>{keys.clear();jumpQueued=false;last=0;accumulator=0;frameStats.reset();});
document.addEventListener('pointerlockchange',()=>{
 keys.clear();jumpQueued=false;
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
$('touch-jump').addEventListener('pointerdown',e=>{e.preventDefault();if(started&&!overview&&!isPaused())jumpQueued=true;});
function closeMobileMenu(){$('mobile-actions').hidden=true;$('mobile-menu').setAttribute('aria-expanded','false');}
$('mobile-menu').onclick=()=>{const open=$('mobile-actions').hidden;releaseMouse();keys.clear();jumpQueued=false;$('mobile-actions').hidden=!open;$('mobile-menu').setAttribute('aria-expanded',String(open));};
for(const [id,action] of Object.entries({'mobile-overview':()=>toggleOverview(),'mobile-system':openSystemMap,'mobile-journal':()=>openDialog('journal'),'mobile-postcard':()=>{if(!overview)drawPostcard();},'mobile-help':()=>openDialog('help')}))$(id).onclick=()=>{closeMobileMenu();action();};
$('mobile-quality').onclick=()=>{const next=quality==='economy'?'balanced':quality==='balanced'?'high':'economy';applyQuality(next);$<HTMLSelectElement>('quality-select').value=next;$('mobile-quality').textContent=`Графика: ${QUALITY[next].label.toLowerCase()}`;};
if(touchMode){applyQuality('economy');$<HTMLSelectElement>('quality-select').value='economy';$('overview-label').querySelector('small')!.textContent='Потяни планету для вращения · Два пальца — масштаб · Меню — назад';}
let bellSoundAt=-3;
let soundChosen=false;
let audio:AudioContext|undefined,audioOn=false;
const music=new MusicPlayer(new Audio(),MUSIC_TRACKS,import.meta.env.BASE_URL,
 track=>{$('music-current').textContent=track.title;},
 ()=>{$('music-current').textContent='Трек не загрузился. Попробуй следующий или включи звук снова.';});
$('music-current').textContent=MUSIC_TRACKS[0].title;
for(const track of MUSIC_TRACKS){
 const item=document.createElement('li'),link=document.createElement('a');
 link.href=`https://incompetech.com/music/royalty-free/index.html?isrc=${track.isrc}`;
 link.textContent=track.title;link.target='_blank';link.rel='noopener noreferrer';item.append(link);$('music-credits').append(item);
}
function toggleSound(){
 soundChosen=true;
 audioOn=!audioOn;music.setEnabled(audioOn);
 $('sound').style.background=audioOn?'#738568':'#24363555';
 for(const id of ['sound','music-toggle']){
  $(id).setAttribute('aria-label',audioOn?'Выключить музыку и звуки':'Включить музыку и звуки');
  $(id).setAttribute('aria-pressed',String(audioOn));
 }
 $('music-toggle').textContent=audioOn?'♫ Звук включён':'♫ Включить звук';
 if(!audioOn)return;
 try{
  if(!audio)audio=new AudioContext();
  void audio.resume().catch(()=>toast('Звуковые эффекты недоступны в этом браузере.'));

 }catch{toast('Звуковые эффекты недоступны в этом браузере.');}
}
$('sound').onclick=toggleSound;
$('music-toggle').onclick=toggleSound;
$('music-next').onclick=()=>music.next();
$('music-volume').oninput=()=>music.setVolume(Number($<HTMLInputElement>('music-volume').value)/100);
music.setHidden(document.hidden);
document.addEventListener('visibilitychange',()=>music.setHidden(document.hidden));

const facing=player.forward.clone(),right=new T.Vector3(),matrix=new T.Matrix4(),desiredCamera=new T.Vector3(),desiredUp=new T.Vector3(),look=new T.Vector3(),cameraLook=new T.Vector3(-25,0,0);
function pose(object:T.Object3D,up:T.Vector3,heading:T.Vector3,height:number){right.crossVectors(heading,up).normalize();matrix.makeBasis(right,up,heading.clone().negate());object.quaternion.setFromRotationMatrix(matrix);object.position.copy(up).multiplyScalar(height);}
function nearby(){
 interactTarget=null;let best=3.2;
 for(const r of world.residents){const d=r.up.distanceTo(player.up)*RADIUS;if(d<best){best=d;interactTarget={kind:'resident',id:r.id,name:r.name};}}
 for(const l of world.letters){if(!l.root.visible)continue;const d=l.up.distanceTo(player.up)*RADIUS;if(d<best){best=d;interactTarget={kind:'letter',id:l.id,name:l.name};}}
 const campDistance=world.camp.noteUp.distanceTo(player.up)*RADIUS;if(campDistance<best){best=campDistance;interactTarget={kind:'camp',name:CAMP.name};}
 for(const place of world.landmarks.places){const d=place.inspectUp.distanceTo(player.up)*RADIUS;if(d<best){best=d;interactTarget={kind:'place',id:place.id,name:place.name};}if(!overview&&!isPaused()&&place.up.distanceTo(player.up)*RADIUS<7)markPlace(place.id);}
 for(const p of world.adventures.points){if(!adventureUI.available(p.id))continue;const d=p.inspectUp.distanceTo(player.up)*RADIUS;if(d<best){best=d;interactTarget={kind:'adventure',id:p.id,name:p.name};}}
 $('interact').hidden=!interactTarget||overview||isPaused();if(interactTarget)$('interact').querySelector('span')!.textContent=interactTarget.kind==='resident'?`Поговорить · ${interactTarget.name}`:interactTarget.kind==='camp'?'Прочитать записку':(interactTarget.kind==='place'||interactTarget.kind==='adventure')?`Осмотреть · ${interactTarget.name}`:'Подобрать письмо';
 const {x,z}=coordinates(player.up);let name='Зелёные холмы',sub='За каждым холмом — что-то новое';
 if(player.up.distanceTo(CAMP.up)*RADIUS<8){name=CAMP.name;sub='Кто-то тоже смотрел на далёкие миры.';}
 else if(player.up.y<.3){name='Дальняя сторона';sub='Здесь особенно близко к звёздам';}
 else if(z>16&&x>0){name='Озеро Тихое';sub='Остановись. Послушай воду.';}
 else if(sample(player.up).bridge){name='Старый мост';sub='Два берега одной истории';}
 else if(z< -21&&z> -32&&x>3&&x<16){name='Каменистый брод';sub='Здесь реку можно перейти пешком';}
 else if(Math.hypot(x+7,z+14)<13){name='Почтовая поляна';sub='Каждое письмо кого-то ждёт';}
 else if(Math.abs(x)<10&&Math.abs(z)<10){name='Луговая тропа';sub='Всё большое начинается с малого';}
 const place=LANDMARKS.find(p=>p.up.distanceTo(player.up)*RADIUS<9);if(place){name=place.name;sub=place.id==='lookout'?(atObservatoryNight(solarSeconds)?'Ночь открывает соседние миры.':'Здесь ждут наступления ночи.'):'Остановись и осмотрись · E у таблички';}
 $('location-name').textContent=name;$('location-sub').textContent=sub;
}
let uiTick=0;
camera.position.set(100,155,143);camera.lookAt(cameraLook);
renderer.setAnimationLoop((ms:number)=>{
 if(document.hidden){last=0;return;}
 if(started&&(worldSaveTick+=last?Math.min((ms-last)/1000,.05):0)>=1){worldSaveTick=0;saveWorld();}
 const cpuStart=performance.now();const frameMs=last?ms-last:1000/60;
 const dt=Math.min(frameMs/1000,.05);last=ms;time+=dt;
 if(!timeStopped&&started&&!dialogs.some(d=>d.open&&d.id!=='system-map-dialog'))solarSeconds+=dt*timeSpeed;
 const paused=isPaused()||overview||!started;
 $('touch-controls').hidden=!touchMode||paused;
 $('mobile-menu').hidden=!touchMode||!started||dialogs.some(d=>d.open);
 $('rotate-hint').hidden=!touchMode||!started||isPaused();
 if(isPaused()||!started){touch.reset();jumpQueued=false;}
 if(!paused)wildlifeTime+=dt;
 if((wildlifeTick+=dt)>=.05){wildlife.update(wildlifeTime,paused?0:wildlifeTick,player.up,solar.state.sunDirection);wildlifeTick=0;}
 if(!paused){accumulator+=dt;while(accumulator>=1/60){
  const finger=touch.read();
  const input={forward:finger.forward+Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),right:finger.right+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),run:finger.run||keys.has('ShiftLeft')||keys.has('ShiftRight'),jump:jumpQueued};
  const old=player.up.clone();step(player,input,1/60,world.obstacles);jumpQueued=false;
  facing.applyQuaternion(new T.Quaternion().setFromUnitVectors(old,player.up)).projectOnPlane(player.up).normalize();
  if(player.moving){const direction=player.forward.clone().multiplyScalar(input.forward).addScaledVector(new T.Vector3().crossVectors(player.forward,player.up),input.right).normalize();facing.lerp(direction,.18).normalize();}
  accumulator-=1/60;
 }}else accumulator=0;
 pose(hero.root,player.up,facing,sample(player.up).height+player.jumpHeight);hero.animate(time,!paused&&player.moving);
 for(const r of world.residents){
  if(r.id==='ada'&&!paused){const night=atObservatoryNight(solarSeconds);
   const destination=night?ADA_OBSERVATORY_UP:r.home;
   if(night!==adaAtObservatory&&canRelocateResident(r.up,destination,player.up,camera)){adaAtObservatory=night;r.up.copy(destination);}

  }
  const walking=!paused&&!(r.id==='ada'&&adaAtObservatory)&&Math.sin(time*.35+r.phase)>.15&&r.up.distanceTo(player.up)*RADIUS>3.5;
  if(walking){const target=normalAt(r.x+Math.sin(time*.15+r.phase)*1.3,r.z+Math.cos(time*.15+r.phase)*1.2);if(sample(target).waterDepth<.1&&!world.obstacles.some(o=>o.up.distanceTo(target)*RADIUS<o.radius+.4)){const dir=target.clone().sub(r.up).projectOnPlane(r.up);r.up.lerp(target,.015).normalize();if(dir.lengthSq()>.00000001)pose(r.model.root,r.up,dir.normalize(),sample(r.up).height);}}
  if(!walking){const dir=player.up.clone().sub(r.up).projectOnPlane(r.up);pose(r.model.root,r.up,dir.lengthSq()>.0001?dir.normalize():new T.Vector3(0,0,-1).projectOnPlane(r.up).normalize(),sample(r.up).height);}
  r.model.animate(time+r.phase,walking);
 }
 world.adventures.update(adventureUI.state,solarSeconds,time,player.up,adventureUI.party());
 if(!paused&&audioOn&&audio&&time-bellSoundAt>2&&adventureUI.state.bell==='searching'&&adventureUI.state.tracks===2){
  const d=world.adventures.points.find(p=>p.id==='bell')!.up.distanceTo(player.up)*RADIUS;
  if(d<16){bellSoundAt=time;const gain=audio.createGain(),o=audio.createOscillator();o.frequency.value=1046;o.type='sine';gain.gain.setValueAtTime(.035*(1-d/16),audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+1.3);o.connect(gain).connect(audio.destination);o.start();o.stop(audio.currentTime+1.3);o.onended=()=>{o.disconnect();gain.disconnect();};}
 }
 for(const l of world.letters){l.envelope.position.y=.95+Math.sin(time*2+l.x)*.12;l.envelope.rotation.y=time*.6;l.ring.scale.setScalar(1+Math.sin(time*2)*.08);}
 world.waveTime.value=time;world.water.material.opacity=.87+Math.sin(time*.6)*.025;if((cloudTick+=dt)>=1/20){world.updateClouds(time,solar.state.sunDirection);cloudTick=0;}
 if(trackingPlanet&&!paused){const aim=planetAim(observedPlanet,solarSeconds,player.up,player.forward);
  if(aim){player.forward.copy(aim.forward);elevation=aim.elevation;neighbors.update(solarSeconds);}else{trackingPlanet=false;toast(`${NEIGHBORS[observedPlanet].name} скрывается за горизонтом.`);}
 }
 if(overview){
  desiredCamera.copy(globePosition(planetOrbit.orientation,planetOrbit.distance));desiredUp.set(0,1,0).applyQuaternion(planetOrbit.orientation);look.set(0,0,0);
 }else if(!started){
  desiredCamera.set(100+Math.sin(time*.035)*12,155,143);desiredUp.set(0,1,0);look.set(-27,0,0);
 }else{
  look.copy(player.position).addScaledVector(player.up,1.25);
  desiredCamera.copy(player.position).addScaledVector(player.forward,-distance*Math.cos(elevation)).addScaledVector(player.up,distance*Math.sin(elevation)+1.5);
  // Keep the orbit camera above hills even at its lowest angle.
  const n=desiredCamera.clone().normalize();const min=sample(n).height+2;
  if(desiredCamera.length()<min)desiredCamera.copy(n).multiplyScalar(min);
  look.copy(desiredCamera).addScaledVector(player.forward,distance*Math.cos(elevation)).addScaledVector(player.up,-distance*Math.sin(elevation));
  desiredUp.copy(player.up);
 }
 if(trackingPlanet&&!paused)look.copy(neighborSkyPosition(observedPlanet,solarSeconds));
 const ease=overview&&drag?1:1-Math.exp(-dt*3.8);camera.position.lerp(desiredCamera,ease);camera.up.lerp(desiredUp,ease).normalize();if(trackingPlanet&&!paused)cameraLook.copy(look);else cameraLook.lerp(look,ease);camera.lookAt(cameraLook);
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

 for(const {r,el} of nameTags){
  const distanceTo=r.up.distanceTo(player.up)*RADIUS;
  const point=r.up.clone().multiplyScalar(sample(r.up).height+2.8).project(camera);
  el.hidden=!started||overview||isPaused()||distanceTo>24||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;
  if(!el.hidden){el.style.left=`${(point.x*.5+.5)*innerWidth}px`;el.style.top=`${(-point.y*.5+.5)*innerHeight}px`;el.textContent=(r.id==='mira'&&story.phase!=='complete'?'◇ ':'')+r.name;}
 }
 }
 lockHint.hidden=touchMode||!started||overview||isPaused()||document.pointerLockElement===canvas||softMouse;
 skySystem.followCamera(camera,overview||!started);
 if((skyTick+=dt)>=.05){skyTick=0;world.night.update(time,solar.state.sunDirection);if($<HTMLDialogElement>('system-map-dialog').open)systemMap.update(solarSeconds);neighbors.update(solarSeconds);solar=skySystem.update(solarSeconds,camera,player.up,overview||!started);
 const hours=((solarSeconds/DAY_SECONDS*24)%24+24)%24;
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
