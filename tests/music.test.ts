import test from 'node:test';
import assert from 'node:assert/strict';
import {MusicPlayer} from '../src/music.ts';

// Node has no media decoder; this boundary records commands sent to the browser.
class Media extends EventTarget {
  src=''; volume=1; preload=''; currentTime=0; paused=true;
  plays:string[]=[];
  play(){this.paused=false;this.plays.push(this.src);return Promise.resolve();}
  pause(){this.paused=true;}
}
const tracks=[{title:'One',file:'one.mp3'},{title:'Two',file:'two.mp3'}];
test('starts only on request, advances at the end, and wraps under the deployment base',async()=>{
  const media=new Media();const player=new MusicPlayer(media,tracks,'/little-orbit/');
  assert.deepEqual(media.plays,[]);
  player.setEnabled(true);await Promise.resolve();
  assert.deepEqual(media.plays,['/little-orbit/music/one.mp3']);
  media.dispatchEvent(new Event('ended'));await Promise.resolve();
  assert.equal(media.src,'/little-orbit/music/two.mp3');
  media.dispatchEvent(new Event('ended'));await Promise.resolve();
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
