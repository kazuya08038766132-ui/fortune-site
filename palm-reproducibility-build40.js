const clamp01=n=>Math.max(0,Math.min(1,Number(n)||0));
const PRIMARY=['life','head','heart'];
const numeric=(v)=>{if(v===null||v===undefined||typeof v==='boolean'||(typeof v==='string'&&!v.trim()))return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const featureDelta=(a,b,key,scale=1)=>{const x=numeric(a?.features?.[key]),y=numeric(b?.features?.[key]);return x===null||y===null?null:Math.min(1,Math.abs(x-y)/scale)};
export function compareRepeatPalmLines(a,b,{maxGeometryDelta=.22,maxCountDelta=1,minConfidence=.72}={}){
 maxGeometryDelta=Number(maxGeometryDelta); maxCountDelta=Number(maxCountDelta); minConfidence=Number(minConfidence);
 if(!Number.isFinite(maxGeometryDelta)||maxGeometryDelta<0||maxGeometryDelta>1||!Number.isSafeInteger(maxCountDelta)||maxCountDelta<0||!Number.isFinite(minConfidence)||minConfidence<0||minConfidence>1)return {stable:false,primary:[],lines:{},reason:'INVALID_LINE_REPRODUCIBILITY_POLICY'};
 const names=[...new Set([...Object.keys(a?.lines||{}),...Object.keys(b?.lines||{})])],lines={};
 for(const name of names){const A=a?.lines?.[name],B=b?.lines?.[name];if(!A||!B)continue;
  const ca=clamp01(A?.stability?.effectiveConfidence??A?.confidence),cb=clamp01(B?.stability?.effectiveConfidence??B?.confidence);
  const sameState=A.state===B.state||['UNCERTAIN','NOT_DETECTED'].includes(A.state)&&['UNCERTAIN','NOT_DETECTED'].includes(B.state);
  const deltas=['lengthRatio','curvature','slope','depth','continuity'].map(k=>featureDelta(A,B,k,k==='slope'?2:1)).filter(Number.isFinite);
  const geometryEvidenceCount=deltas.length;
  const geometryDelta=deltas.length?deltas.reduce((x,y)=>x+y,0)/deltas.length:null;
  const maxFeatureDelta=deltas.length?Math.max(...deltas):null;
  const breakA=numeric(A?.features?.breakCount),breakB=numeric(B?.features?.breakCount),branchA=numeric(A?.features?.branchCount),branchB=numeric(B?.features?.branchCount);
  const breakDelta=breakA===null||breakB===null?null:Math.abs(breakA-breakB);
  const branchDelta=branchA===null||branchB===null?null:Math.abs(branchA-branchB);
  const countEvidenceCount=(breakDelta===null?0:1)+(branchDelta===null?0:1);
  const hasGeometryEvidence=geometryEvidenceCount>0;
  const stable=hasGeometryEvidence&&Math.min(ca,cb)>=minConfidence&&sameState&&geometryDelta<=maxGeometryDelta&&maxFeatureDelta<=Math.max(.35,maxGeometryDelta)&&(breakDelta===null||breakDelta<=maxCountDelta)&&(branchDelta===null||branchDelta<=maxCountDelta);
  lines[name]={stable,confidenceFloor:Number(Math.min(ca,cb).toFixed(3)),sameState,geometryEvidenceCount,countEvidenceCount,geometryDelta:geometryDelta===null?null:Number(geometryDelta.toFixed(3)),maxFeatureDelta:maxFeatureDelta===null?null:Number(maxFeatureDelta.toFixed(3)),breakDelta,branchDelta,reason:hasGeometryEvidence?null:'NO_LINE_GEOMETRY_EVIDENCE'};
 }
 const primary=PRIMARY.filter(k=>lines[k]);
 return {stable:primary.length===PRIMARY.length&&primary.every(k=>lines[k].stable),primary,lines};
}
export function compareRepeatPalmReadings(a,b,{minConfidence=.72,minAgreement=.6}={}){
 minConfidence=Number(minConfidence); minAgreement=Number(minAgreement);
 if(!Number.isFinite(minConfidence)||minConfidence<0||minConfidence>1||!Number.isFinite(minAgreement)||minAgreement<0||minAgreement>1)return {reproducible:false,agreement:0,stableTags:[],confidenceFloor:0,lineComparison:null,retakeRequired:true,reason:'INVALID_REPRODUCIBILITY_POLICY'};
 const tags=r=>new Set(Array.isArray(r?.tags)?r.tags:[]), conf=r=>Math.min(clamp01(r?.confidence),clamp01(r?.semanticConfidence??1),clamp01(r?.evidenceQuality??1));
 const A=tags(a),B=tags(b),stable=[...A].filter(x=>B.has(x)),union=new Set([...A,...B]);
 const agreement=stable.length/Math.max(1,union.size), ca=conf(a),cb=conf(b);
 const contradictory=[...A].filter(x=>String(x).startsWith('!')&&B.has(String(x).slice(1))).length+[...B].filter(x=>String(x).startsWith('!')&&A.has(String(x).slice(1))).length;
 const lineComparison=(a?.feature&&b?.feature)?compareRepeatPalmLines(a.feature,b.feature,{minConfidence}):null;
 const hasComparableEvidence=union.size>0||Boolean(lineComparison);
 const reproducible=hasComparableEvidence&&Math.min(ca,cb)>=minConfidence&&agreement>=minAgreement&&contradictory===0&&(lineComparison?.stable!==false);
 return {reproducible,agreement:Number(agreement.toFixed(3)),stableTags:stable,confidenceFloor:Math.min(ca,cb),lineComparison,retakeRequired:!reproducible,reason:reproducible?null:(!hasComparableEvidence?'NO_COMPARABLE_EVIDENCE':Math.min(ca,cb)<minConfidence?'LOW_CONFIDENCE':contradictory?'CONTRADICTORY_READING':lineComparison?.stable===false?'LINE_GEOMETRY_VARIANCE':'CAPTURE_VARIANCE')};
}
export function repeatCaptureGate(readings,{required=3,minPairAgreement=.6,maxCaptures=8}={}){
 required=Number(required); maxCaptures=Number(maxCaptures); minPairAgreement=Number(minPairAgreement);
 // Reproducibility is comparative: a single capture cannot establish repeatability.
 // Malformed or out-of-range policy values fail closed instead of weakening this gate.
 if(!Number.isSafeInteger(required)||required<2||!Number.isSafeInteger(maxCaptures)||maxCaptures<required||!Number.isFinite(minPairAgreement)||minPairAgreement<0||minPairAgreement>1)return {pass:false,reason:'INVALID_REPEAT_CAPTURE_POLICY',required,maxCaptures,minPairAgreement};
 if(!Array.isArray(readings)||readings.length<required)return {pass:false,reason:'INSUFFICIENT_REPEAT_CAPTURES',captureCount:Array.isArray(readings)?readings.length:0,required,maxCaptures};
 // Pairwise comparison is O(n²); cap supplied evidence to keep this gate deterministic and bounded.
 if(readings.length>maxCaptures)return {pass:false,reason:'TOO_MANY_REPEAT_CAPTURES',captureCount:readings.length,required,maxCaptures};
 // Every supplied capture is evidence. Never ignore malformed/null/sparse evidence merely
 // because enough other captures remain to satisfy the minimum count.
 const invalidCaptureIndexes=[];
 for(let i=0;i<readings.length;i++){
  if(!Object.prototype.hasOwnProperty.call(readings,i)||!readings[i]||typeof readings[i]!=='object'||Array.isArray(readings[i])) invalidCaptureIndexes.push(i);
 }
 if(invalidCaptureIndexes.length)return {pass:false,reason:'INVALID_REPEAT_CAPTURE_EVIDENCE',captureCount:readings.length,required,maxCaptures,invalidCaptureIndexes};
 const r=readings,pairs=[];
 for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++)pairs.push({a:i,b:j,...compareRepeatPalmReadings(r[i],r[j],{minAgreement:minPairAgreement})});
 const failedPairs=pairs.filter(x=>!x.reproducible);
 return {pass:failedPairs.length===0,pairs,failedPairs,captureCount:r.length,required,reason:failedPairs.length? 'REPRODUCIBILITY_FAILED':null};
}

export function comparePalmHistorySnapshots(current,previous,options={}){
 const toReading=x=>{const ev=x?.historyEvidence||{};const geometry=ev?.lineGeometry;return {...x,feature:geometry&&typeof geometry==='object'?{lines:geometry}:undefined};};
 return compareRepeatPalmReadings(toReading(current),toReading(previous),options);
}
