import {Vector3} from 'three';
import {ResidentNavigation} from './resident-life.ts';
let navigation:ResidentNavigation;
const scope=globalThis as unknown as {onmessage:((event:MessageEvent)=>void)|null;postMessage:(value:unknown)=>void};
scope.onmessage=({data})=>{
 if(data.type==='init'){navigation=new ResidentNavigation(data.obstacles.map((o:{up:number[];radius:number})=>({up:new Vector3().fromArray(o.up),radius:o.radius})));return;}
 if(data.type==='route'){
  try{const path=navigation.route(new Vector3().fromArray(data.from),new Vector3().fromArray(data.to));scope.postMessage({key:data.key,path:path?.map(p=>p.toArray())??null});}
  catch(error){scope.postMessage({key:data.key,path:null,error:String(error)});}
 }
};
