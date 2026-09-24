const clamp01=n=>Math.max(0,Math.min(1,Number(n)||0));
const NAMES=['life','head','heart','fate','sun','wealth','marriage'];
export function applyPalmLineConfidenceGate(feature,stability,{minScore=0.72}={}){
 const out=structuredClone(feature||{}); out.lines=out.lines||{}; const usable=[],suppressed=[];
 for(const name of NAMES){const line=out.lines[name]; if(!line)continue; const s=stability?.lines?.[name];
  const base=Math.min(clamp01(line.confidence),clamp01(line.evidence?.semanticConfidence),clamp01(line.evidence?.evidenceQuality));
  const stable=s?.ready?clamp01(s.stabilityScore):0; const effective=Number(Math.min(base,stable).toFixed(3));
  line.stability={...(line.stability||{}),score:stable,effectiveConfidence:effective,usableForReading:effective>=minScore};
  if(effective>=minScore)usable.push(name); else {suppressed.push(name); line.state='UNSTABLE'; line.tags=[]; if(line.semantics) line.semantics={};}
 }
 out.stabilityGate={version:'palm-line-confidence-gate-v1',threshold:minScore,usableLines:usable,suppressedLines:suppressed}; return out;
}
