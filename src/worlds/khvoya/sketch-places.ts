import {ALL_LANDMARKS} from './landmarks.ts';
import {ADVENTURE_POINTS} from './adventures.ts';
import {CAMP} from './discoveries.ts';
import {HOMES,PEOPLE} from './resident-life.ts';
/** The stationary places represented by map markers, including residents' homes. */
export const SKETCH_PLACES=[
 ...ALL_LANDMARKS,
 ...ADVENTURE_POINTS.map(p=>({...p,up:p.id==='traveler'?HOMES.noah.up:p.up,text:p.hint})),
 {id:'camp',name:CAMP.name,up:CAMP.up,text:'Одинокая палатка, ящик у входа и кострище под открытым небом.'},
 ...PEOPLE.filter(p=>p.id!=='noah'&&p.id!=='savva').map(p=>({id:'home-'+p.id,name:'Дом · '+p.name,up:HOMES[p.id].up,text:'Дом '+p.name+' — ещё одно знакомое место в Тихой долине.'})),
];
export function sketchPlace(id:string){return SKETCH_PLACES.find(p=>p.id===id);}
