import crypto from 'crypto';
import {canonicalPalmReadingJson} from './palm-reading-canonical-hash-build40.js';

export const PALM_HISTORY_RECORD_HASH_VERSION='palm-history-record-v1';
export const PALM_HISTORY_RECORD_LEGACY_VERSION='legacy-record-v1';
const SHA256_RE=/^[a-f0-9]{64}$/i;

export function palmHistoryRecordBindingPayload({assetId,subjectKey,readingVersion,readingSha256,readingHashVersion,historyEvidence}={}){
  const id=Number(assetId);
  if(!Number.isSafeInteger(id)||id<=0)throw new Error('invalid_asset_id');
  const subject=String(subjectKey||'');
  if(!subject||subject.length>256)throw new Error('invalid_subject_key');
  const version=String(readingVersion||'');
  const readingHash=String(readingSha256||'').toLowerCase();
  const readingHashVersionValue=String(readingHashVersion||'');
  if(!version||!SHA256_RE.test(readingHash)||!readingHashVersionValue)throw new Error('invalid_record_binding_metadata');
  if(!historyEvidence||typeof historyEvidence!=='object'||Array.isArray(historyEvidence))throw new Error('invalid_record_binding_evidence');
  return {assetId:id,subjectKey:subject,readingVersion:version,readingSha256:readingHash,readingHashVersion:readingHashVersionValue,historyEvidence};
}

export function hashPalmHistoryRecordBinding(input){
  const payload=palmHistoryRecordBindingPayload(input);
  return crypto.createHash('sha256').update(canonicalPalmReadingJson(payload),'utf8').digest('hex');
}

export function verifyPalmHistoryRecordBinding(input,{storedSha256,hashVersion}={}){
  const version=String(hashVersion||PALM_HISTORY_RECORD_LEGACY_VERSION);
  if(version===PALM_HISTORY_RECORD_LEGACY_VERSION)return {ok:true,verified:false,legacy:true,hashVersion:version};
  if(version!==PALM_HISTORY_RECORD_HASH_VERSION)return {ok:false,error:'unsupported_history_record_hash_version'};
  const stored=String(storedSha256||'').toLowerCase();
  if(!SHA256_RE.test(stored))return {ok:false,error:'invalid_history_record_sha256'};
  let actual;
  try{actual=hashPalmHistoryRecordBinding(input);}catch{return {ok:false,error:'invalid_history_record_binding'};}
  if(actual!==stored)return {ok:false,error:'history_record_hash_mismatch',actual,expected:stored,hashVersion:version};
  return {ok:true,verified:true,legacy:false,actual,hashVersion:version};
}
