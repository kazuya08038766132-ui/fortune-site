export const PALM_RELEASE_POLICY=Object.freeze({
 primary:["life","head","heart"],
 lineDetectedMin:0.72,
 secondaryDetectedMin:0.78,
 primaryCompleteMinCount:2,
 forbidAbsentInference:true,
 maxDisplayPolylinePoints:256
});
export function palmDisplayDecision(feature){
 const q=feature?.quality;
 if(!q?.acceptable||!q?.roiComplete)return {ok:false,action:"RECAPTURE",reason:"IMAGE_QUALITY"};
 const L=feature?.lines||{};
 let confident=0;
 for(const k of PALM_RELEASE_POLICY.primary){
  const x=L[k];
  if(x?.state==="DETECTED"&&Number(x.confidence)>=PALM_RELEASE_POLICY.lineDetectedMin) confident++;
 }
 if(confident<PALM_RELEASE_POLICY.primaryCompleteMinCount)
   return {ok:false,action:"RECAPTURE",reason:"PRIMARY_LINES_UNCERTAIN"};
 return {ok:true,action:"RENDER",primaryConfident:confident};
}
