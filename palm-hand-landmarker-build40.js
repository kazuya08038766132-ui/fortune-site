export function normalizeHandLandmarkerResult(result){
 const landmarks=result?.landmarks?.[0];
 if(!Array.isArray(landmarks)||landmarks.length!==21)return {status:'NO_HAND',landmarks:null,handedness:'UNCERTAIN',handednessConfidence:0};
 const cat=result?.handedness?.[0]?.[0]||result?.handednesses?.[0]?.[0]||{};
 const raw=String(cat.categoryName||cat.displayName||'').toUpperCase();
 const handedness=raw==='LEFT'?'LEFT':raw==='RIGHT'?'RIGHT':'UNCERTAIN';
 const handednessConfidence=Number.isFinite(Number(cat.score))?Number(cat.score):0;
 return {status:'OK',landmarks:landmarks.map(p=>({x:Number(p.x),y:Number(p.y),z:Number(p.z||0)})),handedness,handednessConfidence};
}
export async function createPalmHandLandmarker({FilesetResolver,HandLandmarker,wasmRoot,modelAssetPath,numHands=1,minHandDetectionConfidence=.6,minHandPresenceConfidence=.6}={}){
 if(!FilesetResolver?.forVisionTasks||!HandLandmarker?.createFromOptions)throw Error('HAND_LANDMARKER_API_MISSING');
 if(!wasmRoot||!modelAssetPath)throw Error('HAND_LANDMARKER_ASSET_PATH');
 const vision=await FilesetResolver.forVisionTasks(wasmRoot);
 const task=await HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath},runningMode:'IMAGE',numHands,minHandDetectionConfidence,minHandPresenceConfidence});
 return {async detect(image){return normalizeHandLandmarkerResult(await task.detect(image));},close(){return task.close?.();}};
}
export async function detectPalmLandmarks({handLandmarker,image}={}){
 if(!handLandmarker||typeof handLandmarker.detect!=='function')throw Error('HAND_LANDMARKER_NOT_READY');
 const out=await handLandmarker.detect(image);return out?.status?out:normalizeHandLandmarkerResult(out);
}
