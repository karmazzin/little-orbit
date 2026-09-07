import {sketchPlace} from './sketch-places.ts';
const line=(d:string,color='#655644',width=2.7)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const shape=(d:string,fill:string)=>`<path d="${d}" fill="${fill}" fill-opacity=".65" stroke="#75634f" stroke-width="2.2" stroke-linejoin="round"/>`;
const tree=(x:number,y:number,color='#91ae68',pine=false)=>`<g transform="translate(${x} ${y})">${line('M-2 4L1 -45M2 -19L-12 -29M1 -26L13 -37','#876247',4)}${shape(pine?'M0 -81L-21 -48L-12 -50L-29 -22L27 -25L14 -48L23 -46Z':'M-23 -30Q-38 -49 -20 -58Q-22 -81 1 -73Q22 -87 25 -61Q43 -47 24 -29Q4 -21 -23 -30',color)}${line('M-15 -48L9 -57M-16 -39L19 -49M-11 -30L17 -38',color,3)}</g>`;
const water=line('M12 117Q32 111 50 118T93 116T138 119T180 115T226 117M23 127Q46 119 69 127T115 126T169 128T218 125','#71a8bf',4);
const mountains=shape('M14 108L59 38L83 67L114 24L158 89L188 53L225 111Z','#a7a9b0')+line('M46 58L59 38L74 58L62 54L56 61M96 47L114 24L133 49L114 42L108 49','#faf2dc',4);
const house=shape('M65 111L65 65L163 62L165 115Z','#d1ac73')+shape('M51 68L105 28L178 66L131 62L89 67Z','#c4775e')+shape('M105 113L104 82L126 83L128 113Z','#a77e61')+shape('M77 76L94 75L93 91L77 92Z','#9bbbc3')+line('M72 101L99 99M133 81L156 79M136 99L156 97','#b58c64');
const bottle=shape('M109 107Q97 94 106 79L111 60L111 48L121 47L123 61L135 80Q143 99 130 110Z','#9cbdab')+shape('M109 79L129 77L132 97L111 100Z','#f4e8bf')+line('M113 84L127 83M114 90L124 89','#ae9170',1.5);
const motifs:Record<string,()=>string>={
 arch:()=>shape('M61 115L66 52L87 38L158 43L177 60L174 117L149 113L151 69L90 65L86 115Z','#a6aaa0')+line('M64 82L87 79M151 92L174 95M71 53L156 57M69 104L85 102','#767e76')+tree(207,118,'#95ab73'),
 grove:()=>tree(61,115,'#c68952')+tree(123,109,'#d4a352')+tree(182,120,'#bd7755'),
 lookout:()=>line('M119 85L96 119M120 85L143 118M120 87L119 121','#987c54',4)+shape('M99 72L154 39L164 54L111 88Z','#b5b5a1')+line('M151 40L163 56','#677f99',5)+line('M171 28L177 20L182 28L174 32Z','#b996c1')+line('M24 40L35 36M30 32L31 44M62 24L72 22M67 17L67 28','#c9a65f',2),
 cave:()=>shape('M39 119L52 76L80 50L122 45L162 61L185 118Z','#a69e8d')+shape('M79 118L84 86L109 70L134 82L148 118Z','#665d64')+line('M54 88L65 81L62 94M157 89L167 80L175 91M56 102L66 103','#dbac69')+shape('M104 119L101 109L112 94L113 106L122 103L127 119Z','#d28a4f'),
 traveler:()=>shape('M55 97L52 60Q105 17 165 57L175 99Z','#9faab8')+shape('M52 98L178 96L175 113L55 112Z','#bf9464')+line('M67 85L67 56M89 76L88 46M137 45L141 85M160 59L161 86','#778397')+shape('M88 95L86 67Q104 56 121 68L125 96Z','#e9dbb5')+line('M63 116Q64 135 79 131Q94 124 81 112Q68 105 63 116M145 115Q140 132 157 132Q172 128 166 115Q158 106 145 115','#79634e',4),
 camp:()=>shape('M49 116L111 44L184 115Z','#d0af6f')+shape('M89 116L112 69L141 116Z','#8c846f')+line('M110 44L116 29M44 119L30 123M185 115L207 124','#8e7158')+line('M161 129L187 126M162 123L189 132','#956c4d',4),
 meteor:()=>shape('M34 107Q110 80 191 108L163 122L65 124Z','#b3a08a')+shape('M88 111L93 89L117 77L140 95L132 117Z','#777e89')+line('M97 92L115 86L126 95M109 101L127 105','#c9baa0')+line('M145 35L165 17M151 45L184 15','#d2a263',3),
 festival:()=>line('M35 48Q116 85 203 45','#8b7855')+[50,84,118,153,189].map((x,i)=>shape(`M${x} ${55+i%2*11}l-6 7l3 13l10 -1l2 -13Z`,i%2?'#dfb95c':'#cf9070')).join('')+line('M65 116L161 114M74 112L77 103L155 103L160 115','#9f805c',5),
 'azure-beacon':()=>water+shape('M91 114L99 46L135 43L148 114Z','#d9cbb0')+shape('M95 45L98 30L133 29L139 44Z','#a0bac2')+shape('M89 29L114 14L140 28Z','#c28467')+line('M107 60L128 59M103 86L136 85','#c2947b',5)+line('M141 36L204 25M140 42L212 59','#daba65'),
 'azure-pass':()=>mountains+line('M124 123Q102 92 122 73','#dfbd83',5)+line('M159 106L160 75L186 74L181 83L159 84','#997956',3),
 'wind-saddle':()=>mountains+line('M67 122L72 65L158 64L163 121M89 65L90 90M106 65L107 107M127 65L125 99M146 65L147 90','#a2865d',4),
 'weather-ridge':()=>mountains+tree(156,119,'#98a16a'),
 'spruce-trail':()=>tree(48,119,'#87a289',true)+tree(114,115,'#799482',true)+tree(183,123,'#99ad83',true)+line('M83 125L134 122','#a38461',7),
 'birch-trail':()=>tree(52,117,'#b7bd78')+tree(119,112,'#aabd79')+tree(181,123,'#b4c686')+line('M50 118L52 70M119 112L119 62M181 123L181 79','#fff4d8',5)+line('M120 85L144 79L143 95','#81a5bf',3),
 'old-shelter':()=>tree(193,121,'#8fa685',true)+line('M57 118L58 57L141 55L151 117','#927752',5)+shape('M42 61L65 42L142 43L162 61Z','#c6ad78')+line('M71 101L134 99M83 104L82 119M128 103L133 119','#a58b67',4),
 'old-station':()=>house+tree(196,120,'#8da185',true)+shape('M40 115L45 96L68 100L63 119Z','#eadfc0')+line('M50 113L55 103M52 108L60 107','#91a16c',2),
 'ranger-shelter':()=>mountains+house,
 'lost-cove':()=>water+shape('M75 107L80 79L109 84L140 78L143 109L112 114Z','#d9c49c')+line('M109 84L112 114M85 91L102 95M85 99L99 101M119 94L135 90','#a78a65',1.8),
 'azure-cove':()=>water+bottle,
 'bottle-1':()=>water+bottle+line('M26 103L41 97L52 103M157 116L170 109L184 115','#a79e87',5),
 'bottle-2':()=>water+bottle+tree(184,114,'#a5b580'),
 'bottle-3':()=>water+bottle+line('M43 120L39 77M55 120L61 81M185 126L192 85M203 124L207 94','#a9a474',3),
 bell:()=>tree(59,118,'#a6ad77')+shape('M106 113L114 94L113 82Q125 70 135 85L137 100L146 113Z','#d4b05e')+line('M124 116L129 121M124 77Q136 62 153 70','#a08a63',3),
 'track-1':()=>tree(185,119,'#a5b980')+line('M56 116L61 107M67 115L71 103M101 98L107 87M113 97L119 85M143 74L147 67','#a69575',5),
 'track-2':()=>water+line('M55 107L61 100M68 105L73 95M105 92L110 82M117 90L121 80','#a69575',5),
 'home-mira':()=>house+shape('M175 100L174 81L197 80L199 99Z','#bb8c77')+line('M187 100L188 119M178 87L187 93L195 85','#8a7261',2),
 'home-lev':()=>house+tree(190,118,'#b4b66f')+line('M28 124L35 108M42 125L49 109M55 126L61 113','#8da071',3),
 'home-ada':()=>house+line('M187 108L174 124M187 108L203 125M177 98L204 83','#9b957e',5),
};
/** Wobbly colored-pencil drawings on paper; authored SVG keeps every place recognizable. */
export function postcardMarkup(id:string){
 const place=sketchPlace(id);if(!place)return '';
 const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 const art=(motifs[id]??(()=>mountains+tree(175,120)))();
 const grain=Array.from({length:75},(_,i)=>{const x=9+(i*47)%223,y=9+(i*31)%126;return line(`M${x} ${y}l${2+i%4} ${i%3-1}`,'#bda981',.45);}).join('');
 const grass=Array.from({length:15},(_,i)=>line(`M${10+i*15} ${130+i%3*3}l3 -6l2 5`,'#90a66e',1.2)).join('');
 return `<article class="postcard"><svg viewBox="0 0 240 150" role="img" aria-label="Детская зарисовка: ${escape(place.name)}"><rect width="240" height="150" fill="#f7efd9"/>${grain}${line('M13 23L64 21M17 29L82 26M145 19L215 23M159 28L225 30','#b3d0d5',6)}${line('M12 124Q51 111 83 123T155 124T227 120','#b3be8a',10)}<g stroke-linecap="round" stroke-linejoin="round">${art}</g>${grass}${line('M7 7L232 9L234 142L8 140Z','#c7b99b',1)}</svg><strong>${escape(place.name)}</strong><small>Цветные карандаши · мой мир</small></article>`;
}
