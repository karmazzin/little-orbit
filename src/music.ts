export const MUSIC_TRACKS = [
  {title:'Dreams Become Real',file:'dreams-become-real.mp3',gain:0.922571,integratedLufs:-24.39,isrc:'USUAN1500027'},
  {title:'Dream Culture',file:'dream-culture.mp3',gain:0.406912,integratedLufs:-17.28,isrc:'USUAN1300046'},
  {title:'Floating Cities',file:'floating-cities.mp3',gain:0.54513,integratedLufs:-19.82,isrc:'USUAN1600018'},
  {title:'Atlantean Twilight',file:'atlantean-twilight.mp3',gain:1.0,integratedLufs:-25.09,isrc:'USUAN1100322'},
  {title:'Meditation Impromptu 01',file:'meditation-impromptu-01.mp3',gain:0.811895,integratedLufs:-23.28,isrc:'USUAN1100163'},
] as const;

type Track={title:string;file:string;gain?:number};
type Media=Pick<HTMLAudioElement,'src'|'volume'|'preload'|'currentTime'|'duration'|'play'|'pause'|'addEventListener'>;
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
const FADE_SECONDS=4;

/** Streaming, non-destructive gain normalization and real-time transport envelopes. */
export class MusicPlayer {
  private index=0;
  private enabled=false;
  private hidden=false;
  private revision=0;
  private failed=false;
  private playing=false;
  private gap:number|null=null;
  private fade=0;
  private skip:number|null=null;
  private skipLevel=0;
  private volume=.22;
  private duck=1;
  private duckTarget=1;
  get current(){return this.tracks[this.index];}
  constructor(private media:Media,private tracks:readonly Track[],private base:string,
    private onChange:(track:Track)=>void=()=>{},private onError:()=>void=()=>{}){
    if(!tracks.length)throw new Error('Music playlist is empty');
    media.preload='none';media.volume=0;
    media.addEventListener('ended',()=>{
      if(this.failed||this.gap!==null)return;
      this.revision++;this.playing=false;media.pause();this.skip=null;this.fade=0;
      this.gap=20+Math.random()*40;this.applyVolume();
    });
    media.addEventListener('error',()=>{if(this.enabled&&!this.hidden)this.fail();});
  }
  setEnabled(enabled:boolean){
    if(this.enabled===enabled)return;
    this.enabled=enabled;if(enabled)this.failed=false;this.sync();
  }
  setHidden(hidden:boolean){if(this.hidden!==hidden){this.hidden=hidden;this.sync();}}
  setVolume(volume:number){if(Number.isFinite(volume)){this.volume=clamp(volume);this.applyVolume();}}
  setDucked(ducked:boolean){this.duckTarget=ducked ? .3 : 1;}
  next(){
    if(this.enabled&&!this.hidden&&!this.failed&&this.gap===null&&this.fade>0){
      if(this.skip===null){this.skip=FADE_SECONDS;this.skipLevel=this.envelope();}
      return;
    }
    this.advance();
  }
  update(dt:number){
    if(!this.enabled||this.hidden||this.failed||!Number.isFinite(dt)||dt<=0)return;
    const step=dt*.7/.8;
    this.duck+=Math.sign(this.duckTarget-this.duck)*Math.min(step,Math.abs(this.duckTarget-this.duck));
    if(this.gap!==null){
      this.gap-=dt;if(this.gap<=0)this.advance();
      return;
    }
    if(!this.playing)return;
    if(this.skip!==null){
      this.skip=Math.max(0,this.skip-dt);
      if(this.skip===0){this.advance();return;}
    }else this.fade=Math.min(1,this.fade+dt/FADE_SECONDS);
    this.applyVolume();
  }
  private envelope(){
    const remaining=this.media.duration-this.media.currentTime;
    const end=Number.isFinite(remaining)?clamp(remaining/FADE_SECONDS):1;
    return Math.min(this.fade,end);
  }
  private applyVolume(){
    const gain=this.current.gain;
    const envelope=this.gap!==null?0:this.skip!==null?this.skipLevel*this.skip/FADE_SECONDS:this.envelope();
    this.media.volume=clamp(this.volume*(gain!==undefined&&Number.isFinite(gain)?clamp(gain):1)*this.duck*envelope);
  }
  private advance(){
    this.revision++;this.playing=false;this.media.pause();this.index=(this.index+1)%this.tracks.length;
    this.gap=null;this.skip=null;this.fade=0;this.failed=false;
    this.media.src=this.url();this.media.currentTime=0;this.applyVolume();
    this.onChange(this.current);this.sync();
  }
  private url(){return `${this.base}music/${this.current.file}`;}
  private fail(){
    if(this.failed)return;
    this.failed=true;this.revision++;this.playing=false;this.media.pause();this.onError();
  }
  private sync(){
    const revision=++this.revision;
    this.playing=false;
    if(!this.enabled||this.hidden||this.failed||this.gap!==null){this.media.pause();return;}
    if(!this.media.src)this.media.src=this.url();
    this.applyVolume();this.onChange(this.current);
    void this.media.play().then(()=>{
      if(revision===this.revision)this.playing=true;
      // A delayed play resolution must never resurrect a muted/hidden transport.
      if(revision!==this.revision&&(!this.enabled||this.hidden||this.failed||this.gap!==null))this.media.pause();
    }).catch(()=>{if(revision===this.revision)this.fail();});
  }
}
