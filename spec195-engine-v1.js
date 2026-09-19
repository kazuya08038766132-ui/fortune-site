(() => {
"use strict";
const VERSION="SPEC195_ENGINE_V1";
const FEATURE_KEYS=["independence","persistence","creativity","logic","intuition","emotional_expression","social_support","adaptability","stability","ambition","caution","leadership"];
const NAME_ROLES={ten:"FAMILY",jin:"CORE",chi:"EARLY",gai:"SOCIAL",sou:"LIFE",sansai:"FLOW"};
const ELEMENT_BY_DIGIT={1:"木",2:"木",3:"火",4:"火",5:"土",6:"土",7:"金",8:"金",9:"水",0:"水"};
const GENERATES={"木":"火","火":"土","土":"金","金":"水","水":"木"};
const CONTROLS={"木":"土","土":"水","水":"火","火":"金","金":"木"};
const PAID_CHAPTERS=["Ⅰ あなたという人","Ⅱ 運命バランス","Ⅲ 掌","Ⅳ 姓名","Ⅴ 生年月日","Ⅵ 仕事と才能","Ⅶ 財と金運","Ⅷ 愛情・人間関係","Ⅸ 人生の転機","Ⅹ 二つの手","最終章 三占術統合"];

function safeText(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function rel(a,b){if(!a||!b)return"UNKNOWN";if(a===b)return"SAME";if(GENERATES[a]===b)return"GENERATES";if(GENERATES[b]===a)return"GENERATED_BY";if(CONTROLS[a]===b)return"CONTROLS";if(CONTROLS[b]===a)return"CONTROLLED_BY";return"UNKNOWN"}
function elem(n){return ELEMENT_BY_DIGIT[Math.abs(Number(n)||0)%10]}

function nameReading(fullName){
  const name=String(fullName||"").trim(), chars=[...name.replace(/\s+/g,"")];
  if(!name)return {status:"INSUFFICIENT",version:"NAME_STANDARD_V1",message:"姓名が未入力です。",roles:NAME_ROLES};
  const parts=window.NameNewFormMaster?.split(name);
  if(parts?.status==="OK"){
    const formal=nameFromVerifiedStrokes(parts.surname,parts.given);
    return {status:"OK_VERIFIED_NEW_FORM",version:"NAME_STANDARD_V1",name,chars,roles:NAME_ROLES,evidence:parts.evidence,formal,
      message:`新字体の検証済み画数から算出しました。人格${formal.grids.jin}画、地格${formal.grids.chi}画、総格${formal.grids.sou}画。`,features:[]};
  }
  return {status:"DATA_VERIFY",version:"NAME_STANDARD_V1",name,chars,roles:NAME_ROLES,unknown:parts?.unknown||[],
    message:"新字体標準の正式Masterで未検証の文字は画数を推測しません。現在は画数確認が必要です。",features:[]};
}
function birthReading(date){
  let raw=null;
  try{if(typeof window.birthCore==="function")raw=window.birthCore(date)}catch(e){}
  if(raw&&typeof raw==="object"&&!raw.error){
    return {status:"OK_PROTO",version:"BIRTH_3PILLAR_PROTO_V1",yearPillar:raw.yearPillar||null,monthPillar:raw.monthPillar||null,dayPillar:raw.dayPillar||null,dayMaster:raw.dayMaster||null,element:raw.element||null,raw};
  }
  return {status:"PROTO_LIMITED",version:"BIRTH_3PILLAR_PROTO_V1",message:"生年月日は受付済みです。節入り等の完全Master検証前の三柱開発版です。時柱は生成しません。"};
}
function palmReading(){
  const p=window.lastPalmAnalysis, q=window.lastPalmPublicQuality;
  if(!p)return {status:q?.status==="ACCEPT"?"IMAGE_ACCEPTED":"PENDING_VALIDATION",version:"PALM_MODEL_INTERFACE_V1",quality:q||null,message:q?.status==="ACCEPT"?"手相写真は品質確認を通過しました。主要線AIの本番検証が未完了のため、線の特徴は推測しません。":"写真は受付済みです。開発解析が未実行のため主要線を推測しません。"};
  const line=(x)=>({confidence:Number.isFinite(Number(x?.confidence))?Number(x.confidence):null,coverage:Number.isFinite(Number(x?.coverage))?Number(x.coverage):null,detected:x?.detected??null});
  return {status:"DEV_ANALYSIS",version:"PALM_MODEL_INTERFACE_V1",quality:p.qualityGate||null,life:line(p.life),head:line(p.head),heart:line(p.heart),fate:line(p.fate),message:"開発解析値です。低信頼・未検出を特徴不在と断定しません。"};
}
function fusion(name,birth,palm){
  const sources=[name,birth,palm], usable=sources.filter(x=>x&&["OK","OK_PROTO","DEV_ANALYSIS"].includes(x.status)).length;
  const status=usable>=3?"STRONG":usable===2?"PARTIAL":usable===1?"MIXED":"INSUFFICIENT";
  return {status,version:"FUSION_RULE_MATRIX_V1",agreement_count:usable,conflicts:[],evidence_ids:sources.map((x,i)=>x?`${i+1}:${x.version}:${x.status}`:null).filter(Boolean),message:status==="STRONG"?"3系統の根拠を統合できます。":status==="PARTIAL"?"確認済みの2系統を中心に読みます。":status==="MIXED"?"確認済み情報が限定的なため断定を避けます。":"検証済み根拠が不足しています。"};
}
function premium11(ctx){
  const n=ctx.name,b=ctx.birth,p=ctx.palm,f=ctx.fusion;
  const technical=b.status==="OK_PROTO"
    ? `年柱：${safeText(b.yearPillar||"確認中")}／月柱：${safeText(b.monthPillar||"確認中")}／日柱：${safeText(b.dayPillar||"確認中")}／日主：${safeText(b.dayMaster||"確認中")}${b.element?`（${safeText(b.element)}）`:""}`
    : "生年月日の専門データは検証中です。";
  const dual=ctx.oppositePalm
    ? "利き手と反対の手を別々に読み、共通点と差分を整理します。"
    : "反対の手の写真が未登録のため、二つの手の比較部分は未完了として表示します。";
  const body=[
   `姓名・生年月日・手相を最初から混ぜず、3つの視点を独立して確認してから統合します。現在の統合状態は ${f.status} です。`,
   `一致している傾向だけでなく、まだ確認できない部分や矛盾も分けて扱います。`,
   p.status==="DEV_ANALYSIS"?"生命線・頭脳線・感情線を中心に開発解析値を確認します。低信頼の線は断定しません。":"手相写真は受付済みです。主要線AIの本番検証が終わるまでは線の特徴を推測しません。",
   n.status==="DATA_VERIFY"?"姓名は正式な画数Masterで確認できない文字を推測せず、確認待ちとして扱います。":"姓名の五格・81数理・三才の確認済み結果を解説します。",
   `${technical}。詳細鑑定ではこの専門データを見せたうえで、専門用語だけで終わらず、性格・強み・注意点を読みやすい言葉で解説します。出生時刻の入力は求めません。`,
   `仕事と才能は、3占術から確認できた持続性・論理性・創造性・適応性などを根拠ごとに整理します。`,
   `財と金運は将来の利益額を予言せず、お金との向き合い方・慎重さ・継続性などの傾向として読みます。`,
   `愛情・人間関係は他人の本心を断定せず、本人の感情表現・距離感・対人傾向を中心に読みます。`,
   `人生の転機は「必ず起こる未来」とせず、生年月日の時間運と固定プロフィールの変化シグナルとして説明します。`,
   dual,
   `最終章では ${f.message} 根拠の出典を残し、矛盾を平均で消さず、総合的な読みとしてまとめます。`
  ];
  return PAID_CHAPTERS.map((title,i)=>({id:i+1,title,text:body[i],technical:i===4?technical:null,status:i===9&&!ctx.oppositePalm?"NEEDS_OPPOSITE_PALM":"READY"}));
}
function freeBirthSummary(b){
 if(!b)return"生年月日を確認中です。";
 if(b.status!=="OK_PROTO")return"生年月日から、性格や得意なこと、仕事・恋愛・金運の傾向を読み解きます。";
 const e=b.element||"";
 const map={"木":"成長や柔軟さ","火":"行動力や表現力","土":"安定感や現実性","金":"判断力や筋の通し方","水":"柔軟な思考や感受性"};
 return `生年月日から見ると、${map[e]||"自分らしい判断軸"}を意識しやすい傾向があります。詳しい干支・日主などの専門データは詳細鑑定で解説します。`;
}

function freeNameSummary(n,fullName){
 const display=String(fullName||n?.name||"").replace(/\s+/g," ").trim();
 if(n?.status==="OK_VERIFIED_NEW_FORM"&&n.formal){
  const g=n.formal.grids||{}, core=n.formal.numerology?.jin?.fortune||"";
  return `${safeText(display)}というお名前を新字体の確認済み画数で見ると、人格${g.jin}画・地格${g.chi}画・総格${g.sou}画です。${core?`人格は「${core}」の分類。`:""}無料鑑定では全体像を簡潔に、詳細鑑定では五格・81数理・三才を分けて読みます。`;
 }
 return `${safeText(display)}というお名前を受け取りました。無料鑑定では名前全体の印象を中心に扱い、未確認の漢字画数を勝手に補いません。画数を正式に確認できた文字は、詳細鑑定で五格・81数理・三才へ段階的に反映します。`;
}
function freePalmSummary(p,dominant="right"){
 const hand=dominant==="left"?"左手":"右手";
 if(p?.quality?.status==="ACCEPT"||p?.status==="IMAGE_ACCEPTED"){
  return `${hand}の手のひら写真は鑑定に使える品質で受け付けました。無料版では利き手を「現在の行動や選択に表れやすい傾向」を見る視点として扱います。主要線の位置や長さを画像から断定する部分は、検証できた解析結果だけを使います。`;
 }
 return `${hand}を現在の傾向を見る手として扱います。写真の状態を確認しながら、読み取れない線を無理に推測しません。`;
}
function freeFusionSummary(r,theme="総合"){
 const b=r?.birth, e=b?.element||"", map={"木":"伸びしろを育てる","火":"動きながら形にする","土":"足元を整えて積み上げる","金":"基準を決めて選び取る","水":"状況を見ながら柔軟に進む"};
 const axis=map[e]||"自分のペースと判断軸を整える";
 const themeText={"恋愛":"相手を決めつけるより、自分が心地よい距離感を言葉にすること","仕事":"得意な進め方を一つ決め、継続して成果につなげること","金運":"大きな一発より、使い方と残し方のルールを整えること","相性":"相手の本心を決めつけず、違いと共通点を分けて見ること","総合":"今ある強みを一つずつ行動に移し、無理なく続けること"}[theme]||"焦らず選択肢を整理すること";
 return `今回の中心テーマは「${axis}」です。${themeText}を意識すると、今の自分に合う選択を整理しやすくなります。3つの占術で確認できる根拠は分けて扱い、読み取れない部分を事実のようには補いません。`;
}

function premiumHtml(reading){
 return reading.premium.map(ch=>`<section class="premiumChapter" data-chapter="${ch.id}"><h2>${safeText(ch.title)}</h2>${ch.technical?`<div class="technicalBirth"><b>命式データ</b><p>${ch.technical}</p></div>`:""}<p>${ch.text}</p>${ch.status==="NEEDS_OPPOSITE_PALM"?'<p class="notice">この章は反対の手の写真を追加すると比較できます。</p>':""}</section>`).join("");
}

function timeProfile(date=new Date()){
 const d=new Date(date), y=d.getFullYear(),m=d.getMonth()+1,day=d.getDate();
 return {version:"TIME_PROFILE_V1",year:y,month:m,day,week:Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return x.toISOString().slice(0,10)}),note:"月額時間運の開発基盤。年境界=立春、月境界=節入りの正式Master照合が完了するまで確定的な吉凶は出しません。"};
}
function build(ctx){
 const n=nameReading(ctx.fullName),b=birthReading(ctx.birth),p=palmReading(),f=fusion(n,b,p);
 return {version:VERSION,name:n,birth:b,palm:p,fusion:f,premium:premium11({name:n,birth:b,palm:p,fusion:f,oppositePalm:ctx.oppositePalm}),time:timeProfile()};
}

// SPEC195 Stage 96-100/140-149: verified classification layer.
// IMPORTANT: this does not infer kanji stroke counts. Stroke master remains a separate gate.
const NUM81_CLASS={
 "大吉":[1,3,5,11,13,15,16,21,23,24,29,31,32,33,37,39,41,45,47,48,52,61,63,65,67,68,81],
 "吉":[6,7,8,17,18,25,35,38,57,58,73],
 "平":[49,50,51,55,71,72,75,77,78,80],
 "凶":[2,9,12,14,19,22,26,27,30,36,40,42,43,53,60,62,74,79],
 "大凶":[4,10,20,28,34,44,46,54,56,59,64,66,69,70,76]
};
function number81(n){
 n=Number(n);
 if(!Number.isInteger(n)||n<1||n>81)return {status:"OUT_OF_MASTER",number:n,message:"81数理V1は1〜81のみ。82以上を自動循環しません。"};
 for(const [fortune,nums] of Object.entries(NUM81_CLASS))if(nums.includes(n))return {status:"OK",number:n,fortune};
 return {status:"DATA_VERIFY",number:n};
}
function sansaiRelation(a,b){return rel(a,b)}
function sansai125(ten,jin,chi){
 const a=elem(ten),b=elem(jin),c=elem(chi);
 return {status:"OK_RULE",version:"SANSAI_125_RULE_V1",elements:[a,b,c],tenToJin:sansaiRelation(a,b),jinToChi:sansaiRelation(b,c),note:"人格を中心に天→人・人→地を分離評価。健康・疾病を断定しません。"};
}
function nameFromVerifiedStrokes(surnameStrokes,givenStrokes){
 const s=(surnameStrokes||[]).map(Number),g=(givenStrokes||[]).map(Number);
 if(!s.length||!g.length||[...s,...g].some(x=>!Number.isInteger(x)||x<1))return {status:"DATA_VERIFY",message:"検証済み画数が必要です。"};
 // Spirit number 1 for single-character surname/given name per current SPEC; use only after stroke input is verified.
 const ten=s.reduce((a,b)=>a+b,0)+(s.length===1?1:0);
 const chi=g.reduce((a,b)=>a+b,0)+(g.length===1?1:0);
 const jin=s[s.length-1]+g[0];
 const sou=[...s,...g].reduce((a,b)=>a+b,0);
 const gai=sou-jin+(s.length===1?1:0)+(g.length===1?1:0);
 return {status:"OK_VERIFIED_STROKES",version:"NAME_STANDARD_V1",grids:{ten,jin,chi,gai,sou},
  roles:NAME_ROLES,numerology:{ten:number81(ten),jin:number81(jin),chi:number81(chi),gai:number81(gai),sou:number81(sou)},
  sansai:sansai125(ten,jin,chi)};
}

window.SPEC195={VERSION,FEATURE_KEYS,PAID_CHAPTERS,NUM81_CLASS,elem,rel,number81,sansai125,nameFromVerifiedStrokes,nameReading,birthReading,palmReading,fusion,premium11,timeProfile,freeBirthSummary,freeNameSummary,freePalmSummary,freeFusionSummary,premiumHtml,build,safeText};
})();