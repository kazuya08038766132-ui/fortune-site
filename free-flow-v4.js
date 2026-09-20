(() => {
"use strict";
const BUILD="SPEC195-BUILD-38",$=id=>document.getElementById(id),esc=v=>window.SPEC195?.safeText(v)??String(v??"");
const BP={木:["成長力と柔軟さ","学びながら改善する力","育成・企画・改善","関係を急がず育てる","継続的に積み上げる","変化を受け止め希望も伝える","優先順位を決める"],火:["行動力と表現力","熱意を伝える力","発信・推進","気持ちを言葉にし急がない","勢いの出費を整える","率直さと余白を両立する","熱い時ほど一度置く"],土:["安定感と現実性","継続して形にする力","管理・調整・運用","信頼を時間をかけ築く","予算と貯蓄を整える","抱え込みすぎない","小さく試す"],金:["判断力と整理力","基準を作り質を高める力","品質・分析・技術","約束を重視し感情も言葉にする","数字で管理する","筋を通し曖昧さも許す","厳しくしすぎない"],水:["観察力と柔軟性","状況を読み切り替える力","情報収集・調整・研究","本音を後回しにしない","目的別に配分する","事実と想像を分ける","判断基準を決める"]};
function birthDetail(b){if(b?.status!=="OK_DATE_ONLY")return"";const x=BP[b.element]||BP.土,r=[["本質・性格",x[0]],["才能・強み",x[1]],["仕事",x[2]],["恋愛",x[3]],["金運",x[4]],["人間関係",x[5]],["注意点",x[6]]];return `<section class="birthFortuneDetail"><h4>生年月日から見る7つの傾向</h4><div class="birthMiniGrid"><div><b>日主</b><strong>${esc(b.dayMaster||"確認中")}</strong></div><div><b>中心の五行</b><strong>${esc(b.element||"確認中")}</strong></div></div>${r.map(a=>`<article class="birthRow"><h4>${a[0]}</h4><p>${a[1]}を活かしやすい傾向です。</p></article>`).join("")}<p class="small">出生時刻は不要です。生年月日だけで確定できない節入り境界は推測しません。</p></section>`}
function show(html){const r=$("result");if(!r)return;r.style.display="block";r.innerHTML=html;r.scrollIntoView({behavior:"smooth",block:"start"})}
function setBtn(t,d=false){const b=$("freeFortuneButton");if(b){b.textContent=t;b.disabled=d}}
async function run(){
 setBtn("鑑定処理を開始しました…",true);
 const birth=$("birth")?.value||"",palm=$("palm")?.files?.[0],theme=$("theme")?.value||"総合",q=$("question")?.value||"",family=($("familyName")?.value||"").trim(),given=($("givenName")?.value||"").trim(),fullName=(family&&given)?`${family} ${given}`:(family||given||"");
 if(!family||!given||!birth||!palm){show('<div class="captureError"><h3>入力を確認してください</h3><p>姓・名・生年月日・利き手の手のひら写真を入力してください。</p></div>');setBtn("無料鑑定を試す");return}
 const bd=new Date(birth+"T00:00:00");if(!Number.isFinite(bd.getTime())||bd>new Date()){show('<div class="captureError"><h3>生年月日を確認してください</h3><p>未来の日付は指定できません。</p></div>');setBtn("無料鑑定を試す");return}
 const palmQuality=await window.PalmPublicQuality.quality(palm);window.lastPalmPublicQuality=palmQuality;
 if(palmQuality.status!=="ACCEPT"){const msg=window.PalmGateCopyV1?.message?.(palmQuality.reason)||"写真を確認できませんでした。別の写真を選んでください。";show(`<div class="captureError"><h3>手相写真を確認してください</h3><p>${esc(msg)}</p><p class="small">判定理由: ${esc(palmQuality.reason||"UNKNOWN")}</p></div>`);setBtn("無料鑑定を試す");return}
 const x=window.SPEC195.build({fullName,birth,theme,q}),bp=window.SPEC195.freeBirthSummary(x.birth),publicName=window.SPEC195.freeNameSummary(x.name,fullName),publicPalm=window.SPEC195.freePalmSummary(x.palm,$("dominantHand")?.value||"right"),publicFusion=window.SPEC195.freeFusionSummary(x,theme);
 show(`<section class="safeFreeResult"><h2>${esc(theme)}・無料鑑定</h2><p><b>${esc(family)} ${esc(given)}さん</b>の3つの視点を読み解きます。</p><h3>姓名から見るあなた</h3><p>${publicName}</p>${window.NameFortuneVisualV1?.render?.(x.name,fullName)||""}<h3>生年月日から見るあなた</h3><p>${bp}</p>${birthDetail(x.birth)}<h3>手相から見る現在の傾向</h3><p>${publicPalm}</p><h3>総合メッセージ</h3><p>${publicFusion}</p>${q?`<h3>ご相談テーマ</h3><p>「${esc(q)}」については、上の傾向を土台に選択肢を整理していくことがポイントです。</p>`:""}<p class="small">鑑定は娯楽・自己理解の参考情報です。開発確認 ${BUILD}</p></section>`);
 window.lastSpec195Reading=x;try{sessionStorage.setItem("fortune_reading_v1",JSON.stringify(x));sessionStorage.setItem("fortune_full_name",fullName);sessionStorage.setItem("fortune_birth",birth);sessionStorage.setItem("fortune_theme",theme);sessionStorage.setItem("fortune_question",q)}catch(e){}
 const paid=$("paidCta");if(paid)paid.style.display="block";setBtn("無料鑑定を試す");
}
function boot(){const b=$("freeFortuneButton");if(!b)return;b.replaceWith(b.cloneNode(true));$("freeFortuneButton").addEventListener("click",run);window.freeReadingV4=run}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot()
})();