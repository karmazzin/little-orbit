import {TRAVEL_KEY,restoreTravel} from './travel.ts';
import {selectPlayablePlanet} from './worlds/catalog.ts';
import {gameStorage,planetPreview} from './runtime/storage.ts';
let routeOpen=false;
try{
 if(planetPreview)gameStorage.setItem(TRAVEL_KEY,JSON.stringify({amber:false,open:true}));
 routeOpen=restoreTravel(gameStorage.getItem(TRAVEL_KEY)).open;
}catch{}
const planet=selectPlayablePlanet(location.search,routeOpen,import.meta.env.DEV);
try{
 await planet.load();
 if(import.meta.env.DEV){const {showPlanetPreview}=await import('./runtime/planet-preview.ts');showPlanetPreview(planet.id,planetPreview);}
}catch(error){
 console.error(error);const loading=document.getElementById('loading');
 if(loading){loading.hidden=false;loading.textContent='Не удалось загрузить мир. Обнови страницу, чтобы попробовать снова.';}
}
