
export function validatePalmVisionBackend(backend,{production=true}={}){
 const missing=[];
 if(!backend||typeof backend.segment!=="function")missing.push("SEGMENT_FN");
 const m=backend?.metadata||{};
 for(const k of ["modelId","modelVersion","artifactSha256"])if(!m[k])missing.push(k.toUpperCase());
 if(production){
  if(m.commercialLicenseVerified!==true)missing.push("COMMERCIAL_LICENSE");
  if(m.datasetRightsVerified!==true)missing.push("DATASET_RIGHTS");
  if(m.goldenQaPassed!==true)missing.push("GOLDEN_QA");
 }
 return {ready:missing.length===0,missing,metadata:m};
}
export async function runPalmVisionBackend(backend,args,{production=true}={}){
 const gate=validatePalmVisionBackend(backend,{production});
 if(!gate.ready)throw Object.assign(Error("PALM_VISION_BACKEND_NOT_READY"),{missing:gate.missing});
 const out=await backend.segment(args);
 if(!out||!Array.isArray(out.candidates))throw Error("PALM_VISION_INVALID_OUTPUT");
 return out;
}
