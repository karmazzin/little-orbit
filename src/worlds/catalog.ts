/** Register only playable worlds. Atlas-only planets have no startup entry yet. */
export const PLAYABLE_PLANETS=[
 {id:'khvoya',name:'Хвоя',load:()=>import('../main.ts')},
 {id:'amber',name:'Янтарь',load:()=>import('../amber-main.ts')},
] as const;
export type PlayablePlanetId=typeof PLAYABLE_PLANETS[number]['id'];
export function previewEnabled(search:string,development:boolean){return development&&new URLSearchParams(search).get('test')==='1';}
export function selectPlayablePlanet(search:string,routeOpen:boolean,development:boolean){
 const id=new URLSearchParams(search).get('planet');
 const planet=PLAYABLE_PLANETS.find(p=>p.id===id)??PLAYABLE_PLANETS[0];
 return planet.id==='khvoya'||routeOpen||previewEnabled(search,development)?planet:PLAYABLE_PLANETS[0];
}
export function planetPreviewUrl(current:string,id:PlayablePlanetId){
 const url=new URL(current);url.searchParams.set('planet',id);url.searchParams.set('test','1');url.searchParams.delete('arrival');url.hash='';return url.href;
}
export function regularGameUrl(current:string){
 const url=new URL(current);for(const key of ['planet','test','arrival'])url.searchParams.delete(key);url.hash='';return url.href;
}
