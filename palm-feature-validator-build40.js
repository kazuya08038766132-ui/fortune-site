const KEYS=["life","head","heart","fate","sun","wealth","marriage"];
const n=x=>typeof x==="number"&&Number.isFinite(x),prob=x=>n(x)&&x>=0&&x<=1;
const optionalNum=(obj,key,{min=-Infinity,max=Infinity}={})=>obj?.[key]==null||(n(obj[key])&&obj[key]>=min&&obj[key]<=max);
export function validatePalmFeatureV2(x){
 const e=[];
 if(x?.schemaVersion!=="palm-feature-v2")e.push("SCHEMA_VERSION");
 if(!["LEFT","RIGHT","UNCERTAIN"].includes(x?.hand?.side))e.push("HAND_SIDE");
 if(!prob(x?.hand?.orientationConfidence))e.push("HAND_CONFIDENCE");
 if(typeof x?.quality?.acceptable!=="boolean"||typeof x?.quality?.roiComplete!=="boolean"||!prob(x?.quality?.blur)||!prob(x?.quality?.exposure))e.push("QUALITY");
 for(const k of KEYS){
  const l=x?.lines?.[k];if(!l){e.push("LINE_"+k);continue}
  if(!["DETECTED","NOT_DETECTED","UNCERTAIN"].includes(l.state))e.push("STATE_"+k);
  if(!prob(l.confidence))e.push("CONF_"+k);
  if(!Array.isArray(l.polyline)||l.polyline.length>256)e.push("POLY_"+k);
  for(const pt of l.polyline||[])if(!Array.isArray(pt)||pt.length!==2||!pt.every(v=>n(v)&&v>=0&&v<=1))e.push("POINT_"+k);
  if(l.state==="DETECTED"&&(l.confidence<.72||(l.polyline?.length||0)<2))e.push("DETECTED_INCONSISTENT_"+k);
  if(!l.features||typeof l.features!=="object"||!l.semantic||typeof l.semantic!=="object")e.push("FIELDS_"+k);
  const f=l.features||{};
  for(const key of ["lengthRatio","curvature","slope","depth","continuity"]){if(!optionalNum(f,key))e.push("FEATURE_"+key+"_"+k)}
  for(const key of ["breakCount","branchCount"]){if(!Number.isInteger(f[key])||f[key]<0||f[key]>64)e.push("FEATURE_"+key+"_"+k)}
  for(const key of ["startU","startV","endU","endV","centroidU","centroidV","spanU","spanV","lifeLineStartDistance"]){if(!optionalNum(l.semantic,key))e.push("SEMANTIC_"+key+"_"+k)}
  if(l.semantic.joinedToLifeStart!=null&&typeof l.semantic.joinedToLifeStart!=="boolean")e.push("SEMANTIC_JOIN_"+k);
  if(l.semantic.shapeProfile!=null){
   const p=l.semantic.shapeProfile;if(typeof p!=="object")e.push("SHAPE_PROFILE_"+k); else {
    const allowed={lengthClass:["SHORT","MEDIUM","LONG","UNCERTAIN","UNKNOWN"],clarityClass:["CLEAR","MODERATE","FAINT","FRAGMENTED","UNCERTAIN","UNKNOWN"],topologyClass:["CLEAN","BROKEN","BRANCHED","BROKEN_AND_BRANCHED","UNKNOWN"]};
    for(const [key,vals] of Object.entries(allowed))if(!vals.includes(p[key]))e.push("SHAPE_"+key+"_"+k);
    if(typeof p.shapeClass!=="string"||!p.shapeClass)e.push("SHAPE_CLASS_"+k);
    if(typeof p.terminationClass!=="string"||!p.terminationClass)e.push("SHAPE_TERMINATION_"+k);
   }
  }
  const ev=l.evidence;if(ev!=null){
   if(typeof ev!=="object")e.push("EVIDENCE_"+k); else for(const key of ["sourceConfidence","semanticScore","evidenceQuality","semanticConfidence","breakEvidenceConfidence","branchEvidenceConfidence"]){if(ev[key]!=null&&!prob(ev[key]))e.push("EVIDENCE_"+key+"_"+k)}
  }
 }
 if(x?.crossLineRelations!=null){
  if(!Array.isArray(x.crossLineRelations)||x.crossLineRelations.length>32)e.push("CROSS_RELATIONS"); else for(const r of x.crossLineRelations){
   if(!r||typeof r!=="object"||typeof r.type!=="string"||!r.type)e.push("CROSS_RELATION_ITEM");
   if(r?.confidence!=null&&!prob(r.confidence))e.push("CROSS_RELATION_CONFIDENCE");
   if(r?.distance!=null&&!n(r.distance))e.push("CROSS_RELATION_DISTANCE");
  }
 }
 return {ok:e.length===0,errors:[...new Set(e)]};
}
