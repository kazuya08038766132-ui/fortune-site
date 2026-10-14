import {sexagenaryDay} from './birth-day-pillar-build40.js';

const STEMS=["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES=["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const ELEMENT={甲:"木",乙:"木",丙:"火",丁:"火",戊:"土",己:"土",庚:"金",辛:"金",壬:"水",癸:"水"};
const YINYANG={甲:"陽",乙:"陰",丙:"陽",丁:"陰",戊:"陽",己:"陰",庚:"陽",辛:"陰",壬:"陽",癸:"陰"};

export function sexagenaryYear(year){
 const y=Number(year);
 const si=((y-4)%10+10)%10,bi=((y-4)%12+12)%12;
 return {stem:STEMS[si],branch:BRANCHES[bi],label:STEMS[si]+BRANCHES[bi],element:ELEMENT[STEMS[si]],yinYang:YINYANG[STEMS[si]],stemIndex:si};
}

export function sexagenaryMonth(pillarYear,monthNo){
 const yr=sexagenaryYear(pillarYear),m=Number(monthNo);
 if(!Number.isInteger(m)||m<1||m>12)return null;
 const firstStemByYearStem=[2,4,6,8,0,2,4,6,8,0];
 const stemIndex=(firstStemByYearStem[yr.stemIndex]+m-1)%10;
 const branchIndex=(2+m-1)%12;
 return {stem:STEMS[stemIndex],branch:BRANCHES[branchIndex],label:STEMS[stemIndex]+BRANCHES[branchIndex],element:ELEMENT[STEMS[stemIndex]],yinYang:YINYANG[STEMS[stemIndex]],monthNo:m};
}

const COPY={
 木:"成長・柔軟性・発展",
 火:"表現・行動力・熱量",
 土:"安定・受容力・継続",
 金:"判断・整理・洗練",
 水:"洞察・適応力・思考"
};

const ELEMENT_GUIDE={
 木:{
  layer:"伸びしろを見つけると力が出やすく、新しい経験を吸収しながら成長する流れを持ちます。",
  love:"一緒に成長できる関係を好みやすく、束縛よりも信頼と前向きな刺激が大切です。",
  work:"改善や育成、新しい仕組みづくりなど、変化を積み上げる仕事で持ち味が出やすいでしょう。",
  money:"自己投資や将来につながる支出には前向きですが、成果を急ぐ投資は一度立ち止まると安定します。",
  relation:"相手の可能性を見ようとする一方、先を急ぎすぎると温度差が出るため歩幅合わせが鍵です。",
  action:"半年後に伸びていたいことを一つ決め、毎週続けられる小さな習慣へ落とすと運を活かしやすくなります。"
 },
 火:{
  layer:"気持ちが動くと行動も速く、周囲へ熱量を伝えながら流れを作る力があります。",
  love:"好意がはっきりすると距離を縮める力が強い反面、勢いだけで結論を急がないことが関係を長持ちさせます。",
  work:"人前での表現、営業、企画、決断の速さが必要な場面で存在感を出しやすいでしょう。",
  money:"稼ぐ意欲と使う勢いの両方が出やすいため、楽しむ予算と残す予算を先に分けると安定します。",
  relation:"明るさや反応の速さが魅力ですが、相手が考える時間を残すとさらに信頼を得やすくなります。",
  action:"迷い続けるより小さく試す方が流れをつかみやすいタイプです。期限を決めて一度動き、結果を見て修正しましょう。"
 },
 土:{
  layer:"急激な変化より、足場を固めて確実に積み重ねるほど本来の強さが出やすい流れです。",
  love:"安心感と誠実さを重視し、時間をかけて信頼を育てるほど関係が安定しやすいでしょう。",
  work:"継続管理、現場調整、品質維持など、責任を持って土台を支える役割で評価されやすい傾向です。",
  money:"大勝負よりも貯蓄・固定費管理・長期運用との相性が良く、守りを整えるほど余裕を作りやすくなります。",
  relation:"頼られると応えようとする一方、抱え込みすぎることがあります。できる範囲を先に言葉にすると楽になります。",
  action:"新しいことを増やす前に、今ある予定・物・支出を一つ整えると次の判断がしやすくなります。"
 },
 金:{
  layer:"必要なものと不要なものを見分け、基準を整えて質を高めることで力を発揮しやすい流れです。",
  love:"曖昧な関係より誠実さや筋の通った態度を求めやすく、率直さに柔らかい言葉を添えることが鍵です。",
  work:"分析、品質、技術、交渉、改善など、判断基準を明確にして成果へつなげる場面に強みがあります。",
  money:"価格と価値を比較して判断できるため管理力がありますが、こだわりの品への一点集中には上限を決めると安心です。",
  relation:"信頼できる相手とは長く付き合う一方、合わないと判断すると距離を取りやすい面があります。結論前の確認が有効です。",
  action:"やることを増やすより『やらないこと』を一つ決めると、集中力が戻りやすくなります。"
 },
 水:{
  layer:"状況を観察し、相手や環境に合わせて進み方を変えられる柔軟さが強みになりやすい流れです。",
  love:"相手の気持ちを読み取ろうとする力がある反面、考えすぎて本音を後回しにしないことが大切です。",
  work:"情報収集、企画、研究、文章、相談役など、複数の情報をつないで考える仕事で力を発揮しやすいでしょう。",
  money:"状況を見ながら動けるため柔軟ですが、選択肢を増やしすぎると判断が遅れます。目的別に口座や予算を分けると安定します。",
  relation:"相手に合わせるのが上手な一方、自分の希望が見えにくくなることがあります。小さな希望から言葉にすると良いでしょう。",
  action:"情報を集める時間と決める時間を分け、期限が来たら今ある材料で一度選ぶことが流れを前へ進めます。"
 }
};

const STEM_PROFILE={
 甲:{
  type:"まっすぐ伸びる開拓型",
  personalityTag:"芯の強さと成長力",
  core:"目標が見えるほど力を発揮しやすく、自分なりの筋を通しながら前へ進むタイプです。",
  strength:"一度決めたことを育て続ける粘り強さと、周囲を引っ張る前向きさが持ち味です。",
  caution:"正しさを急ぐと頑固に見えやすいため、途中で他人の案を取り入れる余白を残すと長所が活きます。",
  loveTag:"誠実に向き合う",
  love:"恋愛では駆け引きより誠実さを重視しやすく、将来像を共有できる相手には深く向き合います。",
  workTag:"先頭で道を作る",
  work:"仕事ではゼロから形にする役割や、長期目標を持って成長させる仕事で力を出しやすいでしょう。",
  moneyTag:"将来へ育てる",
  money:"お金は目標と結びつくと管理しやすく、長期的な積み上げに向きます。見栄のための出費は満足度を下げやすい傾向です。",
  relationTag:"率直で頼られやすい",
  relation:"人間関係では裏表の少なさが信頼につながりますが、相手にも同じ速さや熱量を求めすぎないことがポイントです。",
  actionTag:"長期目標を小さく刻む",
  action:"大きな目標ほど、一週間単位で確認できる行動へ分けると持ち前の継続力を最大限使えます。"
 },
 乙:{
  type:"しなやかに伸びる調整型",
  personalityTag:"柔軟さと粘り強さ",
  core:"周囲の状況を読みながら形を変え、無理なく目的へ近づいていく柔軟なタイプです。",
  strength:"人の気持ちや場の空気を細かく捉え、対立を避けながら結果を出す粘り強さがあります。",
  caution:"遠慮が続くと本音が後回しになりやすいため、譲れない条件だけは早めに言葉にすると安定します。",
  loveTag:"距離を育てる",
  love:"恋愛では急激な展開より、相手を知りながら少しずつ距離を縮める関係に安心しやすいでしょう。",
  workTag:"人と情報をつなぐ",
  work:"調整、サポート、デザイン、育成など、人や情報を結び付けて全体を整える役割に適性が出やすい傾向です。",
  moneyTag:"無理なく積み上げる",
  money:"大きく賭けるより、生活を崩さず続けられる貯蓄や運用との相性が良いタイプです。",
  relationTag:"気配りの調整役",
  relation:"相手の立場を汲むのが上手ですが、合わせすぎると疲れが蓄積します。断る基準を持つと関係が長続きします。",
  actionTag:"環境を味方につける",
  action:"意志の強さだけで頑張るより、続けやすい場所・人・時間帯を先に整えると成果へつながりやすくなります。"
 },
 丙:{
  type:"周囲を照らす行動型",
  personalityTag:"明るさと実行力",
  core:"気持ちが動いたときの行動力が高く、自分の熱量を周囲へ伝えて流れを作るタイプです。",
  strength:"決断の速さ、表現力、場を前向きにするエネルギーが強みになりやすいでしょう。",
  caution:"勢いが強い時ほど細部を飛ばしやすいため、大きな判断は一度だけ確認時間を置くと安定します。",
  loveTag:"気持ちを素直に示す",
  love:"好きになると分かりやすく気持ちを示しやすく、一緒に楽しめる関係で魅力が出ます。",
  workTag:"動いて流れを作る",
  work:"営業、企画、発信、リーダー役など、人を巻き込みながら前へ進める場面で力を出しやすいでしょう。",
  moneyTag:"稼ぐ力と使う勢い",
  money:"収入を増やす目標には強く反応しますが、気分が上がると支出も増えやすいので先取りで残す仕組みが有効です。",
  relationTag:"反応が早く親しみやすい",
  relation:"明るく話しやすい印象を与えやすい一方、相手が静かに考える時間も尊重すると関係の幅が広がります。",
  actionTag:"小さく始めて修正する",
  action:"完璧な準備を待つより、小さく動いて反応を見ながら直す進め方が本来の強さを活かします。"
 },
 丁:{
  type:"静かに熱を灯す集中型",
  personalityTag:"感受性と集中力",
  core:"外からは穏やかに見えても、内側には強いこだわりや情熱を持ち、好きなことへ深く集中するタイプです。",
  strength:"細かな違いに気づく感受性と、一つのテーマを丁寧に磨く集中力が持ち味です。",
  caution:"考えや感情を内側に溜め込みやすいため、疲れる前に言葉や休息で外へ逃がすことが大切です。",
  loveTag:"深く大切にする",
  love:"恋愛では表面的な派手さより心の通い方を重視し、信頼した相手には細かな気遣いを向けます。",
  workTag:"質を高める",
  work:"専門性、制作、接客、研究など、細部まで気を配りながら価値を高める仕事で能力が出やすいでしょう。",
  moneyTag:"納得できる物へ使う",
  money:"衝動的に広く使うより、価値を感じたものへ集中して使いやすい傾向です。こだわり費の上限を決めると安定します。",
  relationTag:"少人数で深く",
  relation:"広く浅くより信頼できる相手と深く付き合う方が自然です。気遣いが伝わっているかを言葉でも確認すると良いでしょう。",
  actionTag:"集中と休息をセットに",
  action:"集中できる時間を確保すると同時に、終わる時刻も決めることで持続力が上がります。"
 },
 戊:{
  type:"土台を作る安定型",
  personalityTag:"責任感と包容力",
  core:"慌てて動くより状況を受け止め、周囲が安心して動ける土台を作るタイプです。",
  strength:"簡単にはぶれない安定感と、長期的に責任を引き受ける粘り強さがあります。",
  caution:"変化への判断が慎重になりすぎると好機を逃しやすいため、試す範囲を限定して動く方法が向きます。",
  loveTag:"安心と信頼を重視",
  love:"恋愛では一時的な刺激より信頼の積み重ねを大切にし、長く付き合える相手を慎重に見極めます。",
  workTag:"全体を支える",
  work:"管理、現場運営、教育、調整など、全体の基盤を支え続ける役割で評価されやすいでしょう。",
  moneyTag:"守りを強くする",
  money:"家計や資産の土台を整える力があり、長期目線で残す仕組みを作るほど安心感が増します。",
  relationTag:"頼られる存在",
  relation:"相談されると受け止める力がありますが、他人の問題まで抱え込まない境界線を持つことが重要です。",
  actionTag:"試す範囲を決める",
  action:"大きく変えるのではなく、期間や金額を限定した小さな実験から始めると安心して前へ進めます。"
 },
 己:{
  type:"丁寧に整える実務型",
  personalityTag:"現実感覚と気配り",
  core:"目の前の状況を細かく見て、必要なことを一つずつ整えながら成果へ近づくタイプです。",
  strength:"実務感覚、気配り、継続的な改善力があり、周囲の不足を自然に補えることが強みです。",
  caution:"細かな問題が気になりすぎると全体の進みが遅くなるため、完成ラインを先に決めると力を使いやすくなります。",
  loveTag:"日常を大切にする",
  love:"恋愛では言葉だけでなく、日々の行動や気遣いから愛情を確認する傾向があります。",
  workTag:"現場を整える",
  work:"事務、品質、支援、育成など、細部を整えて安定した成果を出す役割に強みが出やすいでしょう。",
  moneyTag:"生活を整えて残す",
  money:"日常の支出を細かく把握できるため、固定費や習慣的支出を整えると着実に余裕を作れます。",
  relationTag:"細かな変化に気づく",
  relation:"相手の様子に気づきやすく頼られますが、先回りしすぎず相手に任せる余白も必要です。",
  actionTag:"完成ラインを決める",
  action:"100点を狙う前に『ここまでできれば一旦完了』という基準を決めると行動が軽くなります。"
 },
 庚:{
  type:"切り開く決断型",
  personalityTag:"決断力と突破力",
  core:"必要だと判断すると迷いを断ち切り、状況を変えるために動けるタイプです。",
  strength:"問題点を見つけて改善へ踏み込む強さと、難しい場面でも決断できる胆力があります。",
  caution:"結論を急ぐと厳しく見えやすいため、相手の事情を一度聞いてから判断すると強さが信頼へ変わります。",
  loveTag:"曖昧さを嫌う",
  love:"恋愛では関係性をはっきりさせたい気持ちが強く、誠実で率直な相手と安心しやすいでしょう。",
  workTag:"改善と決断に強い",
  work:"技術、改善、交渉、管理など、問題を見つけて変化を起こす役割で力を発揮しやすいタイプです。",
  moneyTag:"基準を決めて判断",
  money:"買う・買わないの基準を持つと管理しやすく、目的のない支出を切るほど資金効率が上がります。",
  relationTag:"率直で頼もしい",
  relation:"はっきりした態度が信頼につながる一方、正論だけでなく感情も受け止めると人間関係が柔らかくなります。",
  actionTag:"一つ手放して前へ",
  action:"停滞を感じるときは、新しいものを増やすより不要な作業や習慣を一つやめる方が流れを変えやすいでしょう。"
 },
 辛:{
  type:"質を磨く洗練型",
  personalityTag:"繊細さと美意識",
  core:"小さな違いに気づき、より良い形へ磨き上げることに満足を感じやすいタイプです。",
  strength:"審美眼、精度、礼儀や品質への意識が高く、細部を整えることで大きな差を作れます。",
  caution:"自分にも他人にも基準が高くなりやすいため、十分良い状態を認める習慣が心の余裕につながります。",
  loveTag:"信頼と品のある関係",
  love:"恋愛では雑な扱いを苦手とし、言葉遣いや約束など小さな誠実さから相手を見ます。",
  workTag:"専門性と品質",
  work:"品質、デザイン、分析、専門職など、精度や完成度が評価される分野で強みが出やすいでしょう。",
  moneyTag:"価値を見極める",
  money:"安さだけでなく品質を見て選ぶ傾向があり、長く使えるものへの支出は満足度が高まりやすいタイプです。",
  relationTag:"慎重に信頼を築く",
  relation:"人を見る目が慎重で、信頼ができると長く付き合います。最初から完璧を求めすぎないことが関係を広げます。",
  actionTag:"80点で一度出す",
  action:"細部を磨き続ける前に、80点の段階で一度外へ出して反応を見ると成長速度が上がります。"
 },
 壬:{
  type:"大きく流れを読む自由型",
  personalityTag:"広い視野と適応力",
  core:"目の前だけに縛られず、大きな流れを見ながら進む方向を変えられるタイプです。",
  strength:"新しい情報や人を受け入れる柔軟さと、複数の選択肢を結び付ける発想力があります。",
  caution:"可能性を広げすぎると集中先が散りやすいため、今期の最優先を一つ決めることが重要です。",
  loveTag:"自由と理解を求める",
  love:"恋愛では互いの自由を尊重し、会話や新しい体験を一緒に楽しめる関係を好みやすいでしょう。",
  workTag:"変化を味方にする",
  work:"企画、営業、情報、移動の多い仕事など、変化へ対応しながら広げる役割で力を発揮しやすい傾向です。",
  moneyTag:"選択肢を広げすぎない",
  money:"稼ぎ方や使い方の選択肢を見つけるのは上手ですが、複数へ広げすぎず主軸を決めると安定します。",
  relationTag:"幅広くつながる",
  relation:"さまざまなタイプと話せる柔軟さがありますが、一人で考える時間も確保すると人付き合いに疲れにくくなります。",
  actionTag:"今期の主軸を一つ",
  action:"面白そうな選択肢が複数あるほど、三か月だけ集中するテーマを一つ決めると結果が見えやすくなります。"
 },
 癸:{
  type:"静かに本質を読む洞察型",
  personalityTag:"観察力と共感性",
  core:"表面だけで判断せず、相手の気持ちや状況の変化を細かく捉えて考えるタイプです。",
  strength:"観察力、共感性、慎重な思考があり、見落とされやすい問題に気づけることが強みです。",
  caution:"考えを巡らせすぎると不安が大きくなりやすいため、事実と想像を分けて整理すると落ち着きます。",
  loveTag:"心のつながりを重視",
  love:"恋愛では表面的な条件より、安心して本音を話せることを大切にする傾向があります。",
  workTag:"深く考えて支える",
  work:"分析、研究、相談、文章など、情報を丁寧に扱い本質を見つける仕事で力を発揮しやすいでしょう。",
  moneyTag:"慎重に守る",
  money:"不確実なことには慎重で、大きな失敗を避けやすいタイプです。情報収集の期限を決めると判断が前へ進みます。",
  relationTag:"相手をよく見る",
  relation:"相手の変化に気づきやすい反面、気を回しすぎることがあります。確認できないことは本人に聞く方が負担を減らせます。",
  actionTag:"事実と想像を分ける",
  action:"不安や迷いが出たときは『分かっている事実』『まだ分からないこと』を分けて書くと次の一歩が見えます。"
 }
};

function browserBirthDate(){
 try{
  if(typeof document==="undefined")return "";
  return String(document.querySelector("#birthDate")?.value||"");
 }catch{return ""}
}

function resolveDayPillar(dayPillar,birthDate){
 if(dayPillar?.status==="OK")return dayPillar;
 const date=String(birthDate||browserBirthDate()||"");
 if(!date)return null;
 const d=sexagenaryDay(date);
 return d?.status==="OK"?d:null;
}

function layerText(pillar,kind){
 if(!pillar?.element)return "";
 const g=ELEMENT_GUIDE[pillar.element];
 if(kind==="year")return `周囲には「${COPY[pillar.element]}」を持つ人として映りやすく、${g.layer}`;
 return `日常では「${COPY[pillar.element]}」が動きやすく、${g.layer}`;
}

function yinYangText(yearPillar,monthPillar){
 if(!yearPillar||!monthPillar)return "";
 if(yearPillar.yinYang===monthPillar.yinYang){
  return yearPillar.yinYang==="陽"
   ?"外へ動く力が重なりやすいので、勢いがある時ほど休む時間を意識するとバランスが取れます。"
   :"内側で考える力が重なりやすいので、考えがまとまったら小さく外へ出すことが運の流れを作ります。";
 }
 return "動く力と考える力の両方を持ちやすく、状況に応じて前へ出る時と引いて考える時を使い分けられる配置です。";
}

function card(title,value,text,evidence){
 return {title,value,text,evidence};
}

export function composeFreeBirthCards({yearPillar,monthPillar,dayPillar,boundary,birthDate}={}){
 const day=resolveDayPillar(dayPillar,birthDate);
 const stem=day?.dayMaster||day?.stem||monthPillar?.stem||yearPillar?.stem;
 const p=STEM_PROFILE[stem]||STEM_PROFILE.甲;
 const month=ELEMENT_GUIDE[monthPillar?.element]||ELEMENT_GUIDE.土;
 const year=ELEMENT_GUIDE[yearPillar?.element]||ELEMENT_GUIDE.土;
 const sameElement=day?.element&&monthPillar?.element&&day.element===monthPillar.element;
 const emphasis=sameElement
   ?`本質と日常の動きに同じ「${COPY[day.element]}」が重なるため、この特徴が長所にも偏りにもなりやすいでしょう。`
   :"本質と日常で違う要素が動くため、一つの性格だけではなく場面によって表れ方が変わりやすいタイプです。";
 const yy=yinYangText(yearPillar,monthPillar);

 return [
  card(
   "総合タイプ",
   p.type,
   `${p.core}${layerText(monthPillar,"month")}${emphasis}`,
   {dayStem:stem,dayElement:day?.element||null,monthElement:monthPillar?.element||null,yearElement:yearPillar?.element||null}
  ),
  card(
   "基本性格",
   p.personalityTag,
   `${p.strength}${p.caution}${yy}`,
   {basis:["day-stem","year-month-yinyang"]}
  ),
  card(
   "恋愛・結婚",
   p.loveTag,
   `${p.love}${month.love}相手の気持ちを占いだけで決めつけず、実際の言葉と行動を確認するほど関係を育てやすくなります。`,
   {basis:["day-stem","month-element"]}
  ),
  card(
   "仕事・才能",
   p.workTag,
   `${p.work}${month.work}得意分野は肩書きだけで決めず、実際に集中しやすい作業や周囲から頼まれやすい役割と照らすと見つけやすいでしょう。`,
   {basis:["day-stem","month-element"]}
  ),
  card(
   "金運",
   p.moneyTag,
   `${p.money}${month.money}金運は将来を断定するものではなく、あなたが取りやすい判断パターンとして活用してください。`,
   {basis:["day-stem","month-element"]}
  ),
  card(
   "対人関係",
   p.relationTag,
   `${p.relation}${year.relation}${layerText(yearPillar,"year")}`,
   {basis:["day-stem","year-element"]}
  ),
  card(
   "開運アドバイス",
   p.actionTag,
   `${p.action}${month.action}一度に全部変えず、今週できる行動を一つだけ決めると続けやすくなります。`,
   {basis:["day-stem","month-element"],boundaryStatus:boundary?.status||null}
  )
 ];
}

const REL={same:"同じ五行",different:"異なる五行"};

export function composePremiumBirthCards({yearPillar,monthPillar,dayPillar,monthBoundary}){
 const elems=[yearPillar.element,monthPillar.element,dayPillar.element],yy=[yearPillar.yinYang,monthPillar.yinYang,dayPillar.yinYang];
 const counts=Object.fromEntries(["木","火","土","金","水"].map(e=>[e,elems.filter(x=>x===e).length]));
 const active=Object.entries(counts).filter(([,n])=>n>0).map(([e,n])=>`${e}${n}`).join("・");
 return [
  {title:"年柱",value:yearPillar.label,text:`生まれた年の柱。${yearPillar.yinYang}${yearPillar.element}として読みます。`},
  {title:"月柱",value:monthPillar.label,text:`節入り基準の第${monthPillar.monthNo}月。${monthPillar.yinYang}${monthPillar.element}として読みます。`},
  {title:"日柱",value:dayPillar.label,text:`生年月日の暦日から算出した日干支です。日付単位で判定します。`},
  {title:"日主",value:dayPillar.dayMaster,text:`日柱の天干 ${dayPillar.dayMaster} を日主として扱います。`},
  {title:"日主の五行",value:dayPillar.element,text:COPY[dayPillar.element]},
  {title:"日主の陰陽",value:dayPillar.yinYang,text:`${dayPillar.dayMaster}は${dayPillar.yinYang}の天干です。`},
  {title:"三柱の五行",value:active,text:"年・月・日の天干五行を並べた構成です。時柱は出生時刻を入力しない仕様のため含めません。"},
  {title:"三柱の陰陽",value:yy.join("・"),text:`陽${yy.filter(x=>x==="陽").length} / 陰${yy.filter(x=>x==="陰").length} の構成です。`},
  {title:"年柱と日主",value:yearPillar.element===dayPillar.element?REL.same:REL.different,text:`年の天干五行は${yearPillar.element}、日主は${dayPillar.element}です。`},
  {title:"月柱と日主",value:monthPillar.element===dayPillar.element?REL.same:REL.different,text:`月の天干五行は${monthPillar.element}、日主は${dayPillar.element}です。`},
  {title:"判定基準",value:monthBoundary.status==="OK"?"節入り確認済み":"要確認",text:"年柱・月柱は検証済み節入りデータ、日柱はグレゴリオ暦日の60干支循環で算出。時柱は省略しています。"}
 ];
}

/*
 Free-result hygiene:
 unavailable implementation-status cards are not fortune results.
 Valid name/palm readings are left untouched; only "準備中" / "判定保留" cards are removed.
*/
function installFreeResultHygiene(){
 if(typeof document==="undefined"||typeof MutationObserver==="undefined")return;
 const install=()=>{
  const grid=document.querySelector("#resultGrid");
  if(!grid||grid.dataset.freeHygiene==="1")return;
  grid.dataset.freeHygiene="1";
  const clean=()=>{
   for(const article of [...grid.querySelectorAll("article.result-card")]){
    const title=String(article.querySelector("h3")?.textContent||"");
    const pill=String(article.querySelector(".pill")?.textContent||"").trim();
    const unavailableName=title.includes("姓名判断")&&(pill==="準備中"||pill==="要確認");
    const unavailablePalm=title.trim().startsWith("手相")&&pill==="判定保留";
    if(unavailableName||unavailablePalm)article.remove();
   }
  };
  new MutationObserver(clean).observe(grid,{childList:true,subtree:false});
  clean();
 };
 install();
 if(!document.querySelector("#resultGrid"))document.addEventListener("DOMContentLoaded",install,{once:true});
}
installFreeResultHygiene();
