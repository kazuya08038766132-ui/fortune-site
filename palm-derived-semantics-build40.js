const clone=x=>JSON.parse(JSON.stringify(x));
const d=(a,b)=>Math.hypot((a?.u??0)-(b?.u??0),(a?.v??0)-(b?.v??0));
const finiteSemantic=s=>[s?.startU,s?.startV,s?.endU,s?.endV].every(x=>Number.isFinite(Number(x)));
function endpoints(line){const s=line?.semantic||{};return [{u:Number(s.startU),v:Number(s.startV)},{u:Number(s.endU),v:Number(s.endV)}]}
function swapSemantic(s){[s.startU,s.endU]=[s.endU,s.startU];[s.startV,s.endV]=[s.endV,s.startV];if(Array.isArray(s.palmPolyline))s.palmPolyline.reverse()}
function orient(line,key){if(!line?.semantic||!finiteSemantic(line.semantic))return;const s=line.semantic,[a,b]=endpoints(line);if(key==="heart"){if(a.u<b.u)swapSemantic(s)}else if(key==="head"){if(a.u>b.u)swapSemantic(s)}else if(key==="life"){if(a.v<b.v)swapSemantic(s)}else if(["fate","sun","wealth"].includes(key)){if(a.v>b.v)swapSemantic(s)}else if(key==="marriage"){if(a.u<b.u)swapSemantic(s)}}
const semanticEvidence=(line,min=.78)=>{
 if(line?.state!=="DETECTED"||Number(line?.confidence)<min||!finiteSemantic(line?.semantic))return false;
 const c=line?.evidence?.semanticConfidence;
 return c==null?true:Number(c)>=min;
};
const num=x=>Number.isFinite(Number(x))?Number(x):null;
function heartTermination(u){if(!Number.isFinite(u))return "UNKNOWN";if(u<=-.28)return "INDEX_SIDE";if(u<=-.08)return "BETWEEN_INDEX_MIDDLE";if(u<=.16)return "MIDDLE_SIDE";return "OTHER"}
function originZone(s){const u=Number(s?.startU),v=Number(s?.startV);if(!Number.isFinite(u)||!Number.isFinite(v))return "UNKNOWN";if(v<-.34&&Math.abs(u)<.24)return "WRIST_CENTER";if(u<-.22)return "THUMB_SIDE";if(u>.22)return "ULNAR_SIDE";return "MID_PALM"}
function bandClass(x,lo,hi,band=.02){if(!Number.isFinite(x))return "UNKNOWN";if(x<lo-band)return "SHORT";if(x>lo+band&&x<hi-band)return "MEDIUM";if(x>=hi+band)return "LONG";return "UNCERTAIN"}
function lengthClass(key,len){if(!Number.isFinite(len))return "UNKNOWN";const t={heart:[.42,.70],head:[.44,.72],life:[.45,.75],fate:[.30,.60],sun:[.24,.48],wealth:[.20,.44],marriage:[.10,.26]}[key]||[.35,.65];return bandClass(len,t[0],t[1],.02)}
function clarityClass(f){const c=num(f?.meanContrast),q=num(f?.continuity),b=Number(f?.breakCount)||0;if(c==null||q==null)return "UNKNOWN";if(b>0||q<.56)return "FRAGMENTED";if(q<=.60)return "UNCERTAIN";if(c<.43)return "FAINT";if(c<=.47)return "UNCERTAIN";if(c>=.74&&q>=.74)return "CLEAR";if((c>=.70&&c<.74)||(q>=.70&&q<.74))return "UNCERTAIN";return "MODERATE"}
function topologyClass(f){const b=Number(f?.breakCount)||0,r=Number(f?.branchCount)||0;if(b&&r)return "BROKEN_AND_BRANCHED";if(b)return "BROKEN";if(r)return "BRANCHED";return "CLEAN"}
function lineShape(key,line){
 const f=line?.features||{},s=line?.semantic||{},len=num(f.normalizedLength??f.lengthRatio),cur=num(f.curvature);
 const p={lengthClass:lengthClass(key,len),clarityClass:clarityClass(f),topologyClass:topologyClass(f),shapeClass:"UNKNOWN",terminationClass:"UNKNOWN"};
 if(key==="heart"){
   p.shapeClass=cur==null?"UNKNOWN":cur<.23?"STRAIGHT":cur>=.57?"CURVED":(cur>=.27&&cur<.53?"MODERATE_CURVE":"UNCERTAIN");
   p.terminationClass=s.terminationZone||"UNKNOWN";
 }else if(key==="head"){
   const du=Number(s.endU)-Number(s.startU),dv=Number(s.endV)-Number(s.startV),slope=Math.abs(du)>1e-6?dv/du:null;
   p.shapeClass=slope==null?"UNKNOWN":slope<=-.24?"DOWNWARD":slope>=.22?"UPWARD":Math.abs(slope)<.12?"STRAIGHT":((slope>-.20&&slope<-.16)||(slope>.14&&slope<.18)?"GENTLE_SLOPE":"UNCERTAIN");
   p.terminationClass=Number.isFinite(Number(s.endU))?(Number(s.endU)>=.25?"ULNAR_FAR":Number(s.endU)>=.05?"ULNAR_MID":"CENTRAL"):"UNKNOWN";
 }else if(key==="life"){
   const span=num(f.spanU);
   p.shapeClass=span==null?"UNKNOWN":span>=.44?"WIDE_ARC":span<.22?"NARROW_ARC":(span>=.26&&span<.40?"MEDIUM_ARC":"UNCERTAIN");
   p.terminationClass=Number.isFinite(Number(s.endV))?(Number(s.endV)<=-.24?"WRIST_REACH":Number(s.endV)<=.02?"LOWER_PALM":"MID_PALM"):"UNKNOWN";
 }else if(key==="fate"){
   const ev=Number(s.endV);
   p.shapeClass=(num(f.spanV)!=null&&num(f.spanU)!=null&&f.spanV>f.spanU*1.8)?"VERTICAL":"SLANTED";
   p.terminationClass=Number.isFinite(ev)?(ev>=.30?"UPPER_PALM":ev>=.06?"MID_PALM":"LOWER_PALM"):"UNKNOWN";
   p.originClass=s.originZone||"UNKNOWN";
 }else if(key==="sun"){
   const ev=Number(s.endV), spanV=num(f.spanV), spanU=num(f.spanU);
   p.shapeClass=(spanV!=null&&spanU!=null&&spanV>spanU*1.7)?"VERTICAL":"SLANTED";
   p.terminationClass=Number.isFinite(ev)?(ev>=.34?"APOLLO_MOUNT":ev>=.10?"UPPER_PALM":"MID_PALM"):"UNKNOWN";
   p.originClass=s.originZone||"UNKNOWN";
 }else if(key==="wealth"){
   const ev=Number(s.endV), spanV=num(f.spanV), spanU=num(f.spanU);
   p.shapeClass=(spanV!=null&&spanU!=null&&spanV>spanU*1.55)?"VERTICAL":"SLANTED";
   p.terminationClass=Number.isFinite(ev)?(ev>=.30?"MERCURY_MOUNT":ev>=.08?"UPPER_PALM":"MID_PALM"):"UNKNOWN";
   p.originClass=s.originZone||"UNKNOWN";
 }else if(key==="marriage"){
   const du=Number(s.endU)-Number(s.startU),dv=Number(s.endV)-Number(s.startV),slope=Math.abs(du)>1e-6?dv/du:null;
   p.shapeClass=slope==null?"UNKNOWN":Math.abs(slope)<.12?"HORIZONTAL":slope<=-.12?"DOWNWARD":"UPWARD";
   p.terminationClass=Number.isFinite(Number(s.endU))?(Number(s.endU)<=.24?"DEEP_INTO_PALM":Number(s.endU)<=.40?"MID_EDGE":"EDGE_SHORT"):"UNKNOWN";
 }
 return p;
}
function orient2(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])}
function onSeg(a,b,p,eps=1e-8){return p[0]>=Math.min(a[0],b[0])-eps&&p[0]<=Math.max(a[0],b[0])+eps&&p[1]>=Math.min(a[1],b[1])-eps&&p[1]<=Math.max(a[1],b[1])+eps}
function intersects(a,b,c,d){const o1=orient2(a,b,c),o2=orient2(a,b,d),o3=orient2(c,d,a),o4=orient2(c,d,b),e=1e-8;if(((o1>e&&o2<-e)||(o1<-e&&o2>e))&&((o3>e&&o4<-e)||(o3<-e&&o4>e)))return true;if(Math.abs(o1)<=e&&onSeg(a,b,c))return true;if(Math.abs(o2)<=e&&onSeg(a,b,d))return true;if(Math.abs(o3)<=e&&onSeg(c,d,a))return true;if(Math.abs(o4)<=e&&onSeg(c,d,b))return true;return false}
function segmentIntersection(a,b,c,d){
 const x1=a[0],y1=a[1],x2=b[0],y2=b[1],x3=c[0],y3=c[1],x4=d[0],y4=d[1];
 const den=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);if(Math.abs(den)<1e-9)return null;
 const px=((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/den;
 const py=((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/den;
 if(!onSeg(a,b,[px,py],1e-7)||!onSeg(c,d,[px,py],1e-7))return null;return [px,py];
}
function semanticPolyline(line){const p=line?.semantic?.palmPolyline||[];return p.map(x=>[Number(x?.u),Number(x?.v)]).filter(x=>x.every(Number.isFinite))}
function polyIntersections(a,b){const p=semanticPolyline(a),q=semanticPolyline(b),out=[];for(let i=1;i<p.length;i++)for(let j=1;j<q.length;j++){if(!intersects(p[i-1],p[i],q[j-1],q[j]))continue;const pt=segmentIntersection(p[i-1],p[i],q[j-1],q[j]);if(pt&&!out.some(z=>Math.hypot(z.u-pt[0],z.v-pt[1])<.015))out.push({u:pt[0],v:pt[1]});}return out}
function polyCross(a,b){return polyIntersections(a,b).length>0}
function verticalZone(v){if(!Number.isFinite(Number(v)))return "UNKNOWN";v=Number(v);if(v>=.26)return "UPPER_PALM";if(v>=.02)return "MID_PALM";if(v>=-.24)return "LOWER_PALM";return "WRIST_SIDE"}
function horizontalZone(u){if(!Number.isFinite(Number(u)))return "UNKNOWN";u=Number(u);if(u<=-.22)return "THUMB_SIDE";if(u>=.22)return "ULNAR_SIDE";return "CENTER"}
function pointProfile(points){return (points||[]).map(p=>({u:p.u,v:p.v,verticalZone:verticalZone(p.v),horizontalZone:horizontalZone(p.u)}))}
function relationConfidence(...lines){return Math.min(...lines.map(l=>Number(l?.evidence?.semanticConfidence??l?.confidence)||0))}
export function derivePalmSemantics(feature){
 const x=clone(feature);const L=x.lines||{},qualityOk=x?.quality?.acceptable!==false&&x?.quality?.roiComplete!==false;for(const k of Object.keys(L))orient(L[k],k);
 if(L.heart?.semantic)L.heart.semantic.terminationZone=semanticEvidence(L.heart,.78)?heartTermination(Number(L.heart.semantic.endU)):"UNKNOWN";
 for(const key of ["fate","sun","wealth"])if(L[key]?.semantic)L[key].semantic.originZone=semanticEvidence(L[key],.80)?originZone(L[key].semantic):"UNKNOWN";
 if(L.head?.semantic&&L.life?.semantic&&semanticEvidence(L.head,.78)&&semanticEvidence(L.life,.78)){
  const h={u:Number(L.head.semantic.startU),v:Number(L.head.semantic.startV)},l={u:Number(L.life.semantic.startU),v:Number(L.life.semantic.startV)},distance=d(h,l);
  if(Number.isFinite(distance)){L.head.semantic.lifeLineStartDistance=distance;L.head.semantic.joinedToLifeStart=distance<=.12;L.head.semantic.joinedToLifeStartConfidence=Math.min(Number(L.head.evidence?.semanticConfidence??L.head.confidence),Number(L.life.evidence?.semanticConfidence??L.life.confidence));}
 }else if(L.head?.semantic){delete L.head.semantic.lifeLineStartDistance;delete L.head.semantic.joinedToLifeStart;delete L.head.semantic.joinedToLifeStartConfidence}
 for(const key of ["heart","head","life","fate","sun","wealth","marriage"]){const line=L[key];if(line?.semantic){line.semantic.shapeProfile=(qualityOk&&line?.features?.measurementState==="MEASURED"&&semanticEvidence(line,key==="marriage"?.80:.72))?lineShape(key,line):{lengthClass:"UNKNOWN",clarityClass:"UNKNOWN",topologyClass:"UNKNOWN",shapeClass:"UNKNOWN",terminationClass:"UNKNOWN"};
   const bp=qualityOk&&semanticEvidence(line,.76)?pointProfile(line.semantic.breakPoints):[];const rp=qualityOk&&semanticEvidence(line,.76)?pointProfile(line.semantic.branchPoints):[];
   line.semantic.topologyPositionProfile={breaks:bp,branches:rp,breakLocationState:bp.length?"LOCATED":((line.features?.breakCount||0)>0?"UNLOCATED":"NONE"),branchLocationState:rp.length?"LOCATED":((line.features?.branchCount||0)>0?"UNLOCATED":"NONE")};
 }}
 const relations=[];
 if(qualityOk&&semanticEvidence(L.heart,.76)&&semanticEvidence(L.head,.76))relations.push({type:"HEART_HEAD_VERTICAL_GAP",value:Number(L.heart.semantic.centroidV)-Number(L.head.semantic.centroidV),confidence:relationConfidence(L.heart,L.head)});
 if(qualityOk&&semanticEvidence(L.head,.76)&&semanticEvidence(L.life,.76)&&typeof L.head.semantic.joinedToLifeStart==="boolean")relations.push({type:"HEAD_LIFE_START",value:L.head.semantic.joinedToLifeStart?"JOINED":"SEPARATE",distance:L.head.semantic.lifeLineStartDistance,startZone:{head:horizontalZone(L.head.semantic.startU),life:horizontalZone(L.life.semantic.startU)},confidence:relationConfidence(L.head,L.life)});
 if(qualityOk&&semanticEvidence(L.fate,.78)&&semanticEvidence(L.head,.76)){const pts=polyIntersections(L.fate,L.head);relations.push({type:"FATE_HEAD_CROSS",value:pts.length>0,intersections:pointProfile(pts),intersectionZone:pts.length?verticalZone(pts[0].v):"NONE",confidence:relationConfidence(L.fate,L.head)});}
 if(qualityOk&&semanticEvidence(L.fate,.78)&&semanticEvidence(L.heart,.76)){const pts=polyIntersections(L.fate,L.heart);relations.push({type:"FATE_HEART_CROSS",value:pts.length>0,intersections:pointProfile(pts),intersectionZone:pts.length?verticalZone(pts[0].v):"NONE",confidence:relationConfidence(L.fate,L.heart)});}
 x.crossLineRelations=relations;
 x.analysisMethodVersion="palm-analysis-method-v4";
 return x;
}
