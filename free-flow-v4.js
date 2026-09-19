(() => {
"use strict";
const BUILD="SPEC195-BUILD-35",$=id=>document.getElementById(id);
const esc=v=>window.SPEC195?.safeText(v)??String(v??"");
function show(html){const r=$("result");if(!r)return;r.style.display="block";r.innerHTML=html;r.scrollIntoView({behavior:"smooth",block:"start"})}
function setBtn(t,d=false){const b=$("freeFortuneButton");if(b){b.textContent=t;b.disabled=d}}
async function run(){
 setBtn("鑑定処理を開始しました…",true);
 const birth=$("birth")?.value||"", palm=$("palm")?.files?.[0], theme=$("theme")?.value||"総合",q=$("question")?.value||"";
 const family=($("familyName")?.value||"").trim(), given=($("givenName")?.value||"").trim();
 const fullName=(family&&given)?`${family} ${given}`:(family||given||$("fullName")?.value||$("name")?.value||"").trim();
 if(!family||!given||!birth||!palm){show('<div class="captureError"><h3>入力を確認してください</h3><p>姓・名・生年月日・利き手の手のひら写真を入力してください。</p></div>');setBtn("無料鑑定を試す");return}
 const bd=new Date(birth+"T00:00:00"); if(!Number.isFinite(bd.getTime())||bd>new Date()){show('<div class="captureError"><h3>生年月日を確認してください</h3><p>未来の日付は生年月日に指定できません。</p></div>');setBtn("無料鑑定を試す");return}
 try{if(typeof palmUseConsent!=="undefined"&&!palmUseConsent){if(typeof showPalmConsent==="function")showPalmConsent($("palm"));show('<div class="notice"><b>写真利用の同意を確認してください。</b></div>');setBtn("無料鑑定を試す");return}}catch(e){}
 const palmQuality=await window.PalmPublicQuality.quality(palm);
 if(palmQuality.status!=="ACCEPT"){
   const msg={TOO_SMALL:"写真が小さすぎます。手のひら全体が写る写真を選んでください。",EXTREME_DARKNESS:"写真が暗すぎます。少し明るい場所で撮り直してください。",EXTREME_OVEREXPOSURE:"写真が明るすぎます。白飛びしない場所で撮り直してください。",VERY_LOW_CONTRAST:"手のひらが判別しにくい写真です。少し条件を変えて撮り直してください。"}[palmQuality.reason]||"写真を読み取れませんでした。別の写真を選んでください。";
   show(`<div class="captureError"><h3>手相写真を確認してください</h3><p>${msg}</p></div>`);setBtn("無料鑑定を試す");return;
 }
 window.lastPalmPublicQuality=palmQuality;
 const x=window.SPEC195.build({fullName,birth,theme,q});
 const bp=window.SPEC195.freeBirthSummary(x.birth);
 const publicName=window.SPEC195.freeNameSummary(x.name,fullName);
 const publicPalm=window.SPEC195.freePalmSummary(x.palm,$("dominantHand")?.value||"right");
 const publicFusion=window.SPEC195.freeFusionSummary(x,theme);
 show(`<section class="safeFreeResult"><h2>${esc(theme)}・無料鑑定</h2>
 <p><b>${esc(family)} ${esc(given)}さん</b>の3つの視点を、確認できた情報から順に読み解きます。</p>
 <h3>姓名から見るあなた</h3><p>${publicName}</p>${window.NameFortuneVisualV1?.render?.(x.name,fullName)||""}
 <h3>生年月日から見るあなた</h3><p>${bp}</p>
 <h3>手相から見る現在の傾向</h3><p>${publicPalm}</p>
 <h3>総合メッセージ</h3><p>${publicFusion}</p>
 ${q?`<h3>ご相談テーマ</h3><p>「${esc(q)}」については、上の傾向を土台に、焦らず選択肢を整理していくことがポイントです。詳細鑑定では仕事・金運・人間関係などの章に分けて深掘りします。</p>`:""}
 <p class="small">鑑定は娯楽・自己理解の参考情報です。開発確認 ${BUILD}</p></section>`);
 window.lastSpec195Reading=x;
 try{sessionStorage.setItem("fortune_reading_v1",JSON.stringify(x));sessionStorage.setItem("fortune_full_name",fullName);sessionStorage.setItem("fortune_birth",birth);sessionStorage.setItem("fortune_theme",theme);sessionStorage.setItem("fortune_question",q)}catch(e){}
 const paid=$("paidCta");if(paid)paid.style.display="block";
 setBtn("無料鑑定を試す");
}
function boot(){const b=$("freeFortuneButton");if(!b)return;b.replaceWith(b.cloneNode(true));const n=$("freeFortuneButton");n.addEventListener("click",run);window.freeReadingV4=run}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot()
})();