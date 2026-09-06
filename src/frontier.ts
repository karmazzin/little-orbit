import {Quaternion,Vector3} from 'three';
import {normalAt,coordinates} from './geography.ts';
const frame=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(-.88,-.4,-.25).normalize());
export const frontierUp=(x:number,z:number)=>normalAt(x,z).applyQuaternion(frame);
export const FRONTIER_PLACES=[
 {id:'ranger-shelter',name:'Приют под седловиной',x:5,z:-48,text:'Дом прижался к каменному склону. На крыльце сушатся верёвки, возле двери стоят высокие сапоги. Здесь живёт Савва — он записывает погоду и следит, чтобы горы оставались местом, куда можно вернуться.',hint:'В западных горах, ниже высокой седловины.'},
 {id:'wind-saddle',name:'Поющая седловина',x:-15,z:-61,text:'Между скалами натянут старый деревянный каркас. Когда-то в нём звенели медные трубки. Теперь слышен только ветер и стук оборванного шнура.',hint:'Над горным приютом, между вершинами западного хребта.'},
 {id:'old-station',name:'Станция сухих трав',x:40,z:-22,text:'Небольшой полевой навес скрыт среди хвойных деревьев. На столе — пустые рамки для гербария, катушка шнура и жестяная коробка. На крышке выцарапано: «Даже у плохой погоды есть свой почерк».',hint:'Среди хвойных деревьев на склоне западного хребта.'},
 {id:'lost-cove',name:'Бухта забытых страниц',x:-35,z:52,text:'Между выбеленными ветками застряла промокшая обложка дневника. На первой странице ещё можно разобрать рисунок одинокого дерева и подпись: «Вернуться, когда отцветёт вереск». Несколько листов вырваны.',hint:'На дальнем берегу Залива заката.'},
 {id:'weather-ridge',name:'Уступ одинокого дерева',x:-42,z:8,text:'На открытом склоне растёт наклонённое ветром дерево. Под камнем у корней лежит жестяной футляр с бумагами. Отсюда видны западные воды и низкие облака над горами.',hint:'На западном склоне, над Медным озером.'},
].map(p=>({...p,up:frontierUp(p.x,p.z)}));
export const SAVVA_HOME=coordinates(FRONTIER_PLACES[0].up);
export type FrontierState={version:1;wind:'new'|'accepted'|'equipped'|'repaired'|'complete';diary:'new'|'searching'|'complete';pages:string[]};
export const initialFrontier=():FrontierState=>({version:1,wind:'new',diary:'new',pages:[]});
export const FRONTIER_SAVE_KEY='little-orbit-frontier-v1';
export type FrontierAction={type:'accept-wind'|'take-cord'|'repair-wind'|'finish-wind'|'start-diary'|'finish-diary'}|{type:'page';id:string};
export function reduceFrontier(s:FrontierState,a:FrontierAction):FrontierState{
 if(a.type==='accept-wind'&&s.wind==='new')return {...s,wind:'accepted'};
 if(a.type==='take-cord'&&s.wind==='accepted')return {...s,wind:'equipped'};
 if(a.type==='repair-wind'&&s.wind==='equipped')return {...s,wind:'repaired'};
 if(a.type==='finish-wind'&&s.wind==='repaired')return {...s,wind:'complete'};
 if(a.type==='start-diary'&&s.diary==='new')return {...s,diary:'searching'};
 if(a.type==='page'&&s.diary==='searching'&&['old-station','weather-ridge'].includes(a.id)&&!s.pages.includes(a.id))return {...s,pages:[...s.pages,a.id]};
 if(a.type==='finish-diary'&&s.diary==='searching'&&s.pages.length===2)return {...s,diary:'complete'};
 return s;
}
export function restoreFrontier(raw:string|null):FrontierState{
 try{const v=JSON.parse(raw??'null');if(v?.version!==1)return initialFrontier();const s=initialFrontier();if(['accepted','equipped','repaired','complete'].includes(v.wind))s.wind=v.wind;if(['searching','complete'].includes(v.diary)){s.diary='searching';s.pages=['old-station','weather-ridge'].filter(id=>Array.isArray(v.pages)&&v.pages.includes(id));if(v.diary==='complete'&&s.pages.length===2)s.diary='complete';}return s;}catch{return initialFrontier();}
}
export function windObjective(s:FrontierState){return s.wind==='accepted'?'Возьми прочный шнур на Станции сухих трав.':s.wind==='equipped'?'Закрепи трубки на Поющей седловине.':s.wind==='repaired'?'Вернись к Савве и расскажи, что сигнал снова работает.':s.wind==='complete'?'Савва услышал восстановленный сигнал.':'Поговори с Саввой у горного приюта.';}
export function diaryObjective(s:FrontierState){return s.diary==='complete'?'Дневник возвращён Савве.':s.pages.length===2?'Покажи найденные страницы Савве.':!s.pages.includes('weather-ridge')?'Поищи страницу у одинокого дерева на уступе над Медным озером.':'Найди второй лист на Станции сухих трав.';}
