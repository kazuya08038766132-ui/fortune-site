(() => {"use strict";
function fuse(items){
 const valid=(items||[]).filter(x=>x&&x.feature&&x.source&&Number.isFinite(x.confidence));
 if(!valid.length)return {status:"INSUFFICIENT",features:[]};
 const g={};for(const x of valid)(g[x.feature]??=[]).push(x);
 const features=Object.entries(g).map(([feature,a])=>{
  const sources=[...new Set(a.map(x=>x.source))],pos=a.filter(x=>x.polarity!=="negative"),neg=a.filter(x=>x.polarity==="negative");
  const conflict=pos.length&&neg.length;
  return {feature,sources,agreement_count:sources.length,confidence:Math.min(...a.map(x=>x.confidence)),
   status:conflict?"MIXED":sources.length>=3?"STRONG":sources.length===2?"PARTIAL":"INSUFFICIENT",
   conflicts:conflict?a.map(x=>({source:x.source,polarity:x.polarity||"positive"})):[],evidence_ids:a.map(x=>x.evidence_id).filter(Boolean)};
 });
 const ss=features.map(x=>x.status),status=ss.includes("MIXED")?"MIXED":ss.includes("STRONG")?"STRONG":ss.includes("PARTIAL")?"PARTIAL":"INSUFFICIENT";
 return {status,features};
}
window.FusionMatrixV1={version:"FUSION_RULE_MATRIX_V1",fuse};
})();