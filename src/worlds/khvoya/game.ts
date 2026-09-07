import {gameStorage as localStorage} from '../../runtime/storage.ts';
import {createDebugPanel,createDialogs,updateMovementControl,setupMobileMenu} from '../../runtime/hud.ts';
import {createGameControls} from '../../runtime/controls.ts';
import {updateGameCamera} from '../../runtime/camera.ts';
import {FrameClock,FixedStepper,startGameLoop} from '../../runtime/loop.ts';
import {createGameRenderer,resizeGameView,applyRenderQuality,bindContextLoss} from '../../runtime/renderer.ts';
import {setupGameAudio} from '../../runtime/audio.ts';
import {createSessionState,readMovementInput} from '../../runtime/session.ts';
import {TRAVEL_KEY,FRAME_UP,initialTravel,restoreTravel,receiveAmber,insertAmber,LEV_GROVE_TEXT,AMBER_GIFT_TEXT} from '../../travel.ts';
import {buildTravelFrame} from '../../travel-view.ts';
import {clearProgress} from '../../progress-reset.ts';
import {createJournalUI} from './journal-ui.ts';
import {createFrontierUI,FRONTIER_SAVE_KEY} from './frontier-ui.ts';
import {journeyEntries} from '../../journey.ts';
import {createJourneyUI} from '../../journey-ui.ts';
import {nextDiscoveryReading} from '../../discovery-reading.ts';
import {createAzureStoryUI,AZURE_STORY_KEY} from './azure-story-ui.ts';
import {createFireSeat,beginFireSeat,advanceFireSeat,leaveFireSeat} from './campfire-seat.ts';
import {ResidentNavigationClient} from './resident-navigation-client.ts';
import {PEOPLE,HOMES,FIRE_UP,OBSERVE_UP,ACTIVITY_LABEL,RESIDENT_SAVE_KEY,ResidentNavigation,restoreResidents,serializeResidents,advanceResidents,noahIsTelling,knockResident,localHour,homeLit,type PersonId} from './resident-life.ts';
import {Soundscape} from './soundscape.ts';
import {createAdventureUI} from './adventure-ui.ts';
import {initialContent,restoreContent,reduceContent,contentObjective,irisCanBeObserved,IRIS_ENDING,CLUE_TEXT,type ContentAction} from './content.ts';
import {SKETCH_PLACES,sketchPlace} from './sketch-places.ts';
import {postcardMarkup} from './postcards.ts';
import {createWildlife} from './wildlife.ts';
import {ALL_LANDMARKS,LANDMARKS,initialExploration,restoreExploration,discoverPlace,atObservatoryNight} from './landmarks.ts';
import {CAMP} from './discoveries.ts';
import {hiddenByPlanet} from '../../sectors.ts';
import {createSystemMap} from '../../system-map.ts';
import {FrameStats,QUALITY,type Quality} from '../../performance.ts';
import {createNeighbors,HOME_PLANET,NEIGHBORS,neighborDirection,planetAim,neighborSkyPosition} from '../../planets.ts';
import {createSky,localPhase,localHours,secondsAtLocalHour,solarState,DAY_SECONDS,YEAR_SECONDS} from '../../sky.ts';
import * as T from 'three';
import {buildWorld} from './world.ts';
import {character} from '../../rendering/character.ts';
import {createPlayer,step,movementAction,type MovementMode} from '../../simulation.ts';
import {WORLD_SAVE_KEY,restoreWorld,serializeWorld} from '../../persistence.ts';
import {coordinates,normalAt,sample,RADIUS} from './terrain.ts';
import {initialStory,restoreStory,reduceStory,dialogue,LETTERS,type ResidentId,type Action,type Dialogue} from '../../story.ts';

export function startKhvoyaGame(){
const session=createSessionState();
const clock=new FrameClock(),fixedSteps=new FixedStepper();
const $=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;
const canvas=$<HTMLCanvasElement>('world');
const touchMode=matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch-mode',touchMode);
const renderer=createGameRenderer(canvas,1.25);
const scene=new T.Scene();scene.background=new T.Color(0x15252f);scene.fog=new T.FogExp2(0x182c35,.0009);
const camera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.1,1000);
const world=buildWorld(scene),hero=character(0xd3af66,true);scene.add(hero.root);
let travel=initialTravel();try{travel=restoreTravel(localStorage.getItem(TRAVEL_KEY));}catch{}
const travelFrame=buildTravelFrame(scene,FRAME_UP,sample(FRAME_UP).height);travelFrame.setOpen(travel.open);world.obstacles.push(...travelFrame.obstacles);
const wildlife=createWildlife(scene,world.obstacles);wildlife.update(0,0,normalAt(-4,4),new T.Vector3(0,1,0));
const skySystem=createSky(scene,world.stars);const neighbors=createNeighbors(scene);
const frameStats=new FrameStats();let quality:Quality='balanced',debugVisible=false,debugTick=0,shadowTick=1,cloudTick=1,skyTick=1,hudTick=0,sectorTick=1,wildlifeTick=0,wildlifeTime=0;
const debugPanel=createDebugPanel(applyQuality);
function applyQuality(value:Quality){
 quality=value;applyRenderQuality(renderer,skySystem.sun,frameStats,value);
}
const renderSize=new T.Vector2();
let solar=skySystem.update(DAY_SECONDS*.43,camera,new T.Vector3(0,1,0),true);

let solarSeconds=DAY_SECONDS*.43,timeSpeed=1,timeStopped=false;
let player=createPlayer(),story=initialStory();
try{story=restoreStory(localStorage.getItem('little-orbit-story-v1'));}catch{}
let time=0,toastUntil=0;
let worldRestored=false,worldSaveTick=0,worldSaveWarning=false;
try{
 const saved=restoreWorld(localStorage.getItem(WORLD_SAVE_KEY));
 if(saved){({player,solarSeconds,timeSpeed,timeStopped,distance: session.distance,elevation: session.elevation}=saved);worldRestored=true;}
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
 if(!session.started)return false;
 try{localStorage.setItem(WORLD_SAVE_KEY,serializeWorld({player,solarSeconds,timeSpeed,timeStopped,distance: session.distance,elevation: session.elevation}));localStorage.setItem(RESIDENT_SAVE_KEY,serializeResidents(residentStates));return true;}
 catch{if(!worldSaveWarning){worldSaveWarning=true;toast('Не удалось сохранить мир. После закрытия вкладки последние изменения могут потеряться.');}return false;}
}
window.addEventListener('pagehide',saveWorld);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveWorld();});
let exploration=initialExploration();try{exploration=restoreExploration(localStorage.getItem('little-orbit-exploration-v1'));}catch{}
let campFound=false;try{campFound=localStorage.getItem('little-orbit-camp-v1')==='found';}catch{}
let contentState=initialContent();try{contentState=restoreContent(localStorage.getItem('little-orbit-content-v1'));}catch{}
if(campFound)contentState=reduceContent(contentState,{type:'clue',id:'camp'});
let interactTarget:{kind:'portal';name:string}|{kind:'adventure';id:string;name:string}|{kind:'place';id:string;name:string}|{kind:'camp';name:string}|{kind:'resident';id:PersonId;name:string}|{kind:'home';id:PersonId;name:string}|{kind:'letter';id:string;name:string}|null=null;

const planetOrbit={orientation:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(new T.Vector3(100,155,143),new T.Vector3(),new T.Vector3(0,1,0))),distance:Math.hypot(100,155,143)};
const lockHint=document.createElement('div');lockHint.className='mouse-hint';lockHint.hidden=true;lockHint.textContent='Клик по миру — управлять камерой · Esc — освободить мышь';document.body.append(lockHint);
const systemMap=createSystemMap($('system-map'));
const hud=createDialogs({session,canvas,releaseMouse:()=>releaseMouse(),refreshJournal:()=>refreshJournal(),closePanelsOnOpen:false});
const {dialogs,isPaused,openDialog,closeMobileMenu}=hud;
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

function talk(id:PersonId,topic='greeting'){
 if(id==='savva'){frontierUI.talk();return;}
 if(id==='noah'){adventureUI.interact('traveler');return;}
 const r=world.residents.find(r=>r.id===id)!;
 const nightTalk=id==='ada'&&!residentState('ada').inside&&residentState('ada').up.distanceTo(OBSERVE_UP)*RADIUS<3&&atObservatoryNight(solarSeconds);
 const line:Dialogue=nightTalk?(topic==='iris'?{text:'Ирис — тот лиловый мир с тонким кольцом. Он обращается вокруг Ореола медленнее нашего. Иногда он прячется за горизонтом: попробуй N, чтобы следить за доступными планетами, или K, чтобы рассмотреть всю систему.',choices:[{text:'Попробую найти его'}]}:{text:'Ты всё-таки пришёл! Отсюда лучше видно небо. Я видела в старом лагере ту же схему, что выбита на Арке ветров: пять миров вокруг Ореола. Когда-нибудь мы доберёмся до каждого. А сегодня начнём с наблюдений.',choices:[{text:'Расскажи об Ирисе',next:'iris'},{text:'Спасибо за этот вечер'}]}):dialogue(id,story,topic);
 if(nightTalk&&!exploration.nightMeeting){exploration={...discoverPlace(exploration,'lookout'),nightMeeting:true};saveExploration();toast('Открытие: вечер у телескопа с Адой.');}
 $('speaker').textContent=r.name;$('speaker-role').textContent=r.role;$('portrait').textContent=r.name[0];$('speech').textContent=(topic==='greeting'&&!nightTalk?(id==='lev'&&adventureUI.state.bell==='complete'?'Слышишь? Твой колокольчик снова бережёт мой сад. Рад тебя видеть! ':id==='ada'&&adventureUI.state.meteor==='complete'?'Рада тебя видеть. Твой образец лежит на почётном месте у окна. ':''):'')+line.text;
 $('choices').replaceChildren(...line.choices.map(choice=>{const button=document.createElement('button');button.textContent=choice.text;button.onclick=()=>{if(choice.next){talk(id,choice.next);return;}if(choice.action){updateStory({type:choice.action});toast(choice.action==='accept'?'Новая история: «Письма на ветру»':'История завершена. В Тихой долине стало на одного друга больше.');}$<HTMLDialogElement>('conversation').close();canvas.focus();};return button;}));
 if(id==='lev'&&topic==='greeting'&&exploration.places.includes('grove'))addContentChoice('Почему в Медной роще такие деревья?',()=>{
  contentDialog('Лев',LEV_GROVE_TEXT);
  if(!travel.amber&&!travel.open)addContentChoice('Ты сохранил что-нибудь с Янтаря?',()=>{
   contentDialog('Лев',AMBER_GIFT_TEXT);addContentChoice('Взять янтарь',()=>{if(commitTravel(receiveAmber(travel,exploration.places))){contentDialog('Лев','Янтарь теперь у тебя. Ищи рамку рядом с Медной рощей.');toast('Получен предмет: Янтарь · рамка рядом с Медной рощей');}});
  });
  else addContentChoice('Напомни, где рамка',()=>contentDialog('Лев','Примерно в десяти метрах от Медной рощи. '+(travel.open?'Путь открыт, и ты всегда можешь вернуться.':'Положи янтарь в углубление на рамке.')));
 });
 if(id==='mira')addContentChoice('Открытки для долины',postcardConversation);
 if(id==='ada'&&contentState.iris!=='dormant')addContentChoice('Знаки из старого лагеря',irisConversation);
 adventureUI.residentChoices(id);
 if(!$<HTMLDialogElement>('conversation').open)openDialog('conversation');
}
function commitTravel(next:typeof travel){
 try{localStorage.setItem(TRAVEL_KEY,JSON.stringify(next));}catch{toast('Не удалось сохранить янтарь. Попробуй ещё раз.');return false;}
 travel=next;travelFrame.setOpen(travel.open);return true;
}
function visitFrame(){
 contentDialog('Янтарная рамка',travel.open?'Между стойками тихо шелестит осенний лес. По ту сторону — Янтарь. Обратная рамка останется открытой.':travel.amber?'На рамке есть пустое углубление. Янтарь, который подарил Лев, подходит к нему по форме.':'Среди травы стоит старая рамка. В янтарной оправе пустует небольшое углубление. Лев, возможно, знает, как она связана с Медной рощей.');
 if(travel.open)addContentChoice('Отправиться на Янтарь',()=>{if(player.up.angleTo(FRAME_UP)*RADIUS>5)return;if(!saveWorld()){toast('Переход отложен: не удалось сохранить Хвою. Попробуй ещё раз.');return;}const url=new URL(location.href);url.searchParams.set('planet','amber');url.searchParams.set('arrival','1');location.assign(url.href);});
 else if(travel.amber)addContentChoice('Положить янтарь в рамку',()=>{const next=insertAmber(travel,player.up.angleTo(FRAME_UP)*RADIUS<5);if(next!==travel&&commitTravel(next)){toast('Путь на Янтарь открыт');visitFrame();}});
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
const frontierUI=createFrontierUI({near:atPlace,nearSavva:()=>session.started&&!session.overview&&!residentState('savva').inside&&residentState('savva').up.distanceTo(player.up)*RADIUS<3.2,dialog:contentDialog,choice:addContentChoice,toast,load:()=>localStorage.getItem(FRONTIER_SAVE_KEY),save:raw=>localStorage.setItem(FRONTIER_SAVE_KEY,raw),journal:()=>{}});
function inspectPlace(id:string){const place=ALL_LANDMARKS.find(p=>p.id===id);if(!place)return;markPlace(id);
 if(frontierUI.discover(id)){addContentChoice('Осмотреть место',()=>inspectPlace(id));return;}
 if(azureStory.discover(id,place.text)){addContentChoice('Осмотреть место',()=>inspectPlace(id));return;}
 $('speaker').textContent=place.name;$('speaker-role').textContent='ЗАПИСКИ О МЕСТЕ';$('portrait').textContent='◇';$('speech').textContent=place.text;
 const close=document.createElement('button');close.textContent='Продолжить прогулку';close.onclick=()=>{$<HTMLDialogElement>('conversation').close();};$('choices').replaceChildren(close);
 if(atPlace(id)){updateContent({type:'clue',id});if(contentState.clues.includes(id)&&CLUE_TEXT[id])$('speech').textContent=place.text+' '+CLUE_TEXT[id];if((contentState.postcards==='complete'&&!(contentState.sketches??[]).includes(id))||(LANDMARKS.some(p=>p.id===id)&&contentState.postcards==='active'&&!contentState.cards.includes(id)))addContentChoice('Зарисовать вид для открытки',()=>drawPostcard(id));
 if(id==='lookout'&&contentState.iris==='searching'&&contentState.clues.length===3)addContentChoice('Наблюдать Ирис в телескоп',observeIris);}
 if(atPlace(id)){
  if(id==='azure-beacon')addContentChoice(beaconLit?'Погасить маяк':'Зажечь маяк',()=>{if(!atPlace(id))return;beaconLit=!beaconLit;world.wilderness.setBeacon(beaconLit);azureStory.refresh();try{localStorage.setItem('little-orbit-azure-beacon-v1',beaconLit?'on':'off');}catch{toast('Свет сохранится только до закрытия вкладки.');}inspectPlace(id);});
  azureStory.choices(id);frontierUI.choices(id);
  const rest=world.wilderness.places.find(p=>p.id===id);if(rest?.restUp)addContentChoice(rest.climbHeight?(trailSeat.phase==='seated'&&restingPlace===id?'Спуститься с маяка':'Подняться на маяк'):'Посидеть на бревне',()=>{if(rest.climbHeight&&trailSeat.phase==='seated'&&restingPlace===id){leaveFireSeat(trailSeat);$<HTMLDialogElement>('conversation').close();return;}if(beginFireSeat(trailSeat,player,true,rest.restUp!)){restingPlace=id;guestNavigation??=new ResidentNavigationClient(world.obstacles.map(o=>({...o,radius:o.radius+.06})));$<HTMLDialogElement>('conversation').close();session.keys.clear();toast(rest.climbHeight?'Подходим к лестнице · движение или Esc — спуститься':'Подходим к бревну · движение или Esc — встать');}});
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
  addContentChoice('Передать альбом Мире',()=>{updateContent({type:'deliver'});toast('Теперь можно зарисовать любую точку на карте: подойди и нажми P. Рисунки — в J → Мир.');contentDialog('Мира','На письме теперь написано: «У нас многое по-прежнему. Но я снова это замечаю». Мира кладёт рядом с открытками два конверта. «Второй — для тебя. Копии на память. А завтра я закрою почту на час и сама дойду до рощи. Если кто спросит, виноват наш летописец». Она улыбается и убирает табличку «Не отходить далеко» в ящик.');});
 }else contentDialog('Мира',contentState.postcards==='complete'?'Сестра ещё не ответила, а я уже придумываю, куда поведу её, если приедет. Твой альбом лежит у окна. Иногда заходят за письмами, а остаются рассматривать рисунки.':contentState.cards.length===0?'Я нашла старое письмо сестры: там целая страница о том, как пахнет роща после дождя. Вот что я хочу ей вернуть — не список достопримечательностей, а ощущение дома. Начни с любого из трёх мест.':`Ты уже зарисовал ${contentState.cards.length===1?'одно место':'два места'}? Я поймала себя на том, что жду эти рисунки больше, чем вечернюю почту. Ещё остались ${LANDMARKS.filter(p=>!contentState.cards.includes(p.id)).map(p=>p.name).join(' и ')}. Если устанешь — просто посиди там. Бумага подождёт.`);
}
function atPlace(id:string){const place=ALL_LANDMARKS.find(p=>p.id===id);return session.started&&!session.overview&&!!place&&place.up.distanceTo(player.up)*RADIUS<7;}
function drawPostcard(id?:string){
 if(!session.started||session.overview)return;
 if(contentState.postcards==='new'){toast('Сначала поговори с Мирой об альбоме открыток.');return;}
 const free=contentState.postcards==='complete';
 const places=free?SKETCH_PLACES:LANDMARKS;
 id??=places.filter(p=>p.up.distanceTo(player.up)*RADIUS<7).sort((a,b)=>a.up.distanceTo(player.up)-b.up.distanceTo(player.up))[0]?.id;
 const place=id?sketchPlace(id):undefined;
 if(!place||!places.some(p=>p.id===id)||place.up.distanceTo(player.up)*RADIUS>=7){toast(free?'Подойди к месту, отмеченному точкой на карте M, и нажми P.':'Для зарисовки подойди к арке, Медной роще или телескопу.');return;}
 if((free?contentState.sketches??[]:contentState.cards).includes(place.id)){toast(free?'Этот рисунок уже есть в журнале → Мир.':'Этот вид уже есть в твоём альбоме.');return;}
 markPlace(place.id);updateContent({type:free?'sketch':'card',id:place.id});
 refreshJournal();
 contentDialog('Зарисовка готова',free?'Рисунок сохранён в журнале → Мир.':`Открытка сохранена в журнале → Мир · ${contentState.cards.length} / 3 для альбома.`);
 $('choices').insertAdjacentHTML('afterbegin',postcardMarkup(place.id));
}
function observeIris(){
 if(!atPlace('lookout')||contentState.clues.length!==3)return;
 if(!irisCanBeObserved(solarSeconds)){contentDialog('Телескоп',atObservatoryNight(solarSeconds)?'Ирис пока за горизонтом. Подожди: мир вращается, и нужная планета появится. Можно ускорить время в меню часов.':'Знаки совпали, но для наблюдения нужна ночь на этом уступе. Дождись темноты или используй меню часов.');return;}
 updateContent({type:'observe'});observedPlanet=NEIGHBORS.findIndex(p=>p.name==='Ирис');session.trackingPlanet=true;contentDialog('Сигнал у кольца','В окуляре — бледно-лиловый Ирис. У края кольца повторяются три короткие вспышки и одна длинная. На схеме из рощи тот же ритм. Ты записываешь последовательность: теперь нужно показать её Аде.');
}
function irisConversation(){
 if(contentState.iris==='observed'){updateContent({type:'decode'});contentDialog('Ада',IRIS_ENDING);}
 else contentDialog('Ада',contentState.iris==='complete'?IRIS_ENDING:'Это не просто украшения: метки похожи на старый наблюдательный шифр. '+contentObjective(contentState));
}

const knownJourneys=new Set<string>();
try{const ids=JSON.parse(localStorage.getItem('little-orbit-known-journeys-v1')??'[]');if(Array.isArray(ids))for(const id of ids)if(['cave','tales','festival','fireside'].includes(id))knownJourneys.add(id);}catch{}
function knowJourney(id:string){knownJourneys.add(id);try{localStorage.setItem('little-orbit-known-journeys-v1',JSON.stringify([...knownJourneys]));}catch{}}
const adventureUI=createAdventureUI({known:knowJourney,dialog:contentDialog,choice:addContentChoice,toast,
 near:id=>{if(id==='traveler')return session.started&&!session.overview&&!residentState('noah').inside&&residentState('noah').up.distanceTo(player.up)*RADIUS<3.2;const p=world.adventures.points.find(p=>p.id===id);return session.started&&!session.overview&&!!p&&p.inspectUp.distanceTo(player.up)*RADIUS<3.2;},
 residentNear:id=>session.started&&!session.overview&&world.residents.some(r=>r.id===id&&!residentState(r.id).inside&&r.up.distanceTo(player.up)*RADIUS<3.2),
 seconds:()=>solarSeconds,completed:()=>Number(story.phase==='complete')+Number(contentState.postcards==='complete')+Number(contentState.iris==='complete')+Number(azureStory.state.complete)+Number(frontierUI.state.wind==='complete')+Number(frontierUI.state.diary==='complete'),travelerPresent:()=>!residentState('noah').inside,storytelling:()=>noahIsTelling(solarSeconds,residentState('noah')),seatedByFire:()=>fireSeat.phase==='seated',
 beginFireSeat:()=>{if(beginFireSeat(fireSeat,player,noahIsTelling(solarSeconds,residentState('noah')))){guestNavigation??=new ResidentNavigationClient(world.obstacles.map(o=>({...o,radius:o.radius+.06})));$<HTMLDialogElement>('conversation').close();session.keys.clear();toast('Подходим к свободному месту · движение или Esc — отменить');}else toast('Чтобы сесть, подойди к Ною на суше, когда он рассказывает у костра.');},
 leaveFireSeat:()=>{leaveFireSeat(fireSeat);$<HTMLDialogElement>('conversation').close();toast('Ты встал с бревна.');}});
const journeyUI=createJourneyUI({focusControls:()=>{releaseMouse();session.keys.clear();session.jumpQueued=false;session.modeQueued=false;},openJournal:()=>{openDialog('journal');$('journal').scrollTop=0;},load:()=>localStorage.getItem('little-orbit-tracked-journey-v1'),save:id=>localStorage.setItem('little-orbit-tracked-journey-v1',id)});
const journalUI=createJournalUI({track:id=>journeyUI.track(id)});
function journeySnapshot(){return {story,content:contentState,adventures:adventureUI.state,exploration,azure:azureStory.state,frontier:frontierUI.state,known:[...knownJourneys],seconds:solarSeconds,beaconLit,noahTelling:noahIsTelling(solarSeconds,residentState('noah'))};}
function refreshJournal(){const snapshot=journeySnapshot(),rows=journeyEntries(snapshot);journeyUI.update(rows);journalUI.update(snapshot,rows,journeyUI.selected,campFound);let entry=document.getElementById('travel-journal');if(!entry){entry=document.createElement('section');entry.id='travel-journal';$('journal-body').after(entry);}entry.hidden=!travel.amber&&!travel.open;entry.textContent=travel.open?'Янтарь · Путь открыт. Янтарная рамка стоит рядом с Медной рощей.':travel.amber?'Янтарь · Подарок Льва. Положи его в рамку примерно в десяти метрах от Медной рощи.':'';}
const adventureMarkers=world.adventures.points.filter(p=>p.id!=='traveler').map(place=>{const el=document.createElement('div');el.className='camp-marker';el.hidden=true;document.body.append(el);return {place,el};});

function interact(){if(!session.started||session.overview||isPaused())return;if(fireSeat.phase==='seated'){adventureUI.fireside();return;}if(!interactTarget)return;if(interactTarget.kind==='portal'){visitFrame();return;}if(interactTarget.kind==='home'){knockResident(residentState(interactTarget.id));toast(`${interactTarget.name}: сейчас выйду!`);return;}if(interactTarget.kind==='adventure'){adventureUI.interact(interactTarget.id);return;}if(interactTarget.kind==='place'){inspectPlace(interactTarget.id);return;}if(interactTarget.kind==='camp'){readCamp();return;}if(interactTarget.kind==='resident')talk(interactTarget.id);else{updateStory({type:'collect',id:interactTarget.id});toast(`Найдено: ${interactTarget.name} · ${story.letters.length}/3`);}}
const controls=createGameControls({session,canvas,camera,player:()=>player,planetOrbit,radius:RADIUS,touchMode,isPaused,toast,cameraLook:()=>cameraLook,
 actions:{movement:requestMovementChange,postcard:drawPostcard,systemMap:openSystemMap,observe:observePlanet,interact,journal:()=>openDialog('journal'),
  debug:()=>{debugVisible=!debugVisible;debugPanel.hidden=!debugVisible;if(debugVisible){releaseMouse();session.keys.clear();session.jumpQueued=false;session.modeQueued=false;}},
  escape:()=>{if(!isPaused()){leaveFireSeat(fireSeat);leaveFireSeat(trailSeat);}session.keys.clear();session.jumpQueued=false;session.modeQueued=false;releaseMouse();if(!$('time-panel').hidden)$('time-panel').hidden=true;else if(session.overview)toggleOverview(false);}},
 onVisibilityReset:()=>{clock.reset();fixedSteps.reset();frameStats.reset();}});
const {releaseMouse,captureMouse,toggleOverview}=controls;
$('start').onclick=()=>{if(!gameAudio.soundChosen)toggleSound();session.started=true;document.body.classList.add('playing');$('hud').hidden=false;canvas.focus();void captureMouse();toast(worldRestored?'Прогулка продолжается с сохранённого места.':'Добро пожаловать! Мира ждёт у почтового домика.');};
$('overview').onclick=()=>toggleOverview();
function openSystemMap(){if(!session.started)return;$('time-panel').hidden=true;systemMap.update(solarSeconds);openDialog('system-map-dialog');}
$('system-toggle').onclick=openSystemMap;
$('journal-toggle').onclick=$('journal-bottom').onclick=()=>openDialog('journal');
$('help-toggle').onclick=()=>openDialog('help');
let observedPlanet=-1;
function observePlanet(){
 if(!session.started||session.overview||dialogs.some(d=>d.open))return;
 for(let j=1;j<=NEIGHBORS.length;j++){const i=(observedPlanet+j)%NEIGHBORS.length,dir=neighborDirection(i,solarSeconds),altitude=dir.dot(player.up);if(altitude<.05)continue;
 observedPlanet=i;session.trackingPlanet=true;player.forward.copy(dir).projectOnPlane(player.up).normalize();session.elevation=-Math.asin(altitude);$('time-panel').hidden=true;toast(`Слежение: ${NEIGHBORS[i].name} · N — следующая · мышь — ручная камера`);return;}
 toast('Соседние планеты сейчас за горизонтом. Попробуй другое время суток.');
}
$('observe-planets').onclick=observePlanet;
$('time-place').textContent=`ВРЕМЯ НА ${HOME_PLANET.locative.toUpperCase()}`;
$('time-toggle').onclick=()=>{releaseMouse();session.keys.clear();session.jumpQueued=false;session.modeQueued=false;$('time-panel').hidden=!$('time-panel').hidden;};
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
 travel=initialTravel();travelFrame.setOpen(false);story=initialStory();exploration=initialExploration();contentState=initialContent();campFound=false;beaconLit=false;knownJourneys.clear();
 adventureUI.reset();azureStory.reset();frontierUI.reset();journeyUI.reset();journalUI.reset();
 player=createPlayer();lookoutLift=0;leaveFireSeat(fireSeat);leaveFireSeat(trailSeat);restingPlace=null;
 solarSeconds=DAY_SECONDS*.43;timeSpeed=1;timeStopped=false;session.distance=15;session.elevation=.55;
 residentStates=restoreResidents(null,residentNavigation);for(const r of world.residents)r.up.copy(residentState(r.id).up);
 world.wilderness.setBeacon(false);session.trackingPlanet=false;observedPlanet=-1;session.overview=false;worldRestored=false;
 document.body.classList.remove('overview');$('overview-label').hidden=true;$('time-panel').hidden=true;
 $('time-pause').textContent='Ⅱ Пауза';$('time-pause').setAttribute('aria-pressed','false');$('time-speed').textContent='Скорость ×1';
 session.keys.clear();session.jumpQueued=false;session.modeQueued=false;interactTarget=null;$('interact').hidden=true;
 skyTick=1;shadowTick=1;announcedLocation='';updateStory();refreshJournal();saveWorld();
 $<HTMLDialogElement>('reset-dialog').close();canvas.focus();toast('Новая игра началась. Журнал очищен. Мира ждёт у почтового домика.');
};
hud.bindCloseButtons();
const touch=controls.bind();
window.addEventListener('resize',()=>resizeGameView(renderer,camera));
$('interact').onclick=interact;
function requestMovementChange(){
 if(!session.started||session.overview||isPaused())return;
 if(movementAction(player,world.obstacles)){session.modeQueued=true;session.trackingPlanet=false;}
 else toast(player.mode==='swim'?'Подплыви к пологому берегу, чтобы выйти из воды.':'Подойди к воде по пологому берегу, чтобы поплыть.');
}
$('movement-action').onclick=requestMovementChange;
let shoreTick=0,shoreAction:MovementMode|null=null;
setupMobileMenu({session,touchMode,player:()=>player,isPaused,releaseMouse,toast,closeMobileMenu,toggleOverview:()=>toggleOverview(),openSystemMap,openDialog,drawPostcard,getQuality:()=>quality,applyQuality});
const soundscape=new Soundscape(world.soundTrees);
const hiddenBell=world.adventures.points.find(p=>p.id==='bell')!.up;
const gardenBell=normalAt(23,5);
const gameAudio=setupGameAudio(import.meta.env.BASE_URL);
const {music,worldAudio,toggleSound,renderMusicTransition}=gameAudio;

const facing=player.forward.clone(),right=new T.Vector3(),matrix=new T.Matrix4(),cameraLook=new T.Vector3(-25,0,0);
function pose(object:T.Object3D,up:T.Vector3,heading:T.Vector3,height:number){right.crossVectors(heading,up).normalize();matrix.makeBasis(right,up,heading.clone().negate());object.quaternion.setFromRotationMatrix(matrix);object.position.copy(up).multiplyScalar(height);}
let announcedLocation='',locationVisibleUntil=0;
const locationBanner=document.querySelector<HTMLElement>('.location')!;
function nearby(){
 const newReading=nextDiscoveryReading([
  ...world.landmarks.places.map(p=>({id:p.id,distance:p.up.distanceTo(player.up)*RADIUS,radius:7,unread:!exploration.places.includes(p.id)||azureStory.unread(p.id)||frontierUI.unread(p.id)})),
  {id:'astronomer-note',distance:world.camp.noteUp.distanceTo(player.up)*RADIUS,radius:3.2,unread:!campFound},
 ],!session.started||session.overview||isPaused());
 if(newReading){if(newReading==='astronomer-note')readCamp();else inspectPlace(newReading);}


 interactTarget=null;let best=3.2;
 for(const r of world.residents){if(residentState(r.id).inside)continue;const d=r.up.distanceTo(player.up)*RADIUS;if(d<best){best=d;interactTarget={kind:'resident',id:r.id,name:r.name};}}
 for(const p of PEOPLE){const h=HOMES[p.id],d=h.porch.distanceTo(player.up)*RADIUS;if(residentState(p.id).inside&&d<best){best=d;interactTarget={kind:'home',id:p.id,name:p.name};}}
 for(const l of world.letters){if(!l.root.visible)continue;const d=l.up.distanceTo(player.up)*RADIUS;if(d<best){best=d;interactTarget={kind:'letter',id:l.id,name:l.name};}}
 const campDistance=world.camp.noteUp.distanceTo(player.up)*RADIUS;if(campDistance<best){best=campDistance;interactTarget={kind:'camp',name:CAMP.name};}
 for(const place of world.landmarks.places){const d=place.inspectUp.distanceTo(player.up)*RADIUS;if(d<best){best=d;interactTarget={kind:'place',id:place.id,name:place.name};}}
 for(const p of world.adventures.points){if(p.id==='traveler'||!adventureUI.available(p.id))continue;const d=p.inspectUp.distanceTo(player.up)*RADIUS;if(d<best){best=d;interactTarget={kind:'adventure',id:p.id,name:p.name};}}
 const frameDistance=player.up.angleTo(FRAME_UP)*RADIUS;if(frameDistance<4.7&&frameDistance<best+2){interactTarget={kind:'portal',name:'Янтарная рамка'};}
 $('interact').hidden=!interactTarget||session.overview||isPaused();if(interactTarget)$('interact').querySelector('span')!.textContent=interactTarget.kind==='portal'?'Янтарная рамка':interactTarget.kind==='home'?`Постучать · ${interactTarget.name}`:interactTarget.kind==='resident'?`Поговорить · ${interactTarget.name}`:interactTarget.kind==='camp'?'Прочитать записку':(interactTarget.kind==='place'||interactTarget.kind==='adventure')?`Осмотреть · ${interactTarget.name}`:'Подобрать письмо';
 if(fireSeat.phase==='seated'&&!session.overview&&!isPaused()){$('interact').hidden=false;$('interact').querySelector('span')!.textContent='Послушать у костра · Ной';}
 const surface=sample(player.up);const {x,z}=coordinates(player.up);let name=surface.region,sub=surface.biome==='mountain'?'Ищи пологие склоны и проходы между вершинами':surface.biome==='hill'?'Выше луга — дальше горизонт':'За каждым холмом — что-то новое';
 if(player.up.distanceTo(CAMP.up)*RADIUS<8){name=CAMP.name;sub='Кто-то тоже смотрел на далёкие миры.';}
 else if(surface.wet){name=surface.region;sub='Река несёт тебя дальше · выходи у пологого берега';}
 else if(player.up.y>.45&&Math.hypot(x-12,z-30)<18){name='Озеро Тихое';sub='Остановись. Послушай воду.';}
 else if(sample(player.up).bridge){name='Старый мост';sub='Два берега одной истории';}
 else if(player.up.y>.45&&z< -21&&z> -32&&x>3&&x<16){name='Каменистый брод';sub='Сухие камни соединяют берега';}
 else if(player.up.y>.45&&Math.hypot(x+7,z+14)<13){name='Почтовая поляна';sub='Каждое письмо кого-то ждёт';}
 else if(player.up.y>.45&&Math.abs(x)<10&&Math.abs(z)<10){name='Луговая тропа';sub='Всё большое начинается с малого';}
 const place=ALL_LANDMARKS.find(p=>p.up.distanceTo(player.up)*RADIUS<9);if(place){name=place.name;sub=place.id==='lookout'?(atObservatoryNight(solarSeconds)?'Ночь открывает соседние миры.':'Здесь ждут наступления ночи.'):'Остановись и осмотрись · E рядом с находкой';}
 if(!session.overview&&!isPaused()&&name!==announcedLocation){
  announcedLocation=name;locationVisibleUntil=performance.now()+4500;
  $('location-name').textContent=name;$('location-sub').textContent=sub;
 }
 locationBanner.classList.toggle('location-visible',!session.overview&&!isPaused()&&performance.now()<locationVisibleUntil);
 journeyUI.update(journeyEntries(journeySnapshot()));

}
let uiTick=0;
const welcomeSpinOrigin=solarState(solarSeconds).spinAngle;
camera.position.set(100,155,143);camera.lookAt(cameraLook);
startGameLoop(renderer,clock,({frameMs,dt,previousDelta})=>{
 if(session.started&&(worldSaveTick+=previousDelta)>=1){worldSaveTick=0;saveWorld();}
 const cpuStart=performance.now();
 time+=dt;
 if(!timeStopped&&!dialogs.some(d=>d.open&&d.id!=='system-map-dialog'))solarSeconds+=dt*timeSpeed;
 const paused=isPaused()||session.overview||!session.started;
 $('touch-controls').hidden=!touchMode||paused;
 $('mobile-menu').hidden=!touchMode||!session.started||dialogs.some(d=>d.open);
 $('rotate-hint').hidden=!touchMode||!session.started||isPaused();
 if(isPaused()||!session.started){touch.reset();session.jumpQueued=false;session.modeQueued=false;}
 if(!paused)wildlifeTime+=dt;
 if((wildlifeTick+=dt)>=.05){wildlife.update(wildlifeTime,paused?0:wildlifeTick,player.up,solar.state.sunDirection);wildlifeTick=0;}
 fixedSteps.advance(dt,paused,()=>{
  const finger=touch.read();
  const input=readMovementInput(session,finger);
  const old=player.up.clone(),oldMode=player.mode;
  if(input.forward||input.right||input.jump||input.toggleMode){leaveFireSeat(fireSeat);leaveFireSeat(trailSeat);}
  if(lookoutLift>0&&trailSeat.phase==='idle'){player.moving=false;}else if(trailSeat.phase!=='idle'&&guestNavigation){
   const rest=world.wilderness.places.find(p=>p.id===restingPlace)!;const result=advanceFireSeat(trailSeat,player,guestNavigation,world.obstacles,1/60,true,rest.restUp!);if(result==='arrived')toast(rest.climbHeight?'Поднимаемся на площадку · движение или Esc — спуститься':'Можно отдохнуть · движение или Esc — встать');if(result==='cancelled')toast('Не удалось подойти к бревну. Попробуй с другой стороны.');
  }else if(fireSeat.phase!=='idle'&&guestNavigation){
   const result=advanceFireSeat(fireSeat,player,guestNavigation,world.obstacles,1/60,noahIsTelling(solarSeconds,residentState('noah')));
   if(result==='arrived'){toast('Ты сидишь у костра · WASD или прыжок — встать');adventureUI.fireside();}
   else if(result==='cancelled')toast('Посиделки закончились или к месту нет свободного подхода.');
  }else step(player,input,1/60,world.obstacles);
  if(oldMode!==player.mode){shoreTick=1;toast(player.mode==='swim'?(touchMode?'Плывёшь · у берега появится «На берег»':'Плывёшь · F у пологого берега — выйти на сушу'):'Ты на берегу · можно идти дальше');}session.jumpQueued=false;session.modeQueued=false;
  facing.applyQuaternion(new T.Quaternion().setFromUnitVectors(old,player.up)).projectOnPlane(player.up).normalize();
  if(player.moving){const direction=player.up.clone().sub(old).projectOnPlane(player.up).normalize();facing.lerp(direction,.18).normalize();}
 },()=>!isPaused());
 if(fireSeat.phase==='seated')facing.copy(FIRE_UP).projectOnPlane(player.up).normalize();
 const liftTarget=trailSeat.phase==='seated'?(world.wilderness.places.find(p=>p.id===restingPlace)?.climbHeight??0):0;
 if(!paused)lookoutLift+=T.MathUtils.clamp(liftTarget-lookoutLift,-dt*1.8,dt*1.8);
 if(lookoutLift>0)player.position.copy(player.up).multiplyScalar(player.groundHeight+player.jumpHeight+lookoutLift);
 if(trailSeat.phase==='seated')facing.copy(world.wilderness.places.find(p=>p.id===restingPlace)!.restFacing).projectOnPlane(player.up).normalize();
 pose(hero.root,player.up,facing,player.position.length());hero.animate(time,!paused&&player.moving,player.mode==='swim',fireSeat.phase==='seated'||(trailSeat.phase==='seated'&&restingPlace!=='azure-beacon')?'sit':undefined);
 world.frontier.update(frontierUI.state.wind==='repaired'||frontierUI.state.wind==='complete',time);
 if((shoreTick+=dt)>=.2){shoreTick=0;shoreAction=paused?null:movementAction(player,world.obstacles);}
 updateMovementControl(paused,shoreAction,player.mode);
 const listeningToNoah=$<HTMLDialogElement>('conversation').open&&$('speaker').textContent==='Ной'&&noahIsTelling(solarSeconds,residentState('noah'));
 const residentPaused=!session.started||dialogs.some(d=>d.open&&d.id!=='system-map-dialog'&&!(d.id==='conversation'&&listeningToNoah));
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
 worldAudio.setActive(session.started&&!session.overview);
 worldAudio.update(soundscape.update(dt,{up:player.up,forward:player.forward,sun:solar.state.sunDirection,
  active:gameAudio.audioOn&&session.started&&!session.overview,walking:!paused,moving:player.moving,grounded:player.grounded&&player.mode==='walk',
  bell:adventureUI.state.bell==='complete'?gardenBell:adventureUI.state.bell==='searching'&&adventureUI.state.tracks===2?hiddenBell:null,
  bellInterval:adventureUI.state.bell==='complete'?35:5,fire:fireBurning?FIRE_UP:null}));
 for(const l of world.letters){l.envelope.position.y=.95+Math.sin(time*2+l.x)*.12;l.envelope.rotation.y=time*.6;l.ring.scale.setScalar(1+Math.sin(time*2)*.08);}
 travelFrame.update(time);world.waveTime.value=time;world.water.material.opacity=.87+Math.sin(time*.6)*.025;if((cloudTick+=dt)>=1/20){world.updateClouds(time,solar.state.sunDirection);cloudTick=0;}
 if(session.trackingPlanet&&!paused){const aim=planetAim(observedPlanet,solarSeconds,player.up,player.forward);
  if(aim){player.forward.copy(aim.forward);session.elevation=aim.elevation;neighbors.update(solarSeconds);}else{session.trackingPlanet=false;toast(`${NEIGHBORS[observedPlanet].name} скрывается за горизонтом.`);}
 }
 updateGameCamera({session,camera,player,planetOrbit,dt,sample,welcomeRotation:welcomeSpinOrigin-solarState(solarSeconds).spinAngle,trackedPosition:session.trackingPlanet&&!paused?neighborSkyPosition(observedPlanet,solarSeconds):undefined},cameraLook);
 if(session.started&&(uiTick+=dt)>.1){nearby();uiTick=0;}
 if(time>toastUntil)$('toast').hidden=true;
 if((hudTick+=dt)>=.1){hudTick=0;
 for(const {place,el} of adventureMarkers){
  const p=place.up.clone().multiplyScalar(sample(place.up).height+3),v=p.clone().project(camera);
  const s=adventureUI.state,show=['meteor','cave','traveler'].includes(place.id)||(place.id==='festival'&&adventureUI.party())||(s.bell==='searching'&&place.id===(s.tracks===0?'track-1':s.tracks===1?'track-2':'bell'));
  el.hidden=!show||!session.overview||isPaused()||hiddenByPlanet(camera.position,new T.Sphere(p,1))||v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1;
  if(!el.hidden){el.style.left=`${(v.x*.5+.5)*innerWidth}px`;el.style.top=`${(-v.y*.5+.5)*innerHeight}px`;el.textContent=`◇ ${place.name} · ${Math.round(player.up.angleTo(place.up)*RADIUS)} м`;}
 }
 for(const {place,el} of placeMarkers){const position=place.up.clone().multiplyScalar(sample(place.up).height+4),point=position.clone().project(camera);
  el.hidden=!session.overview||isPaused()||hiddenByPlanet(camera.position,new T.Sphere(position,1))||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;
  if(!el.hidden){el.style.left=`${(point.x*.5+.5)*innerWidth}px`;el.style.top=`${(-point.y*.5+.5)*innerHeight}px`;el.textContent=`${exploration.places.includes(place.id)?'✓ '+place.name:'◇ Неизведанное место'} · ${Math.round(player.up.angleTo(place.up)*RADIUS)} м`;}
 }
 const campPosition=CAMP.up.clone().multiplyScalar(sample(CAMP.up).height+2.5),campPoint=campPosition.clone().project(camera);
 campMarker.hidden=!session.overview||isPaused()||hiddenByPlanet(camera.position,new T.Sphere(campPosition,.5))||campPoint.z>1||Math.abs(campPoint.x)>1||Math.abs(campPoint.y)>1;
 if(!campMarker.hidden){campMarker.style.left=`${(campPoint.x*.5+.5)*innerWidth}px`;campMarker.style.top=`${(-campPoint.y*.5+.5)*innerHeight}px`;campMarker.textContent=`⌂ ${campFound?CAMP.name:'Одинокая палатка'} · ${Math.round(player.up.angleTo(CAMP.up)*RADIUS)} м`;}

 }
 for(const {p,el} of homeMarkers){const up=HOMES[p.id].up,position=up.clone().multiplyScalar(sample(up).height+4),point=position.clone().project(camera);el.hidden=!session.started||!session.overview||point.z>1||hiddenByPlanet(camera.position,new T.Sphere(position,1));if(!el.hidden){el.style.left=`${(point.x*.5+.5)*innerWidth}px`;el.style.top=`${(-point.y*.5+.5)*innerHeight}px`;el.textContent=`⌂ ${p.id==='noah'?'Повозка Ноя':'Дом · '+p.name}${residentState(p.id).inside?' · дома':''}`;}}
 // Screen-space names follow the same camera frame as the rendered residents.
 for(const {r,el} of nameTags){
  const distanceTo=r.up.distanceTo(player.up)*RADIUS;
  const point=r.up.clone().multiplyScalar(sample(r.up).height+2.8).project(camera);
  el.hidden=!session.started||residentState(r.id).inside||isPaused()||(!session.overview&&distanceTo>24)||hiddenByPlanet(camera.position,new T.Sphere(r.up.clone().multiplyScalar(sample(r.up).height+2),1))||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;
  if(!el.hidden){el.style.left=`${(point.x*.5+.5)*innerWidth}px`;el.style.top=`${(-point.y*.5+.5)*innerHeight}px`;el.textContent=(r.id==='mira'&&story.phase!=='complete'?'◇ ':'')+r.name+' · '+ACTIVITY_LABEL[residentState(r.id).activity];}
 }
 lockHint.hidden=touchMode||!session.started||session.overview||isPaused()||document.pointerLockElement===canvas||session.softMouse;
 skySystem.followCamera(camera,session.overview||!session.started);
 if((skyTick+=dt)>=.05){skyTick=0;world.night.update(time,solar.state.sunDirection,Object.fromEntries(residentStates.map(r=>[r.id,homeLit(r.id,solarSeconds,r.inside)])));if($<HTMLDialogElement>('system-map-dialog').open)systemMap.update(solarSeconds);neighbors.update(solarSeconds);solar=skySystem.update(solarSeconds,camera,player.up,session.overview||!session.started);
 const hours=localHours(solarSeconds,player.up);
 $('time-clock').textContent=`${Math.floor(hours).toString().padStart(2,'0')}:${Math.floor(hours%1*60).toString().padStart(2,'0')}`;
 $('time-phase').textContent=localPhase(solarSeconds,player.up);

 const orbitAngle=solarSeconds/YEAR_SECONDS*Math.PI*2;
 $('orbit-dot').setAttribute('cx',String(50+39*Math.cos(orbitAngle)));$('orbit-dot').setAttribute('cy',String(35+23*Math.sin(orbitAngle)));
 }
 if((shadowTick+=dt)>=1/QUALITY[quality].shadowHz){renderer.shadowMap.needsUpdate=true;shadowTick%=1/QUALITY[quality].shadowHz;}
 if((sectorTick+=dt)>=.1||session.drag){sectorTick=0;if(world.decor.update(camera.position,solar.state.sunDirection))renderer.shadowMap.needsUpdate=true;}
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
bindContextLoss(canvas,renderer,saveWorld,'3D-контекст потерян. Обнови страницу — найденные письма сохранены.');

}
