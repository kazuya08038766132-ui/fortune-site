(() => {
"use strict";
const BUILD="SPEC195-BUILD-33";
function renderPremiumPreview(){
 const host=document.getElementById("premiumDevPreview"); if(!host)return;
 const r=window.lastSpec195Reading;
 if(!r){host.innerHTML="<p>先に無料鑑定を実行してください。</p>";return}
 host.innerHTML=`<div class="premiumPreviewHead"><h2>¥980 詳細鑑定・11章プレビュー</h2><p>開発確認用。実購入解除とは別です。</p></div>${window.SPEC195.premiumHtml(r)}`;
 host.scrollIntoView({behavior:"smooth",block:"start"});
}
function boot(){
 const dev=document.querySelector("#devDashboard");
 if(dev&&!document.getElementById("premiumPreviewButton")){
  const b=document.createElement("button");b.id="premiumPreviewButton";b.type="button";b.textContent="¥980・11章を開発プレビュー";b.addEventListener("click",renderPremiumPreview);dev.appendChild(b)
 }
 if(!document.getElementById("premiumDevPreview")){
  const x=document.createElement("section");x.id="premiumDevPreview";x.className="devOnly premiumDevPreview";x.style.display="none";document.body.appendChild(x)
 }
 document.getElementById("premiumPreviewButton")?.addEventListener("click",()=>{document.getElementById("premiumDevPreview").style.display="block"})
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();