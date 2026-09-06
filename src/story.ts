export type Story={phase:'new'|'active'|'complete';letters:string[]};
export type Action={type:'accept'|'finish'}|{type:'collect';id:string};
export const initialStory=():Story=>({phase:'new',letters:[]});
export const LETTERS=[
 {id:'bridge',name:'Письмо для садовника',hint:'За мостом, рядом с указателем',x:19,z:3},
 {id:'lake',name:'Открытка с далёкой звезды',hint:'На восточном берегу озера',x:27,z:27},
 {id:'hill',name:'Письмо, пахнущее хвоей',hint:'У камней на холме за домиком',x:-14,z:-19},
];
export function reduceStory(s:Story,a:Action):Story{
 if(a.type==='accept'&&s.phase==='new')return {...s,phase:'active'};
 if(a.type==='collect'&&s.phase==='active'&&LETTERS.some(l=>l.id===a.id)&&!s.letters.includes(a.id))return {...s,letters:[...s.letters,a.id]};
 if(a.type==='finish'&&s.phase==='active'&&s.letters.length===3)return {...s,phase:'complete'};
 return s;
}
export function restoreStory(raw:string|null):Story{
 try{
  const s=JSON.parse(raw??'null');
  if(!s||!['new','active','complete'].includes(s.phase)||!Array.isArray(s.letters))return initialStory();
  const letters=LETTERS.filter(l=>s.letters.includes(l.id)).map(l=>l.id);
  if(s.phase==='complete'&&letters.length!==3)return initialStory();
  return {phase:s.phase,letters:s.phase==='new'?[]:letters};
 }catch{return initialStory();}
}
export type ResidentId='mira'|'lev'|'ada';
export const RESIDENTS=[
 {id:'mira' as const,name:'Мира',role:'ХРАНИТЕЛЬНИЦА ПИСЕМ',x:-4,z:-8,color:0xd59169},
 {id:'lev' as const,name:'Лев',role:'САДОВНИК',x:23,z:5,color:0x799d68},
 {id:'ada' as const,name:'Ада',role:'ИССЛЕДОВАТЕЛЬНИЦА ЗВЁЗД',x:27,z:21,color:0x899aca},
];
export type Dialogue={text:string;choices:{text:string;action?:'accept'|'finish';next?:string}[]};
export function dialogue(id:ResidentId,s:Story,topic='greeting'):Dialogue{
 if(topic==='world')return {text:'Мы называем это место Тихой долиной. Иди куда захочешь: рано или поздно вернёшься сюда с другой стороны. А у брода выше по течению можно перейти по сухим камням. Если захочешь поплыть — спустись к пологому берегу.',choices:[{text:'Пойду осмотрюсь'}]};
 if(id==='mira'){
  if(s.phase==='new')return {text:'Привет, путешественник! Я Мира. Сегодня ветер унёс три моих письма — за мост, к озеру и на холм за домиком. Поможешь их найти? Заодно познакомишься с нашей маленькой планетой.',choices:[{text:'Конечно, я найду письма',action:'accept'},{text:'Расскажи об этом месте',next:'world'},{text:'Загляну чуть позже'}]};
  if(s.phase==='complete')return {text:'Все письма уже у адресатов. Спасибо! Теперь у тебя здесь есть друзья. Оставайся, сколько захочешь — на закате озеро особенно красиво.',choices:[{text:'Рад, что смог помочь'},{text:'Расскажи об этом месте',next:'world'}]};
  if(s.letters.length===3)return {text:'Ты нашёл все три! Теперь Лев получит семена, а Ада — открытку с далёкой звезды. Даже самый маленький мир становится больше, когда в нём появляется новый друг.',choices:[{text:'Передать письма Мире',action:'finish'}]};
  return {text:`Уже найдено ${s.letters.length} из трёх! Загляни за мост к указателю, на восточный берег озера и к камням за почтовым домиком. Я подожду тебя здесь.`,choices:[{text:'Скоро вернусь'}]};
 }
 if(id==='lev')return {text:'Здравствуй! У меня растут деревья со всей планеты. Ветер часто оставляет всякие находки у указателя за мостом. Если ищешь письма Миры, начни оттуда.',choices:[{text:'Спасибо за подсказку'},{text:'А что за место дальше?',next:'world'}]};
 return {text:'Слышишь, как тихо? На том берегу — весь наш посёлок, а над ним — бесконечность. На берегу неподалёку я заметила открытку. Кажется, она выпала из сумки Миры.',choices:[{text:'Посмотрю на берегу'},{text:'Расскажи о планете',next:'world'}]};
}
