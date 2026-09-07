import * as T from 'three';

const materials=new Map<number,T.MeshStandardMaterial>();
export function material(color:number){let m=materials.get(color);if(!m){m=new T.MeshStandardMaterial({color,roughness:.92,flatShading:true});materials.set(color,m);}return m;}
export function mesh(g:T.BufferGeometry,c:number,parent:T.Object3D,x=0,y=0,z=0){const m=new T.Mesh(g,material(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function box(parent:T.Object3D,c:number,w:number,h:number,d:number,x=0,y=0,z=0){return mesh(new T.BoxGeometry(w,h,d),c,parent,x,y,z);}
export function ball(parent:T.Object3D,c:number,r:number,x=0,y=0,z=0,detail=0){return mesh(new T.IcosahedronGeometry(r,detail),c,parent,x,y,z);}
export function cylinder(parent:T.Object3D,c:number,r:number,h:number,x=0,y=0,z=0){return mesh(new T.CylinderGeometry(r,r,h,7),c,parent,x,y,z);}
