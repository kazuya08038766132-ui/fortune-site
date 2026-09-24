const PRIMARY=['life','head','heart','fate'];
const SECONDARY=['sun','wealth','marriage'];
const ALL=[...PRIMARY,...SECONDARY];
const METRICS=['lengthRatio','curvature','slope','depth','continuity','breakCount','branchCount'];
function geometryEvidence(feature={}){const out={};for(const k of ALL){const l=feature?.lines?.[k];if(!l)continue;const f={};for(const m of METRICS){const n=Number(l?.features?.[m]);if(Number.isFinite(n))f[m]=n;}out[k]={state:String(l.state||'UNCERTAIN'),confidence:Number(l?.stability?.effectiveConfidence??l?.confidence??0),features:f};}return out;}
export function palmHistoryLineState(feature={}){
 const gate=feature?.stabilityGate||{};
 const usable=new Set(Array.isArray(gate.usableLines)?gate.usableLines:[]);
 const suppressed=new Set(Array.isArray(gate.suppressedLines)?gate.suppressedLines:[]);
 const detected=new Set(Object.entries(feature?.lines||{}).filter(([,v])=>v?.state==='DETECTED').map(([k])=>k));
 const confirmed=ALL.filter(k=>detected.has(k)&&usable.has(k));
 const pending=ALL.filter(k=>detected.has(k)&&suppressed.has(k));
 return {confirmed,pending,primaryConfirmed:confirmed.filter(k=>PRIMARY.includes(k)),primaryPending:pending.filter(k=>PRIMARY.includes(k))};
}
export function buildPalmHistorySnapshot({reading,feature,stability,selfStabilityMethod}={}){
 if(!reading||typeof reading!=='object'||Array.isArray(reading))throw new Error('READING_REQUIRED');
 const lineState=palmHistoryLineState(feature);
 return {...reading,historyEvidence:{schema:'palm-history-evidence-v2',method:String(selfStabilityMethod||'single-image-micro-perturbation-v1'),repeatStable:stability?.stable===true,confirmedLines:lineState.confirmed,pendingLines:lineState.pending,primaryConfirmed:lineState.primaryConfirmed,primaryPending:lineState.primaryPending,lineGeometry:geometryEvidence(feature)}};
}
