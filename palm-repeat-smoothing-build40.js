const clamp01=n=>Math.max(0,Math.min(1,Number(n)||0));
const median=a=>{const x=a.filter(Number.isFinite).sort((p,q)=>p-q);if(!x.length)return null;const m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2};
const mad=(a,m)=>median(a.map(x=>Math.abs(x-m)));
const FIELDS=['normalizedLength','lengthRatio','curvature','meanContrast','continuity','spanU','spanV'];
export function smoothRepeatLineFeatures(lines,{minCaptures=3}={}){
 const valid=(Array.isArray(lines)?lines:[]).filter(x=>x&&x.state==='DETECTED'&&x.features?.measurementState==='MEASURED');
 if(valid.length<minCaptures)return {ready:false,reason:'INSUFFICIENT_REPEAT_CAPTURES',captureCount:valid.length};
 const features={measurementState:'MEASURED'};const dispersion={};
 for(const k of FIELDS){const vals=valid.map(x=>Number(x.features?.[k])).filter(Number.isFinite);const m=median(vals);if(m==null)continue;features[k]=m;dispersion[k]=mad(vals,m)??0;}
 const conf=median(valid.map(x=>Number(x.confidence)).filter(Number.isFinite))??0;
 const semantic=median(valid.map(x=>Number(x.evidence?.semanticConfidence)).filter(Number.isFinite))??0;
 const evidence=median(valid.map(x=>Number(x.evidence?.evidenceQuality)).filter(Number.isFinite))??0;
 const normalizedDispersion=Object.entries(dispersion).map(([k,v])=>v/(k==='curvature'||k==='meanContrast'||k==='continuity'?0.12:0.10));
 // RC169: one materially unstable measurement dimension must not be hidden by median-of-fields.
 const noise=normalizedDispersion.length?Math.max(...normalizedDispersion):1;
 const stabilityScore=clamp01(Math.min(conf,semantic,evidence)*(1-Math.min(1,noise)*0.55));
 return {ready:true,captureCount:valid.length,features,dispersion,stabilityScore:Number(stabilityScore.toFixed(3)),stable:stabilityScore>=0.72,reason:stabilityScore>=0.72?null:'LINE_MEASUREMENT_UNSTABLE'};
}
export function smoothRepeatPalmLines(captures,{minCaptures=3}={}){
 const names=['life','head','heart','fate','sun','wealth','marriage'],lines={};
 for(const name of names){const samples=(Array.isArray(captures)?captures:[]).map(x=>x?.lines?.[name]).filter(Boolean);if(samples.length)lines[name]=smoothRepeatLineFeatures(samples,{minCaptures});}
 const primary=['life','head','heart','fate'].filter(k=>lines[k]);const scores=primary.map(k=>lines[k].stabilityScore).filter(Number.isFinite);
 const overall=scores.length?median(scores):0;
 return {ready:(Array.isArray(captures)?captures.length:0)>=minCaptures,lines,overallStability:Number(overall.toFixed(3)),stable:primary.length>=3&&primary.filter(k=>lines[k].stable).length>=3};
}
