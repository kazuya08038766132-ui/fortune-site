(() => {
"use strict";const BUILD="FREE-FLOW-04",$=id=>document.getElementById(id);
function status(msg){const e=$("palmDevStatus");if(e)e.textContent=msg}
async function loadOrtOptional(){if(window.ort)return true;return new Promise(resolve=>{const x=document.createElement("script");x.src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js";x.async=true;x.onload=()=>resolve(true);x.onerror=()=>resolve(false);document.head.appendChild(x);setTimeout(()=>resolve(!!window.ort),8000)})}
async function run(){const btn=$("runPalmDevPreview"),file=$("palm")?.files?.[0];if(!file){status("手のひら写真を選択してください。");return}if(typeof palmFeatures!=="function"){status("Palm解析器を読み込めません。無料鑑定側には影響ありません。");return}btn.disabled=true;status("開発解析を実行中…");try{await loadOrtOptional();const p=await palmFeatures(file,$("handSide")?.value||"auto",$("calibrationMode")?.value||"auto");window.lastPalmAnalysis=p;const preview=$("analysisPreview");if(preview){preview.style.display="block";preview.scrollIntoView({behavior:"smooth",block:"center"})}status("開発解析完了。ROI・ランドマーク・線候補を確認してください。")}catch(e){console.error(BUILD,e);status("開発解析エラー（無料鑑定側には影響しません）")}finally{btn.disabled=false}}
function boot(){$("runPalmDevPreview")?.addEventListener("click",run)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot()
})();