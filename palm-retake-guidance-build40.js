const LABEL={life:'生命線',head:'知能線',heart:'感情線',fate:'運命線',sun:'太陽線',wealth:'財運線',marriage:'結婚線'};
const uniq=a=>[...new Set(a.filter(Boolean))];
export function diagnosePalmRetake({photoQuality={},stability={},coverage={},feature={}}={}){
 const global=[];
 const issues=new Set(photoQuality.issues||[]);
 if(issues.has('TOO_DARK')||issues.has('SHADOW_HEAVY'))global.push({code:'LIGHTING_DARK',message:'手のひら全体に均一な明るさが当たる場所で撮影してください。'});
 if(issues.has('TOO_BRIGHT')||issues.has('HIGHLIGHT_CLIPPED'))global.push({code:'LIGHTING_BRIGHT',message:'フラッシュや強い反射を避け、線が白飛びしない明るさで撮影してください。'});
 if(issues.has('LOW_CONTRAST'))global.push({code:'LOW_CONTRAST',message:'影を避け、手のしわがはっきり見える均一な照明で撮影してください。'});
 if(issues.has('BLUR_DETECTED'))global.push({code:'BLUR',message:'スマホを固定し、手のひらにピントを合わせて撮影してください。'});
 if(issues.has('LOW_RESOLUTION'))global.push({code:'LOW_RESOLUTION',message:'手のひらが画面内で大きく写る距離で撮影してください。'});
 const names=uniq([...(coverage.retakeLines||[]),...Object.entries(stability.lines||{}).filter(([,v])=>v?.stable===false).map(([k])=>k)]);
 const lines=names.map(name=>{
  const s=stability.lines?.[name]||{}; const f=feature.lines?.[name]||{};
  const reasons=[];
  if(Number(s.stabilityScore)<.72)reasons.push('STABILITY_LOW');
  if(Number(f.confidence)<.72||Number(f.semanticConfidence)<.72||Number(f.evidenceQuality)<.72)reasons.push('DETECTION_CONFIDENCE_LOW');
  const disp=s.dispersion||{}; if(Object.values(disp).some(v=>Number(v)>.04))reasons.push('ANGLE_POSITION_SENSITIVE');
  let advice='手のひらをカメラに対して正面・平行にし、指先から手首まで入れて撮影してください。';
  if(reasons.includes('DETECTION_CONFIDENCE_LOW'))advice='この線の検出確度が低いため、線にピントを合わせ、影や反射を避けて撮影してください。';
  if(reasons.includes('ANGLE_POSITION_SENSITIVE'))advice='微小な角度差で判定が揺れています。手のひらを傾けず、カメラに対して正面・平行にして撮影してください。';
  return {line:name,label:LABEL[name]||name,reasons:uniq(reasons),advice};
 });
 const primaryCause=global[0]?.code||(lines.some(x=>x.reasons.includes('ANGLE_POSITION_SENSITIVE'))?'ANGLE_POSITION_SENSITIVE':lines.some(x=>x.reasons.includes('DETECTION_CONFIDENCE_LOW'))?'DETECTION_CONFIDENCE_LOW':'LINE_STABILITY_LOW');
 return {version:'palm-retake-guidance-v1',retakeRequired:coverage.enoughForOverall===false||lines.length>0||global.length>0,primaryCause,globalGuidance:global,lineGuidance:lines,message:[...global.map(x=>x.message),...lines.map(x=>`${x.label}: ${x.advice}`)].join(' ')};
}
