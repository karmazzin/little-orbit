/** Return only one unread nearby entry; modal/overview callers keep discoveries pending. */
export function nextDiscoveryReading(entries:readonly {id:string;distance:number;radius:number;unread:boolean}[],blocked:boolean):string|null{
 if(blocked)return null;
 let next:string|null=null,best=Infinity;
 for(const entry of entries)if(entry.unread&&entry.distance<entry.radius&&entry.distance<best){next=entry.id;best=entry.distance;}
 return next;
}
