import {LANDMARKS,atObservatoryNight} from './landmarks.ts';
import {neighborDirection,NEIGHBORS} from './planets.ts';
export type ContentState={postcards:'new'|'active'|'complete';cards:string[];iris:'dormant'|'searching'|'observed'|'complete';clues:string[]};
export type ContentAction={type:'accept'|'deliver'|'observe'|'decode'}|{type:'card'|'clue';id:string};
export const initialContent=():ContentState=>({postcards:'new',cards:[],iris:'dormant',clues:[]});
export function reduceContent(s:ContentState,a:ContentAction):ContentState{
 if(a.type==='accept'&&s.postcards==='new')return {...s,postcards:'active'};
 if(a.type==='card'&&s.postcards==='active'&&LANDMARKS.some(p=>p.id===a.id)&&!s.cards.includes(a.id))return {...s,cards:[...s.cards,a.id]};
 if(a.type==='deliver'&&s.postcards==='active'&&s.cards.length===3)return {...s,postcards:'complete'};
 if(a.type==='clue'&&['camp','arch','grove'].includes(a.id)&&!s.clues.includes(a.id)&&(a.id==='camp'||s.clues.includes('camp')))return {...s,clues:[...s.clues,a.id],iris:s.iris==='dormant'?'searching':s.iris};
 if(a.type==='observe'&&s.iris==='searching'&&s.clues.length===3)return {...s,iris:'observed'};
 if(a.type==='decode'&&s.iris==='observed')return {...s,iris:'complete'};
 return s;
}
export function restoreContent(raw:string|null):ContentState{
 try{const v=JSON.parse(raw??'null');if(!v||typeof v!=='object')return initialContent();
 const s=initialContent();
 if(['active','complete'].includes(v.postcards)&&Array.isArray(v.cards)){
  s.cards=LANDMARKS.filter(p=>v.cards.includes(p.id)).map(p=>p.id);
  if(v.postcards==='active'||s.cards.length===3)s.postcards=v.postcards;else s.cards=[];
 }
 if(Array.isArray(v.clues)&&v.clues.includes('camp')){s.clues=['camp','arch','grove'].filter(id=>v.clues.includes(id));s.iris=s.clues.length===3&&['observed','complete'].includes(v.iris)?v.iris:'searching';}
 return s;
 }catch{return initialContent();}
}
export function irisCanBeObserved(seconds:number){return atObservatoryNight(seconds)&&neighborDirection(NEIGHBORS.findIndex(p=>p.name==='Ирис'),seconds).dot(LANDMARKS[2].up)>.1;}
export function contentObjective(s:ContentState){
 if(s.iris==='dormant')return 'Найди записку в одинокой палатке на дальней стороне. Отметка — в обзоре M.';
 if(s.iris==='complete')return 'Глава завершена: координаты станции у Ириса расшифрованы. Дорога к ней — история будущего путешествия.';
 if(s.iris==='observed')return 'Покажи запись вспышек Аде. Днём она у озера, ночью — у телескопа.';
 if(!s.clues.includes('arch'))return 'Осмотри табличку Арки ветров: сравни знаки с запиской из лагеря.';
 if(!s.clues.includes('grove'))return 'Осмотри табличку Медной рощи: там сохранилась вторая часть схемы.';
 return 'У телескопа на Звёздном уступе дождись местной ночи и видимого Ириса. Нажми E у таблички; наблюдение доступно, когда Ирис над горизонтом.';
}
export const IRIS_ENDING='Ада долго рассматривает записи, а потом улыбается: «Это почерк Арсена, прежнего смотрителя обсерватории. Он оставил части схемы там, где путешественники обязательно остановятся. Три короткие вспышки, одна длинная — позывной старой станции у кольца Ириса. Мы нашли её координаты. Пока у нас нет корабля, но теперь есть место, куда отправиться». Она вкладывает расшифрованную схему в твой журнал.';

export const CLUE_TEXT:Record<string,string>={
 arch:'Сравнив рисунок с запиской из лагеря, ты замечаешь насечки под пятым кругом. Это не счёт деревьев: круг обозначает орбиту, а насечки — место наблюдения. Рядом вырезан маленький лист. Вторая часть схемы должна быть в Медной роще.',
 grove:'На обратной стороне таблички — тонкая латунная пластинка. Три короткие черты и одна длинная окружены схемой кольца. Ниже подпись: «Смотри с уступа, когда солнце скроется». Ты переносишь рисунок в журнал.',
};
