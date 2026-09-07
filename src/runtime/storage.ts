import {previewEnabled} from '../worlds/catalog.ts';
export type GameStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
/** Resolve lazily so existing try/catch handlers also catch denied storage access. */
export function createScopedStorage(resolve:()=>GameStorage,prefix:string):GameStorage{
 return {
  getItem:key=>resolve().getItem(prefix+key),
  setItem:(key,value)=>resolve().setItem(prefix+key,value),
  removeItem:key=>resolve().removeItem(prefix+key),
 };
}
export const planetPreview=previewEnabled(globalThis.location?.search??'',import.meta.env?.DEV===true);
export const gameStorage=createScopedStorage(()=>globalThis.localStorage,planetPreview?'little-orbit-preview:':'');
