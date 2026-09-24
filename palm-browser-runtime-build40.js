
const ALLOWED_EP=new Set(["wasm","webgpu"]);
const isSecure=()=>typeof location==="undefined"||location.protocol==="https:"||["localhost","127.0.0.1"].includes(location.hostname);
export function choosePalmExecutionProvider({navigatorObject=globalThis.navigator,secureContext=isSecure()}={}){
 const hasGpu=!!navigatorObject?.gpu;
 if(secureContext&&hasGpu)return {provider:"webgpu",fallback:"wasm",reason:"WEBGPU_AVAILABLE"};
 return {provider:"wasm",fallback:null,reason:secureContext?"WEBGPU_UNAVAILABLE":"INSECURE_CONTEXT"};
}
export function validatePalmModelManifest(m,{production=true}={}){
 const missing=[];
 const eqArray=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((v,i)=>v===b[i]);
 for(const k of ["modelId","modelVersion","artifactSha256","input","output","runtime"])if(!m?.[k])missing.push(k.toUpperCase());
 if(!/^[a-f0-9]{64}$/i.test(String(m?.artifactSha256||"")))missing.push("ARTIFACT_HASH_FORMAT");
 if(!/^[a-f0-9]{64}$/i.test(String(m?.handLandmarkerSha256||"")))missing.push("HAND_LANDMARKER_HASH_FORMAT");
 if(m?.runtime!=="onnxruntime-web")missing.push("RUNTIME_ONNX_WEB");
 if(!Array.isArray(m?.executionProviders)||!m.executionProviders.some(x=>ALLOWED_EP.has(x)))missing.push("EXECUTION_PROVIDER");
 if(production){
  if(m?.modelId!=="fortune-palm-principal-lines-v1")missing.push("MODEL_ID_CONTRACT");
  if(m?.status!=="PROMOTED")missing.push("MODEL_STATUS_PROMOTED");
  if(m?.canonicalHand!=="LEFT")missing.push("CANONICAL_HAND_LEFT");
  if(m?.input?.name!=="input"||!eqArray(m?.input?.shape,[1,3,512,512]))missing.push("INPUT_CONTRACT");
  if(m?.input?.dtype!=="float32"||m?.input?.color!=="RGB")missing.push("INPUT_FORMAT");
  if(m?.output?.name!=="output"||!eqArray(m?.output?.dims,[1,4,512,512]))missing.push("OUTPUT_CONTRACT");
  const cm=m?.output?.classMap||{};
  if(cm["0"]!=="background"||cm["1"]!=="heart"||cm["2"]!=="head"||cm["3"]!=="life"||Object.keys(cm).length!==4)missing.push("CLASS_MAP_CONTRACT");
  if(m?.commercialLicenseVerified!==true)missing.push("COMMERCIAL_LICENSE");
  if(m?.datasetRightsVerified!==true)missing.push("DATASET_RIGHTS");
  if(m?.goldenQaPassed!==true)missing.push("GOLDEN_QA");
  const ev=m?.promotionEvidence;
  if(!ev||typeof ev!=="object")missing.push("PROMOTION_EVIDENCE");
  else{
   if(!/^[a-f0-9]{64}$/i.test(String(ev.rightsSha256||"")))missing.push("RIGHTS_EVIDENCE_HASH");
   if(!/^[a-f0-9]{64}$/i.test(String(ev.metricsSha256||"")))missing.push("METRICS_EVIDENCE_HASH");
   if(!/^[a-f0-9]{64}$/i.test(String(ev.evidenceReceiptSha256||"")))missing.push("EVIDENCE_RECEIPT_HASH");
   if(!String(ev.datasetId||"").trim())missing.push("DATASET_EVIDENCE_ID");
   const ts=String(ev.promotedAt||"").trim();
   if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(ts)||Number.isNaN(Date.parse(ts)))missing.push("PROMOTION_TIMESTAMP");
  }
 }
 return {ready:missing.length===0,missing:[...new Set(missing)]};
}
export function createOrtPalmSegmenter({ort,manifest,modelUrl,production=true}){
 const gate=validatePalmModelManifest(manifest,{production});
 if(!gate.ready)throw Object.assign(Error("PALM_MODEL_MANIFEST_NOT_READY"),{missing:gate.missing});
 if(!ort?.InferenceSession?.create||!ort?.Tensor)throw Error("ORT_API_MISSING");
 let sessionPromise=null;
 async function session(){
  if(!sessionPromise){
   const pref=choosePalmExecutionProvider();
   const eps=pref.provider==="webgpu"?["webgpu","wasm"]:["wasm"];
   sessionPromise=ort.InferenceSession.create(modelUrl,{executionProviders:eps});
  }
  return sessionPromise;
 }
 return {metadata:manifest,async segment({tensor,inputName=manifest.input.name,outputName=manifest.output.name,postprocess}){
  const s=await session();const result=await s.run({[inputName]:tensor});const out=result?.[outputName];
  if(!out)throw Error("PALM_MODEL_OUTPUT_MISSING");if(typeof postprocess!=="function")throw Error("PALM_POSTPROCESS_REQUIRED");
  return postprocess(out,manifest);
 }};
}
