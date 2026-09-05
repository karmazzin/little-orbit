import test from 'node:test';
import assert from 'node:assert/strict';
import {WorldAudio} from '../src/world-audio.ts';

class Param {value=0;setTargetAtTime(v:number){this.value=v;}}
class Node {gain=new Param();pan=new Param();playbackRate=new Param();buffer=null;loop=false;onended:(()=>void)|null=null;stopped=false;
 connect(node:Node){return node;}disconnect(){}start(){}stop(){this.stopped=true;this.onended?.();}}
class Context {state='suspended';currentTime=0;destination=new Node();sources:Node[]=[];
 createGain(){return new Node();}createStereoPanner(){return new Node();}
 createBufferSource(){const n=new Node();this.sources.push(n);return n;}
 async resume(){this.state='running';}async suspend(){this.state='suspended';}}
const buffer={duration:3} as AudioBuffer;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const mix={loops:[{id:'river',gain:.3,pan:.5}],shots:[]};
test('a loop downloaded after mute never starts, and enabling again reuses its buffer',async()=>{
 const context=new Context();let resolve!:(b:AudioBuffer)=>void;
 const audio=new WorldAudio('/',()=>{},()=>context as unknown as AudioContext,
  id=>id==='river'?new Promise(r=>{resolve=r;}):Promise.resolve(buffer));
 audio.setEnabled(true);audio.update(mix);audio.setEnabled(false);resolve(buffer);await flush();
 assert.equal(context.sources.length,0);
 audio.setEnabled(true);audio.update(mix);await flush();assert.equal(context.sources.length,1);
 audio.setHidden(true);assert.equal(context.sources[0].stopped,true);
});
test('repeated updates do not duplicate loops and old footstep events are dropped while loading',async()=>{
 const context=new Context();const pending:((b:AudioBuffer)=>void)[]=[];
 const audio=new WorldAudio('/',()=>{},()=>context as unknown as AudioContext,
  ()=>new Promise(r=>pending.push(r)));
 audio.setEnabled(true);
 for(let i=0;i<50;i++)audio.update({...mix,shots:[{id:'step-grass-1',gain:.2,pan:0}]});
 assert.equal(context.sources.length,0);
 pending.forEach(r=>r(buffer));await flush();assert.equal(context.sources.length,1);
 for(let i=0;i<50;i++)audio.update(mix);
 assert.equal(context.sources.length,1);
 audio.update({...mix,shots:[{id:'step-grass-1',gain:.2,pan:0}]});
 assert.equal(context.sources.length,2);
 audio.setActive(false);assert.ok(context.sources.every(s=>s.stopped));
});
test('failed assets are not retried each frame and simultaneous one-shots stay bounded',async()=>{
 const context=new Context();let failures=0,requests=0;
 const audio=new WorldAudio('/',()=>failures++,()=>context as unknown as AudioContext,async id=>{
  if(id==='river'){requests++;throw new Error('offline');}return buffer;
 });
 audio.setEnabled(true);audio.update(mix);await flush();
 for(let i=0;i<20;i++)audio.update({...mix,shots:[{id:'bell',gain:.2,pan:0}]});
 assert.equal(requests,1);assert.equal(failures,1);assert.equal(context.sources.length,8);
});
