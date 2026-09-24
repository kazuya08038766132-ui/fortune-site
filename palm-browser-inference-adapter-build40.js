
import {createOrtPalmSegmenter} from "./palm-browser-runtime-build40.js";import {principalMaskToCandidates} from "./palm-mask-postprocess-build40.js";
export function createPalmBrowserInferenceAdapter({ort,manifest,modelUrl,production=true}){const base=createOrtPalmSegmenter({ort,manifest,modelUrl,production});return {metadata:base.metadata,segment(args){return base.segment({...args,postprocess:principalMaskToCandidates})}}}
