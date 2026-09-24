import {evaluatePalmPhotoFile,palmPhotoQualityMessage} from './palm-photo-quality-build40.js';
import {detectPalmLandmarks} from './palm-hand-landmarker-build40.js';
import {analyzePalmFileBrowser} from './palm-browser-e2e-build40.js';
export async function runPalmLocalReading({file,ort,manifest,modelUrl,handLandmarker,createBitmap=globalThis.createImageBitmap,documentObject=globalThis.document}={}){
 const quality=await evaluatePalmPhotoFile(file,{createBitmap,documentObject});
 if(!quality.acceptable)return {status:'RECAPTURE',reason:'PHOTO_QUALITY',quality,message:palmPhotoQualityMessage(quality)};
 const bitmap=await createBitmap(file);
 let hand;try{hand=await detectPalmLandmarks({handLandmarker,image:bitmap});}finally{bitmap?.close?.();}
 if(hand.status!=='OK')return {status:'RECAPTURE',reason:'HAND_NOT_FOUND',quality,message:'手のひら全体を正面から写し、指先から手首まで画像内に収めてください。'};
 const result=await analyzePalmFileBrowser({file,ort,manifest,modelUrl,landmarks:hand.landmarks,handedness:hand.handedness,handednessConfidence:hand.handednessConfidence,production:true,createBitmap,documentObject});
 return {...result,quality,handedness:hand.handedness,handednessConfidence:hand.handednessConfidence};
}
