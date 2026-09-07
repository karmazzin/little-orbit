import {gameStorage as localStorage} from './storage.ts';
import {MusicPlayer,MUSIC_TRACKS} from '../music.ts';
import {WorldAudio} from '../world-audio.ts';

/** Shared music controls, persistence and world-audio settings for the active planet. */
export function setupGameAudio(base:string){
 const $=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;
 let soundChosen=false;
 let audioOn=false;
 
 const worldAudio=new WorldAudio(base,()=>{$('sound-status').textContent='Часть звуков не загрузилась. Выключи и включи звук, чтобы повторить.';});
 
 const MUSIC_SAVE_KEY='little-orbit-music-v1';
 let savedMusic:string|null=null;
 try{savedMusic=localStorage.getItem(MUSIC_SAVE_KEY);}catch{}
 const music=new MusicPlayer(new Audio(),MUSIC_TRACKS,base,
  track=>{$('music-current').textContent=track.title;},
  ()=>{$('music-current').textContent='Трек не загрузился. Попробуй следующий или включи звук снова.';},savedMusic);
 $('music-current').textContent=music.current.title;
 function saveMusic(){try{localStorage.setItem(MUSIC_SAVE_KEY,music.snapshot());}catch{}}
 window.addEventListener('pagehide',saveMusic);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)saveMusic();});
 window.setInterval(saveMusic,1000);
 for(const track of MUSIC_TRACKS){
  const item=document.createElement('li'),link=document.createElement('a');
  link.href=`https://incompetech.com/music/royalty-free/index.html?isrc=${track.isrc}`;
  link.textContent=track.title;link.target='_blank';link.rel='noopener noreferrer';item.append(link);$('music-credits').append(item);
 }
 function toggleSound(){
  soundChosen=true;
  audioOn=!audioOn;music.setEnabled(audioOn);worldAudio.setEnabled(audioOn);
  if(audioOn)$('sound-status').textContent='';
  $('sound').style.background=audioOn?'#738568':'#24363555';
  for(const id of ['sound','music-toggle']){
   $(id).setAttribute('aria-label',audioOn?'Выключить музыку и звуки':'Включить музыку и звуки');
   $(id).setAttribute('aria-pressed',String(audioOn));
  }
  $('music-toggle').textContent=audioOn?'♫ Звук включён':'♫ Включить звук';
 
 }
 $('sound').onclick=toggleSound;
 $('music-toggle').onclick=toggleSound;
 function renderMusicTransition(){
  const state=music.status,busy=state==='switching'||state==='loading';
  const button=$<HTMLButtonElement>('music-next');
  const label=state==='switching'?'Переключаем…':state==='loading'?'Загружаем трек…':'Следующий трек →';
  if(button.textContent!==label)button.textContent=label;
  button.disabled=state==='switching';button.setAttribute('aria-busy',String(busy));
  $('music-transition').hidden=!busy;
  const description=state==='switching'?'Плавно приглушаем текущую мелодию…':'Загружаем: '+music.current.title;
  if(busy&&$('music-transition-label').textContent!==description)$('music-transition-label').textContent=description;
  const progress=$<HTMLProgressElement>('music-transition-progress');
  if(state==='switching')progress.value=music.switchProgress;
  else if(progress.hasAttribute('value'))progress.removeAttribute('value');
 }
 $('music-next').onclick=()=>{music.next();renderMusicTransition();};
 $('music-volume').oninput=()=>music.setVolume(Number($<HTMLInputElement>('music-volume').value)/100);
 const updateMixVolumes=()=>worldAudio.setVolumes(Number($<HTMLInputElement>('ambience-volume').value)/100,Number($<HTMLInputElement>('effects-volume').value)/100);
 $('ambience-volume').oninput=updateMixVolumes;$('effects-volume').oninput=updateMixVolumes;
 music.setHidden(document.hidden);worldAudio.setHidden(document.hidden);
 document.addEventListener('visibilitychange',()=>{music.setHidden(document.hidden);worldAudio.setHidden(document.hidden);});
 return {music,worldAudio,get soundChosen(){return soundChosen;},get audioOn(){return audioOn;},toggleSound,renderMusicTransition};
}
