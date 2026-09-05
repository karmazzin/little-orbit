import {DirectionalLight} from 'three';
/** VSM owns two targets. Both must follow quality changes. */
export function resizeShadow(sun:DirectionalLight,size:number){
 sun.shadow.map?.dispose();sun.shadow.mapPass?.dispose();
 sun.shadow.map=null;sun.shadow.mapPass=null;sun.shadow.mapSize.set(size,size);
 // Keep the softness roughly constant in world units across quality presets.
 sun.shadow.radius=2.5*size/1024;sun.shadow.blurSamples=8;
}
