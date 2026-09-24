const LINE_KEYS=['life','head','heart','fate','sun','wealth','marriage'];
const LINE_SET=new Set(LINE_KEYS);
const PRIMARY_SET=new Set(['life','head','heart','fate']);
const STATES=new Set(['DETECTED','NOT_DETECTED','UNCERTAIN']);
const METRICS=new Set(['lengthRatio','curvature','slope','depth','continuity','breakCount','branchCount']);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const validList=x=>Array.isArray(x)&&x.length===new Set(x).size&&x.every(k=>LINE_SET.has(k));
function validGeometry(g){
 if(!g||typeof g!=='object'||Array.isArray(g))return false;
 const keys=Object.keys(g);if(keys.length>LINE_KEYS.length||keys.some(k=>!LINE_SET.has(k)))return false;
 for(const k of keys){
  const line=g[k];if(!line||typeof line!=='object'||Array.isArray(line))return false;
  if(Object.keys(line).some(x=>!['state','confidence','features'].includes(x)))return false;
  if(!STATES.has(line.state)||!finite(line.confidence)||line.confidence<0||line.confidence>1)return false;
  const f=line.features;if(!f||typeof f!=='object'||Array.isArray(f))return false;
  const fkeys=Object.keys(f);if(fkeys.length>METRICS.size||fkeys.some(x=>!METRICS.has(x)))return false;
  for(const [name,value] of Object.entries(f)){
   if(!finite(value))return false;
   if((name==='depth'||name==='continuity')&&(value<0||value>1))return false;
   if(name==='breakCount'&&(!Number.isInteger(value)||value<0||value>20))return false;
   if(name==='branchCount'&&(!Number.isInteger(value)||value<0||value>30))return false;
  }
 }
 return true;
}
export function validatePalmHistoryEvidence(ev){
 if(!ev||typeof ev!=='object'||Array.isArray(ev))return {ok:false,error:'missing_history_evidence'};
 if(!['palm-history-evidence-v1','palm-history-evidence-v2'].includes(ev.schema))return {ok:false,error:'unsupported_history_evidence'};
 if(ev.repeatStable!==true||!validList(ev.confirmedLines)||!validList(ev.pendingLines)||!validList(ev.primaryConfirmed)||!validList(ev.primaryPending)||ev.primaryConfirmed.length<2||ev.primaryConfirmed.some(k=>!PRIMARY_SET.has(k)||!ev.confirmedLines.includes(k))||ev.primaryPending.some(k=>!PRIMARY_SET.has(k)||!ev.pendingLines.includes(k))||ev.confirmedLines.some(k=>ev.pendingLines.includes(k)))return {ok:false,error:'unstable_history_evidence'};
 if(ev.schema==='palm-history-evidence-v2'&&!validGeometry(ev.lineGeometry))return {ok:false,error:'invalid_history_geometry'};
 return {ok:true};
}
