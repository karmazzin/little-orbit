// Explicit scope: never clear preferences or other applications on this origin.
export const PROGRESS_KEYS=['travel','amber-world','story','world','residents','exploration','camp','content','adventures','azure-story','azure-beacon','frontier','known-journeys','tracked-journey'].map(id=>`little-orbit-${id}-v1`);
export function clearProgress(storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>){
 const previous=PROGRESS_KEYS.map(key=>[key,storage.getItem(key)] as const);
 try{for(const [key] of previous)storage.removeItem(key);}
 catch(error){
  const failures:unknown[]=[error];
  for(const [key,value] of previous)try{if(value!==null)storage.setItem(key,value);}catch(restoreError){failures.push(restoreError);}
  throw new AggregateError(failures,'Не удалось удалить сохранение');
 }
}
