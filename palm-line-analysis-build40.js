const LINE_KEYS=Object.freeze(["life","head","heart","fate","sun","wealth","marriage"]);
const clamp=(x,a=0,b=1)=>{const n=Number(x);return Number.isFinite(n)?Math.max(a,Math.min(b,n)):a};
const finite=x=>Number.isFinite(Number(x));
const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
const turn=(a,b,c)=>{
 const u={x:b.x-a.x,y:b.y-a.y},v={x:c.x-b.x,y:c.y-b.y};
 const lu=Math.hypot(u.x,u.y),lv=Math.hypot(v.x,v.y);if(lu<1e-9||lv<1e-9)return 0;
 return Math.acos(Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y)/(lu*lv))));
};
function normalizePoint(x){
 const a=Array.isArray(x)?x:[x?.x,x?.y];
 const px=Number(a?.[0]),py=Number(a?.[1]);
 if(!Number.isFinite(px)||!Number.isFinite(py))return null;
 // Candidate polylines are normalized image coordinates. Never repair wildly invalid model output.
 if(px<-.02||px>1.02||py<-.02||py>1.02)return null;
 return {x:clamp(px),y:clamp(py)};
}
function curveStats(points,geometry){
 const img=(points||[]).map(normalizePoint).filter(Boolean);
 if(img.length<2||!geometry||typeof geometry.toPalm!=="function")return null;
 const pal=[];for(const q of img){
   let z;try{z=geometry.toPalm(q)}catch{return null}
   const u=Number(z?.u),v=Number(z?.v);if(!Number.isFinite(u)||!Number.isFinite(v))return null;
   pal.push({u,v});
 }
 let arc=0,curve=0;for(let i=1;i<img.length;i++)arc+=dist(img[i-1],img[i]);
 for(let i=1;i<img.length-1;i++)curve+=turn(img[i-1],img[i],img[i+1]);
 const palmH=Number(geometry.palmHeight),palmW=Number(geometry.palmWidth);
 if(!Number.isFinite(palmH)||!Number.isFinite(palmW)||palmH<=0||palmW<=0)return null;
 const a=pal[0],b=pal.at(-1),us=pal.map(x=>x.u),vs=pal.map(x=>x.v);
 const centroid={u:us.reduce((s,x)=>s+x,0)/us.length,v:vs.reduce((s,x)=>s+x,0)/vs.length};
 const spanU=Math.max(...us)-Math.min(...us),spanV=Math.max(...vs)-Math.min(...vs),du=b.u-a.u,dv=b.v-a.v;
 const arcRatio=arc/Math.max(palmH,palmW),curvature=curve/Math.PI;
 const result={img,pal,arcRatio,curvature,slope:Math.abs(du)<1e-6?Math.sign(dv)*4:Math.max(-4,Math.min(4,dv/du)),spanU,spanV,centroid,start:a,end:b,horizontalness:spanU/(spanU+spanV+1e-9),verticalness:spanV/(spanU+spanV+1e-9)};
 return Object.values(result).some(v=>typeof v==="number"&&!Number.isFinite(v))?null:result;
}
const gauss=(x,mu,s)=>Math.exp(-0.5*((x-mu)/s)**2);
const positive=x=>Math.max(0,Math.min(1,x));
const evidenceCount=(candidate,countKey,confidenceKey,threshold=.72)=>{
 const count=Math.max(0,Math.trunc(candidate?.[countKey]??0)),confidence=Number(candidate?.[confidenceKey]);
 return count>0&&Number.isFinite(confidence)&&confidence>=threshold?count:0;
};
const evidencePoints=(candidate,key,confidenceKey,geometry,threshold=.72)=>{
 const confidence=Number(candidate?.[confidenceKey]);if(!Number.isFinite(confidence)||confidence<threshold||!Array.isArray(candidate?.[key]))return [];
 const out=[];for(const raw of candidate[key].slice(0,16)){const q=normalizePoint(raw);if(!q)continue;let z;try{z=geometry?.toPalm?.(q)}catch{continue}const u=Number(z?.u),v=Number(z?.v);if(Number.isFinite(u)&&Number.isFinite(v))out.push({u,v});}
 return out;
};
function semanticScores(s){
 const longH=positive((s.spanU-.25)/.55),longV=positive((s.spanV-.20)/.80),high=gauss(s.centroid.v,.34,.28),mid=gauss(s.centroid.v,.02,.28),centerU=gauss(s.centroid.u,0,.22),radial=gauss(s.centroid.u,-.28,.27),ulnar=gauss(s.centroid.u,.30,.25),curved=positive(s.curvature/1.15),short=positive(1-s.arcRatio/1.0);
 return {heart:.30*s.horizontalness+.26*high+.22*longH+.12*ulnar+.10*positive(1-curved),head:.33*s.horizontalness+.30*mid+.22*longH+.10*radial+.05*positive(1-curved),life:.25*longV+.28*radial+.32*curved+.15*positive(1-s.horizontalness),fate:.42*s.verticalness+.30*centerU+.18*longV+.10*gauss(s.centroid.v,-.05,.45),sun:.43*s.verticalness+.27*gauss(s.centroid.u,.13,.18)+.15*longV+.15*high,wealth:.42*s.verticalness+.30*gauss(s.centroid.u,.35,.16)+.13*longV+.15*high,marriage:.35*s.horizontalness+.30*gauss(s.centroid.u,.48,.16)+.25*gauss(s.centroid.v,.42,.22)+.10*short};
}

function linePlausibility(line,s){
 // Broad anatomical plausibility guard. Keep margins intentionally permissive: this is a false-positive gate, not a palmistry classifier.
 const {centroid,start,end,horizontalness,verticalness,spanU,spanV,arcRatio,curvature}=s;
 const absSlope=Math.abs(s.slope);
 if(line==="heart"){
   if(centroid.v<-.30||centroid.v>.62||horizontalness<.48||spanU<.16)return 0;
   return clamp(.35+.30*horizontalness+.20*gauss(centroid.v,.28,.32)+.15*clamp(spanU/.55));
 }
 if(line==="head"){
   if(centroid.v<-.45||centroid.v>.48||horizontalness<.45||spanU<.16)return 0;
   return clamp(.34+.31*horizontalness+.20*gauss(centroid.v,.02,.34)+.15*clamp(spanU/.55));
 }
 if(line==="life"){
   // Life line should occupy the thumb/radial half and have meaningful vertical travel or curvature.
   if(centroid.u>.20||spanV<.14||(verticalness<.40&&curvature<.22))return 0;
   return clamp(.30+.22*gauss(centroid.u,-.28,.34)+.22*verticalness+.16*clamp(curvature/1.1)+.10*clamp(arcRatio/.75));
 }
 if(line==="fate"){
   if(Math.abs(centroid.u)>.38||verticalness<.52||spanV<.16)return 0;
   return clamp(.34+.28*verticalness+.23*gauss(centroid.u,0,.24)+.15*clamp(spanV/.65));
 }
 if(line==="sun"){
   if(centroid.u<-.16||centroid.u>.46||verticalness<.52||spanV<.11)return 0;
   return clamp(.33+.29*verticalness+.23*gauss(centroid.u,.14,.22)+.15*clamp(spanV/.55));
 }
 if(line==="wealth"){
   if(centroid.u<.05||centroid.u>.62||verticalness<.50||spanV<.09)return 0;
   return clamp(.32+.28*verticalness+.25*gauss(centroid.u,.35,.20)+.15*clamp(spanV/.50));
 }
 if(line==="marriage"){
   // Marriage lines are short transverse lines on the ulnar/upper edge. Reject long central creases.
   if(centroid.u<.24||centroid.v<.12||horizontalness<.58||spanU>.34||spanV>.20)return 0;
   return clamp(.34+.28*horizontalness+.22*gauss(centroid.u,.47,.18)+.16*gauss(centroid.v,.38,.25));
 }
 return 0;
}
function polylineSimilarity(a,b){
 const pa=a?.pal||[],pb=b?.pal||[];if(pa.length<2||pb.length<2)return 0;
 const near=(p,arr)=>Math.min(...arr.map(q=>Math.hypot(p.u-q.u,p.v-q.v)));
 const da=pa.reduce((z,p)=>z+near(p,pb),0)/pa.length,db=pb.reduce((z,p)=>z+near(p,pa),0)/pb.length;
 const mean=(da+db)/2;
 const spanDelta=Math.abs(a.spanU-b.spanU)+Math.abs(a.spanV-b.spanV);
 const centroidDelta=Math.hypot(a.centroid.u-b.centroid.u,a.centroid.v-b.centroid.v);
 return clamp(1-(mean/.075+.45*spanDelta+.40*centroidDelta));
}
function suppressDuplicateCandidates(analyzed,{duplicateSimilarity=.82}={}){
 const ranked=[...analyzed].sort((a,b)=>b.evidenceQuality-a.evidenceQuality||b.sourceConfidence-a.sourceConfidence||b.arcRatio-a.arcRatio||a.candidateId.localeCompare(b.candidateId));
 const kept=[],duplicates=[];
 for(const item of ranked){
   const winner=kept.find(k=>polylineSimilarity(item,k)>=duplicateSimilarity);
   if(winner)duplicates.push({candidate:item,duplicateOf:winner.candidateId});
   else kept.push(item);
 }
 return {kept,duplicates};
}

function endpointDistance(a,b){
 const ea=[a?.start,a?.end].filter(Boolean),eb=[b?.start,b?.end].filter(Boolean);
 let best=Infinity;for(const p of ea)for(const q of eb)best=Math.min(best,Math.hypot(p.u-q.u,p.v-q.v));return best;
}
function topSemanticLine(a){return Object.entries(a?.scores||{}).sort((x,y)=>y[1]-x[1])[0]?.[0]||null}
function minPointDistance(shorter,longer){
 const a=shorter?.pal||[],b=longer?.pal||[];if(!a.length||!b.length)return Infinity;
 let best=Infinity;for(const p of a)for(const q of b)best=Math.min(best,Math.hypot(p.u-q.u,p.v-q.v));return best;
}
function suppressRelatedFragments(analyzed,{fragmentEndpointDistance=.11,branchAttachDistance=.07}={}){
 const ranked=[...analyzed].sort((a,b)=>b.arcRatio-a.arcRatio||b.evidenceQuality-a.evidenceQuality||a.candidateId.localeCompare(b.candidateId));
 const kept=[],fragments=[];
 for(const item of ranked){
   const itemTop=topSemanticLine(item);
   let relation=null;
   for(const main of kept){
     const mainTop=topSemanticLine(main);
     if(!itemTop||itemTop!==mainTop)continue;
     const ep=endpointDistance(item,main),attach=minPointDistance(item,main);
     const shorter=item.arcRatio<=main.arcRatio*.72;
     // Broken segments of the same semantic line often terminate close to each other.
     if(ep<=fragmentEndpointDistance){relation={main,type:'LINE_FRAGMENT',endpointDistance:ep,attachDistance:attach};break;}
     // A short offshoot attached to a stronger/longer curve is a branch, not another named palm line.
     if(shorter&&attach<=branchAttachDistance){relation={main,type:'LINE_BRANCH_FRAGMENT',endpointDistance:ep,attachDistance:attach};break;}
   }
   if(relation)fragments.push({candidate:item,fragmentOf:relation.main.candidateId,type:relation.type,endpointDistance:relation.endpointDistance,attachDistance:relation.attachDistance});
   else kept.push(item);
 }
 return {kept,fragments};
}


function suppressAttachedWrinkles(analyzed,{attachDistance=.055,maxArcRatio=.34,maxSpan=.22}={}){
 // RC124: a short crease that merely touches/crosses a much longer primary crease must not become a second named line
 // only because its model hint points elsewhere. Preserve edge-specific marriage lines and independent long vertical lines.
 const ranked=[...analyzed].sort((a,b)=>b.arcRatio-a.arcRatio||b.evidenceQuality-a.evidenceQuality||a.candidateId.localeCompare(b.candidateId));
 const kept=[],suppressed=[];
 for(const item of ranked){
   let relation=null;
   const itemTop=topSemanticLine(item);
   for(const main of kept){
     const mainTop=topSemanticLine(main);
     if(!itemTop||!mainTop||itemTop===mainTop)continue;
     if(!['heart','head','life'].includes(mainTop))continue;
     if(itemTop==='marriage')continue;
     const maxItemSpan=Math.max(item.spanU,item.spanV);
     const muchShorter=item.arcRatio<=Math.min(maxArcRatio,main.arcRatio*.46);
     if(!muchShorter||maxItemSpan>maxSpan)continue;
     const d=minPointDistance(item,main),cc=crossingCount(item,main);
     if(d>attachDistance&&cc===0)continue;
     const itemBest=item.scores?.[itemTop]??0;
     const alternatives=Object.entries(item.scores||{}).filter(([k])=>k!==itemTop).sort((a,b)=>b[1]-a[1]);
     const margin=itemBest-(alternatives[0]?.[1]??0);
     // Strong independent semantics survive. Weak/ambiguous short contacts are treated as incidental wrinkles.
     if(margin>.22&&item.evidenceQuality>=.72&&item.arcRatio>.16)continue;
     relation={main,type:'ATTACHED_SHORT_WRINKLE',attachDistance:d,crossings:cc,semanticMargin:margin};break;
   }
   if(relation)suppressed.push({candidate:item,suppressedBy:relation.main.candidateId,type:relation.type,attachDistance:relation.attachDistance,crossings:relation.crossings,semanticMargin:relation.semanticMargin});
   else kept.push(item);
 }
 return {kept,suppressed};
}

function curveMinDistance(a,b){
 const pa=a?.pal||[],pb=b?.pal||[];if(!pa.length||!pb.length)return Infinity;
 let best=Infinity;for(const p of pa)for(const q of pb)best=Math.min(best,Math.hypot(p.u-q.u,p.v-q.v));
 return best;
}
function orient(a,b,c){return (b.u-a.u)*(c.v-a.v)-(b.v-a.v)*(c.u-a.u)}
function onSeg(a,b,p,eps=1e-7){return p.u>=Math.min(a.u,b.u)-eps&&p.u<=Math.max(a.u,b.u)+eps&&p.v>=Math.min(a.v,b.v)-eps&&p.v<=Math.max(a.v,b.v)+eps}
function segmentsIntersect(a,b,c,d){
 const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b),eps=1e-8;
 if(((o1>eps&&o2< -eps)||(o1< -eps&&o2>eps))&&((o3>eps&&o4< -eps)||(o3< -eps&&o4>eps)))return true;
 if(Math.abs(o1)<=eps&&onSeg(a,b,c))return true;if(Math.abs(o2)<=eps&&onSeg(a,b,d))return true;if(Math.abs(o3)<=eps&&onSeg(c,d,a))return true;if(Math.abs(o4)<=eps&&onSeg(c,d,b))return true;return false;
}
function crossingCount(a,b){
 const pa=a?.pal||[],pb=b?.pal||[];let n=0;
 for(let i=1;i<pa.length;i++)for(let j=1;j<pb.length;j++)if(segmentsIntersect(pa[i-1],pa[i],pb[j-1],pb[j]))n++;
 return n;
}
function relationStrength(a){return (a?.semanticScore??0)*(.62+.23*(a?.evidenceQuality??0)+.15*(a?.plausibility?.[a?.assignedLine]??1))}
function canAssignAs(a,line,{minimumScore,minimumEvidenceQuality,minimumPlausibility}){
 return !!a && (a.scores?.[line]??0)>=minimumScore && (a.evidenceQuality??0)>=minimumEvidenceQuality && (a.plausibility?.[line]??0)>=minimumPlausibility;
}
function applyPrimaryTopology(assigned,opts){
 const diagnostics=[];let heart=assigned.heart,head=assigned.head,life=assigned.life;
 if(heart&&head){
   const delta=heart.centroid.v-head.centroid.v;
   const overlap=polylineSimilarity(heart,head),crossings=crossingCount(heart,head);
   if(delta<-.035){
     const swapHeart=head,swapHead=heart;
     const swapAllowed=canAssignAs(swapHeart,'heart',opts)&&canAssignAs(swapHead,'head',opts);
     const swappedDelta=swapHeart.centroid.v-swapHead.centroid.v;
     const originalScore=(heart.semanticScore??0)+(head.semanticScore??0);
     const swappedScore=(swapHeart.scores?.heart??0)+(swapHead.scores?.head??0);
     if(swapAllowed&&swappedDelta>.035&&swappedScore>=originalScore*.80){
       assigned.heart={...swapHeart,semanticScore:swapHeart.scores.heart,assignedLine:'heart'};
       assigned.head={...swapHead,semanticScore:swapHead.scores.head,assignedLine:'head'};
       diagnostics.push({type:'PRIMARY_ORDER_SWAP',heartCandidateId:assigned.heart.candidateId,headCandidateId:assigned.head.candidateId,deltaBefore:delta,deltaAfter:swappedDelta});
       heart=assigned.heart;head=assigned.head;
     }else{
       const hs=(heart.semanticScore??0)*(.7+.3*(heart.evidenceQuality??0)),ds=(head.semanticScore??0)*(.7+.3*(head.evidenceQuality??0));
       const drop=hs<=ds?'heart':'head';diagnostics.push({type:'PRIMARY_ORDER_REJECT',dropped:drop,delta});delete assigned[drop];
       heart=assigned.heart;head=assigned.head;
     }
   }
   if(heart&&head){
     const ov=polylineSimilarity(heart,head),cc=crossingCount(heart,head);
     if(ov>=.72||cc>=2){
       const hs=(heart.semanticScore??0)*(.7+.3*(heart.evidenceQuality??0)),ds=(head.semanticScore??0)*(.7+.3*(head.evidenceQuality??0));
       const drop=hs<=ds?'heart':'head';diagnostics.push({type:ov>=.72?'PRIMARY_OVERLAP_REJECT':'PRIMARY_MULTI_CROSS_REJECT',dropped:drop,similarity:ov,crossings:cc});delete assigned[drop];
       heart=assigned.heart;head=assigned.head;
     }else diagnostics.push({type:'HEART_HEAD_RELATION_OK',orderDelta:heart.centroid.v-head.centroid.v,similarity:ov,crossings:cc});
   }
 }
 if(head&&life){
   const d=curveMinDistance(head,life),cc=crossingCount(head,life);
   // Head/life can share a start or be separated, but they should not occupy unrelated opposite regions.
   if(d>.42){
     const hs=(head.semanticScore??0)*(.7+.3*(head.evidenceQuality??0)),ls=(life.semanticScore??0)*(.7+.3*(life.evidenceQuality??0));
     const drop=hs<=ls?'head':'life';diagnostics.push({type:'HEAD_LIFE_DISCONNECTED_REJECT',dropped:drop,minDistance:d,crossings:cc});delete assigned[drop];
   }else diagnostics.push({type:'HEAD_LIFE_RELATION_OK',minDistance:d,crossings:cc});
 }
 return diagnostics;
}

function candidateEvidenceQuality(candidate,s){
 const contrast=clamp(candidate?.contrast??.5),continuity=clamp(candidate?.continuity??.7),source=clamp(candidate?.confidence??0);
 const pointSupport=clamp((s.img.length-1)/5),lengthSupport=clamp((s.arcRatio-.035)/.18),shapeSupport=clamp((Math.max(s.spanU,s.spanV)-.025)/.18);
 return clamp(.30*source+.20*contrast+.20*continuity+.15*pointSupport+.10*lengthSupport+.05*shapeSupport);
}
export function analyzeCandidate(candidate,geometry,{candidateId}={}){
 const s=curveStats(candidate?.polyline,geometry);if(!s)return null;
 const sourceConfidence=clamp(candidate?.confidence??0),contrast=clamp(candidate?.contrast??.5),continuity=clamp(candidate?.continuity??.7);
 const evidenceQuality=candidateEvidenceQuality(candidate,s);
 // High source probability alone is not sufficient for a usable line; tiny/noisy fragments fail closed.
 if(s.img.length<2||s.arcRatio<.035||Math.max(s.spanU,s.spanV)<.025||evidenceQuality<.38)return null;
 const raw=semanticScores(s),scores={},plausibility={};
 for(const k of LINE_KEYS){
   plausibility[k]=linePlausibility(k,s);
   const bonus=candidate?.hint===k?0.20:0; // hints may help, but can no longer override anatomy
   scores[k]=plausibility[k]===0?0:clamp((raw[k]*(0.55+0.45*sourceConfidence)+bonus)*(.72+.28*plausibility[k]));
 }
 const idRaw=String(candidate?.id??"").trim();
 return {...s,scores,plausibility,sourceConfidence,contrast,continuity,evidenceQuality,
   breakCount:evidenceCount(candidate,"breakCount","breakConfidence"),branchCount:evidenceCount(candidate,"branchCount","branchConfidence"),
   breakPoints:evidencePoints(candidate,"breakPoints","breakConfidence",geometry),branchPoints:evidencePoints(candidate,"branchPoints","branchConfidence",geometry),
   breakEvidenceConfidence:finite(candidate?.breakConfidence)?clamp(candidate.breakConfidence):0,branchEvidenceConfidence:finite(candidate?.branchConfidence)?clamp(candidate.branchConfidence):0,
   candidateId:idRaw||String(candidateId||"candidate-unknown"),hint:LINE_KEYS.includes(candidate?.hint)?candidate.hint:null};
}
export function assignPalmLines(candidates,geometry,{minimumScore=.48,minimumMargin=.05,minimumEvidenceQuality=.42,minimumPlausibility=.34,duplicateSimilarity=.82}={}){
 const analyzed=(candidates||[]).map((c,i)=>analyzeCandidate(c,geometry,{candidateId:`candidate-${i}`})).filter(Boolean);
 const dedup=suppressDuplicateCandidates(analyzed,{duplicateSimilarity});
 const related=suppressRelatedFragments(dedup.kept);
 const attached=suppressAttachedWrinkles(related.kept);
 const eligible=attached.kept;
 const all=[];for(const a of eligible)for(const [line,score] of Object.entries(a.scores))all.push({line,score,a});
 all.sort((x,y)=>y.score-x.score||y.a.evidenceQuality-x.a.evidenceQuality||x.a.candidateId.localeCompare(y.a.candidateId));
 const usedC=new Set(),usedL=new Set(),assigned={};
 for(const x of all){
   if(usedC.has(x.a.candidateId)||usedL.has(x.line)||x.score<minimumScore||x.a.evidenceQuality<minimumEvidenceQuality||(x.a.plausibility?.[x.line]??0)<minimumPlausibility)continue;
   const alt=Object.entries(x.a.scores).filter(([k])=>k!==x.line).sort((a,b)=>b[1]-a[1])[0]?.[1]??0;
   if(x.score-alt<minimumMargin)continue;
   assigned[x.line]={...x.a,semanticScore:x.score,assignedLine:x.line};usedC.add(x.a.candidateId);usedL.add(x.line);
 }
 const relationDiagnostics=applyPrimaryTopology(assigned,{minimumScore,minimumEvidenceQuality,minimumPlausibility});
 const finalUsed=new Set(Object.values(assigned).map(a=>a.candidateId));
 return {assigned,unassigned:eligible.filter(a=>!finalUsed.has(a.candidateId)),analyzed,duplicates:dedup.duplicates.map(x=>({candidateId:x.candidate.candidateId,duplicateOf:x.duplicateOf})),fragments:related.fragments.map(x=>({candidateId:x.candidate.candidateId,fragmentOf:x.fragmentOf,type:x.type,endpointDistance:x.endpointDistance,attachDistance:x.attachDistance})),attachedWrinkles:attached.suppressed.map(x=>({candidateId:x.candidate.candidateId,suppressedBy:x.suppressedBy,type:x.type,attachDistance:x.attachDistance,crossings:x.crossings,semanticMargin:x.semanticMargin})),relationDiagnostics};
}
const PRIMARY_LINE_KEYS=Object.freeze(["heart","head","life","fate"]);
function directionalShape(a){
 const du=Number(a?.end?.u)-Number(a?.start?.u),dv=Number(a?.end?.v)-Number(a?.start?.v);
 const mag=Math.hypot(du,dv);
 if(!Number.isFinite(mag)||mag<1e-9)return {directionU:null,directionV:null,directionAngleDeg:null};
 return {directionU:du/mag,directionV:dv/mag,directionAngleDeg:Math.atan2(dv,du)*180/Math.PI};
}
function measuredLineFeatures(a,{measurementAvailable=true}={}){
 if(!a)return {
   normalizedLength:null,lengthRatio:null,meanContrast:null,meanDepth:null,continuity:null,curvature:null,slope:null,
   spanU:null,spanV:null,startU:null,startV:null,endU:null,endV:null,centroidU:null,centroidV:null,
   directionU:null,directionV:null,directionAngleDeg:null,breakCount:0,branchCount:0,measurementState:"UNKNOWN"
 };
 const dir=directionalShape(a);
 return {
   normalizedLength:measurementAvailable?a.arcRatio:null,
   lengthRatio:measurementAvailable?a.arcRatio:null,
   meanContrast:measurementAvailable?a.contrast:null,
   // Until a calibrated ridge/depth model is supplied, contrast is explicitly retained as a proxy rather than pretending physical depth.
   meanDepth:measurementAvailable?a.contrast:null,
   continuity:measurementAvailable?a.continuity:null,curvature:measurementAvailable?a.curvature:null,slope:measurementAvailable?a.slope:null,
   spanU:measurementAvailable?a.spanU:null,spanV:measurementAvailable?a.spanV:null,
   startU:measurementAvailable?a.start.u:null,startV:measurementAvailable?a.start.v:null,endU:measurementAvailable?a.end.u:null,endV:measurementAvailable?a.end.v:null,
   centroidU:measurementAvailable?a.centroid.u:null,centroidV:measurementAvailable?a.centroid.v:null,
   directionU:measurementAvailable?dir.directionU:null,directionV:measurementAvailable?dir.directionV:null,directionAngleDeg:measurementAvailable?dir.directionAngleDeg:null,
   breakCount:a.breakCount,branchCount:a.branchCount,
   measurementState:measurementAvailable?"MEASURED":"UNKNOWN",depthBasis:"contrast_proxy"
 };
}
function primaryObservation(k,a,features,confidence,semanticConfidence){
 if(!PRIMARY_LINE_KEYS.includes(k))return null;
 if(!a)return {line:k,state:"UNCERTAIN",identificationConfidence:0,interpretationConfidence:0,geometry:null,qualityFlags:["LINE_NOT_RELIABLY_IDENTIFIED"]};
 const flags=[];
 if(a.continuity<.55)flags.push("LOW_CONTINUITY");
 if(a.contrast<.45)flags.push("LOW_CONTRAST");
 if(a.breakCount>0)flags.push("BREAK_EVIDENCE");
 if(a.branchCount>0)flags.push("BRANCH_EVIDENCE");
 return {line:k,state:confidence>=.72?"DETECTED":"UNCERTAIN",identificationConfidence:confidence,interpretationConfidence:semanticConfidence,
   geometry:{start:{u:features.startU,v:features.startV},end:{u:features.endU,v:features.endV},normalizedLength:features.normalizedLength,spanU:features.spanU,spanV:features.spanV,curvature:features.curvature,directionAngleDeg:features.directionAngleDeg},
   appearance:{meanContrast:features.meanContrast,meanDepth:features.meanDepth,depthBasis:features.depthBasis,continuity:features.continuity},
   topology:{breakCount:features.breakCount,branchCount:features.branchCount},qualityFlags:flags};
}
export function featureObjectFromAssignments({assignments,geometry,quality={}}){
 const lines={},primaryObservations={};
 const imageMeasurementAvailable=quality.acceptable!==false&&quality.roiComplete!==false;
 for(const k of LINE_KEYS){
   const a=assignments?.assigned?.[k];
   if(!a){
     const features=measuredLineFeatures(null);
     lines[k]={state:"UNCERTAIN",confidence:0,polyline:[],features,semantic:{},evidence:{sourceConfidence:0,semanticScore:0,evidenceQuality:0,semanticConfidence:0}};
     const obs=primaryObservation(k,null,features,0,0);if(obs)primaryObservations[k]=obs;continue;
   }
   const confidence=clamp(.45*a.sourceConfidence+.30*a.semanticScore+.25*a.evidenceQuality),semanticConfidence=clamp(.50*a.semanticScore+.30*a.evidenceQuality+.20*a.sourceConfidence);
   const detected=confidence>=.72;
   const features=measuredLineFeatures(a,{measurementAvailable:imageMeasurementAvailable});
   lines[k]={state:detected?"DETECTED":"UNCERTAIN",confidence,
     polyline:a.img.map(q=>[clamp(q.x),clamp(q.y)]),
     features,
     semantic:{startU:a.start.u,startV:a.start.v,endU:a.end.u,endV:a.end.v,centroidU:a.centroid.u,centroidV:a.centroid.v,spanU:a.spanU,spanV:a.spanV,
       palmPolyline:(a.pal||[]).map(p=>({u:p.u,v:p.v})),breakPoints:(a.breakPoints||[]).map(p=>({u:p.u,v:p.v})),branchPoints:(a.branchPoints||[]).map(p=>({u:p.u,v:p.v}))},
     evidence:{sourceConfidence:a.sourceConfidence,semanticScore:a.semanticScore,evidenceQuality:a.evidenceQuality,semanticConfidence,breakEvidenceConfidence:a.breakEvidenceConfidence,branchEvidenceConfidence:a.branchEvidenceConfidence,candidateId:a.candidateId}
   };
   const obs=primaryObservation(k,a,features,confidence,semanticConfidence);if(obs)primaryObservations[k]=obs;
 }
 return {schemaVersion:"palm-feature-v2",measurementVersion:"primary-geometry-v1",hand:{side:geometry.handedness,orientationConfidence:clamp(geometry.handednessConfidence)},quality:{acceptable:quality.acceptable!==false,blur:clamp(quality.blur??0),exposure:clamp(quality.exposure??.5),roiComplete:quality.roiComplete!==false},lines,primaryObservations};
}
