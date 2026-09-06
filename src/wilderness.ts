import {Quaternion,Vector3} from 'three';
import {normalAt,RADIUS} from './geography.ts';
const frame=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(.86,-.4,-.3).normalize());
export const azureUp=(x:number,z:number)=>normalAt(x,z).applyQuaternion(frame);
export const WILDERNESS=[
 {id:'spruce-trail',name:'Еловая тишина',x:96,z:5,hint:'Высокие ели на дальней стороне, между лагерем астронома и горами.',text:'Под елями пахнет смолой. На срезе поваленного ствола виден почти стёртый разомкнутый круг. Кто-то оставил здесь удобное место для долгой передышки.'},
 {id:'old-shelter',name:'Старый привал',x:73,z:-14,hint:'У подножия гор, между еловой рощей и перевалом.',text:'Под навесом сохранились кружка, сухие дрова и записка: «На перевале всё ещё лежала тень. А внизу уже светились белые стволы. Там я впервые почувствовал, что дойду до моря. О маяке допишу позже».'},
 {id:'azure-pass',name:'Перевал дальнего ветра',x:58,z:-32,hint:'В седловине над старым привалом, между каменистыми склонами.',text:'Ветер перебирает траву между камнями. Позади остались ели и палатка, впереди за склонами открывается Лазурное море. На указателе два знака: палатка и волна.'},
 {id:'birch-trail',name:'Берёзовый просвет',x:45,z:-5,hint:'На спуске с перевала к Лазурному морю.',text:'Белые стволы светятся даже в пасмурный день. Между корнями растут мелкие цветы. В развилке ветвей застряла ленточка того же цвета, что и море внизу.'},
 {id:'azure-cove',name:'Бухта тихой волны',x:34,z:23,hint:'Ниже берёзовой рощи, на восточном берегу Лазурного моря.',text:'Между ракушками лежит бутылка с запиской: «Думал, что дошёл до края мира. Посидел у воды и понял: отсюда просто начинается другая дорога». У пологого берега можно войти в воду.'},
 {id:'azure-beacon',name:'Маяк дальнего берега',x:30,z:45,hint:'От бухты вдоль берега — к каменному маяку на возвышенности.',text:'На мысе стоит небольшой старый маяк. С открытой площадки видны вода и дальние хребты. Под стеклом уцелел фонарь; рычаг у основания ещё поддаётся руке.'},
].map(p=>({...p,up:azureUp(p.x,p.z)}));
export const TRAIL=[azureUp(125.197373,22.65436),...WILDERNESS.map(p=>p.up)];
/** Distance to the authored spherical trail, used to keep its walking corridor clear. */
export function trailDistance(up:Vector3){
 let best=Infinity;for(let i=1;i<TRAIL.length;i++){const a=TRAIL[i-1],b=TRAIL[i],d=b.clone().sub(a),t=Math.max(0,Math.min(1,up.clone().sub(a).dot(d)/d.lengthSq()));best=Math.min(best,up.distanceTo(a.clone().addScaledVector(d,t).normalize())*RADIUS);}return best;
}
