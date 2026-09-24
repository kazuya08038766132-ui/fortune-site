const clamp=x=>Math.max(0,Math.min(1,x)),idx=(x,y,w)=>y*w+x;
export function argmaxClasses(data,{classes,width,height}){
 if(data.length!==classes*width*height)throw Error("MASK_SIZE");const out=new Uint8Array(width*height),plane=width*height;
 for(let i=0;i<plane;i++){let best=0,bv=-Infinity;for(let c=0;c<classes;c++){const v=Number(data[c*plane+i]);if(v>bv){bv=v;best=c}}out[i]=best}return out;
}
function n8(x,y,w,h){const a=[];for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++)if(xx!==x||yy!==y)a.push([xx,yy]);return a}
function components(mask,w,h,classId,{minPixels=18}={}){
 const seen=new Uint8Array(w*h),out=[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=idx(x,y,w);if(seen[k]||mask[k]!==classId)continue;
  const q=[[x,y]],pts=[];seen[k]=1;while(q.length){const [cx,cy]=q.pop();pts.push([cx,cy]);for(const [nx,ny] of n8(cx,cy,w,h)){const j=idx(nx,ny,w);if(!seen[j]&&mask[j]===classId){seen[j]=1;q.push([nx,ny])}}}
  if(pts.length>=minPixels)out.push(pts);
 }
 out.sort((a,b)=>b.length-a.length);return out;
}
function tracePoints(pts,w,h,{maxPoints=128}={}){
 if(!pts?.length)return[];let mx=0,my=0;for(const [x,y] of pts){mx+=x;my+=y}mx/=pts.length;my/=pts.length;
 let xx=0,yy=0,xy=0;for(const [x,y] of pts){const dx=x-mx,dy=y-my;xx+=dx*dx;yy+=dy*dy;xy+=dx*dy}
 const th=.5*Math.atan2(2*xy,xx-yy),ux=Math.cos(th),uy=Math.sin(th);const sorted=[...pts].sort((a,b)=>((a[0]-mx)*ux+(a[1]-my)*uy)-((b[0]-mx)*ux+(b[1]-my)*uy));
 const step=Math.max(1,Math.ceil(sorted.length/maxPoints));return sorted.filter((_,i)=>i%step===0).map(([x,y])=>[clamp((x+.5)/w),clamp((y+.5)/h)]);
}
export function componentTrace(mask,w,h,classId,{minPixels=18,maxPoints=128}={}){return tracePoints(components(mask,w,h,classId,{minPixels})[0],w,h,{maxPoints});}
function softmaxStats(data,pixel,classId,classes,plane){
 let max=-Infinity;for(let c=0;c<classes;c++)max=Math.max(max,Number(data[c*plane+pixel]));
 let sum=0,target=0,second=0;for(let c=0;c<classes;c++){const e=Math.exp(Math.max(-80,Math.min(80,Number(data[c*plane+pixel])-max)));sum+=e;if(c===classId)target=e;}
 const p=target/Math.max(sum,1e-12);for(let c=0;c<classes;c++){if(c===classId)continue;const e=Math.exp(Math.max(-80,Math.min(80,Number(data[c*plane+pixel])-max)));second=Math.max(second,e/Math.max(sum,1e-12));}
 return {probability:p,margin:p-second};
}
function probabilityStats(data,pts,classId,classes,w,{scoreMode='logits'}={}){
 const plane=data.length/classes;let sum=0,margin=0,min=1;
 for(const [x,y] of pts){const pixel=idx(x,y,w);let p,m;
  if(scoreMode==='probability'){
   p=clamp(Number(data[classId*plane+pixel]));let second=0;for(let c=0;c<classes;c++)if(c!==classId)second=Math.max(second,clamp(Number(data[c*plane+pixel])));m=p-second;
  }else({probability:p,margin:m}=softmaxStats(data,pixel,classId,classes,plane));
  sum+=p;margin+=m;min=Math.min(min,p);
 }
 const n=Math.max(1,pts.length);return {meanProbability:sum/n,meanMargin:margin/n,minProbability:min};
}
export function principalMaskToCandidates(output,manifest){
 const dims=output.dims||manifest.output.dims;if(!Array.isArray(dims)||dims.length!==4)throw Error("OUTPUT_DIMS");
 const [,classes,h,w]=dims;if(output.data?.length!==classes*h*w)throw Error('MASK_SIZE');
 const mask=argmaxClasses(output.data,{classes,width:w,height:h}),classMap=manifest.output.classMap||{1:"heart",2:"head",3:"life"},candidates=[];
 const cfg=manifest.postprocess||{},minPixels=cfg.minPixels||18,maxPoints=cfg.maxPoints||128,minMeanProbability=Number(cfg.minMeanProbability??.55),minMeanMargin=Number(cfg.minMeanMargin??.10),scoreMode=cfg.scoreMode||'logits';
 for(const [cls,label] of Object.entries(classMap)){
  if(label==='background')continue;const classId=Number(cls);const cs=components(mask,w,h,classId,{minPixels});if(!cs.length)continue;const pts=cs[0];
  const stats=probabilityStats(output.data,pts,classId,classes,w,{scoreMode});
  if(stats.meanProbability<minMeanProbability||stats.meanMargin<minMeanMargin)continue;
  const polyline=tracePoints(pts,w,h,{maxPoints});if(polyline.length<2)continue;
  const allPixels=cs.reduce((n,c)=>n+c.length,0),dominance=pts.length/Math.max(1,allPixels),confidence=clamp(stats.meanProbability),contrast=clamp((stats.meanMargin+1)/2),continuity=clamp(dominance);
  candidates.push({id:`model-${label}`,hint:label,polyline,confidence,contrast,continuity,modelEvidence:{meanProbability:stats.meanProbability,meanMargin:stats.meanMargin,minProbability:stats.minProbability,componentPixels:pts.length,componentDominance:dominance}});
 }
 const principal=new Set(['heart','head','life']),primary=candidates.filter(c=>principal.has(c.hint)),meanConfidence=primary.length?primary.reduce((s,c)=>s+c.confidence,0)/primary.length:0,minPrincipal=Math.max(1,Math.trunc(Number(cfg.minDetectedPrincipalLines??2)));
 const visionUsable=primary.length>=minPrincipal&&meanConfidence>=Number(cfg.minVisionMeanConfidence??.60);
 return {candidates,quality:{acceptable:visionUsable,visionUsable,detectedPrincipalLines:primary.length,meanConfidence,issues:visionUsable?[]:['VISION_LOW_CONFIDENCE']},assignmentOptions:{minimumScore:Number(cfg.minimumScore??.35),minimumMargin:Number(cfg.minimumAssignmentMargin??0)}};
}
