const PRIMARY=['life','head','heart','fate'];
const LABEL={life:'生命線',head:'知能線',heart:'感情線',fate:'運命線',sun:'太陽線',wealth:'財運線',marriage:'結婚線'};
export function assessPalmReadingCoverage(feature,{minPrimary=2,minTotal=2}={}){
 const gate=feature?.stabilityGate||{};
 const usable=new Set(gate.usableLines||[]);
 const suppressed=(gate.suppressedLines||[]).filter(x=>LABEL[x]);
 const usablePrimary=PRIMARY.filter(x=>usable.has(x));
 const missingPrimary=PRIMARY.filter(x=>!usable.has(x));
 const enough=usablePrimary.length>=minPrimary && usable.size>=minTotal;
 const retakeLines=missingPrimary.filter(x=>suppressed.includes(x));
 return Object.freeze({version:'palm-reading-coverage-gate-v1',status:enough?'READY':'RETAKE_REQUIRED',enoughForOverall:enough,usableLineCount:usable.size,usablePrimaryCount:usablePrimary.length,usablePrimary,retakeLines,retakeLabels:retakeLines.map(x=>LABEL[x]),reason:enough?null:'INSUFFICIENT_STABLE_LINE_COVERAGE'});
}
