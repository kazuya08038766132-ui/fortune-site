import {validatePalmReadingEnvelope} from './palm-reading-envelope-validator-build40.js';
import {verifyPalmHistoryRecordBinding} from './palm-history-record-binding-build40.js';

export function annotatePalmHistoryRows(rows=[]){
  return (Array.isArray(rows)?rows:[]).map(row=>{
    const reading=row?.reading;
    const validation=validatePalmReadingEnvelope(reading,{storedVersion:row?.reading_version??null,storedSha256:row?.reading_sha256??null,storedHashVersion:row?.reading_hash_version??null});
    let recordBinding={ok:true,verified:false,legacy:true};
    if(validation.ok&&reading){recordBinding=verifyPalmHistoryRecordBinding({assetId:row?.id,subjectKey:row?.snapshot_subject_key??row?.subject_key,readingVersion:row?.reading_version,readingSha256:row?.reading_sha256,readingHashVersion:row?.reading_hash_version,historyEvidence:reading.historyEvidence},{storedSha256:row?.record_sha256,hashVersion:row?.record_hash_version});}
    const combined=validation.ok&&!recordBinding.ok?{ok:false,error:recordBinding.error,recordBinding}:validation;
    return {...row,_readingEnvelopeValidation:combined,_historyEvidenceValidation:combined,_recordBindingValidation:recordBinding};
  });
}

export function buildPalmHistoryItem(row){
  const valid=row?._readingEnvelopeValidation?.ok===true;
  const h=valid?row.reading.historyEvidence:{};
  return {
    assetId:Number(row?.id),
    state:row?.state,
    contentType:row?.content_type,
    size:Number(row?.content_length||0),
    capturedAt:row?.uploaded_at||row?.created_at,
    readingVersion:row?.reading_version||null,
    historyEvidencePresent:valid,
    comparisonReady:!!row?.reading&&valid,
    historyEvidenceError:row?.reading&&!valid?'invalid_history_evidence':null,
    readingEnvelopeError:row?.reading&&!valid?(row?._readingEnvelopeValidation?.error||'invalid_reading_envelope'):null,
    confirmedLines:Array.isArray(h.confirmedLines)?h.confirmedLines:[],
    pendingLines:Array.isArray(h.pendingLines)?h.pendingLines:[],
    repeatStable:h.repeatStable===true
  };
}

export function selectComparablePalmSnapshots(rows=[],limit=3){
  const latestReadings=(Array.isArray(rows)?rows:[]).filter(x=>x?.reading).slice(0,limit);
  const latestPair=latestReadings.slice(0,2);
  if(latestPair.some(x=>x?._readingEnvelopeValidation?.ok!==true)){
    const errors=latestPair.map(x=>x?._readingEnvelopeValidation?.error).filter(Boolean);
    const evidenceOnly=errors.length>0&&errors.every(e=>e==='invalid_history_evidence'||e==='invalid_history_geometry');
    return {snapshots:[],ready:false,reason:evidenceOnly?'invalid_history_evidence':'invalid_reading_envelope'};
  }
  const snapshots=latestReadings.filter(x=>x?._readingEnvelopeValidation?.ok===true);
  return {
    snapshots,
    ready:snapshots.length>=2,
    reason:snapshots.length>=2?null:'two_analysis_snapshots_required'
  };
}
