import * as T from 'three';
/** Match adaptive triangle borders before uploading the terrain to the GPU. */
export function stitchTerrain(points:number[],colours:number[]){
 const vertices:{point:T.Vector3;up:T.Vector3}[]=[],ids:number[]=[],unique=new Map<string,number>(),buckets=new Map<string,number[]>();
 const cell=.035,cellKey=(x:number,y:number,z:number)=>`${x},${y},${z}`;
 for(let i=0;i<points.length;i+=3){
  const point=new T.Vector3(points[i],points[i+1],points[i+2]),key=point.toArray().map(v=>v.toFixed(6)).join(',');
  let id=unique.get(key);
  if(id===undefined){id=vertices.length;unique.set(key,id);const up=point.clone().normalize();vertices.push({point,up});const k=cellKey(Math.floor(up.x/cell),Math.floor(up.y/cell),Math.floor(up.z/cell));const list=buckets.get(k)??[];list.push(id);buckets.set(k,list);}
  ids.push(id);
 }
 const borders=new Map<string,number[]>();
 function edge(a:number,b:number){
  if(a===b)return [];
  const low=Math.min(a,b),high=Math.max(a,b),key=`${low}:${high}`;
  let found=borders.get(key);
  if(!found){
   const u=vertices[low].up,v=vertices[high].up,delta=v.clone().sub(u),length=delta.lengthSq(),normal=u.clone().cross(v).normalize();
   const candidates:{id:number;t:number}[]=[];
   if(length>1e-14){
    const pad=.001,min=u.clone().min(v).addScalar(-pad).divideScalar(cell).floor(),max=u.clone().max(v).addScalar(pad).divideScalar(cell).floor();
    for(let x=min.x;x<=max.x;x++)for(let y=min.y;y<=max.y;y++)for(let z=min.z;z<=max.z;z++)for(const id of buckets.get(cellKey(x,y,z))??[]){
     if(id===low||id===high)continue;const n=vertices[id].up;
     if(Math.abs(n.dot(normal))>1e-8)continue;
     const t=n.clone().sub(u).dot(delta)/length;if(t>1e-7&&t<1-1e-7)candidates.push({id,t});
    }
   }
   found=candidates.sort((a,b)=>a.t-b.t).map(v=>v.id);borders.set(key,found);
  }
  return a===low?found:[...found].reverse();
 }
 const stitched:number[]=[],paint:number[]=[];
 function emit(point:T.Vector3,colour:number[]){stitched.push(point.x,point.y,point.z);paint.push(...colour);}
 for(let i=0;i<ids.length;i+=3){
  const a=ids[i],b=ids[i+1],c=ids[i+2],ab=edge(a,b),bc=edge(b,c),ca=edge(c,a),colour=colours.slice(i*3,i*3+3);
  if(!ab.length&&!bc.length&&!ca.length){for(const id of [a,b,c])emit(vertices[id].point,colour);continue;}
  const boundary=[a,...ab,b,...bc,c,...ca],center=vertices[a].point.clone().add(vertices[b].point).add(vertices[c].point).divideScalar(3);
  for(let j=0;j<boundary.length;j++){emit(center,colour);emit(vertices[boundary[j]].point,colour);emit(vertices[boundary[(j+1)%boundary.length]].point,colour);}
 }
 return {points:stitched,colours:paint};
}
