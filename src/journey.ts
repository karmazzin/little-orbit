import {type FrontierState,windObjective,diaryObjective} from './worlds/khvoya/frontier.ts';
import type {Story} from './story.ts';
import {type ContentState,contentObjective,irisCanBeObserved} from './worlds/khvoya/content.ts';
import {type Adventures,adventureHint,completedAdventures,festivalAvailable,ADVENTURE_POINTS,BOTTLE_IDS} from './worlds/khvoya/adventures.ts';
import {type Exploration,ALL_LANDMARKS,LANDMARKS,atObservatoryNight} from './worlds/khvoya/landmarks.ts';
import {type AzureStory,azureObjective,azureReady} from './worlds/khvoya/azure-story.ts';
export type JourneySnapshot={story:Story;content:ContentState;adventures:Adventures;exploration:Exploration;azure:AzureStory;seconds:number;beaconLit:boolean;noahTelling:boolean;known?:string[];frontier?:FrontierState};
export type JourneyStatus='available'|'active'|'ready'|'waiting'|'complete'|'repeat';
export const JOURNEY_STATUS:Record<JourneyStatus,string>={available:'Не начато',active:'В процессе',ready:'Можно завершить',waiting:'Нужно условие',complete:'Завершено',repeat:'Можно повторять'};
export type JourneyEntry={id:string;title:string;group:'story'|'discovery'|'repeat';status:JourneyStatus;done:number;total:number;next:string};
const JOURNEY_START_HINTS:Record<string,string>={
 letters:'Поговори с Мирой у почты и предложи найти письма.',
 postcards:'Спроси Миру об открытках.',
 iris:'Найди одинокую палатку на дальней стороне и прочитай записку астронома. Палатка отмечена на карте M.',
 meteor:'Поговори с Адой и спроси, что случилось этой ночью. Найти Аду можно на карте M.',
 bell:'Поговори со Львом о пропавшем колокольчике. Найти Льва можно на карте M.',
 cave:'Найди пещеру за Аркой ветров и осмотри знаки у входа.',
 bottles:'Найди и прочитай первое письмо в бутылке на берегу.',
 tales:'Поговори с Ноем и попроси прочитать историю из его тетради. Найти Ноя можно на карте M.',
 azure:'Найди старый привал за еловой рощей и разверни оставленную карту.',
 wind:'Поговори с Саввой у горного приюта о сломанном сигнале.',
 diary:'Найди бухту с забытым дневником и осмотри его обложку.',
};
export function journeyEntries(s:JourneySnapshot,view:'known'|'unstarted'='known'):JourneyEntry[]{
 const {story:l,content:c,adventures:a,exploration:e,azure:z}=s;
 const completed=Number(l.phase==='complete')+Number(c.postcards==='complete')+Number(c.iris==='complete')+Number(z.complete)+Number(s.frontier?.wind==='complete')+Number(s.frontier?.diary==='complete');
 const missingCards=LANDMARKS.filter(p=>!c.cards.includes(p.id)).map(p=>p.name).join(', ');
 const missingBottles=ADVENTURE_POINTS.filter(p=>BOTTLE_IDS.includes(p.id)&&!a.bottles.includes(p.id)).map(p=>p.name).join(', ');
 const known=new Set(s.known??[]);
 const acquired:Record<string,boolean>={letters:l.phase!=='new'||l.letters.length>0,postcards:c.postcards!=='new'||c.cards.length>0,iris:c.iris!=='dormant'||c.clues.length>0,meteor:a.meteor!=='new',bell:a.bell!=='new'||a.tracks>0,cave:a.cave||a.runes>0,bottles:a.bottles.length>0,tales:a.tales.length>0,festival:a.festival,azure:z.complete||z.map||z.marks.length>0||z.bottle||z.entry!==null,places:e.places.length>0,'ada-night':e.nightMeeting,fireside:false,wind:!!s.frontier&&s.frontier.wind!=='new',diary:!!s.frontier&&s.frontier.diary!=='new'};
 const rows:JourneyEntry[]=[];
 function row(id:string,title:string,status:JourneyStatus,done:number,total:number,next:string,group:JourneyEntry['group']='story'){if(view==='unstarted'){if(group!=='story'||acquired[id])return;status='available';done=0;next=JOURNEY_START_HINTS[id]??next;}else if(!known.has(id)&&!acquired[id])return;rows.push({id,title,status,done:total?(status==='complete'?total:Math.min(done,total)):done,total,next,group});}
 row('letters','Письма на ветру',l.phase==='complete'?'complete':l.phase==='new'?'available':l.letters.length===3?'ready':'active',Number(l.phase!=='new')+l.letters.length,5,l.phase==='complete'?'Все письма переданы Мире.':l.phase==='new'?'Поговори с Мирой у почты и предложи найти письма.':l.letters.length===3?'Верни три найденных письма Мире.':`Найди оставшиеся письма у моста, озера и на холме. Собрано ${l.letters.length} из 3.`);
 row('postcards','Альбом для сестры',c.postcards==='complete'?'complete':c.postcards==='new'?'available':c.cards.length===3?'ready':'active',Number(c.postcards!=='new')+c.cards.length,5,c.postcards==='complete'?'Альбом передан Мире.':c.postcards==='new'?'Спроси Миру об открытках.':c.cards.length===3?'Покажи готовый альбом Мире.':`Зарисуй: ${missingCards}. Нажми P на месте.`);
 row('iris','Сигнал Ириса',c.iris==='complete'?'complete':c.iris==='dormant'?'available':c.iris==='observed'?'ready':c.clues.length===3&&!irisCanBeObserved(s.seconds)?'waiting':'active',c.clues.length+Number(c.iris==='observed'),5,c.iris==='observed'?'Покажи запись вспышек Аде. Найди её на карте M или постучи в её дом.':contentObjective(c));
 row('meteor','Камень, который добрался',a.meteor==='complete'?'complete':a.meteor==='new'?'available':a.meteor==='sample'?'ready':'active',a.meteor==='new'?0:a.meteor==='searching'?1:2,3,adventureHint(a,'meteor'));
 row('bell','Звон к ужину',a.bell==='complete'?'complete':a.bell==='new'?'available':a.bell==='found'?'ready':'active',Number(a.bell!=='new')+a.tracks+Number(a.bell==='found'),5,adventureHint(a,'bell'));
 row('cave','Пещера первого огня',a.cave?'complete':a.runes?'active':'available',a.runes,3,a.cave?'Послание первых жителей прочитано.':`Найди пещеру за Аркой ветров. Рисунки у входа подскажут порядок знаков. Верных знаков подряд: ${a.runes} из 3.`);
 row('bottles','Два берега',a.bottles.length===3?'complete':a.bottles.length?'active':'available',a.bottles.length,3,a.bottles.length===3?'Все три письма Томы и Нэл собраны.':`Осталось найти: ${missingBottles}.`);
 row('tales','Тетрадь Ноя',a.tales.length===3?'complete':a.tales.length?'active':'available',a.tales.length,3,a.tales.length===3?'Все три истории из тетради прочитаны.':`Послушай непрочитанные истории Ноя (${a.tales.length}/3). Они доступны и днём. Найди Ноя на карте M.`);
 const eligible=completed+completedAdventures(a)>=2;
 row('festival','Вечер фонарей',a.festival?'complete':festivalAvailable(a,completed,s.seconds)?'ready':'waiting',0,1,a.festival?'Ты остался на чай на поляне фонарей.':!eligible?`Заверши ещё ${2-completed-completedAdventures(a)} истории, затем приходи вечером на поляну фонарей.`:festivalAvailable(a,completed,s.seconds)?'Осмотри поляну фонарей и выбери «Остаться на чай».':'Две истории уже завершены. Дождись вечера на поляне фонарей и останься на чай.');
 row('azure','Свет для следующего',z.complete?'complete':azureReady(z)&&s.beaconLit?'ready':z.map||z.marks.length||z.bottle?'active':'available',Number(z.map)+z.marks.length+Number(z.bottle),5,azureObjective(z,s.beaconLit));
 if(s.frontier){const f=s.frontier;row('wind','У гор есть голос',f.wind==='complete'?'complete':f.wind==='repaired'?'ready':'active',['new','accepted','equipped','repaired','complete'].indexOf(f.wind),4,windObjective(f));row('diary','Когда отцветёт вереск',f.diary==='complete'?'complete':f.pages.length===2?'ready':'active',1+f.pages.length,4,diaryObjective(f));}
 const discoveredPlaces=ALL_LANDMARKS.filter(p=>e.places.includes(p.id));
 row('places','Открытые места','active',discoveredPlaces.length,0,`Открыто мест: ${discoveredPlaces.length}. ${discoveredPlaces.map(p=>p.name).join(', ')}.`,'discovery');
 row('ada-night','Вечер у телескопа',e.nightMeeting?'complete':atObservatoryNight(s.seconds)?'active':'waiting',0,1,e.nightMeeting?'Ночная встреча с Адой состоялась.':'Поговори с Адой у телескопа ночью на Звёздном уступе.','discovery');
 row('fireside','Рассказы у костра','repeat',0,0,s.noahTelling?'Ной рассказывает: поговори с ним и выбери «Подсесть к Ною у костра».':'С 18 до 22 по времени поляны Ной может рассказывать у костра. Это отдельные посиделки, без отметки «пройдено».','repeat');
 return rows;
}
export function journeySummary(rows:JourneyEntry[]){const stories=rows.filter(r=>r.group==='story');return {complete:stories.filter(r=>r.status==='complete').length,total:stories.length,active:stories.filter(r=>['active','ready'].includes(r.status)).length,available:stories.filter(r=>r.status==='available').length,waiting:stories.filter(r=>r.status==='waiting').length};}
export function resolveJourneySelection(rows:JourneyEntry[],saved:string|null){
 if(rows.some(r=>r.id===saved))return saved!;
 return rows.find(r=>r.status==='ready')?.id??rows.find(r=>r.group==='story'&&r.status==='active')?.id??rows.find(r=>r.group==='story'&&r.status==='available')?.id??rows[0]?.id??'';
}
