export const MUSIC_TRACKS = [
  {title:'Dreams Become Real',file:'dreams-become-real.mp3',isrc:'USUAN1500027'},
  {title:'Dream Culture',file:'dream-culture.mp3',isrc:'USUAN1300046'},
  {title:'Floating Cities',file:'floating-cities.mp3',isrc:'USUAN1600018'},
  {title:'Atlantean Twilight',file:'atlantean-twilight.mp3',isrc:'USUAN1100322'},
  {title:'Meditation Impromptu 01',file:'meditation-impromptu-01.mp3',isrc:'USUAN1100163'},
] as const;

type Track={title:string;file:string};
type Media=Pick<HTMLAudioElement,'src'|'volume'|'preload'|'currentTime'|'play'|'pause'|'addEventListener'>;

/** One streaming element keeps the soundtrack out of the initial game download. */
export class MusicPlayer {
  private index=0;
  private enabled=false;
  private hidden=false;
  private revision=0;
  get current(){return this.tracks[this.index];}
  constructor(private media:Media,private tracks:readonly Track[],private base:string,
    private onChange:(track:Track)=>void=()=>{},private onError:()=>void=()=>{}){
    if(!tracks.length)throw new Error('Music playlist is empty');
    media.preload='none';media.volume=.22;
    media.addEventListener('ended',()=>{if(this.enabled&&!this.hidden)this.next();});
    // Loading and decoding failures may occur after play() has already resolved.
    media.addEventListener('error',()=>{if(this.enabled&&!this.hidden){this.revision++;media.pause();this.onError();}});
  }
  setEnabled(enabled:boolean){this.enabled=enabled;this.sync();}
  setHidden(hidden:boolean){this.hidden=hidden;this.sync();}
  setVolume(volume:number){if(Number.isFinite(volume))this.media.volume=Math.max(0,Math.min(1,volume));}
  next(){
    this.revision++;this.media.pause();
    this.index=(this.index+1)%this.tracks.length;
    this.media.src=this.url();this.media.currentTime=0;
    this.onChange(this.current);this.sync();
  }
  private url(){return `${this.base}music/${this.current.file}`;}
  private sync(){
    const revision=++this.revision;
    if(!this.enabled||this.hidden){this.media.pause();return;}
    if(!this.media.src)this.media.src=this.url();
    this.onChange(this.current);
    void this.media.play().catch(()=>{if(revision===this.revision)this.onError();});
  }
}
