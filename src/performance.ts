export class FrameStats{
 private frames:number[]=[];private cpu:number[]=[];
 record(frameMs:number,cpuMs:number){if(!Number.isFinite(frameMs)||frameMs<=0)return;this.frames.push(frameMs);this.cpu.push(cpuMs);if(this.frames.length>120){this.frames.shift();this.cpu.shift();}}
 reset(){this.frames=[];this.cpu=[];}
 snapshot(){const n=this.frames.length;if(!n)return {fps:0,meanMs:0,p95Ms:0,maxMs:0,cpuMs:0};const sorted=[...this.frames].sort((a,b)=>a-b),meanMs=this.frames.reduce((a,b)=>a+b,0)/n;return {fps:1000/meanMs,meanMs,p95Ms:sorted[Math.ceil(n*.95)-1],maxMs:sorted[n-1],cpuMs:this.cpu.reduce((a,b)=>a+b,0)/n};}
}
export const QUALITY={economy:{label:'Экономный',pixelRatio:1,shadowSize:512,shadowHz:10},balanced:{label:'Сбалансированный',pixelRatio:1.25,shadowSize:1024,shadowHz:20},high:{label:'Высокий',pixelRatio:1.75,shadowSize:2048,shadowHz:30}} as const;
export type Quality=keyof typeof QUALITY;
