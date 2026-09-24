import {chooseStrokeCount} from "./name-stroke-convention-build40.js";
export function resolveNameStrokes(name,master){
 const chars=[...String(name||"")], values=[], issues=[];
 for(const ch of chars){
  const row=master[ch];
  const r=chooseStrokeCount(row);
  if(r.status!=="OK")issues.push({char:ch,...r}); else values.push({char:ch,stroke:r.stroke,alternateStrokeCounts:r.alternateStrokeCounts||row?.alternateStrokeCounts||[],sourceSemantics:r.sourceSemantics||row?.strokeCountSemantics||"EXPLICIT_CANONICAL"});
 }
 return issues.length?{status:"DATA_VERIFY",issues}:{status:"OK",values};
}
