import {letterboxPlan,imageDataToTensorSpec,normalizedPointToSource} from "./palm-image-preprocess-build40.js";
import {createPalmBrowserInferenceAdapter} from "./palm-browser-inference-adapter-build40.js";
import {analyzePalmSiteComplete} from "./palm-analysis-pipeline-build40.js";

const ALLOWED=new Set(["image/jpeg","image/png","image/webp"]);
export async function decodePalmFile(file,{maxBytes=8*1024*1024,createBitmap=globalThis.createImageBitmap}={}){
 if(!file||!ALLOWED.has(file.type))throw Error("PALM_IMAGE_TYPE");
 if(!(file.size>0&&file.size<=maxBytes))throw Error("PALM_IMAGE_SIZE");
 if(typeof createBitmap!=="function")throw Error("IMAGE_BITMAP_UNAVAILABLE");
 return createBitmap(file);
}
export function makePalmInputCanvas(bitmap,{size=512,documentObject=globalThis.document,mirrorX=false}={}){
 if(!documentObject?.createElement)throw Error("CANVAS_UNAVAILABLE");
 const canvas=documentObject.createElement("canvas");canvas.width=size;canvas.height=size;
 const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw Error("CANVAS_CONTEXT");
 const plan=letterboxPlan(bitmap.width,bitmap.height,size,size);
 ctx.fillStyle="rgb(127,127,127)";ctx.fillRect(0,0,size,size);
 if(mirrorX){ctx.save();ctx.translate(size,0);ctx.scale(-1,1);ctx.drawImage(bitmap,size-(plan.dx+plan.drawW),plan.dy,plan.drawW,plan.drawH);ctx.restore();}
 else ctx.drawImage(bitmap,plan.dx,plan.dy,plan.drawW,plan.drawH);
 return {canvas,ctx,plan,imageData:ctx.getImageData(0,0,size,size)};
}
function unletterboxCandidate(c,plan,{mirrorX=false}={}){
 let pts=(c.polyline||[]).map(p=>normalizedPointToSource(p,plan));if(mirrorX)pts=pts.map(([x,y])=>[1-x,y]);
 return {...c,polyline:pts.map(([x,y])=>[Math.max(0,Math.min(1,x)),Math.max(0,Math.min(1,y))])};
}
export async function analyzePalmFileBrowser({file,ort,manifest,modelUrl,landmarks,handedness="UNCERTAIN",handednessConfidence=0,production=true,maxBytes=8*1024*1024,createBitmap=globalThis.createImageBitmap,documentObject=globalThis.document}){
 const bitmap=await decodePalmFile(file,{maxBytes,createBitmap});
 try{
  const canonical=manifest.canonicalHand||"LEFT",mirrorX=canonical==="LEFT"&&handedness==="RIGHT";
  const prep=makePalmInputCanvas(bitmap,{size:manifest.input.shape[2],documentObject,mirrorX});
  const spec=imageDataToTensorSpec(prep.imageData,{inputWidth:manifest.input.shape[3],inputHeight:manifest.input.shape[2],mean:manifest.input.normalization?.mean,std:manifest.input.normalization?.std});
  const tensor=new ort.Tensor(spec.type,spec.data,spec.dims),base=createPalmBrowserInferenceAdapter({ort,manifest,modelUrl,production});
  const backend={metadata:base.metadata,async segment(){const vision=await base.segment({tensor});return {...vision,candidates:vision.candidates.map(c=>unletterboxCandidate(c,prep.plan,{mirrorX}))};}};
  return analyzePalmSiteComplete({image:tensor,landmarks,handedness,handednessConfidence,quality:{acceptable:true,roiComplete:true},visionBackend:backend,production});
 } finally {bitmap?.close?.();}
}
