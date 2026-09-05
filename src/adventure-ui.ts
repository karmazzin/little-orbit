import {ADVENTURE_POINTS,adventureHint,restoreAdventures,reduceAdventures,festivalAvailable,type AdventureAction} from './adventures.ts';
import {BOTTLE_LETTERS,TRAVELER_TALES,CAVE_INTRO,CAVE_END,METEOR_END,BELL_END} from './adventure-text.ts';
type Host={dialog:(speaker:string,text:string)=>void;choice:(text:string,action:()=>void)=>void;near:(id:string)=>boolean;residentNear:(id:string)=>boolean;seconds:()=>number;completed:()=>number;travelerPresent:()=>boolean;toast:(text:string)=>void};
export function createAdventureUI(h:Host){
 let state=restoreAdventures(null);try{state=restoreAdventures(localStorage.getItem('little-orbit-adventures-v1'));}catch{}
 const journal=document.createElement('section');journal.className='adventure-journal';document.getElementById('camp-journal')!.parentElement!.before(journal);
 function change(action:AdventureAction){const next=reduceAdventures(state,action);if(next!==state){state=next;try{localStorage.setItem('little-orbit-adventures-v1',JSON.stringify(state));}catch{h.toast('Истории сохранятся только до закрытия вкладки.');}render();}}
 const party=()=>festivalAvailable(state,h.completed(),h.seconds());
 function render(){
  journal.replaceChildren();const title=document.createElement('h3');title.textContent='Маленькие истории';journal.append(title);
  function row(title:string,text:string,read?:()=>void){const el=document.createElement('article');el.className='discovery-row';const name=document.createElement('strong'),p=document.createElement('p');name.textContent=title;p.textContent=text;el.append(name,p);if(read){const b=document.createElement('button');b.textContent='Перечитать';b.onclick=read;el.append(b);}journal.append(el);}
  row('Камень, который добрался',adventureHint(state,'meteor'),state.meteor==='complete'?()=>h.dialog('Запись Ады',METEOR_END):undefined);
  row('Звон к ужину',adventureHint(state,'bell'),state.bell==='complete'?()=>h.dialog('Лев',BELL_END):undefined);
  row('Пещера первого огня',state.cave?'✓ Прочитано послание первых жителей.':'За Аркой ветров, на северо-западе. Рисунки у входа подсказывают порядок знаков.',state.cave?()=>h.dialog('Первый дом',CAVE_END):undefined);
  row('Два берега',`Письма в бутылках: ${state.bottles.length} / 3. ${state.bottles.length===3?'✓ История Томы и Нэл собрана.':'Ищи у брода, восточного берега озера и южного тростника.'}`);
  for(const id of state.bottles){const letter=BOTTLE_LETTERS[id];row(letter.title,'Сохранённое письмо',()=>h.dialog(letter.title,letter.text));}
  row('Вечер фонарей',state.festival?'✓ Ты побывал на празднике. Снова приходи вечером.':'После двух завершённых историй приходи вечером на поляну между луговой тропой и почтой. Время можно ускорить в меню часов.');
  row('Тетрадь Ноя',`Рассказов: ${state.tales.length} / 3. Ной останавливается у северного домика днём через день. Повозка отмечена на карте M. Это рассказы из старых радиозаписей, а не открытые маршруты полётов.`);
  for(const id of state.tales){const tale=TRAVELER_TALES[id];row(tale.title,'История из тетради',()=>h.dialog('Ной',tale.text));}
 }
 function meteor(){
  if(!h.residentNear('ada'))return;
  if(state.meteor==='new'){
   h.dialog('Ада','Видишь подпаленный угол? Ночью я так резко повернула лампу к окну, что едва не сожгла карту. За озером прошёл огонь — совсем низко. На мгновение мне показалось… Впрочем, сначала нужно узнать, что там упало.');
   h.choice('Ты ждала кого-то?',()=>{if(!h.residentNear('ada'))return;h.dialog('Ада','Мой учитель ушёл искать старые станции. Раньше присылал карты, потом письма стали короче, а потом перестали приходить. Я знаю, падающая звезда — плохой повод надеяться. Но всё равно смотрю на южные холмы. Сходишь туда? Возьми маленький остывший осколок, если найдёшь камень.');h.choice('Схожу за озеро и посмотрю',()=>{if(!h.residentNear('ada'))return;change({type:'meteor-start'});h.dialog('Ада','Спасибо. Вспышка исчезла за дальним южным холмом. Там должен остаться свежий тёмный след. И не придумывай для меня хороших новостей — расскажи, что увидишь.');});});
  }else if(state.meteor==='sample'){
   h.dialog('Ада','Ты вернулся. По лицу не пойму — ты нашёл что-нибудь?');h.choice('Показать остывший осколок',()=>{if(!h.residentNear('ada'))return;change({type:'meteor-return'});h.dialog('Ада',METEOR_END);});
  }else h.dialog('Ада',state.meteor==='complete'?'Я уже подписала коробочку для следующего образца. Забавно: столько смотрела вдаль, а первую коллекцию мне принесли пешком.': 'Я поймала себя на том, что прислушиваюсь к шагам. Не торопись ради меня. Ищи за озером, на дальнем южном холме: огонь ушёл именно туда.');
 }
 function bell(){
  if(!h.residentNear('lev'))return;
  if(state.bell==='new'){
   h.dialog('Лев','Тихо сегодня у калитки. Обычно ветер звенит, а сейчас… Я утром чинил навес, снял старый колокольчик и положил на мешок с травой. Отвернулся — мешок разодран, а колокольчика нет. По саду только заячьи следы.');
   h.choice('Он тебе дорог?',()=>{if(!h.residentNear('lev'))return;h.dialog('Лев','Он ещё от отца остался. Не красивый, треснутый с краю. Новый звенел бы лучше, наверное. Только мне нужен этот. Сам бы пошёл по следам, но пока я ищу, ветер разнесёт саженцы из открытого парника.');h.choice('Я посмотрю, куда ведут следы',()=>{if(!h.residentNear('lev'))return;change({type:'bell-start'});h.dialog('Лев','У северного края сада примята трава. Начни там. Если заяц зацепил шнурок, колокольчик где-нибудь застрял. У него тихий звон — не пройди мимо.');});});
  }else if(state.bell==='found'){
   h.dialog('Лев','Я слышал звон, пока ты подходил. Или мне показалось?');h.choice('Вернуть колокольчик со старым шнурком',()=>{if(!h.residentNear('lev'))return;change({type:'bell-return'});h.dialog('Лев',BELL_END);});
  }else h.dialog('Лев',state.bell==='complete'?'Теперь, когда звенит, думаю: вдруг это ты идёшь. Хорошая у старой вещи новая работа.':state.tracks===0?'На северной кромке сада осталась полоска примятой травы. Я бы сам её не заметил, если бы всё утро не искал шнурок.':state.tracks===1?'К броду? Похоже на нашего зайца. Он всегда выбирает самый мокрый путь и потом сушится в моих грядках.': 'За бродом низкие кусты. Шнурок легко мог там зацепиться. Если ветер стихнет, присмотрись: латунь ловит свет.');
 }
 function cave(prefix=''){
  h.dialog('Каменная шкатулка',state.cave?CAVE_END:prefix+CAVE_INTRO+` Сейчас нажато знаков: ${state.runes} из 3.`);
  if(!state.cave)for(const [symbol,label] of [['sun','Солнце'],['tree','Дерево'],['star','Звезда']])h.choice(label,()=>{if(!h.near('cave'))return;change({type:'rune',symbol});cave(state.runes===0?'Камень отзывается глухим стуком. Знаки вернулись на место. Попробуй прочитать надпись как историю, по порядку. ':'Знак тихо подался внутрь. ');});
 }
 function traveler(){
  if(!h.near('traveler')||!h.travelerPresent())return;
  h.dialog('Ной',state.tales.length?'Я всё думаю о твоём лице, когда читал прошлую запись. Бабушке понравилось бы, что её тетрадь ещё кому-то нужна. Послушаем другую?':'Не пугайся повозки: продавать ничего не стану. Я Ной. Обхожу планету и записываю то, что люди помнят. А эту тетрадь оставила бабушка — она слушала дальнее радио. Не знаю, сколько в ней правды. Зато знаю, почему она берегла эти голоса. Хочешь послушать?');
  for(const [id,tale] of Object.entries(TRAVELER_TALES))h.choice((state.tales.includes(id)?'✓ ':'')+tale.title,()=>{if(!h.near('traveler')||!h.travelerPresent())return;change({type:'tale',id});h.dialog('Ной',tale.text);h.choice('Послушать ещё',traveler);});
 }
 function interact(id:string){
  if(!h.near(id))return;
  if(id==='meteor'){
   h.dialog('Шрам на холме',state.meteor==='new'?'В тёмной земле лежит небольшой камень. На сколе — блестящие крупинки, а трава вокруг обожжена. Ада разбирается в небесных камнях. Стоит рассказать ей о находке прежде, чем что-нибудь уносить.':state.meteor==='searching'?'След обрывается у серого камня. Ни металла обшивки, ни чужих следов — только земля и остывшие осколки. Один уже откололся. Он легко поместится в ладони. Ада просила принести правду, какой бы маленькой она ни оказалась.':'Кратер уже не кажется раной: между камнями пробивается трава. Образец ты забрал для Ады.');
   if(state.meteor==='searching')h.choice('Завернуть остывший образец',()=>{if(!h.near(id))return;change({type:'meteor-pick'});h.dialog('Осколок в рюкзаке','Сквозь бумагу чувствуется неровный край. Теперь нужно вернуться к Аде — пусть сама прочитает историю этого камня.');});
  }else if(BOTTLE_LETTERS[id]){change({type:'bottle',id});const l=BOTTLE_LETTERS[id];h.dialog(l.title,l.text+(state.bottles.length===3?' Все три письма сохранены в журнале. Теперь историю можно прочесть от первого до последнего.':''));}
  else if(id==='cave')cave();
  else if(id.startsWith('track')){
   const index=Number(id.slice(-1));if(state.bell!=='searching'){h.dialog('Маленькие следы','Кто-то протащил по траве тонкий шнурок. Следы идут от сада. Возможно, Лев знает, что здесь случилось.');return;}
   if(index>state.tracks+1){h.dialog('След у воды','Отпечатки теряются среди камней. Чтобы понять, откуда пришёл зверёк, сначала проверь примятую траву севернее сада.');return;}
   change({type:'track',index});h.dialog('По следам',index===1?'В примятой траве застряло волокно синего шнурка. Рядом — короткие парные отпечатки. Лев был прав насчёт зайца. Следы уходят к западной стороне каменистого брода.':'На мокром камне синяя нитка, а дальше следы уже легче: заяц освободился от своей ноши. Ветер доносит тонкий звон из низких кустов к западу от брода.');
  }else if(id==='bell'){
   h.dialog('В низких ветках',state.bell==='searching'&&state.tracks===2?'Синий шнурок обмотался вокруг ветки. Колокольчик качается над травой, отзываясь на ветер. На боку маленькая трещина — точно как говорил Лев.':'Ветви тихо позванивают. Кто-то из деревни, наверное, ищет эту вещь. Следы помогут понять, как она сюда попала.');
   if(state.bell==='searching'&&state.tracks===2)h.choice('Осторожно распутать шнурок',()=>{if(!h.near(id))return;change({type:'bell-pick'});h.dialog('Колокольчик найден','Ты придерживаешь язык колокольчика пальцем. На обратном пути он всё равно иногда звенит. Верни его Льву в сад.');});
  }else if(id==='traveler')traveler();
  else if(id==='festival'){
   if(!party()){h.dialog('Поляна фонарей','Здесь собираются, когда в долине появляются хорошие новости. Заверши хотя бы две истории и возвращайся местным вечером — от заката до ранней ночи.');return;}
   h.dialog('Вечер фонарей',state.festival?'На столе снова чай. Кто-то подвигает скамейку: твоё место уже знают. Здесь не нужно приносить ещё одну историю, чтобы остаться.':'Гости поднимают фонари. На столе — пирог от Льва, чай Ады и записка почерком Миры: «Я всё собиралась сказать тебе спасибо отдельно. А потом оказалось, что я не одна такая. Вот мы и собрались». Соседка подвигает тебе чашку. «Они ещё подойдут, если освободятся. А ты садись, пока чай горячий».');
   if(!state.festival)h.choice('Остаться на чай',()=>{if(!h.near(id)||!party())return;change({type:'festival',seconds:h.seconds(),completed:h.completed()});h.dialog('За общим столом','Разговор уходит от твоих прогулок к завтрашней погоде, потом к пирогу, который чуть не сгорел. Никто уже не представляет тебя гостям: все знают. Уходя, ты замечаешь, что твою чашку оставили на полке вместе с остальными.');});
  }
 }
 render();return {get state(){return state;},party,interact,residentChoices(id:string){if(id==='ada')h.choice('Что случилось этой ночью?',meteor);if(id==='lev')h.choice('Почему у калитки так тихо?',bell);},available(id:string){if(id==='traveler')return h.travelerPresent();if(id.startsWith('bottle'))return !state.bottles.includes(id);if(id==='bell')return state.bell!=='found'&&state.bell!=='complete';return ADVENTURE_POINTS.some(p=>p.id===id);}};
}
