import {validatePalmModelManifest} from './palm-browser-runtime-build40.js';

const PALM_READINESS_FETCH_TIMEOUT_MS=15000;
const PALM_READINESS_MAX_ASSET_BYTES=128*1024*1024;
async function fetchBounded(fetchImpl,url,options={},timeoutMs=PALM_READINESS_FETCH_TIMEOUT_MS){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{return await fetchImpl(url,{...options,signal:controller.signal})}
 catch(e){if(e?.name==='AbortError')throw new Error('network_timeout');throw e}
 finally{clearTimeout(timer)}
}
async function readJsonFailClosed(response){
 const ct=String(response?.headers?.get?.('content-type')||'').toLowerCase();
 if(!ct.includes('application/json'))throw new Error('invalid_json_response');
 try{return await response.json()}catch{throw new Error('invalid_json_response')}
}
function normalizeSha256(value){const s=String(value||'').toLowerCase();return /^[a-f0-9]{64}$/.test(s)?s:'';}
function bytesToHex(bytes){return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
export async function verifyPalmAssetHash({fetchImpl=globalThis.fetch,cryptoImpl=globalThis.crypto,url,expectedSha256,maxBytes=PALM_READINESS_MAX_ASSET_BYTES}={}){
 if(typeof fetchImpl!=='function'||!cryptoImpl?.subtle?.digest)return {ok:false,reason:'HASH_RUNTIME_UNAVAILABLE'};
 const expected=normalizeSha256(expectedSha256);if(!expected)return {ok:false,reason:'EXPECTED_HASH_INVALID'};
 let head=null;
 try{head=await fetchBounded(fetchImpl,url,{method:'HEAD',cache:'no-store'});}catch{}
 if(head?.ok){
  const n=Number(head.headers?.get?.('content-length')||0);
  if(Number.isFinite(n)&&n>maxBytes)return {ok:false,reason:'ASSET_TOO_LARGE',size:n};
 }
 const r=await fetchBounded(fetchImpl,url,{method:'GET',cache:'no-store'});
 if(!r.ok)return {ok:false,reason:'ASSET_FETCH_FAILED',status:r.status};
 const buf=await r.arrayBuffer();
 if(!buf?.byteLength)return {ok:false,reason:'ASSET_EMPTY',size:buf?.byteLength||0};
 if(buf.byteLength>maxBytes)return {ok:false,reason:'ASSET_TOO_LARGE',size:buf.byteLength};
 const digest=await cryptoImpl.subtle.digest('SHA-256',buf);
 const actual=bytesToHex(new Uint8Array(digest));
 return {ok:actual===expected,reason:actual===expected?null:'HASH_MISMATCH',actual,expected,size:buf.byteLength};
}
export async function probePalmProductionReadiness({fetchImpl=globalThis.fetch,cryptoImpl=globalThis.crypto,manifestUrl='./palm-production-model-manifest.json',modelUrl='./models/palm-principal-lines.onnx',handModelUrl='./models/hand_landmarker.task'}={}){
 const out={ready:false,manifest:false,lineModel:false,handModel:false,missing:[],errors:[],evidence:{}};
 if(typeof fetchImpl!=='function'){out.missing.push('FETCH');return out;}
 let manifest;
 try{
  const r=await fetchBounded(fetchImpl,manifestUrl,{cache:'no-store'});
  if(!r.ok)throw Error('manifest');
  manifest=await readJsonFailClosed(r);
  const gate=validatePalmModelManifest(manifest,{production:true});
  if(!gate.ready){out.missing.push(...gate.missing);return {...out,manifest:true,manifestData:manifest};}
  out.manifest=true;out.manifestData=manifest;
 }catch{out.missing.push('PRODUCTION_MANIFEST');return out;}
 const assets=[
  ['lineModel',modelUrl,'LINE_MODEL_ASSET',manifest.artifactSha256],
  ['handModel',handModelUrl,'HAND_LANDMARKER_ASSET',manifest.handLandmarkerSha256]
 ];
 for(const [key,url,label,expectedSha256] of assets){
  try{
   const v=await verifyPalmAssetHash({fetchImpl,cryptoImpl,url,expectedSha256});
   out.evidence[key]={sha256:v.actual||null,size:v.size||0};
   if(v.ok)out[key]=true;else out.errors.push(`${label}_${v.reason}`);
  }catch(e){out.errors.push(`${label}_${e?.message==='network_timeout'?'NETWORK_TIMEOUT':'VERIFY_FAILED'}`)}
 }
 out.ready=out.manifest&&out.lineModel&&out.handModel&&out.missing.length===0&&out.errors.length===0;return out;
}
