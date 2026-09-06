type FullscreenDocument=Document&{webkitFullscreenElement?:Element;webkitExitFullscreen?:()=>Promise<void>|void};
type FullscreenRoot=HTMLElement&{webkitRequestFullscreen?:()=>Promise<void>|void};
export function setupFullscreen(button:HTMLElement,notify:(message:string)=>void,before:()=>void,doc:FullscreenDocument=document){
 const root=doc.documentElement as FullscreenRoot;
 const active=()=>!!(doc.fullscreenElement||doc.webkitFullscreenElement);
 function refresh(){const on=active();button.textContent=on?'Выйти из полного экрана':'На весь экран';button.setAttribute('aria-pressed',String(on));}
 button.onclick=async()=>{
  before();
  try{
   if(active()){if(doc.exitFullscreen)await doc.exitFullscreen();else await doc.webkitExitFullscreen?.();}
   else if(root.requestFullscreen)await root.requestFullscreen();
   else if(root.webkitRequestFullscreen)await root.webkitRequestFullscreen();
   else notify('Этот браузер не поддерживает полноэкранный режим игры.');
  }catch{notify('Не удалось переключить полный экран. Попробуй открыть игру в обычном браузере.');}
  refresh();
 };
 doc.addEventListener('fullscreenchange',refresh);doc.addEventListener('webkitfullscreenchange',refresh);refresh();
}
