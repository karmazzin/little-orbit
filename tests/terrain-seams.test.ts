import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {stitchTerrain} from '../src/terrain-seams.ts';
test('a curved elevated midpoint is shared by both sides of an adaptive border',()=>{
 const a=new T.Vector3(-1,5,0),b=new T.Vector3(1,5,0),m=a.clone().add(b).normalize().multiplyScalar(6),c=new T.Vector3(0,5,1),d=new T.Vector3(0,5,-1);
 const points=[a,b,c,b,m,d,m,a,d].flatMap(v=>v.toArray()),colours=points.map(()=>.5),result=stitchTerrain(points,colours);
 const edges=new Map<string,number>(),key=(v:number[])=>v.map(n=>n.toFixed(6)).join(',');
 for(let i=0;i<result.points.length;i+=9)for(let j=0;j<3;j++){const x=key(result.points.slice(i+j*3,i+j*3+3)),k=(j+1)%3,y=key(result.points.slice(i+k*3,i+k*3+3)),edge=[x,y].sort().join('|');edges.set(edge,(edges.get(edge)??0)+1);}
 for(const p of [a,b])assert.equal(edges.get([key(p.toArray()),key(m.toArray())].sort().join('|')),2);
 assert.equal(result.points.length,result.colours.length);
});
