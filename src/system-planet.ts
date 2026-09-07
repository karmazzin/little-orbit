import * as T from 'three';
import {sample,RADIUS} from './worlds/khvoya/terrain.ts';
/** Small, deterministic atlas surfaces. Home uses the playable world's elevation. */
export function createAtlasPlanet(index:number,home:boolean,color:number,detail=14){
 const root=new T.Group(),surface=new T.Group();surface.name='surface';root.add(surface);
 const radius=home?6:5+index*.4;
 const geometry=new T.IcosahedronGeometry(radius,detail),positions=geometry.getAttribute('position');
 const colours:number[]=[],n=new T.Vector3(),base=new T.Color(color),shade=new T.Color();
 for(let i=0;i<positions.count;i++){
  n.fromBufferAttribute(positions,i).normalize();
  const broad=Math.sin(n.x*5+index*2)*Math.cos(n.y*4-index)+Math.sin(n.z*7+n.x*3)*.45;
  const ridge=Math.pow(1-Math.abs(Math.sin(n.x*13+n.y*8+n.z*5+index)),3);
  let height=radius*(1+Math.max(-.025,broad*.055+ridge*.05));
  if(home){const land=sample(n);height=radius*Math.max(land.height,land.waterLevel)/RADIUS;
   shade.set(land.wet?0x397f9c:land.biome==='mountain'?(land.height>77?0xe5e2cf:0x8d9983):land.biome==='shore'?0xb7be8b:0x6f9c64);
  }else{
   shade.copy(base).multiplyScalar(.68+(broad+1.5)*.16);
   if(index===2&&broad<.2){height=radius;shade.set(0x367caa).lerp(new T.Color(0x73c7cf),Math.max(0,broad+.8)*.4);}
   if(index===1&&ridge>.65)shade.lerp(new T.Color(0xf6d99f),.55);
   if(index===3&&broad>.65)shade.lerp(new T.Color(0xe5cbed),.6);
   if(index===4&&ridge>.6)shade.lerp(new T.Color(0x593d48),.6);
  }
  positions.setXYZ(i,n.x*height,n.y*height,n.z*height);colours.push(shade.r,shade.g,shade.b);
 }
 geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));geometry.computeVertexNormals();
 const terrain=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.86,flatShading:true}));terrain.name='terrain';surface.add(terrain);
 const axis=new T.Group();axis.rotation.x=.2+index*.12;root.remove(surface);axis.add(surface);root.add(axis);
 if(index===3){const ring=new T.Mesh(new T.RingGeometry(radius*1.45,radius*2,96),new T.MeshStandardMaterial({color:0xcbbad8,transparent:true,opacity:.6,side:T.DoubleSide,roughness:1,depthWrite:false}));ring.rotation.x=Math.PI/2;axis.add(ring);}
 root.userData.radius=radius*(home?1.3:index===3?2:1.15);
 return root;
}
