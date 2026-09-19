(() => {
"use strict";
const BUILD="SPEC195-BUILD-32",$=id=>document.getElementById(id);
const esc=v=>window.SPEC195?.safeText(v)??String(v??"");
function show(html){const r=$("result");if(!r)return;r.style.display="block";r.innerHTML=html;r.scrollIntoView({behavior:"smooth",block:"start"})}
function setBtn(t,d=false){const b=$("freeFortuneButton");if(b){b.textContent=t;b.disabled=d}}
async function run(){
 setBtn("鑑定処理を開始しました…",true);
 const birth=$("birth")?.value||"", palm=$("palm")?.files?.[0], theme=$("theme")?.value||"総合",q=$("question")?.value||"";
 const fullName=($("fullName")?.value||$("name")?.value||"").trim();
 if(!birth||!palm){show('<div class="captureError"><h3>入力を確認してください</h3><p>生年月日と利き手の手のひら写真が必要です。</p></div>');setBtn("無料鑑定を試す");return}
 try{if(typeof palmUseConsent!=="undefined"&&!palmUseConsent){if(typeof showPalmConsent==="function")showPalmConsent($("palm"));show('<div class="notice"><b>写真利用の同意を確認してください。</b></div>');setBtn("無料鑑定を試す");return}}catch(e){}
 const palmQuality=await window.PalmPublicQuality.quality(palm);
 if(palmQuality.status!=="ACCEPT"){
   const msg={TOO_SMALL:"写真が小さすぎます。手のひら全体が写る写真を選んでください。",EXTREME_DARKNESS:"写真が暗すぎます。少し明るい場所で撮り直してください。",EXTREME_OVEREXPOSURE:"写真が明るすぎます。白飛びしない場所で撮り直してください。",VERY_LOW_CONTRAST:"手のひらが判別しにくい写真です。少し条件を変えて撮り直してください。"}[palmQuality.reason]||"写真を読み取れませんでした。別の写真を選んでください。";
   show(`<div class="captureError"><h3>手相写真を確認してください</h3><p>${msg}</p></div>`);setBtn("無料鑑定を試す");return;
 }
 window.lastPalmPublicQuality=palmQuality;
 const x=window.SPEC195.build({fullName,birth,theme,q});
 const bp=window.SPEC195.freeBirthSummary(x.birth);
 show(`<section class="safeFreeResult"><h2>${esc(theme)}・無料鑑定</h2>
 <h3>姓名</h3><p>${esc(x.name.message)}</p>
 <h3>生年月日</h3><p>${bp}</p>
 <h3>手相</h3><p>${esc(x.palm.message)}</p>
 <h3>三占術統合</h3><p>${esc(x.fusion.message)} <small>状態：${x.fusion.status}</small></p>
 ${q?`<h3>ご相談</h3><p>${esc(q)}</p>`:""}
 <p class="small">開発確認用 ${BUILD} / SPEC195 Engine ${esc(x.version)}</p></section>`);
 window.lastSpec195Reading=x;
 try{sessionStorage.setItem("fortune_reading_v1",JSON.stringify(x));sessionStorage.setItem("fortune_full_name",fullName);sessionStorage.setItem("fortune_birth",birth);sessionStorage.setItem("fortune_theme",theme);sessionStorage.setItem("fortune_question",q)}catch(e){}
 const paid=$("paidCta");if(paid)paid.style.display="block";
 setBtn("無料鑑定を試す");
}
function boot(){const b=$("freeFortuneButton");if(!b)return;b.replaceWith(b.cloneNode(true));const n=$("freeFortuneButton");n.addEventListener("click",run);window.freeReadingV4=run}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot()
})();