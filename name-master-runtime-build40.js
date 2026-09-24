import fs from 'fs';
import {nameMasterGate} from './name-master-gate-build40.js';
import {masterFromCorpus,buildNameReading} from './name-reading-service-build40.js';
import {verifyNameMasterReceipt} from './name-master-receipt-verify-build40.mjs';

export function loadNameRuntime(path='name-stroke-corpus-build40.json',receiptPath='NAME_CORPUS_RECEIPT_BUILD40.json'){
  try{
    if(!fs.existsSync(path))return {ready:false,status:'MASTER_NOT_PRESENT',master:{},evidence:null,mtimeMs:null,receiptMtimeMs:null};
    if(!fs.existsSync(receiptPath))return {ready:false,status:'MASTER_RECEIPT_NOT_PRESENT',master:{},evidence:null,mtimeMs:fs.statSync(path).mtimeMs,receiptMtimeMs:null};
    const receiptVerification=verifyNameMasterReceipt({corpusPath:path,receiptPath});
    if(!receiptVerification.ok)return {ready:false,status:'MASTER_RECEIPT_FAILED',master:{},evidence:{receiptVerification},mtimeMs:fs.statSync(path).mtimeMs,receiptMtimeMs:fs.statSync(receiptPath).mtimeMs};
    const corpus=JSON.parse(fs.readFileSync(path,'utf8'));
    const gate=nameMasterGate(corpus);
    if(!gate.ready)return {ready:false,status:'MASTER_GATE_FAILED',master:{},evidence:{gate,receiptVerification,meta:corpus?.meta||null,stats:corpus?.stats||null},mtimeMs:fs.statSync(path).mtimeMs,receiptMtimeMs:fs.statSync(receiptPath).mtimeMs};
    return {ready:true,status:'READY',master:masterFromCorpus(corpus),evidence:{gate,receiptVerification,meta:corpus.meta,stats:corpus.stats},mtimeMs:fs.statSync(path).mtimeMs,receiptMtimeMs:fs.statSync(receiptPath).mtimeMs};
  }catch(error){return {ready:false,status:'MASTER_LOAD_ERROR',master:{},error:String(error?.message||error),mtimeMs:null,receiptMtimeMs:null};}
}

export function createNameReadingRuntime(path='name-stroke-corpus-build40.json',receiptPath='NAME_CORPUS_RECEIPT_BUILD40.json'){
  let runtime=loadNameRuntime(path,receiptPath);
  let observedMtime=runtime.mtimeMs, observedReceiptMtime=runtime.receiptMtimeMs;
  function refreshIfChanged(){
    let current=null,currentReceipt=null;try{current=fs.existsSync(path)?fs.statSync(path).mtimeMs:null}catch{};try{currentReceipt=fs.existsSync(receiptPath)?fs.statSync(receiptPath).mtimeMs:null}catch{}
    if(current!==observedMtime||currentReceipt!==observedReceiptMtime){runtime=loadNameRuntime(path,receiptPath);observedMtime=runtime.mtimeMs;observedReceiptMtime=runtime.receiptMtimeMs;}
    return runtime;
  }
  return {
    reload(){runtime=loadNameRuntime(path,receiptPath);observedMtime=runtime.mtimeMs;observedReceiptMtime=runtime.receiptMtimeMs;return this.readiness();},
    readiness(){const r=refreshIfChanged();return {ready:r.ready,status:r.status,evidence:r.evidence||null};},
    reading(input){const r=refreshIfChanged();return r.ready?buildNameReading({...input,master:r.master}):{status:r.status};}
  };
}
