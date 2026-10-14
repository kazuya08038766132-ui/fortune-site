const TITLES=["総合運","性格・本質","恋愛・結婚運","仕事・才能運","金運","人間関係","開運メッセージ"];

const byTitle=(cards,title)=>(cards||[]).find(x=>x?.title===title)||null;
const byKey=(nr,key)=>(nr?.numerology?.entries||[]).find(x=>x?.key===key)||null;
const text=x=>String(x??"").trim();

function cleanBirthText(value,maxSentences=2){
 const sentences=text(value)
  .split("。")
  .map(x=>x.trim())
  .filter(Boolean)
  .filter(x=>!x.includes("将来を断定するものではなく"))
  .filter(x=>!x.includes("相手の気持ちを占いだけで決めつけず"))
  .filter(x=>!x.includes("配置です"));
 return sentences.slice(0,maxSentences).map(x=>x+"。").join("");
}

function ratingAdvice(rating,area){
 const r=text(rating);
 const table={
  personality:{
   大吉:"この良さは自然に出やすいので、自分の感覚を信じて伸ばしていくほど魅力になります。",
   吉:"無理に目立とうとしなくても、続けていることの中からあなたらしさが育っていきます。",
   半吉:"良い時と迷う時の差が出やすいので、答えを急がず一度整理すると安定します。",
   凶:"繊細さが強く出る時は気持ちも揺れやすいので、無理に答えを出さず一度落ち着くことが大切です。",
   大凶:"抱え込みやすい時ほど一人で結論を出さず、休む・相談する・距離を取ることで本来の良さを取り戻せます。"
  },
  love:{
   大吉:"気持ちを言葉にするほどあなたの魅力が伝わりやすく、関係も育ちやすいでしょう。",
   吉:"派手な駆け引きより、約束を守る・丁寧に話すといった積み重ねが良い縁につながります。",
   半吉:"惹かれる気持ちと慎重さの両方が出やすいので、相手を知る時間を大切にすると安心できます。",
   凶:"不安な時に相手の反応を読みすぎやすいので、想像だけで決めず言葉で確かめることが恋愛運を整えるコツです。",
   大凶:"無理に合わせ続ける恋は疲れやすいので、安心して本音を言える相手かどうかを大切にしてください。"
  },
  work:{
   大吉:"得意なことを任されるほど力が出やすいので、できることを遠慮せず形にして見せると評価につながります。",
   吉:"一度身につけたことを続けて磨くほど、仕事の安定感と信頼が育っていきます。",
   半吉:"得意不得意がはっきりしやすいので、全部を一人で抱えず役割を選ぶと力を出しやすくなります。",
   凶:"評価や失敗を気にしすぎると動きが止まりやすいので、最初から完璧を目指さず小さく試すことが大切です。",
   大凶:"無理な環境で頑張り続けるより、役割や進め方を変えた方が本来の力を出しやすいでしょう。"
  },
  money:{
   大吉:"目的を決めて使うお金は良い循環を作りやすく、残すお金とのメリハリをつけるほど安定します。",
   吉:"大きく当てにいくより、無理なく続けられる管理を積み重ねる方があなたに合っています。",
   半吉:"使う時と守る時の差が出やすいので、先に予算を決めておくと金運がぶれにくくなります。",
   凶:"気分や勢いで決めると後悔しやすいので、高い買い物ほど一晩置いてから決めると安心です。",
   大凶:"増やすことを急ぐより、まず固定費や大きな支出を整えることが金運の立て直しにつながります。"
  },
  relation:{
   大吉:"自然体で接するほど人に恵まれやすいので、無理に好かれようとしなくても大丈夫です。",
   吉:"丁寧な付き合いを続けるほど信頼が積み上がり、長く付き合える人が残っていきます。",
   半吉:"相手に合わせる時と自分を通す時の差が出やすいので、無理を感じたら早めに言葉にすると楽になります。",
   凶:"相手に気を使いすぎると疲れやすいので、できることとできないことを先に伝えると関係が安定します。",
   大凶:"人間関係で消耗する時は、無理に付き合い続けず距離を調整することも大切な選択です。"
  }
 };
 return table[area]?.[r]||"持ち味を無理なく使える環境を選ぶほど、良い流れにつながります。";
}

function nameMessage(entry,areaLabel,adviceArea){
 if(!entry)return "";
 return `お名前からは、${areaLabel}に「${text(entry.theme)||"あなたらしさ"}」という傾向も見えます。${ratingAdvice(entry.rating,adviceArea)}`;
}

function overallNameMessage(nr){
 const p=byKey(nr,"person"),t=byKey(nr,"total");
 if(!p&&!t)return "";
 const parts=[];
 if(p)parts.push(`お名前からは「${p.theme}」というあなたらしさも見えます。`);
 if(t)parts.push(`長い目では「${t.theme}」が人生のテーマになりやすいでしょう。`);
 if(p)parts.push(ratingAdvice(p.rating,"personality"));
 return parts.join("");
}

function friendlyValue(card,fallback){return text(card?.value)||fallback}

export function composeFriendlyFreeReading({birthCards=[],nameReading=null,fullName=""}={}){
 const overall=byTitle(birthCards,"総合タイプ");
 const personality=byTitle(birthCards,"基本性格");
 const love=byTitle(birthCards,"恋愛・結婚");
 const work=byTitle(birthCards,"仕事・才能");
 const money=byTitle(birthCards,"金運");
 const relation=byTitle(birthCards,"対人関係");
 const action=byTitle(birthCards,"開運アドバイス");

 const nameOk=nameReading?.status==="OK";
 const person=nameOk?byKey(nameReading,"person"):null;
 const earth=nameOk?byKey(nameReading,"earth"):null;
 const outer=nameOk?byKey(nameReading,"outer"):null;
 const total=nameOk?byKey(nameReading,"total"):null;

 return [
  {
   title:TITLES[0],
   value:friendlyValue(overall,"あなたらしく伸びる運勢"),
   text:`あなたの生まれ持った運勢は、「${friendlyValue(overall,"自分らしさ")}」の良さを活かすほど伸びていくタイプです。${cleanBirthText(overall?.text,2)}${nameOk?overallNameMessage(nameReading):"自分の得意なペースを大切にすると、運の流れをつかみやすくなるでしょう。"}`
  },
  {
   title:TITLES[1],
   value:friendlyValue(personality,"あなたの持ち味"),
   text:`あなたは、${cleanBirthText(personality?.text,2)}${nameOk?nameMessage(person,"性格の中心","personality"):"自分では当たり前だと思っている部分ほど、周囲から見るとあなたの強みになっていることがあります。"}`
  },
  {
   title:TITLES[2],
   value:friendlyValue(love,"信頼を育てる恋"),
   text:`あなたの恋愛は「${friendlyValue(love,"信頼を育てること")}」が大切になるタイプです。${cleanBirthText(love?.text,2)}${nameOk?nameMessage(earth,"恋愛や心の動き","love"):"焦って答えを出すより、安心して話せる関係を育てるほどあなたらしい恋になりやすいでしょう。"}`
  },
  {
   title:TITLES[3],
   value:friendlyValue(work,"得意を活かす仕事"),
   text:`仕事では「${friendlyValue(work,"あなたの得意")}」を活かせる場所ほど力を発揮しやすいでしょう。${cleanBirthText(work?.text,2)}${nameOk?nameMessage(person,"仕事での判断や才能","work"):"周囲からよく頼まれることや、時間を忘れて集中できる作業の中に適性のヒントがあります。"}`
  },
  {
   title:TITLES[4],
   value:friendlyValue(money,"自分に合ったお金の使い方"),
   text:`あなたの金運は、一気に増やすことより「${friendlyValue(money,"自分に合った使い方")}」を意識すると整いやすいタイプです。${cleanBirthText(money?.text,2)}${nameOk?nameMessage(total,"長い目で見たお金との付き合い方","money"):"使う目的と残す目的を分けるだけでも、お金の流れは安定しやすくなります。"}`
  },
  {
   title:TITLES[5],
   value:friendlyValue(relation,"自分らしい距離感"),
   text:`人間関係では「${friendlyValue(relation,"自分らしい距離感")}」があなたの持ち味です。${cleanBirthText(relation?.text,2)}${nameOk?nameMessage(outer,"周囲との関わり方","relation"):"相手に合わせすぎず、自分が無理をしていないか時々確かめることが良い関係を長続きさせるコツです。"}`
  },
  {
   title:TITLES[6],
   value:friendlyValue(action,"今日からできること"),
   text:`今のあなたにおすすめしたい開運のコツは「${friendlyValue(action,"小さく行動すること")}」です。${cleanBirthText(action?.text,2)}${nameOk&&total?`お名前から見た長い目でのテーマは「${total.theme}」。大きく変えようとせず、今日できる小さな一歩を続けるほど、あなたの良さが運につながっていくでしょう。`:"大きく変えようとせず、今日できる小さな一歩を一つ決めてみてください。"}`
  }
 ];
}

export function buildFriendlyReadingEvidence({birthCards=[],nameReading=null,yearPillar=null,monthPillar=null}={}){
 const overall=byTitle(birthCards,"総合タイプ");
 const ev=overall?.evidence||{};
 const nameOk=nameReading?.status==="OK";
 const g=nameOk?nameReading.fiveGrid:null;
 const chars=nameOk?[...(nameReading.family||[]),...(nameReading.given||[])]:[];
 return {
  birth:[
   yearPillar?.label?`年柱 ${yearPillar.label}`:null,
   monthPillar?.label?`月柱 ${monthPillar.label}`:null,
   ev.dayStem?`日主 ${ev.dayStem}`:null,
   ev.dayElement?`日主の五行 ${ev.dayElement}`:null
  ].filter(Boolean),
  name:nameOk&&g?[
   chars.length?`採用画数 ${chars.map(x=>`${x.char}${x.stroke}画`).join(" / ")}`:null,
   `五格 天${g.heaven} / 人${g.person} / 地${g.earth} / 外${g.outer} / 総${g.total}`,
   ...(nameReading.numerology?.entries||[]).map(x=>`${x.label}${x.number}画 ${x.rating}「${x.theme}」`)
  ].filter(Boolean):[],
  nameStatus:nameReading?.status||"NOT_USED",
  note:"表の7項目は、生年月日の傾向と姓名判断を読みやすい言葉にまとめた無料鑑定です。計算値はここで確認できます。"
 };
}

export const FRIENDLY_FREE_READING_TITLES=Object.freeze([...TITLES]);
export const FRIENDLY_FREE_READING_VERSION="RC285-2";
