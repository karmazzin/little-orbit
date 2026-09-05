import {test} from 'node:test';
import assert from 'node:assert/strict';
import {joystickInput} from '../src/touch.ts';
test('joystick ignores drift and maps upward drag to forward walking',()=>{
 assert.deepEqual(joystickInput(2,3),{forward:0,right:0,run:false});
 const input=joystickInput(0,-24);assert.ok(input.forward>0);assert.equal(input.right,0);assert.equal(input.run,false);
});
test('full diagonal drag runs with a bounded direction',()=>{
 const input=joystickInput(100,-100);assert.equal(input.run,true);assert.ok(input.forward>0&&input.right>0);assert.ok(Math.hypot(input.forward,input.right)<=1.000001);
});

import {createTouchControls} from '../src/touch.ts';
test('two fingers can walk and look independently; cancel and blur stop movement',()=>{
 class Surface extends EventTarget{style={transform:''};setPointerCapture(){}getBoundingClientRect(){return {left:0,top:0,width:128,height:128};}}
 const win=new EventTarget(),doc=new EventTarget();
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'window',{value:win,configurable:true});Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 try{
  const canvas=new Surface(),stick=new Surface(),knob=new Surface();let look=0,zoom=1,enabled=true,globe=0;
  const control=createTouchControls({canvas:canvas as unknown as HTMLCanvasElement,stick:stick as unknown as HTMLElement,knob:knob as unknown as HTMLElement,enabled:()=>enabled,overview:()=>false,look:x=>look+=x,globe:()=>globe++,zoom:r=>zoom*=r});
  function pointer(target:EventTarget,type:string,id:number,x:number,y:number){const event=new Event(type,{cancelable:true});Object.assign(event,{pointerId:id,pointerType:'touch',clientX:x,clientY:y});target.dispatchEvent(event);}
  pointer(stick,'pointerdown',1,64,16);pointer(canvas,'pointerdown',2,200,100);pointer(canvas,'pointermove',2,220,100);
  assert.equal(control.read().run,true);assert.equal(look,20);
  pointer(stick,'pointerdown',3,64,112);assert.ok(control.read().forward>0);
  pointer(canvas,'pointerup',2,220,100);assert.ok(control.read().forward>0);
  pointer(stick,'pointercancel',1,64,16);assert.equal(control.read().forward,0);
  pointer(canvas,'pointerdown',4,200,100);pointer(canvas,'pointerdown',5,300,100);pointer(canvas,'pointermove',5,400,100);assert.equal(zoom,.5);assert.equal(globe,0);assert.equal(look,20);
  pointer(stick,'pointerdown',6,64,16);win.dispatchEvent(new Event('blur'));assert.equal(control.read().forward,0);
  pointer(stick,'pointermove',6,64,16);assert.equal(control.read().forward,0);
  enabled=false;pointer(stick,'pointerdown',7,64,16);assert.equal(control.read().forward,0);
 }finally{if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');}
});
