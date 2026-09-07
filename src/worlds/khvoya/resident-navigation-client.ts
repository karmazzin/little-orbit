import {Vector3} from 'three';
import {ResidentNavigation} from './resident-life.ts';
import type {Obstacle} from '../../simulation.ts';
/** Route jobs never block rendering; the resident waits at its actual position for the result. */
export class ResidentNavigationClient extends ResidentNavigation {
 private worker=new Worker(new URL('./resident-navigation-worker.ts',import.meta.url),{type:'module'});
 private results=new Map<string,Vector3[]|null>();
 private pending=new Set<string>();
 constructor(obstacles:readonly Obstacle[]){
  super(obstacles);this.worker.postMessage({type:'init',obstacles:obstacles.map(o=>({up:o.up.toArray(),radius:o.radius}))});
  this.worker.onmessage=({data})=>{this.pending.delete(data.key);this.results.set(data.key,data.path?.map((p:number[])=>new Vector3().fromArray(p))??null);if(data.error)console.error('Resident route:',data.error);if(this.results.size>256)this.results.delete(this.results.keys().next().value!);};
 }
 override route(from:Vector3,to:Vector3):Vector3[]|null{
  const key=[...from.toArray(),...to.toArray()].map(v=>v.toFixed(6)).join(',');
  if(this.results.has(key))return this.results.get(key)?.map(p=>p.clone())??null;
  if(!this.pending.has(key)){this.pending.add(key);this.worker.postMessage({type:'route',key,from:from.toArray(),to:to.toArray()});}
  return null;
 }
 dispose(){this.worker.terminate();}
}
