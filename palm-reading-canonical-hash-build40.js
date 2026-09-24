import crypto from 'crypto';

export const PALM_READING_HASH_VERSION='canonical-json-v1';
export const PALM_READING_LEGACY_HASH_VERSION='legacy-json-v1';
const SHA256_RE=/^[a-f0-9]{64}$/i;

function canonicalValue(value){
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number'){
    if(!Number.isFinite(value))throw new Error('non_finite_number');
    return Object.is(value,-0)?0:value;
  }
  if(Array.isArray(value))return value.map(canonicalValue);
  if(typeof value==='object'){
    const out={};
    for(const key of Object.keys(value).sort()){
      const v=value[key];
      if(v===undefined)continue;
      if(typeof v==='function'||typeof v==='symbol'||typeof v==='bigint')throw new Error('unsupported_json_value');
      out[key]=canonicalValue(v);
    }
    return out;
  }
  throw new Error('unsupported_json_value');
}

export function canonicalPalmReadingJson(reading){
  return JSON.stringify(canonicalValue(reading));
}

export function hashPalmReadingCanonical(reading){
  return crypto.createHash('sha256').update(canonicalPalmReadingJson(reading),'utf8').digest('hex');
}

export function verifyStoredPalmReadingHash(reading,{storedSha256,hashVersion}={}){
  const stored=String(storedSha256||'').toLowerCase();
  if(!SHA256_RE.test(stored))return {ok:false,error:'invalid_reading_sha256'};
  const version=String(hashVersion||PALM_READING_LEGACY_HASH_VERSION);
  if(version===PALM_READING_LEGACY_HASH_VERSION){
    // RC223 and earlier hashes were made from request JSON before PostgreSQL JSONB storage.
    // JSONB may reorder object keys, so legacy rows cannot be safely re-hashed after read.
    return {ok:true,verified:false,legacy:true,hashVersion:version};
  }
  if(version!==PALM_READING_HASH_VERSION)return {ok:false,error:'unsupported_reading_hash_version'};
  let actual;
  try{actual=hashPalmReadingCanonical(reading);}catch{return {ok:false,error:'invalid_reading_canonicalization'};}
  if(actual!==stored)return {ok:false,error:'reading_hash_mismatch',actual,expected:stored,hashVersion:version};
  return {ok:true,verified:true,legacy:false,actual,hashVersion:version};
}
