const KEYS_V1=Object.freeze(['schema','modelId','modelVersion','artifactSha256','rightsSha256','metricsSha256','datasetId','promotedAt']);
const KEYS_V2=Object.freeze([...KEYS_V1,'handLandmarkerSha256']);
const HASH=/^[a-f0-9]{64}$/i;
const SAFE_ID=/^[A-Za-z0-9._:-]{1,128}$/;
function isoUtc(v){
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(v))return false;
 const t=Date.parse(v); return Number.isFinite(t)&&new Date(t).toISOString().startsWith(v.slice(0,19));
}
export function validatePalmPromotionReceipt(r){
 const errors=[];
 if(!r||typeof r!=='object'||Array.isArray(r))return {ready:false,errors:['RECEIPT_OBJECT']};
 const expected=r?.schema==='palm-production-evidence-receipt-v2'?KEYS_V2:KEYS_V1;
 const keys=Object.keys(r);
 for(const k of keys)if(!expected.includes(k))errors.push(`UNKNOWN_FIELD:${k}`);
 for(const k of expected)if(!Object.prototype.hasOwnProperty.call(r,k))errors.push(`MISSING_FIELD:${k}`);
 if(!['palm-production-evidence-receipt-v1','palm-production-evidence-receipt-v2'].includes(r.schema))errors.push('RECEIPT_SCHEMA');
 if(r.modelId!=='fortune-palm-principal-lines-v1')errors.push('MODEL_ID');
 if(typeof r.modelVersion!=='string'||!SAFE_ID.test(r.modelVersion))errors.push('MODEL_VERSION');
 for(const k of ['artifactSha256','rightsSha256','metricsSha256'])if(!HASH.test(String(r[k]||'')))errors.push(k.toUpperCase());
 if(r.schema==='palm-production-evidence-receipt-v2'&&!HASH.test(String(r.handLandmarkerSha256||'')))errors.push('HANDLANDMARKERSHA256');
 if(typeof r.datasetId!=='string'||!SAFE_ID.test(r.datasetId))errors.push('DATASET_ID');
 if(!isoUtc(r.promotedAt))errors.push('PROMOTED_AT');
 return {ready:errors.length===0,errors};
}
