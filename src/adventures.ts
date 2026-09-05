import {normalAt} from './terrain.ts';
import {solarState,DAY_SECONDS} from './sky.ts';
export const ADVENTURE_POINTS=[
 {id:'meteor',name:'Шрам на холме',x:-16,z:65,hint:'За южными холмами, дальше озера.'},
 {id:'cave',name:'Пещера первого огня',x:-60,z:-58,hint:'За Аркой ветров, на северо-западном склоне.'},
 {id:'bottle-1',name:'Бутылка у брода',x:16,z:-27,hint:'На восточном берегу возле каменистого брода.'},
 {id:'bottle-2',name:'Бутылка у озера',x:26,z:34,hint:'На восточном берегу озера, южнее Ады.'},
 {id:'bottle-3',name:'Бутылка у тростника',x:7,z:44,hint:'На дальнем южном берегу озера.'},
 {id:'track-1',name:'Следы в траве',x:22,z:-7,hint:'Севернее сада Льва, у примятой травы.'},
 {id:'track-2',name:'Следы у брода',x:7,z:-24,hint:'На западной стороне каменистого брода.'},
 {id:'bell',name:'Колокольчик в кустах',x:-2,z:-31,hint:'За бродом к западу, в низких кустах.'},
 {id:'festival',name:'Поляна фонарей',x:-10,z:-4,hint:'Между луговой тропой и почтовым домиком.'},
 {id:'traveler',name:'Повозка Ноя',x:13,z:-51,hint:'У одинокого северного домика, восточнее его двери.'},
].map(p=>({...p,up:normalAt(p.x,p.z)}));
export const pointById=(id:string)=>ADVENTURE_POINTS.find(p=>p.id===id)!;
export const BOTTLE_IDS=['bottle-1','bottle-2','bottle-3'];
export const TALE_IDS=['amber','azure','ruby'];
export type Adventures={meteor:'new'|'searching'|'sample'|'complete';bell:'new'|'searching'|'found'|'complete';tracks:number;cave:boolean;runes:number;bottles:string[];tales:string[];festival:boolean};
export const initialAdventures=():Adventures=>({meteor:'new',bell:'new',tracks:0,cave:false,runes:0,bottles:[],tales:[],festival:false});
export type AdventureAction={type:'meteor-start'|'meteor-pick'|'meteor-return'|'bell-start'|'bell-pick'|'bell-return'}|{type:'track';index:number}|{type:'rune';symbol:string}|{type:'bottle'|'tale';id:string}|{type:'festival';seconds:number;completed:number};
export function reduceAdventures(s:Adventures,a:AdventureAction):Adventures{
 if(a.type==='meteor-start'&&s.meteor==='new')return {...s,meteor:'searching'};
 if(a.type==='meteor-pick'&&s.meteor==='searching')return {...s,meteor:'sample'};
 if(a.type==='meteor-return'&&s.meteor==='sample')return {...s,meteor:'complete'};
 if(a.type==='bell-start'&&s.bell==='new')return {...s,bell:'searching'};
 if(a.type==='track'&&s.bell==='searching'&&a.index===s.tracks+1&&a.index<=2)return {...s,tracks:a.index};
 if(a.type==='bell-pick'&&s.bell==='searching'&&s.tracks===2)return {...s,bell:'found'};
 if(a.type==='bell-return'&&s.bell==='found')return {...s,bell:'complete'};
 if(a.type==='rune'&&!s.cave){const runes=['sun','tree','star'][s.runes]===a.symbol?s.runes+1:0;return {...s,runes,cave:runes===3};}
 if(a.type==='bottle'&&BOTTLE_IDS.includes(a.id)&&!s.bottles.includes(a.id))return {...s,bottles:[...s.bottles,a.id]};
 if(a.type==='tale'&&TALE_IDS.includes(a.id)&&!s.tales.includes(a.id))return {...s,tales:[...s.tales,a.id]};
 if(a.type==='festival'&&!s.festival&&festivalAvailable(s,a.completed,a.seconds))return {...s,festival:true};
 return s;
}
export function restoreAdventures(raw:string|null):Adventures{
 try{const v=JSON.parse(raw??'null');if(!v||typeof v!=='object')return initialAdventures();const s=initialAdventures();
 if(['searching','sample','complete'].includes(v.meteor))s.meteor=v.meteor;
 if(v.bell==='searching')s.bell='searching';
 if(Number.isInteger(v.tracks)&&v.tracks>=0&&v.tracks<=2&&['searching','found','complete'].includes(v.bell))s.tracks=v.tracks;
 if(['found','complete'].includes(v.bell)&&s.tracks===2)s.bell=v.bell;
 if(Number.isInteger(v.runes)&&v.runes>=0&&v.runes<=3)s.runes=v.runes;
 s.cave=v.cave===true&&s.runes===3;if(!s.cave&&s.runes===3)s.runes=0;
 s.bottles=BOTTLE_IDS.filter(id=>Array.isArray(v.bottles)&&v.bottles.includes(id));s.tales=TALE_IDS.filter(id=>Array.isArray(v.tales)&&v.tales.includes(id));s.festival=v.festival===true;return s;
 }catch{return initialAdventures();}
}
export function completedAdventures(s:Adventures){return Number(s.meteor==='complete')+Number(s.bell==='complete')+Number(s.cave)+Number(s.bottles.length===3)+Number(s.tales.length===3);}
export function festivalAvailable(s:Adventures,completed:number,seconds:number){
 const up=pointById('festival').up,a=solarState(seconds).sunDirection.dot(up),next=solarState(seconds+.1).sunDirection.dot(up);
 return completed+completedAdventures(s)>=2&&a<.25&&a>-.85&&next<a;
}
export function travelerScheduled(seconds:number){return Math.floor(seconds/DAY_SECONDS)%2===0&&solarState(seconds).sunDirection.dot(pointById('traveler').up)>.05;}
export function adventureHint(s:Adventures,id:string){
 if(id==='meteor')return s.meteor==='new'?'У Ады появился обгоревший лист бумаги. Спроси, что случилось этой ночью.':s.meteor==='searching'?'Найди свежий кратер за южными холмами, дальше озера.':s.meteor==='sample'?'Принеси образец Аде.':'✓ Ада получила образец; история «Камень, который добрался» завершена.';
 if(id==='bell')return s.bell==='new'?'Лев всё прислушивается к садовой калитке. Поговори с ним.':s.bell==='found'?'Верни колокольчик Льву.':s.bell==='complete'?'✓ Колокольчик снова у Льва.':s.tracks===0?'Осмотри примятую траву севернее сада Льва.':s.tracks===1?'Следы ведут к западной стороне каменистого брода.':'Ищи звон в кустах к западу от брода. При выключенном звуке заметно мерцание.';
 return '';
}
