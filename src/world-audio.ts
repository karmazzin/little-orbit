import type {Sound,SoundMix} from './soundscape.ts';

type Voice={source:AudioBufferSourceNode;gain:GainNode;pan:StereoPannerNode};
const LOOPS=new Set(['wind','river','leaves','crickets']);
const SHORTS=['bell',...Array.from({length:3},(_,i)=>`bird-${i+1}`),
 ...['grass','stone','wood'].flatMap(s=>Array.from({length:3},(_,i)=>`step-${s}-${i+1}`))];
const clamp=(v:number)=>Math.max(0,Math.min(1,v));

/** Small decoded recordings, bounded voices, and no late sounds after a mute or scene change. */
export class WorldAudio {
 private context:AudioContext|undefined;
 private ambience:GainNode|undefined;
 private effects:GainNode|undefined;
 private enabled=false;
 private hidden=false;
 private active=true;
 private revision=0;
 private ambienceVolume=.25;
 private effectsVolume=.30;
 private buffers=new Map<string,AudioBuffer>();
 private loading=new Map<string,Promise<AudioBuffer|null>>();
 private failures=new Set<string>();
 private loops=new Map<string,Voice>();
 private starting=new Set<string>();
 private shots=new Set<Voice>();
 private targets=new Map<string,Sound>();
 constructor(private base:string,private onError:(id:string)=>void=()=>{},
  private createContext=()=>new AudioContext(),
  private fetchSample=async(id:string,context:AudioContext)=>{
   const response=await fetch(`${base}sounds/${id}.mp3`);
   if(!response.ok)throw new Error(`Sound ${response.status}: ${id}`);
   return context.decodeAudioData(await response.arrayBuffer());
  }){}
 setEnabled(enabled:boolean){
  if(this.enabled===enabled)return;
  this.enabled=enabled;
  if(enabled){for(const id of this.failures)this.loading.delete(id);this.failures.clear();}
  this.sync();
 }
 setHidden(hidden:boolean){if(this.hidden!==hidden){this.hidden=hidden;this.sync();}}
 setActive(active:boolean){if(this.active!==active){this.active=active;this.sync();}}
 setVolumes(ambience:number,effects:number){
  if(Number.isFinite(ambience))this.ambienceVolume=clamp(ambience);
  if(Number.isFinite(effects))this.effectsVolume=clamp(effects);
  if(this.context){
   this.ambience!.gain.setTargetAtTime(this.ambienceVolume,this.context.currentTime,.12);
   this.effects!.gain.setTargetAtTime(this.effectsVolume,this.context.currentTime,.12);
  }
 }
 private get audible(){return this.enabled&&!this.hidden&&this.active;}
 private sync(){
  this.revision++;
  if(!this.audible){
   this.stopAll();void this.context?.suspend().catch(()=>{});return;
  }
  try{
   if(!this.context){
    this.context=this.createContext();
    this.ambience=this.context.createGain();this.effects=this.context.createGain();
    this.ambience.gain.value=this.ambienceVolume;this.effects.gain.value=this.effectsVolume;
    this.ambience.connect(this.context.destination);this.effects.connect(this.context.destination);
   }
   const revision=this.revision;
   void this.context.resume().catch(()=>{if(revision===this.revision)this.onError('audio');});
   // Warm short clips once; missed footsteps are dropped, never played late.
   for(const id of SHORTS)void this.load(id);
  }catch{this.onError('audio');}
 }
 private load(id:string):Promise<AudioBuffer|null>{
  const existing=this.loading.get(id);if(existing)return existing;
  const pending=this.fetchSample(id,this.context!).then(buffer=>{this.buffers.set(id,buffer);return buffer;}).catch(()=>{
   this.failures.add(id);this.onError(id);return null;
  });
  this.loading.set(id,pending);return pending;
 }
 update(mix:SoundMix){
  this.targets=new Map(mix.loops.map(s=>[s.id,s]));
  if(!this.audible||!this.context||this.context.state!=='running')return;
  for(const [id,voice] of this.loops)this.adjust(voice,this.targets.get(id)??{id,gain:0,pan:0});
  for(const sound of mix.loops){
   if(!LOOPS.has(sound.id)||sound.gain<=.001||this.loops.has(sound.id)||this.starting.has(sound.id)||this.failures.has(sound.id))continue;
   const revision=this.revision;this.starting.add(sound.id);
   void this.load(sound.id).then(buffer=>{
    this.starting.delete(sound.id);
    const target=this.targets.get(sound.id);
    if(!buffer||revision!==this.revision||!this.audible||!target||target.gain<=.001)return;
    const voice=this.voice(buffer,true,this.ambience!);this.loops.set(sound.id,voice);this.adjust(voice,target);
   });
  }
  for(const sound of mix.shots){
   if(sound.gain<=0||this.shots.size>=8)continue;
   const buffer=this.buffers.get(sound.id);
   if(!buffer){if(SHORTS.includes(sound.id))void this.load(sound.id);continue;}
   const voice=this.voice(buffer,false,sound.id.startsWith('bird-')?this.ambience!:this.effects!,sound);
   this.shots.add(voice);
  }
 }
 private voice(buffer:AudioBuffer,loop:boolean,bus:GainNode,sound?:Sound):Voice{
  const c=this.context!,source=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner();
  source.buffer=buffer;source.loop=loop;source.playbackRate.value=sound?.rate??1;
  gain.gain.value=sound?.gain??0;pan.pan.value=sound?.pan??0;
  source.connect(gain).connect(pan).connect(bus);
  const voice={source,gain,pan};
  source.onended=()=>{this.shots.delete(voice);source.disconnect();gain.disconnect();pan.disconnect();};
  source.start(0,loop?Math.random()*buffer.duration:0);return voice;
 }
 private adjust(voice:Voice,sound:Sound){
  voice.gain.gain.setTargetAtTime(clamp(sound.gain),this.context!.currentTime,.35);
  voice.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,sound.pan)),this.context!.currentTime,.2);
 }
 private stopAll(){
  for(const voice of [...this.loops.values(),...this.shots]){
   voice.source.stop();voice.source.disconnect();voice.gain.disconnect();voice.pan.disconnect();
  }
  this.loops.clear();this.shots.clear();this.targets.clear();
 }
}
