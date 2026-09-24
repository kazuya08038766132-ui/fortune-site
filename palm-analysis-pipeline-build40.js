
import {buildPalmGeometry} from "./palm-geometry-build40.js";
import {runPalmVisionBackend} from "./palm-vision-backend-build40.js";
import {assignPalmLines,featureObjectFromAssignments} from "./palm-line-analysis-build40.js";
import {palmDisplayDecision} from "./palm-site-release-policy-build40.js";
import {evaluatePalmRules} from "./palm-rule-engine-build40.js";
import {composePalmReading} from "./palm-reading-composer-build40.js";
import {derivePalmSemantics} from "./palm-derived-semantics-build40.js";
import {fusePalmQuality} from "./palm-quality-fusion-build40.js";
import {validatePalmFeatureV2} from "./palm-feature-validator-build40.js";
import {buildPalmSynthesis} from "./palm-synthesis-build40.js";

export async function analyzePalmSiteComplete({image,landmarks,handedness,handednessConfidence,quality,visionBackend,production=true}){
 const geometry=buildPalmGeometry(landmarks,{handedness,handednessConfidence});
 const vision=await runPalmVisionBackend(visionBackend,{image,geometry},{production});
 const assignments=assignPalmLines(vision.candidates,geometry,vision.assignmentOptions||{});
 const fusedQuality=fusePalmQuality(quality||{},vision.quality||{});
 const rawFeature=featureObjectFromAssignments({assignments,geometry,quality:fusedQuality});
 const feature=derivePalmSemantics(rawFeature);
 const validation=validatePalmFeatureV2(feature);
 if(!validation.ok)return {status:"RECAPTURE",display:{ok:false,reason:"INVALID_FEATURE",errors:validation.errors},feature,reading:null,rules:[]};
 const display=palmDisplayDecision(feature);
 if(!display.ok)return {status:"RECAPTURE",display,feature,reading:null,rules:[]};
 const rules=evaluatePalmRules(feature);
 const synthesis=buildPalmSynthesis(feature,rules);
 const reading=composePalmReading(feature,rules,synthesis);
 return {status:"READY",display,feature,reading,rules,synthesis,model:visionBackend.metadata};
}
