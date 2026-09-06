import * as T from 'three';
/** Surface detail lives on the sphere, so spots rotate with the star. */
export function createAtlasStar(segments=64){
 const material=new T.ShaderMaterial({
  uniforms:{tint:{value:new T.Color(0xffffff)},spots:{value:[new T.Vector3(.3,-.8,.5),new T.Vector3(-.4,-.8,.3),new T.Vector3(.7,.6,-.1),new T.Vector3(-.8,.4,-.2),new T.Vector3(.1,.9,.2),new T.Vector3(-.15,-.95,-.2),new T.Vector3(.6,-.5,-.5)].map(v=>v.normalize())}},
  vertexShader:`varying vec3 localDirection; varying vec3 viewNormal; varying vec3 viewDirection;
   void main(){localDirection=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.0);viewNormal=normalMatrix*normal;viewDirection=-p.xyz;gl_Position=projectionMatrix*p;}`,
  fragmentShader:`uniform vec3 tint;uniform vec3 spots[7];varying vec3 localDirection;varying vec3 viewNormal;varying vec3 viewDirection;
   float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   void main(){vec3 n=normalize(localDirection);float grain=noise(n*75.0),cloud=noise(n*12.0);float spot=0.0;
    for(int i=0;i<7;i++){float d=dot(n,spots[i])+(cloud-.5)*.007;spot=max(spot,smoothstep(.988,.996,d)*.38+smoothstep(.996,.999,d)*.42);}
    float facing=max(0.0,dot(normalize(viewNormal),normalize(viewDirection)));float limb=.82+.18*pow(facing,.45);
    vec3 colour=mix(vec3(2.4,1.18,.3),vec3(3.4,2.55,1.25),.65+cloud*.25);colour*=limb*(.96+.04*grain);colour=mix(colour,vec3(.48,.17,.035),spot);
    gl_FragColor=vec4(colour*tint,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 const star=new T.Mesh(new T.SphereGeometry(12,segments,Math.round(segments*.625)),material);star.name='oreol';
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(x+.5)/size*2-1,dy=(y+.5)/size*2-1,r=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
  const rays=1+.06*Math.sin(angle*9)+.035*Math.sin(angle*17+1.3);
  const alpha=r<1?Math.exp(-r*r*5.8)*Math.pow(1-r,1.3)*rays*.7:0;
  const i=(y*size+x)*4;data[i]=255;data[i+1]=190;data[i+2]=82;data[i+3]=Math.round(alpha*255);
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearFilter;texture.needsUpdate=true;
 const corona=new T.Sprite(new T.SpriteMaterial({map:texture,color:0xffda91,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}));corona.name='oreol-corona';corona.scale.set(76,76,1);star.add(corona);
 return star;
}
