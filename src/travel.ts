import {normalAt} from './geography.ts';
export const TRAVEL_KEY='little-orbit-travel-v1';
export const AMBER_SAVE_KEY='little-orbit-amber-world-v1';
export const FRAME_UP=normalAt(-58,35);
export type TravelState={amber:boolean;open:boolean};
export const initialTravel=():TravelState=>({amber:false,open:false});
export function restoreTravel(raw:string|null):TravelState{
 try{const s=JSON.parse(raw??'null');return s?.open===true?{amber:false,open:true}:{amber:s?.amber===true,open:false};}catch{return initialTravel();}
}
export function receiveAmber(state:TravelState,places:readonly string[]):TravelState{
 return places.includes('grove')&&!state.open&&!state.amber?{amber:true,open:false}:state;
}
export function insertAmber(state:TravelState,nearFrame:boolean):TravelState{
 return nearFrame&&state.amber&&!state.open?{amber:false,open:true}:state;
}
export const LEV_GROVE_TEXT='Эти деревья родом с Янтаря. Там целые леса с красными, жёлтыми и оранжевыми листьями, а между ними бегут маленькие ручьи. Нашу рощу посадили из семян, которые принесли вернувшиеся путешественники. Поэтому на табличке и написано: «Посажено теми, кто вернулся». Цвет листьев они сохранили даже здесь, на Хвое.';
export const AMBER_GIFT_TEXT='Возьми янтарь. Он хранился у нас вместе с рассказами о той дороге. Возле Медной рощи стоит янтарная рамка — примерно в десяти метрах от деревьев. На ней есть углубление такой же формы. Попробуй положить янтарь туда. И помни: домой всегда можно вернуться.';
