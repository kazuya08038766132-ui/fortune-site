import {validatePalmHistoryEvidence} from './palm-history-evidence-validator-build40.js';
import {verifyStoredPalmReadingHash} from './palm-reading-canonical-hash-build40.js';

const VERSION_RE=/^palm-reading-v\d+$/;
const SHA256_RE=/^[a-f0-9]{64}$/i;
const finite01=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1;

function validTags(tags){
  return Array.isArray(tags)&&tags.length<=32&&tags.every(x=>typeof x==='string'&&x.length>0&&x.length<=80);
}

export function validatePalmReadingEnvelope(reading,{storedVersion=null,storedSha256=null,storedHashVersion=null,requireHistoryEvidence=true}={}){
  if(!reading||typeof reading!=='object'||Array.isArray(reading))return {ok:false,error:'invalid_reading_object'};
  let raw;
  try{raw=JSON.stringify(reading);}catch{return {ok:false,error:'invalid_reading_serialization'};}
  if(Buffer.byteLength(raw,'utf8')>256*1024)return {ok:false,error:'reading_too_large'};
  const version=String(reading.version||'');
  if(!VERSION_RE.test(version))return {ok:false,error:'unsupported_reading_version'};
  if(storedVersion!==null&&String(storedVersion)!==version)return {ok:false,error:'reading_version_mismatch'};
  if(storedSha256!==null&&storedSha256!==undefined&&storedSha256!==''){
    if(!SHA256_RE.test(String(storedSha256)))return {ok:false,error:'invalid_reading_sha256'};
    const hashCheck=verifyStoredPalmReadingHash(reading,{storedSha256,hashVersion:storedHashVersion});
    if(!hashCheck.ok)return {ok:false,error:hashCheck.error,hashCheck};
  }
  if(!finite01(reading.confidence))return {ok:false,error:'invalid_reading_confidence'};
  if(reading.semanticConfidence!==undefined&&!finite01(reading.semanticConfidence))return {ok:false,error:'invalid_semantic_confidence'};
  if(reading.evidenceQuality!==undefined&&!finite01(reading.evidenceQuality))return {ok:false,error:'invalid_evidence_quality'};
  if(!validTags(reading.tags))return {ok:false,error:'invalid_reading_tags'};
  if(requireHistoryEvidence){
    const ev=validatePalmHistoryEvidence(reading.historyEvidence);
    if(!ev.ok)return {ok:false,error:ev.error==='invalid_history_geometry'?'invalid_history_geometry':'invalid_history_evidence',historyEvidence:ev};
  }
  return {ok:true,version};
}
