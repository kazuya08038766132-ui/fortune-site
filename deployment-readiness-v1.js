(() => {"use strict";
async function check(){
 try{const r=await fetch("/api/readiness",{credentials:"same-origin"});const j=await r.json();return {http:r.status,ok:r.ok,data:j}}
 catch(e){return {http:0,ok:false,error:String(e.message||e)}}
}
async function render(){
 if(!window.FORTUNE_CONFIG?.devMode)return;
 const box=document.createElement("section");box.id="devReadiness";box.style.cssText="position:fixed;left:10px;bottom:10px;z-index:9998;max-width:360px;background:#100b25;color:#fff;border:1px solid #d8b35a;border-radius:12px;padding:10px;font:12px system-ui";
 box.textContent="本番接続状態を確認中…";document.body.appendChild(box);const x=await check();
 box.textContent=x.ok?`本番接続Gate: ${x.data?.ready?"READY":"未完了"} / DB:${x.data?.checks?.database?"OK":"NG"} Stripe:${(x.data?.checks?.stripeConfigured??x.data?.checks?.stripeSecret)?"OK":"NG"} Webhook:${(x.data?.checks?.webhookConfigured??x.data?.checks?.stripeWebhookSecret)?"OK":"NG"} R2:${x.data?.checks?.r2Configured?"OK":"NG"}`:`本番接続Gate: API確認失敗 (${x.http})`;
}
window.DeploymentReadinessV1={version:"DEPLOYMENT_READINESS_V1",check};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});else render();
})();