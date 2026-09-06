export const AZURE_STORY_KEY='little-orbit-azure-story-v1';
export const AZURE_ENTRIES={
 welcome:'Если ты дошёл сюда уставшим, задержись. Свет уже горит. Дальше можно идти не сегодня.',
 home:'Я тоже искал, куда ведёт эта дорога. Теперь знаю: по ней можно вернуться. Оставляю свет для тебя.',
 onward:'Я не знаю твоего имени и куда ты идёшь. Но этот огонёк мы теперь зажгли вместе. Передай его следующему.',
};
export type AzureEntry=keyof typeof AZURE_ENTRIES;
export type AzureStory={version:1;map:boolean;marks:string[];bottle:boolean;complete:boolean;entry:AzureEntry|null};
export const initialAzureStory=():AzureStory=>({version:1,map:false,marks:[],bottle:false,complete:false,entry:null});
export type AzureAction={type:'read';id:string}|{type:'finish';entry:AzureEntry;lit:boolean};
export function azureReady(s:AzureStory){return s.map&&s.marks.includes('azure-pass')&&s.marks.includes('birch-trail')&&s.bottle;}
export function reduceAzureStory(s:AzureStory,a:AzureAction):AzureStory{
 if(a.type==='finish')return !s.complete&&azureReady(s)&&a.lit&&Object.hasOwn(AZURE_ENTRIES,a.entry)?{...s,complete:true,entry:a.entry}:s;
 if(a.id==='old-shelter')return s.map?s:{...s,map:true};
 if(a.id==='azure-pass'||a.id==='birch-trail')return s.marks.includes(a.id)?s:{...s,marks:[...s.marks,a.id]};
 if(a.id==='azure-cove')return s.bottle?s:{...s,bottle:true};
 return s;
}
export function restoreAzureStory(raw:string|null):AzureStory{
 try{const v=JSON.parse(raw??'null');if(!v||v.version!==1)return initialAzureStory();
  const s:AzureStory={version:1,map:v.map===true,marks:['azure-pass','birch-trail'].filter(id=>Array.isArray(v.marks)&&v.marks.includes(id)),bottle:v.bottle===true,complete:false,entry:null};
  if(v.complete===true&&azureReady(s)&&typeof v.entry==='string'&&Object.hasOwn(AZURE_ENTRIES,v.entry)){s.complete=true;s.entry=v.entry as AzureEntry;}return s;
 }catch{return initialAzureStory();}
}
export function azureObjective(s:AzureStory,lit:boolean){
 if(s.complete)return 'История завершена · Твоя запись ждёт следующего путешественника.';
 if(!s.map)return 'Найди старый привал за еловой рощей и разверни оставленную карту.';
 if(!s.marks.includes('azure-pass'))return 'Найди отметку с разомкнутым кругом на Перевале дальнего ветра.';
 if(!s.marks.includes('birch-trail'))return 'Отыщи такую же отметку у ленты в Берёзовом просвете.';
 if(!s.bottle)return 'Прочитай послание в бутылке в Бухте тихой волны.';
 return lit?'Вернись к маяку и оставь свою запись для следующего путника.':'Зажги Маяк дальнего берега, затем оставь свою запись.';
}
export const AZURE_PAGES:Record<string,{title:string;action:string;text:string}>={
 'old-shelter':{title:'Карта с пустым краем',action:'Развернуть незавершённую карту',text:'Под кружкой лежит сложенная карта. На ней — ели, перевал, белые стволы и линия берега. Дальше карандашная дорожка обрывается. На обороте: «Рисовал путь только вперёд. Теперь попробую оставить дорогу тому, кто пойдёт следом. Среди камней перевала остался мой разомкнутый круг». Последняя строка стёрлась от дождя. Ты аккуратно перерисовываешь карту в свой журнал.'},
 'azure-pass':{title:'Круг, оставленный открытым',action:'Рассмотреть отметку на камне',text:'На плоском камне у указателя вырезан круг с небольшим просветом. В углублении сухо; там свёрнута полоска бумаги: «Наверху долго ждал, что перестану бояться идти дальше. Не перестал. Зато увидел белые деревья внизу. В кармане нашлась синяя лента — привяжу её к ветке, когда доберусь до них». Под кругом нарисована короткая черта — словно луч света. Ты переносишь знак на карту.'},
 'birch-trail':{title:'Лента среди белых стволов',action:'Прочитать записку у ленты',text:'К синей ленте привязана деревянная пластинка с тем же разомкнутым кругом. На обратной стороне мелко написано: «Сегодня впервые оглянулся. С перевала почти не видно тропу, по которой я пришёл. Если стемнеет, как её найдёт следующий? У воды допишу письмо. Хочу, чтобы кто-нибудь понял, зачем мне нужен старый маяк». Дальше на карте появляется бухта.'},
 'azure-cove':{title:'Письмо к незнакомому человеку',action:'Достать письмо из бутылки',text:'Внутри бутылки — несколько тесных строк: «Думал, что дошёл до края мира. Посидел у воды и понял: отсюда просто начинается другая дорога. Завтра ухожу по берегу. Маяк я очистил, но зажечь не успел. Если ты нашёл это письмо, верни ему свет. Не для меня: я уже знаю путь. Для того, кто однажды увидит эти горы впервые и засомневается, найдёт ли дорогу обратно». Внизу знакомый круг. Теперь понятно, почему он оставлен открытым. Ты убираешь письмо в журнал.'},
};
export function azureEnding(s:AzureStory){return s.complete&&s.entry?'В журнале маяка появилась новая строка:\n\n«'+AZURE_ENTRIES[s.entry]+'»\n\nТы дорисовываешь на карте последний участок. Рядом с чужим разомкнутым кругом ставишь маленькую точку. Теперь здесь есть след и твоей прогулки.':null;}
