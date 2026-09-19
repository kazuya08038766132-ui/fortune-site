(() => {
"use strict";
const BUILD="SPEC195-BUILD-36",$=id=>document.getElementById(id);
const esc=v=>window.SPEC195?.safeText(v)??String(v??"");
function show(html){const r=$("result");if(!r)return;r.style.display="block";r.innerHTML=html;r.scrollIntoView({behavior:"smooth",block:"start"})}
function setBtn(t,d=false){const b=$("freeFortuneButton");if(b){b.textContent=t;b.disabled=d}}
async function run(){
 setBtn("鑑定処理を開始しました…",true);
 const birth=$("birth")?.value||"",palm=$("palm")?.files?.[0],theme=$("theme")?.value||"総合",q=$("question")?.value||"";
 const family=($("familyName")?.value||"").trim(),given=($("givenName")?.value||"").trim(),fullName=(family&&given)?`${family} ${given}`:(family||given||"");
 if(!family||!given||!birth||!palm){show('<div class="captureError"><h3>入力を確認してください</h3><p>姓・名・生年月日・利き手の手のひら写真を入力してください。</p></div>');setBtn("無料鑑定を試す");return}
 const bd=new Date(birth+"T00:00:00");if(!Number.isFinite(bd.getTime())||bd>new Date()){show('<div class="captureError"><h3>生年月日を確認してください</h3><p>未来の日付は指定できません。</p></div>');setBtn("無料鑑定を試す");return}
 const palmQuality=await window.PalmPublicQuality.quality(palm);if(palmQuality.status!=="ACCEPT"){show('<div class="captureError"><h3>手相写真を確認してください</h3><p>写真を読み取れませんでした。手のひら全体が見える写真を選んでください。</p></div>');setBtn("無料鑑定を試す");return}
 const x=window.SPEC195.build({fullName,birth,theme,q}),bp=window.SPEC195.freeBirthSummary(x.birth),bdh=window.BirthFreeDetailV1?.render?.(x.birth)||"",publicName=window.SPEC195.freeNameSummary(x.name,fullName),publicPalm=window.SPEC195.freePalmSummary(x.palm,$("dominantHand")?.value||"right"),publicFusion=window.SPEC195.freeFusionSummary(x,theme);
 show(`<section class="safeFreeResult"><h2>${esc(theme)}・無料鑑定</h2><p><b>${esc(family)} ${esc(given)}さん</b>の3つの視点を読み解きます。</p><h3>姓名から見るあなた</h3><p>${publicName}</p>${window.NameFortuneVisualV1?.render?.(x.name,fullName)||""}<h3>生年月日から見るあなた</h3><p>${bp}</p>${bdh}<h3>手相から見る現在の傾向</h3><p>${publicPalm}</p><h3>総合メッセージ</h3><p>${publicFusion}</p>${q?`<h3>ご相談テーマ</h3><p>「${esc(q)}」については、上の傾向を土台に選択肢を整理していくことがポイントです。</p>`:""}<p class="small">鑑定は娯楽・自己理解の参考情報です。開発確認 ${BUILD}</p></section>`);
 window.lastSpec195Reading=x;try{sessionStorage.setItem("fortune_reading_v1",JSON.stringify(x));sessionStorage.setItem("fortune_full_name",fullName);sessionStorage.setItem("fortune_birth",birth);sessionStorage.setItem("fortune_theme",theme);sessionStorage.setItem("fortune_question",q)}catch(e){}
 const paid=$("paidCta");if(paid)paid.style.display="block";setBtn("無料鑑定を試す");
}
function boot(){const b=$("freeFortuneButton");if(!b)return;b.replaceWith(b.cloneNode(true));$("freeFortuneButton").addEventListener("click",run);window.freeReadingV4=run}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot()
})();