(() => {
"use strict";
const GATES=[
 ["FREE_FLOW","PASS","無料鑑定の単一実行経路"],
 ["NAME_81_SANSAI_RULE","PASS","81分類・三才125ルール基盤"],
 ["NAME_STROKE_MASTER","BLOCKED","漢字画数Masterの出典・全対象文字検証が必要"],
 ["BIRTH_3PILLAR","PASS_PROTO","出生時刻不要の年/月/日開発版"],
 ["BIRTH_MASTER","BLOCKED","節入り等の境界Golden QAが必要"],
 ["PALM_QUALITY_GATE","PASS","公開写真品質ゲートV2"],
 ["PALM_DEV","PASS_DEV","開発解析UI"],
 ["PALM_PRODUCTION_MODEL","BLOCKED","商用権利監査済み学習モデル・Golden QAが必要"],
 ["PREMIUM_11_CHAPTER","PASS","11章Generator/Renderer"],
 ["TIME_PROFILE","PASS_BASE","¥490時間運基盤"],
 ["STRIPE_E2E","EXTERNAL_VERIFY","実決済・Webhook・再試行・解約を実環境確認"],
 ["PRIVACY_RETENTION_CONTRACT","PASS_BASE","学習初期OFF・保持方針"],
 ["R2_RESEND","EXTERNAL_VERIFY","実ストレージ/メール環境未接続"],
 ["DEV_MODE_PRODUCTION_OFF","REQUIRED","公開時に開発者UIを無効化"]
];
window.SPEC195_GATES=GATES;
function boot(){
 const d=document.getElementById("devDashboard");if(!d||document.getElementById("spec195GateBox"))return;
 const x=document.createElement("div");x.id="spec195GateBox";x.className="devStat";x.innerHTML="<b>SPEC195 Completion Gate</b>"+GATES.map(g=>`<div>${g[0]}：${g[1]}</div>`).join("");d.appendChild(x)
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot()
})();