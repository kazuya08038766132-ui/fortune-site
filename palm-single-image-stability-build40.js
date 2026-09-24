import {stabilizePalmReading} from './palm-reading-stability-build40.js';

export const PALM_MICRO_PERTURBATIONS=Object.freeze([
 {id:'base',rotateDeg:0,scale:1,dxRatio:0,dyRatio:0},
 {id:'micro-a',rotateDeg:0.55,scale:0.997,dxRatio:0.0015,dyRatio:-0.0010},
 {id:'micro-b',rotateDeg:-0.55,scale:1.003,dxRatio:-0.0015,dyRatio:0.0010}
]);

export async function makePalmPerturbationBlob(file,spec,{createBitmap=globalThis.createImageBitmap,documentObject=globalThis.document}={}){
 if(spec?.id==='base')return file;
 if(!file||typeof createBitmap!=='function'||!documentObject?.createElement)throw new Error('PALM_PERTURB_RUNTIME_UNAVAILABLE');
 const bitmap=await createBitmap(file);
 try{
  const w=bitmap.width,h=bitmap.height,canvas=documentObject.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('PALM_PERTURB_CANVAS_UNAVAILABLE');
  ctx.save();ctx.translate(w/2+w*(spec.dxRatio||0),h/2+h*(spec.dyRatio||0));ctx.rotate((spec.rotateDeg||0)*Math.PI/180);ctx.scale(spec.scale||1,spec.scale||1);ctx.drawImage(bitmap,-w/2,-h/2,w,h);ctx.restore();
  const type=/^image\/(jpeg|png|webp)$/.test(file.type||'')?file.type:'image/jpeg';
  return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PALM_PERTURB_ENCODE_FAILED')),type,type==='image/jpeg'?0.94:undefined));
 }finally{bitmap?.close?.();}
}

export async function runPalmSingleImageStability({file,baseResult,analyzeVariant,makeVariant=makePalmPerturbationBlob}={}){
 if(!file||baseResult?.status!=='READY'||typeof analyzeVariant!=='function')return {status:'INCONCLUSIVE',reason:'BASE_READING_REQUIRED'};
 const results=[baseResult];
 for(const spec of PALM_MICRO_PERTURBATIONS.slice(1)){
  let blob;try{blob=await makeVariant(file,spec);}catch{return {status:'INCONCLUSIVE',reason:'PERTURBATION_RUNTIME_UNAVAILABLE',captureCount:results.length};}
  let r;try{r=await analyzeVariant(blob,spec);}catch{return {status:'RETAKE_REQUIRED',reason:'PERTURBED_ANALYSIS_FAILED',captureCount:results.length};}
  if(r?.status!=='READY')return {status:'RETAKE_REQUIRED',reason:'PERTURBED_ANALYSIS_NOT_READY',captureCount:results.length+1};
  results.push(r);
 }
 const stable=stabilizePalmReading(results.map(r=>r.feature));
 if(stable.status!=='STABLE')return {status:'RETAKE_REQUIRED',reason:'SINGLE_IMAGE_PERTURBATION_UNSTABLE',captureCount:results.length,stability:stable.stability||null};
 return {status:'STABLE',captureCount:results.length,feature:stable.feature,rules:stable.rules,synthesis:stable.synthesis,reading:stable.reading,stability:stable.stability,method:'single-image-micro-perturbation-v1'};
}
