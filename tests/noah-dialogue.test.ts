import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureUI} from '../src/adventure-ui.ts';
// Minimal document host for the existing dialogue controller; assertions exercise its real choices/reducer.
class Element {className='';textContent='';onclick:(()=>void)|null=null;parentElement=this;children:unknown[]=[];append(...nodes:unknown[]){this.children.push(...nodes);}before(){}replaceChildren(...nodes:unknown[]){this.children=nodes;}}
test('Noah keeps his ordinary notebook stories available both by day and by the evening fire',()=>{
 const previousDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),previousStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>new Element(),getElementById:()=>new Element()}});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{}}});
 try{
  let storytelling=false,seated=false,requested=false,left=false,text='';const choices:{label:string;action:()=>void}[]=[];
  const ui=createAdventureUI({dialog:(_speaker,speech)=>{text=speech;choices.length=0;},choice:(label,action)=>choices.push({label,action}),near:()=>true,residentNear:()=>true,seconds:()=>290,completed:()=>0,travelerPresent:()=>true,storytelling:()=>storytelling,beginFireSeat:()=>{requested=true;},leaveFireSeat:()=>{left=true;seated=false;},seatedByFire:()=>seated,toast:()=>{}});
  ui.interact('traveler');assert.equal(choices.length,3);assert.equal(ui.state.tales.length,0);choices[0].action();assert.equal(ui.state.tales.length,1);
  storytelling=true;ui.interact('traveler');assert.equal(choices.length,4);const first=choices[0].action;
  storytelling=false;first();assert.equal(ui.state.tales.length,1);
  storytelling=true;ui.interact('traveler');choices[0].action();assert.equal(ui.state.tales.length,1);
  ui.interact('traveler');choices.find(c=>c.label==='Подсесть к Ною у костра')!.action();assert.equal(requested,true);
  const before=text;ui.fireside();assert.equal(text,before);seated=true;ui.fireside();assert.match(text,/Письмо без адреса/);const firstFire=text;choices[0].action();assert.notEqual(text,firstFire);assert.equal(ui.state.tales.length,1);choices[1].action();assert.equal(left,true);
 }finally{
  if(previousDocument)Object.defineProperty(globalThis,'document',previousDocument);else Reflect.deleteProperty(globalThis,'document');
  if(previousStorage)Object.defineProperty(globalThis,'localStorage',previousStorage);else Reflect.deleteProperty(globalThis,'localStorage');
 }
});
