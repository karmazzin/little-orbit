import test from 'node:test';
import assert from 'node:assert/strict';
import {MusicPlayer} from '../src/music.ts';

// Node has no media decoder; this boundary records commands sent to the browser.
class Media extends EventTarget {
  src=''; volume=1; preload=''; currentTime=0; duration=120; paused=true;
  plays:string[]=[];
  play(){this.paused=false;this.plays.push(this.src);return Promise.resolve();}
  pause(){this.paused=true;}
}
const tracks=[{title:'One',file:'one.mp3'},{title:'Two',file:'two.mp3'}];
test('starts only on request, waits between tracks, and wraps under the deployment base',async()=>{
  const media=new Media();const player=new MusicPlayer(media,tracks,'/little-orbit/');
  assert.deepEqual(media.plays,[]);
  player.setEnabled(true);await Promise.resolve();
  assert.deepEqual(media.plays,['/little-orbit/music/one.mp3']);
  media.dispatchEvent(new Event('ended'));await Promise.resolve();
  assert.equal(media.src,'/little-orbit/music/one.mp3');
  player.update(19);assert.equal(media.plays.length,1);
  player.update(41);
  assert.equal(media.src,'/little-orbit/music/two.mp3');
  media.dispatchEvent(new Event('ended'));await Promise.resolve();
  player.update(60);
  assert.equal(media.src,'/little-orbit/music/one.mp3');
});
test('muting and hiding pause music; returning to a muted tab never starts it',()=>{
  const media=new Media();const player=new MusicPlayer(media,tracks,'/');
  player.setEnabled(true);media.currentTime=32;
  player.setHidden(true);assert.equal(media.paused,true);
  player.setHidden(false);assert.equal(media.paused,false);assert.equal(media.currentTime,32);
  player.setEnabled(false);player.setHidden(true);player.setHidden(false);
  assert.equal(media.paused,true);
  player.next();assert.equal(media.paused,true);assert.equal(player.current.title,'Two');
});
test('a blocked play reports one error and can be retried by the user',async()=>{
  const media=new Media();let errors=0;
  media.play=()=>Promise.reject(new Error('NotAllowedError'));
  const player=new MusicPlayer(media,tracks,'/',()=>{},()=>errors++);
  player.setEnabled(true);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(errors,1);
  media.play=async()=>{media.paused=false;};
  player.setEnabled(false);player.setEnabled(true);await Promise.resolve();
  assert.equal(media.paused,false);
});
test('a stale play rejection after mute is ignored',async()=>{
  const media=new Media();let reject!:(reason:Error)=>void;let errors=0;
  media.play=()=>new Promise<void>((_,r)=>{reject=r;});
  const player=new MusicPlayer(media,tracks,'/',()=>{},()=>errors++);
  player.setEnabled(true);player.setEnabled(false);reject(new Error('AbortError'));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(errors,0);assert.equal(media.paused,true);
});

test('fades at the start and finite track end, normalizes gain and clamps volume',async()=>{
  const media=new Media();const player=new MusicPlayer(media,[{...tracks[0],gain:.5}],'/');
  player.setVolume(2);player.setEnabled(true);await Promise.resolve();assert.equal(media.volume,0);
  player.update(2);assert.equal(media.volume,.25);
  player.update(2);assert.equal(media.volume,.5);
  media.currentTime=118;player.update(.1);assert.equal(media.volume,.25);
  media.duration=Infinity;player.update(.1);assert.equal(media.volume,.5);
  player.setVolume(-1);assert.equal(media.volume,0);
});
test('dialogue ducks smoothly and restores the chosen volume',async()=>{
  const media=new Media();const player=new MusicPlayer(media,tracks,'/');
  player.setVolume(.8);player.setEnabled(true);await Promise.resolve();player.update(4);
  player.setDucked(true);player.update(.4);assert.ok(media.volume<.8&&media.volume>.24);
  player.update(2);assert.ok(Math.abs(media.volume-.24)<1e-9);
  player.setDucked(false);player.update(.4);assert.ok(media.volume>.24&&media.volume<.8);
  player.update(2);assert.equal(media.volume,.8);
});
test('hidden and muted time freezes both fade and silence',async()=>{
  const media=new Media();const player=new MusicPlayer(media,tracks,'/');
  player.setEnabled(true);await Promise.resolve();player.update(2);const half=media.volume;
  player.setHidden(true);player.update(100);assert.equal(media.volume,half);
  player.setHidden(false);await Promise.resolve();player.update(2);media.dispatchEvent(new Event('ended'));
  player.setHidden(true);player.update(100);player.setHidden(false);
  assert.equal(media.plays.length,2); // initial play and visibility resume, no gap resume
  player.setEnabled(false);player.update(100);player.setEnabled(true);
  player.update(19);assert.equal(player.current.title,'One');
  player.update(41);assert.equal(player.current.title,'Two');
});
test('manual next fades before switching, bypasses silence and never plays muted',async()=>{
  const media=new Media();const player=new MusicPlayer(media,tracks,'/');
  player.setEnabled(true);await Promise.resolve();player.update(4);player.next();
  assert.equal(player.current.title,'One');player.update(2);assert.ok(media.volume>0&&media.volume<.22);
  player.update(2);assert.equal(player.current.title,'Two');assert.equal(media.volume,0);
  media.dispatchEvent(new Event('ended'));player.next();assert.equal(player.current.title,'One');
  player.setEnabled(false);player.next();assert.equal(player.current.title,'Two');assert.equal(media.paused,true);
});
test('decoder errors are bounded and update does not retry a failed track',()=>{
  const media=new Media();let errors=0;
  const player=new MusicPlayer(media,tracks,'/',()=>{},()=>errors++);player.setEnabled(true);
  media.dispatchEvent(new Event('error'));media.dispatchEvent(new Event('error'));player.update(100);
  assert.equal(errors,1);assert.equal(media.paused,true);assert.equal(media.plays.length,1);
});
test('a delayed play success cannot resume a muted or hidden player',async()=>{
  const media=new Media();let resolve!:()=>void;
  media.play=()=>new Promise<void>(r=>{resolve=()=>{media.paused=false;r();};});
  const player=new MusicPlayer(media,tracks,'/');player.setEnabled(true);player.setEnabled(false);
  resolve();await new Promise(r=>setImmediate(r));assert.equal(media.paused,true);
});
test('slow playback readiness preserves the full initial fade',async()=>{
  const media=new Media();let resolve!:()=>void;
  media.play=()=>new Promise<void>(r=>{resolve=r;});
  const player=new MusicPlayer(media,tracks,'/');player.setVolume(1);player.setEnabled(true);
  player.update(20);assert.equal(media.volume,0);
  resolve();await Promise.resolve();player.update(2);assert.equal(media.volume,.5);
  player.update(2);assert.equal(media.volume,1);
});
