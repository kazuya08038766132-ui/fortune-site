(() => {
"use strict";
const BUILD="FREE-FLOW-04";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function status(msg){ const e=$("palmDevStatus"); if(e)e.textContent=msg; }
function facts(p){
  const e=$("palmDevFacts"); if(!e)return;
  if(!p){e.innerHTML="";return;}
  const hand=p?.image?.hand?.resolved || p?.handedness || "確認中";
  const quality=p?.qualityGate?.status || "確認中";
  const lm=p?.landmarks?.length ?? p?.image?.hand?.landmarks?.length ?? "確認中";
  const life=p?.life?.confidence ?? p?.life?.score;
  const head=p?.head?.confidence ?? p?.head?.score;
  const heart=p?.heart?.confidence ?? p?.heart?.score;
  const pct=v=>Number.isFinite(Number(v))?Math.round(Number(v)*100)+"%":"未確定";
  e.innerHTML=`<b>開発解析結果</b><br>
  手：${esc(hand)} / 品質ゲート：${esc(quality)} / ランドマーク：${esc(lm)}<br>
  生命線 ${pct(life)}・知能線 ${pct(head)}・感情線 ${pct(heart)}<br>
  <small>低信頼・未検出は断定しません。NOT_DETECTED と FEATURE_ABSENT は別扱いです。</small>`;
}
async function loadOrtOptional(){
  if(window.ort)return true;
  return new Promise(resolve=>{
    const old=document.querySelector('script[data-dev-ort="1"]');
    if(old){old.addEventListener("load",()=>resolve(true),{once:true});old.addEventListener("error",()=>resolve(false),{once:true});return;}
    const x=document.createElement("script");
    x.src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js";
    x.async=true;x.dataset.devOrt="1";
    x.onload=()=>resolve(true);x.onerror=()=>resolve(false);
    document.head.appendChild(x);
    setTimeout(()=>resolve(!!window.ort),8000);
  });
}
async function run(){
  const btn=$("runPalmDevPreview"), file=$("palm")?.files?.[0];
  if(!file){status("手のひら写真を選択してください。");return;}
  if(typeof palmFeatures!=="function"){
    status("旧Palm解析器を読み込めません。無料鑑定側には影響ありません。");
    return;
  }
  btn.disabled=true; status("開発解析を実行中…（利用者向け無料鑑定とは別処理）"); facts(null);
  try{
    // ONNX is optional and loaded only in developer analysis.
    await loadOrtOptional();
    const hand=$("handSide")?.value||"auto";
    const cal=$("calibrationMode")?.value||"auto";
    const p=await palmFeatures(file,hand,cal);
    window.lastPalmAnalysis=p;
    const preview=$("analysisPreview");
    if(preview){preview.style.display="block";preview.scrollIntoView({behavior:"smooth",block:"center"});}
    facts(p);
    status("開発解析完了。画像上のROI・ランドマーク・線候補を確認してください。");
  }catch(err){
    console.error(BUILD,err);
    status("開発解析でエラー：" + String(err?.message||err) + "（無料鑑定側は分離されているため影響しません）");
  }finally{btn.disabled=false;}
}
function boot(){
  $("runPalmDevPreview")?.addEventListener("click",run);
  console.info(BUILD,"dev palm preview ready");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();