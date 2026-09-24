import {palmUxState} from './palm-ux-state-build40.js';
import {palmPhotoQualityMessage} from './palm-photo-quality-build40.js';
import {diagnosePalmRetake} from './palm-retake-guidance-build40.js';

export function palmFlowStep(key,detail='',extra={}){const ux=palmUxState(key,detail);return Object.freeze({key,label:ux.label,message:ux.message,kind:ux.kind,...extra});}
export async function runPalmUserFlow({file,evaluateQuality,analyzeBase,stabilize}={}){
 if(!file)return {status:'EMPTY',step:palmFlowStep('EMPTY')};
 const quality=await evaluateQuality(file);
 if(!quality?.acceptable)return {status:'RECAPTURE',reason:'PHOTO_QUALITY',quality,step:palmFlowStep('RECAPTURE',palmPhotoQualityMessage(quality),{stage:'quality'})};
 const base=await analyzeBase(file);
 if(base?.status!=='READY')return {status:'RECAPTURE',reason:base?.reason||'BASE_ANALYSIS_NOT_READY',quality,step:palmFlowStep('RECAPTURE',base?.message||'主要線を十分な信頼度で確認できませんでした。手のひら全体にピントを合わせて撮り直してください。',{stage:'analysis'})};
 const stable=await stabilize(file,base);
 if(stable?.status==='STABLE')return {status:'READY',quality,base,stable,feature:stable.feature,reading:stable.reading,rules:stable.rules,synthesis:stable.synthesis,stability:stable.stability,repeatStable:true,selfStabilityMethod:stable.method,step:palmFlowStep('READY','写真品質と内部再現性を確認しました。安定して確認できた主要線を鑑定へ反映しました。',{stage:'complete'})};
 const coverage=stable?.coverage||null,stability=stable?.stability||null;
 const guidance=stable?.retakeGuidance||diagnosePalmRetake({photoQuality:quality,coverage:coverage||{},stability:stability||{},feature:base.feature||{}});
 return {status:'RECAPTURE',reason:stable?.reason||'STABILITY_NOT_READY',quality,base,stability,coverage,retakeGuidance:guidance,step:palmFlowStep('RECAPTURE',guidance?.message||'解析結果が安定しませんでした。案内に沿って撮り直してください。',{stage:'stability',retakeLines:coverage?.retakeLines||[]})};
}
