import {smoothRepeatPalmLines} from './palm-repeat-smoothing-build40.js';
import {derivePalmSemantics} from './palm-derived-semantics-build40.js';
import {evaluatePalmRules} from './palm-rule-engine-build40.js';
import {buildPalmSynthesis} from './palm-synthesis-build40.js';
import {composePalmReading} from './palm-reading-composer-build40.js';
import {applyPalmLineConfidenceGate} from './palm-line-confidence-gate-build40.js';
import {assessPalmReadingCoverage} from './palm-reading-coverage-gate-build40.js';
import {diagnosePalmRetake} from './palm-retake-guidance-build40.js';

const PRIMARY=['life','head','heart','fate'];
export function stabilizePalmReading(captures,{minCaptures=3}={}){
 const xs=(Array.isArray(captures)?captures:[]).filter(x=>x?.lines);
 if(xs.length<minCaptures)return {status:'PENDING',captureCount:xs.length,required:minCaptures};
 const sm=smoothRepeatPalmLines(xs.slice(-minCaptures),{minCaptures});
 if(!sm.stable)return {status:'RETAKE_REQUIRED',captureCount:xs.length,stability:sm,reason:'REPEAT_MEASUREMENT_UNSTABLE'};
 const base=structuredClone(xs.at(-1));
 for(const [name,s] of Object.entries(sm.lines)){
  if(!s?.stable||!base.lines?.[name])continue;
  base.lines[name].features={...(base.lines[name].features||{}),...s.features,stabilityScore:s.stabilityScore,repeatCaptureCount:s.captureCount};
  base.lines[name].stability={score:s.stabilityScore,dispersion:s.dispersion,captureCount:s.captureCount,stable:true};
 }
 const rawFeature=derivePalmSemantics(base);
 const feature=applyPalmLineConfidenceGate(rawFeature,sm);
 const coverage=assessPalmReadingCoverage(feature);
 if(!coverage.enoughForOverall){const stability={...sm,stablePrimary:PRIMARY.filter(k=>sm.lines[k]?.stable)};const retakeGuidance=diagnosePalmRetake({stability,coverage,feature});return {status:'RETAKE_REQUIRED',captureCount:xs.length,feature,stability,coverage,retakeGuidance,reason:coverage.reason,message:retakeGuidance.message||`${coverage.retakeLabels.join('・')||'主要線'}を撮り直してください。`};}
 const rules=evaluatePalmRules(feature);
 const synthesis=buildPalmSynthesis(feature,rules);
 const reading=composePalmReading(feature,rules,synthesis);
 const stablePrimary=PRIMARY.filter(k=>sm.lines[k]?.stable);
 return {status:'STABLE',captureCount:xs.length,feature,rules,synthesis,reading,coverage,stability:{...sm,stablePrimary}};
}
