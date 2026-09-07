import type {Input} from '../simulation.ts';

/** Transient controls belong to the app; world progress stays in each planet. */
export function createSessionState(){
 return {started:false,overview:false,distance:15,elevation:.55,jumpQueued:false,modeQueued:false,drag:false,softMouse:false,trackingPlanet:false,keys:new Set<string>()};
}
export type SessionState=ReturnType<typeof createSessionState>;
export function clearMovementInput(state:SessionState){state.keys.clear();state.jumpQueued=false;state.modeQueued=false;}
export function readMovementInput(state:SessionState,finger:{forward:number;right:number;run:boolean}):Input{
 const keys=state.keys;
 return {forward:finger.forward+Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),right:finger.right+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),run:finger.run||keys.has('ShiftLeft')||keys.has('ShiftRight'),jump:state.jumpQueued,toggleMode:state.modeQueued};
}
