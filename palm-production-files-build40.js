import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {validatePalmModelManifest} from './palm-browser-runtime-build40.js';
import {validatePalmPromotionReceipt} from './palm-promotion-receipt-validator-build40.js';

function sha256File(file){
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function inspectPalmProductionFiles({
  root='.',
  manifestPath='palm-production-model-manifest.json',
  modelPath='models/palm-principal-lines.onnx',
  handModelPath='models/hand_landmarker.task',
  evidenceReceiptPath='palm-production-evidence-receipt.json',
  rightsEvidencePath='palm-production-rights-evidence.json',
  metricsEvidencePath='palm-production-metrics-evidence.json'
}={}){
  const abs=(p)=>path.resolve(root,p);
  const out={ready:false,manifestReady:false,modelReady:false,handModelReady:false,missing:[],errors:[],evidence:{}};
  const manifestFile=abs(manifestPath),modelFile=abs(modelPath),handFile=abs(handModelPath),receiptFile=abs(evidenceReceiptPath),rightsFile=abs(rightsEvidencePath),metricsFile=abs(metricsEvidencePath);
  if(!fs.existsSync(manifestFile)){out.missing.push('PRODUCTION_MANIFEST');return out;}
  let manifest;
  try{manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));}catch(error){out.errors.push('MANIFEST_INVALID_JSON');return out;}
  const gate=validatePalmModelManifest(manifest,{production:true});
  out.manifestReady=gate.ready;
  if(!gate.ready)out.missing.push(...gate.missing);
  out.evidence.manifest={modelId:manifest?.modelId||null,modelVersion:manifest?.modelVersion||null,artifactSha256:manifest?.artifactSha256||null,goldenQaPassed:manifest?.goldenQaPassed===true,datasetRightsVerified:manifest?.datasetRightsVerified===true,commercialLicenseVerified:manifest?.commercialLicenseVerified===true};
  if(!fs.existsSync(modelFile))out.missing.push('LINE_MODEL_ASSET');
  else{
    const actual=sha256File(modelFile),expected=String(manifest?.artifactSha256||'').toLowerCase();
    out.evidence.model={sha256:actual,size:fs.statSync(modelFile).size};
    out.modelReady=/^[a-f0-9]{64}$/.test(expected)&&actual===expected;
    if(!out.modelReady)out.errors.push('MODEL_HASH_MISMATCH');
  }
  if(!fs.existsSync(receiptFile))out.missing.push('PROMOTION_EVIDENCE_RECEIPT');
  else{
    let receipt=null;
    const receiptStat=fs.statSync(receiptFile);
    if(receiptStat.size>4096){out.errors.push('EVIDENCE_RECEIPT_TOO_LARGE');}
    else try{receipt=JSON.parse(fs.readFileSync(receiptFile,'utf8'));}catch(error){out.errors.push('EVIDENCE_RECEIPT_INVALID_JSON');}
    if(receipt){
      const receiptGate=validatePalmPromotionReceipt(receipt);
      if(!receiptGate.ready)out.errors.push(...receiptGate.errors.map(x=>`EVIDENCE_RECEIPT_${x}`));
      const actualReceiptHash=sha256File(receiptFile), ev=manifest?.promotionEvidence||{};
      const receiptOk=receiptGate.ready&&/^[a-f0-9]{64}$/i.test(String(ev.evidenceReceiptSha256||''))&&actualReceiptHash===String(ev.evidenceReceiptSha256).toLowerCase()
        &&receipt.schema==='palm-production-evidence-receipt-v2'&&receipt.modelId===manifest.modelId&&receipt.modelVersion===manifest.modelVersion&&receipt.artifactSha256===manifest.artifactSha256
        &&receipt.handLandmarkerSha256===manifest.handLandmarkerSha256
        &&receipt.rightsSha256===ev.rightsSha256&&receipt.metricsSha256===ev.metricsSha256&&receipt.datasetId===ev.datasetId&&receipt.promotedAt===ev.promotedAt;
      out.evidence.promotionReceipt={sha256:actualReceiptHash,datasetId:receipt.datasetId||null};
      if(!receiptOk)out.errors.push('EVIDENCE_RECEIPT_MISMATCH');
    }
  }
  const evidenceFiles=[['RIGHTS_EVIDENCE_FILE',rightsFile,'rightsSha256'],['METRICS_EVIDENCE_FILE',metricsFile,'metricsSha256']];
  for(const [code,file,key] of evidenceFiles){
    if(!fs.existsSync(file)){out.missing.push(code);continue;}
    const st=fs.statSync(file);
    if(!st.isFile()||st.size<=0){out.errors.push(`${code}_EMPTY`);continue;}
    const actual=sha256File(file),expected=String(manifest?.promotionEvidence?.[key]||'').toLowerCase();
    out.evidence[key==='rightsSha256'?'rightsEvidence':'metricsEvidence']={sha256:actual,size:st.size};
    if(!/^[a-f0-9]{64}$/.test(expected)||actual!==expected)out.errors.push(`${code}_HASH_MISMATCH`);
  }
  if(!fs.existsSync(handFile))out.missing.push('HAND_LANDMARKER_ASSET');
  else{
    const st=fs.statSync(handFile);
    const actual=st.isFile()&&st.size>0?sha256File(handFile):'';
    const expected=String(manifest?.handLandmarkerSha256||'').toLowerCase();
    out.handModelReady=st.isFile()&&st.size>0&&/^[a-f0-9]{64}$/.test(expected)&&actual===expected;
    out.evidence.handModel={size:st.size,sha256:actual||null};
    if(!st.isFile()||st.size<=0)out.errors.push('HAND_LANDMARKER_EMPTY');
    else if(!out.handModelReady)out.errors.push('HAND_LANDMARKER_HASH_MISMATCH');
  }
  out.ready=out.manifestReady&&out.modelReady&&out.handModelReady&&out.missing.length===0&&out.errors.length===0;
  return out;
}
