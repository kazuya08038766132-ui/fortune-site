const boolAnd=(a,b,defaultValue=true)=>{
  if(a===false||b===false)return false;
  if(a===true||b===true)return true;
  return defaultValue;
};
const finiteOr=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
export function fusePalmQuality(photoQuality={},visionQuality={}){
  const visionUsable=visionQuality.visionUsable!==false;
  const acceptable=photoQuality.acceptable!==false&&visionQuality.acceptable!==false&&visionUsable;
  const issues=[...new Set([...(photoQuality.issues||[]),...(visionQuality.issues||[])])];
  if(!visionUsable&&!issues.includes('VISION_LOW_CONFIDENCE'))issues.push('VISION_LOW_CONFIDENCE');
  return {
    acceptable,
    roiComplete:boolAnd(photoQuality.roiComplete,visionQuality.roiComplete,true),
    blur:finiteOr(photoQuality.blur,finiteOr(visionQuality.blur,0)),
    exposure:finiteOr(photoQuality.exposure,finiteOr(visionQuality.exposure,.5)),
    visionUsable,
    visionMeanConfidence:finiteOr(visionQuality.meanConfidence,0),
    visionDetectedPrincipalLines:Math.max(0,Math.trunc(finiteOr(visionQuality.detectedPrincipalLines,0))),
    issues
  };
}
