const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const PRIMARY=new Set(["life","head","heart","fate"]);
const SECONDARY=new Set(["sun","wealth","marriage"]);
const ALL=new Set([...PRIMARY,...SECONDARY]);
const label={life:"生命線",head:"知能線",heart:"感情線",fate:"運命線",sun:"太陽線",wealth:"財運線",marriage:"結婚線"};
const lineEvidence=l=>clamp(Math.min(Number(l?.confidence)||0,Number(l?.evidence?.semanticConfidence??l?.confidence)||0,Number(l?.evidence?.evidenceQuality??l?.confidence)||0));
const uniq=a=>[...new Set(a)];
function supportedRules(feature,rules,min=.72){
 return (rules||[]).filter(r=>ALL.has(r.line)&&Number(r.evidenceConfidence)>=min&&feature?.lines?.[r.line]?.state==="DETECTED"&&lineEvidence(feature.lines[r.line])>=min);
}
// RC138: semantic audit prevents duplicate evidence from being counted twice and
// fails closed when mutually exclusive interpretations are nearly tied.
const RULE_ALIAS_FAMILIES=[
 ["HEAD_DOWN","HEAD_SHAPE_DOWNWARD"],
 ["LIFE_WIDE_ARC","LIFE_WIDE_ARC_PROFILE"]
];
const RULE_CONFLICT_GROUPS=[
 ["HEAD_LONG","HEAD_SHORT"],["HEART_LONG","HEART_SHORT"],["LIFE_LONG","LIFE_SHORT"],["FATE_CLEAR","FATE_FAINT"],
 ["SUN_CLEAR","SUN_FAINT"],["WEALTH_CLEAR","WEALTH_FAINT"],["LIFE_DEEP","LIFE_FAINT"],["HEART_DEEP","HEART_FAINT"],
 ["HEAD_STRAIGHT","HEAD_DOWN","HEAD_SHAPE_DOWNWARD"],["HEART_STRAIGHT","HEART_CURVED_PROFILE"],
 ["HEAD_JOIN_LIFE","HEAD_SEPARATE_LIFE"],["LIFE_NARROW_ARC","LIFE_WIDE_ARC","LIFE_WIDE_ARC_PROFILE"],
 ["MARRIAGE_UP","MARRIAGE_DOWN"]
];
function auditSupportedRules(rules){
 const active=new Map((rules||[]).map(r=>[r.ruleId,r])),suppressed=[],conflicts=[];
 const suppress=(r,reason,kept=null)=>{if(!r||!active.has(r.ruleId))return;active.delete(r.ruleId);suppressed.push({ruleId:r.ruleId,line:r.line,reason,keptRuleId:kept?.ruleId||null});};
 for(const family of RULE_ALIAS_FAMILIES){
  const found=family.map(id=>active.get(id)).filter(Boolean).sort((a,b)=>Number(b.evidenceConfidence)-Number(a.evidenceConfidence));
  if(found.length>1)for(const r of found.slice(1))suppress(r,"DUPLICATE_SEMANTIC_EVIDENCE",found[0]);
 }
 for(const group of RULE_CONFLICT_GROUPS){
  const found=group.map(id=>active.get(id)).filter(Boolean).sort((a,b)=>Number(b.evidenceConfidence)-Number(a.evidenceConfidence));
  if(found.length<2)continue;
  const top=found[0],runner=found[1],delta=(Number(top.evidenceConfidence)||0)-(Number(runner.evidenceConfidence)||0);
  if(delta>=.08){for(const r of found.slice(1))suppress(r,"CONFLICT_LOWER_CONFIDENCE",top);}
  else {
   const ids=found.map(r=>r.ruleId);conflicts.push({type:"AMBIGUOUS_RULE_CONFLICT",ruleIds:ids,lines:uniq(found.map(r=>r.line)),confidence:Math.min(...found.map(r=>Number(r.evidenceConfidence)||0))});
   for(const r of found)suppress(r,"AMBIGUOUS_CONFLICT");
  }
 }
 return {active:[...active.values()],suppressed,conflicts};
}
function auditRelations(relations){
 const groups=new Map();for(const r of relations||[]){if(clamp(r?.confidence)<.76)continue;const k=r.type||"UNKNOWN";if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
 const active=[],suppressed=[],conflicts=[];
 for(const [type,items] of groups){
  const sig=r=>JSON.stringify([r.value,r.intersectionZone||null]);const bySig=new Map();for(const r of items){const k=sig(r),old=bySig.get(k);if(!old||clamp(r.confidence)>clamp(old.confidence))bySig.set(k,r);}
  const unique=[...bySig.values()].sort((a,b)=>clamp(b.confidence)-clamp(a.confidence));
  if(unique.length===1){active.push(unique[0]);continue;}
  const delta=clamp(unique[0].confidence)-clamp(unique[1].confidence);
  if(delta>=.08){active.push(unique[0]);for(const r of unique.slice(1))suppressed.push({type,reason:"CONFLICT_LOWER_CONFIDENCE",value:r.value});}
  else {conflicts.push({type:"AMBIGUOUS_RELATION_CONFLICT",relation:type,confidence:Math.min(clamp(unique[0].confidence),clamp(unique[1].confidence))});for(const r of unique)suppressed.push({type,reason:"AMBIGUOUS_CONFLICT",value:r.value});}
 }
 return {active,suppressed,conflicts};
}
function sharedThemes(rules){
 const byTag=new Map();
 for(const r of rules)for(const tag of r.tags||[]){
  if(!byTag.has(tag))byTag.set(tag,new Map());
  const byLine=byTag.get(tag),prev=byLine.get(r.line);
  if(!prev||r.evidenceConfidence>prev.evidenceConfidence)byLine.set(r.line,r);
 }
 const out=[];
 for(const [tag,byLine] of byTag){
  if(byLine.size<2)continue;
  const evidence=[...byLine.values()];
  out.push({type:"SHARED_THEME",tag,lines:[...byLine.keys()],confidence:Math.min(...evidence.map(x=>Number(x.evidenceConfidence)||0)),ruleIds:evidence.map(x=>x.ruleId),text:`${evidence.map(x=>label[x.line]).join("と")}の両方に「${tag}」につながる特徴が出ています。単独の線だけでなく、複数線に共通するテーマとして読みます。`});
 }
 return out.sort((a,b)=>b.confidence-a.confidence||a.tag.localeCompare(b.tag));
}
function relationInsights(relations){
 const out=[];
 for(const r of relations||[]){
  const confidence=clamp(r?.confidence);if(confidence<.76)continue;
  if(r.type==="HEAD_LIFE_START"){
   if(r.value==="JOINED")out.push({type:"RELATION",relation:r.type,lines:["head","life"],confidence,text:"知能線と生命線の起点が近い組み合わせです。手相では、考えてから動く慎重さを補強する配置として読みます。"});
   if(r.value==="SEPARATE")out.push({type:"RELATION",relation:r.type,lines:["head","life"],confidence,text:"知能線と生命線の起点が離れる組み合わせです。手相では、自分の判断で動き出しやすい傾向を補強する配置として読みます。"});
  }
  if(r.type==="FATE_HEAD_CROSS"&&r.value===true){const z=r.intersectionZone&&r.intersectionZone!=="NONE"?`（${r.intersectionZone}）`:"";out.push({type:"RELATION",relation:r.type,lines:["fate","head"],confidence,intersectionZone:r.intersectionZone||"UNKNOWN",text:`運命線と知能線が交差する配置${z}を確認しました。総合鑑定では、方向性と考え方の特徴を別々に断定せず、交差位置も含めて組み合わせます。`});}
  if(r.type==="FATE_HEART_CROSS"&&r.value===true){const z=r.intersectionZone&&r.intersectionZone!=="NONE"?`（${r.intersectionZone}）`:"";out.push({type:"RELATION",relation:r.type,lines:["fate","heart"],confidence,intersectionZone:r.intersectionZone||"UNKNOWN",text:`運命線と感情線が交差する配置${z}を確認しました。総合鑑定では、方向性と対人・感情面の特徴を、交差位置も含めて組み合わせて読みます。`});}
 }
 return out;
}
const ruleMap=rules=>new Map(rules.map(r=>[r.ruleId,r]));
const has=(m,...ids)=>ids.some(id=>m.has(id));
function combo(rules,lines,confidence,text,key,tags=[]){return {type:"COMBINATION",key,lines,confidence:clamp(confidence),tags,text,ruleIds:rules.map(r=>r.ruleId)}}
function combinationInsights(supported){
 const m=ruleMap(supported), out=[];
 const rs=(...ids)=>ids.map(id=>m.get(id)).filter(Boolean);
 const conf=x=>x.length?Math.min(...x.map(r=>Number(r.evidenceConfidence)||0)):0;
 let x;
 x=rs("HEAD_LONG","LIFE_LONG"); if(x.length===2)out.push(combo(x,["head","life"],conf(x),"知能線の長さと生命線の継続性がそろっています。手相では、考えを深めたうえで腰を据えて続ける傾向として組み合わせて読みます。","DEEP_THINKING_AND_PERSISTENCE",["思考","継続"]));
 x=rs("HEAD_STRAIGHT","HEART_STRAIGHT"); if(x.length===2)out.push(combo(x,["head","heart"],conf(x),"知能線と感情線の両方に直線的な特徴があります。感情だけ・理屈だけに偏らず、状況を整理して判断しやすい組み合わせとして読みます。","RATIONAL_BALANCE",["現実性","冷静"]));
 x=rs("HEAD_DOWN","HEART_CURVED_PROFILE"); if(x.length===2)out.push(combo(x,["head","heart"],conf(x),"知能線の感性寄りの形と、感情線のカーブが重なっています。手相では、イメージや感情反応を活かしながら考える傾向として読みます。","SENSITIVE_IMAGINATION",["感性","感情表現"]));
 x=rs("HEAD_JOIN_LIFE","LIFE_DEEP"); if(x.length===2)out.push(combo(x,["head","life"],conf(x),"知能線と生命線の起点が近く、生命線も比較的明瞭です。慎重に状況を見てから、方針を決めると粘り強く進みやすい組み合わせとして読みます。","CAUTIOUS_STEADINESS",["慎重","安定"]));
 x=rs("HEAD_SEPARATE_LIFE","LIFE_WIDE_ARC_PROFILE"); if(x.length===2)out.push(combo(x,["head","life"],conf(x),"知能線と生命線の起点が離れ、生命線も広がりのある形です。自分で判断して動き、経験の範囲を広げやすい組み合わせとして読みます。","INDEPENDENT_EXPANSION",["自立","活動性"]));
 x=rs("FATE_CLEAR","HEAD_LONG"); if(x.length===2)out.push(combo(x,["fate","head"],conf(x),"運命線の連続性と知能線の長さがそろっています。方向性を持ちながら、考えを積み上げて進みやすい組み合わせとして読みます。","PLANNED_DIRECTION",["方向性","思考"]));
 x=rs("FATE_BRANCH","HEAD_BRANCH"); if(x.length===2)out.push(combo(x,["fate","head"],conf(x),"運命線と知能線の両方に枝分かれ傾向があります。進路と考え方の双方で、複数の選択肢を持ちやすい組み合わせとして読みます。","MULTI_PATH",["選択肢","多角的"]));
 x=rs("FATE_BROKEN","LIFE_BREAK"); if(x.length===2)out.push(combo(x,["fate","life"],conf(x),"運命線と生命線の双方に途切れ候補があります。手相では、生活面と役割・進路の節目が重なって見える配置として慎重に読みます。","LIFE_DIRECTION_TRANSITION",["転機","再選択"]));
 x=rs("SUN_CLEAR","FATE_CLEAR"); if(x.length===2)out.push(combo(x,["sun","fate"],conf(x),"太陽線と運命線がともに明瞭です。方向性を積み上げることと、表現・評価の流れが結びつきやすい補助的な組み合わせとして読みます。","DIRECTION_AND_EXPRESSION",["方向性","評価"]));
 x=rs("WEALTH_CLEAR","HEAD_STRAIGHT"); if(x.length===2)out.push(combo(x,["wealth","head"],conf(x),"財運線の明瞭さと知能線の現実的な形がそろっています。資源やお金の扱いを、感覚だけでなく整理・計画を通じて考えやすい組み合わせとして読みます。","PRACTICAL_MANAGEMENT",["管理","現実性"]));
 x=rs("MARRIAGE_CLEAR","HEART_END_BALANCED"); if(x.length===2)out.push(combo(x,["marriage","heart"],conf(x),"結婚線候補の明瞭さと、感情線のバランス型の終点が重なっています。対人関係では気持ちと現実面の両方を意識しやすい補助的な組み合わせとして読みます。","RELATIONSHIP_BALANCE",["関係性","バランス"]));
 x=rs("SUN_CLEAR","WEALTH_CLEAR","FATE_CLEAR"); if(x.length===3)out.push(combo(x,["sun","wealth","fate"],conf(x),"太陽線・財運線・運命線がそろって明瞭です。表現、資源管理、方向性の3要素が同時に確認できるため、総合鑑定では『積み上げを形にする力』という一つのテーマとして扱います。","BUILD_AND_REALIZE",["評価","管理","方向性"]));
 return out.sort((a,b)=>b.confidence-a.confidence||a.key.localeCompare(b.key));
}



function geometryCombinationInsights(feature,supported){
 const m=ruleMap(supported),out=[],L=feature?.lines||{};
 const conf=(...lines)=>Math.min(...lines.map(k=>lineEvidence(L[k])));
 const add=(key,lines,text,tags,confidence,ruleIds=[])=>{if(confidence>=.76)out.push({type:"GEOMETRY_COMBINATION",key,lines,confidence:clamp(confidence),tags,text,ruleIds});};
 const rel=(type)=>feature?.crossLineRelations?.find(r=>r.type===type);
 const hl=rel("HEAD_LIFE_START"),fh=rel("FATE_HEAD_CROSS"),fe=rel("FATE_HEART_CROSS");
 const headShape=L.head?.semantic?.shapeProfile||{},lifeShape=L.life?.semantic?.shapeProfile||{},heartShape=L.heart?.semantic?.shapeProfile||{},marriageShape=L.marriage?.semantic?.shapeProfile||{};
 if(hl?.value==="JOINED"&&headShape.terminationClass==="ULNAR_FAR")add("JOINED_START_FAR_HEAD",["head","life"],"知能線と生命線は起点が近い一方、知能線は手のひら外側まで伸びています。慎重に始めつつ、考え始めると視野を広げて検討する形として読みます。",["慎重","視野"],Math.min(clamp(hl.confidence),conf("head","life")),[...(m.has("HEAD_JOIN_LIFE")?["HEAD_JOIN_LIFE"]:[]),...(m.has("HEAD_LONG")?["HEAD_LONG"]:[])]);
 if(hl?.value==="SEPARATE"&&headShape.terminationClass==="CENTRAL")add("SEPARATE_START_COMPACT_HEAD",["head","life"],"知能線と生命線の起点は離れていますが、知能線の到達は中央寄りです。動き出しは自分で決めやすく、判断そのものは要点を絞る形として読みます。",["自立","要点"],Math.min(clamp(hl.confidence),conf("head","life")),[...(m.has("HEAD_SEPARATE_LIFE")?["HEAD_SEPARATE_LIFE"]:[])]);
 if(fh?.value===true&&["LOWER_PALM","MID_PALM","UPPER_PALM"].includes(fh.intersectionZone))add(`FATE_HEAD_CROSS_${fh.intersectionZone}`,["fate","head"],`運命線と知能線の交差が${fh.intersectionZone}にあります。方向性と考え方が接続する位置が明確なので、単なる「交差あり」ではなく、どの位置で重なるかを総合判断の根拠にします。`,["方向性","思考","位置関係"],Math.min(clamp(fh.confidence),conf("fate","head")),[...(m.has("FATE_CLEAR")?["FATE_CLEAR"]:[]),...(m.has("HEAD_LONG")?["HEAD_LONG"]:[])]);
 if(fe?.value===true&&["MID_PALM","UPPER_PALM"].includes(fe.intersectionZone))add(`FATE_HEART_CROSS_${fe.intersectionZone}`,["fate","heart"],`運命線と感情線の交差が${fe.intersectionZone}にあります。方向性と感情・対人面が接続する位置として、交差の有無だけでなく場所も含めて読みます。`,["方向性","対人","位置関係"],Math.min(clamp(fe.confidence),conf("fate","heart")),[...(m.has("FATE_CLEAR")?["FATE_CLEAR"]:[])]);
 if(headShape.terminationClass==="ULNAR_FAR"&&lifeShape.shapeClass==="WIDE_ARC")add("FAR_HEAD_WIDE_LIFE",["head","life"],"知能線が外側まで伸び、生命線も広い弧を描いています。考える範囲と行動範囲の両方を広げやすい形として組み合わせて読みます。",["視野","活動性"],conf("head","life"),[...(m.has("HEAD_LONG")?["HEAD_LONG"]:[]),...(m.has("LIFE_WIDE_ARC_PROFILE")?["LIFE_WIDE_ARC_PROFILE"]:[])]);
 if(heartShape.terminationClass==="INDEX_SIDE"&&marriageShape.terminationClass==="DEEP_INTO_PALM")add("IDEAL_HEART_DEEP_RELATION",["heart","marriage"],"感情線は人差し指側へ向かい、結婚線候補は手のひら側へ比較的深く入っています。関係性では理想や誠実さを持ちつつ、関わりを丁寧に考える形として補助的に読みます。",["理想","関係性"],conf("heart","marriage"),[...(m.has("HEART_END_INDEX")?["HEART_END_INDEX"]:[]),...(m.has("MARRIAGE_LONG")?["MARRIAGE_LONG"]:[])]);
 for(const [k,line] of Object.entries(L)){const tp=line?.semantic?.topologyPositionProfile;if(!tp)continue;
   if(tp.breakLocationState==="LOCATED"&&tp.breaks?.length){const z=tp.breaks[0].verticalZone;add(`${k.toUpperCase()}_BREAK_${z}`,[k],`${label[k]}の途切れ候補は${z}に位置しています。途切れがあるという事実だけでなく、線のどこに現れるかを補助根拠として保持します。`,["切替","位置関係"],lineEvidence(line),[]);}
   if(tp.branchLocationState==="LOCATED"&&tp.branches?.length){const z=tp.branches[0].verticalZone;add(`${k.toUpperCase()}_BRANCH_${z}`,[k],`${label[k]}の枝分かれ候補は${z}に位置しています。枝分かれ数だけでなく位置も確認できる場合に限り、展開の仕方を読む補助根拠として使います。`,["展開","位置関係"],lineEvidence(line),[]);}
 }
 return out.sort((a,b)=>b.confidence-a.confidence||a.key.localeCompare(b.key));
}

const COMBINATION_GUIDANCE={
 DEEP_THINKING_AND_PERSISTENCE:{domains:["personality","work","action"],strength:"考えを深めてから粘り強く続ける組み合わせが出ています。複雑なことでも、整理して積み上げる進め方を強みにしやすいでしょう。",caution:"考えを深めるほど着手が遅れたり、続けること自体が目的になったりしないよう、途中で区切りを置くとバランスを取りやすくなります。",action:"大きな課題は『考える段階』『試す段階』『続ける段階』に分け、一定期間ごとに方向を見直すと特徴を活かしやすくなります。"},
 RATIONAL_BALANCE:{domains:["personality","relationships","work"],strength:"理屈と感情を分けて整理しやすい組み合わせです。人や状況を一方向だけで決めつけず、落ち着いて判断する力として活かしやすいでしょう。",caution:"整理を優先しすぎると、自分や相手の感情を後回しにすることがあります。結論だけでなく気持ちの確認も挟むと偏りを抑えられます。",action:"判断するときに『事実』『自分の気持ち』『相手の事情』を分けて書き出すと、この組み合わせの良さが出やすくなります。"},
 SENSITIVE_IMAGINATION:{domains:["personality","relationships","work"],strength:"感性とイメージを使って考える組み合わせです。言葉になっていない雰囲気や発想を拾い、表現や対人理解へつなげやすい傾向があります。",caution:"感情やイメージが強い時は、事実確認より先に結論を作らないよう注意が必要です。",action:"ひらめきを一度メモに出したあと、根拠や実行条件を後から確認する二段階の進め方が合いやすいでしょう。"},
 CAUTIOUS_STEADINESS:{domains:["personality","action","work"],strength:"慎重に状況を確認し、方針を決めた後は安定して続けやすい組み合わせです。",caution:"安全を確かめる時間が長くなりすぎると、動き出す機会を逃しやすくなります。",action:"事前確認の期限を決め、その時点で得られた情報で小さく始める形にすると持ち味を活かしやすくなります。"},
 INDEPENDENT_EXPANSION:{domains:["personality","action","work"],strength:"自分で判断して動き、経験の幅を広げやすい組み合わせです。新しい環境や方法を試す時に持ち味が出やすいでしょう。",caution:"自分の判断を優先しすぎると、周囲との認識差に気づくのが遅れることがあります。",action:"自分で決める前提は保ちつつ、節目ごとに第三者の意見を一度確認すると、行動力と安定感を両立しやすくなります。"},
 PLANNED_DIRECTION:{domains:["work","action"],strength:"方向性を持ちながら考えを積み上げる組み合わせです。中長期の目標を段階化して進める場面で活かしやすいでしょう。",caution:"計画の整合性を守ろうとして、状況が変わっても修正を遅らせることがあります。",action:"目標そのものと手段を分け、手段は定期的に入れ替えられるようにすると継続しやすくなります。"},
 MULTI_PATH:{domains:["work","action","personality"],strength:"複数の選択肢を並行して考えやすい組み合わせです。一つの道に固執せず、状況に合わせて別案を持てる点が強みです。",caution:"選択肢が多いほど、決め切れずに力が分散することがあります。",action:"候補を増やす期間と、一本に絞る期限を分けて設定すると、多角性を実行力につなげやすくなります。"},
 LIFE_DIRECTION_TRANSITION:{domains:["action","work"],strength:"生活面と進路面の両方に切り替えのサインが重なるため、変化に応じて再選択できる柔軟さとして読む組み合わせです。",caution:"変化の最中は、短期的な揺れを最終結論だと受け取りすぎないことが大切です。",action:"変化が起きた時は、維持するもの・変えるもの・保留するものの三つに分けて整理すると立て直しやすくなります。"},
 DIRECTION_AND_EXPRESSION:{domains:["work"],strength:"方向性を積み上げながら、それを外へ見せる流れが重なる組み合わせです。成果を形にして伝える場面で活かしやすいでしょう。",caution:"評価を意識しすぎると、進む方向そのものより見せ方を優先しやすくなります。",action:"まず中身を積み上げ、その後に見せ方を整える順番にすると両方の特徴を活かしやすくなります。"},
 PRACTICAL_MANAGEMENT:{domains:["work","action"],strength:"現実的に整理しながら資源を管理する組み合わせです。数字・手順・優先順位を整える場面で持ち味が出やすいでしょう。",caution:"効率や管理を優先しすぎると、試行錯誤の余地を狭めることがあります。",action:"固定する項目と実験する項目を分けて管理すると、安定と改善を両立しやすくなります。"},
 RELATIONSHIP_BALANCE:{domains:["relationships","personality"],strength:"気持ちと現実的な距離感の両方を意識しやすい組み合わせです。対人関係で一方的になりにくい点が強みです。",caution:"バランスを取ろうとして、自分の希望を後回しにしすぎないよう注意が必要です。",action:"相手への配慮と自分の希望を別々に言葉にしてから伝えると、無理のない関係を作りやすくなります。"},
 BUILD_AND_REALIZE:{domains:["work","action"],strength:"方向性・表現・管理の三つがそろう組み合わせです。考えたことを積み上げ、形にして届ける一連の流れを作りやすいでしょう。",caution:"複数の要素を同時に整えようとして、完成基準が高くなりすぎることがあります。",action:"完成度を一度で上げ切らず、試作→確認→改善の順で回すと、この組み合わせを実行力へつなげやすくなります。",
 JOINED_START_FAR_HEAD:{domains:["personality","action","work"],strength:"始めは慎重でも、考え始めると視野を広げて検討できる形です。",caution:"準備に時間を使いすぎると、広く考える段階へ移るのが遅くなることがあります。",action:"着手条件を先に決め、その後は選択肢を広げて比較すると特徴を活かしやすくなります。"},
 SEPARATE_START_COMPACT_HEAD:{domains:["personality","action"],strength:"自分で動き出しやすく、判断では要点を絞りやすい形です。",caution:"早く決められる反面、検討範囲を狭くしすぎない確認が必要です。",action:"最初の判断後に一度だけ代替案を確認する習慣を入れるとバランスを取りやすくなります。"},
 FAR_HEAD_WIDE_LIFE:{domains:["personality","action","work"],strength:"考える範囲と行動範囲の両方を広げやすい組み合わせです。",caution:"広げるほど焦点が散りやすいため、優先順位を明確にすることが大切です。",action:"探索する範囲と、実際に続ける対象を分けて管理すると持ち味を活かしやすくなります。"},
 IDEAL_HEART_DEEP_RELATION:{domains:["relationships","personality"],strength:"関係性で理想を持ちながら、相手との関わりを丁寧に考えやすい形です。",caution:"理想像が強い時ほど、現実の相手との違いをそのまま確認することが大切です。",action:"大切にしたい価値観と、相手に求める条件を分けて考えると関係性を整理しやすくなります。"},
 FATE_HEAD_CROSS_LOWER_PALM:{domains:["work","action"],strength:"方向性と考え方の接点が手のひら下部にある配置です。土台づくりの段階から判断軸を持ちやすい形として読みます。",caution:"初期の判断軸を固定しすぎず、後から更新できる余地を残すことが大切です。",action:"最初に方針を置きつつ、定期的な見直し時点を決めると活かしやすくなります。"},
 FATE_HEAD_CROSS_MID_PALM:{domains:["work","action"],strength:"方向性と考え方の接点が手のひら中央にある配置です。進みながら考えを調整する形として読みます。",caution:"考え直しが増えすぎると進行が止まりやすいため、見直す条件を決めておくとよいでしょう。",action:"一定区間ごとに方針と実行結果を照合する進め方が合いやすいでしょう。"},
 FATE_HEAD_CROSS_UPPER_PALM:{domains:["work","action"],strength:"方向性と考え方の接点が手のひら上部にある配置です。積み上げた後に判断を統合する形として読みます。",caution:"後半まで判断を保留しすぎないよう、中間確認を設けると安定します。",action:"途中の仮決定と最終判断を分けて進めると特徴を活かしやすくなります。"},
 FATE_HEART_CROSS_MID_PALM:{domains:["relationships","work"],strength:"方向性と感情・対人面の接点が中央にある配置です。役割と人間関係を同時に調整する力として読みます。",caution:"どちらも大切にしようとして負担を抱え込みすぎないよう注意が必要です。",action:"役割上の判断と対人上の配慮を別々に整理してから結論を出すと扱いやすくなります。"},
 FATE_HEART_CROSS_UPPER_PALM:{domains:["relationships","work"],strength:"方向性と感情・対人面の接点が上部にある配置です。積み上げた関係や役割を踏まえて判断しやすい形として読みます。",caution:"これまでの関係性に引っ張られすぎず、今の条件も確認することが大切です。",action:"過去から続く事情と現在の希望を分けて整理すると判断しやすくなります。"}
}
};
const TENSION_GUIDANCE={
 LOGIC_AND_EMOTION:{domains:["personality","relationships"],strength:"理屈と感情の両方を使える二面性があります。",caution:"場面ごとに判断軸が切り替わるため、自分でも迷いが生じることがあります。",action:"迷った時は『事実としてどうか』『気持ちとしてどうか』を分けて確認すると整理しやすくなります。"},
 DEEP_THOUGHT_FLEXIBLE_DIRECTION:{domains:["work","action"],strength:"深く考える力を保ちながら、進路は固定しすぎない柔軟さがあります。",caution:"考えが深いぶん、方向転換の判断に時間がかかることがあります。",action:"方向そのものではなく判断基準を先に決めておくと、必要な時に切り替えやすくなります。"},
 CAUTIOUS_BASE_INDEPENDENT_START:{domains:["personality","action"],strength:"土台は慎重でも、判断場面では自分で動き出せる二面性があります。",caution:"準備段階と実行段階で自分のペースが変わるため、周囲には急に見えることがあります。",action:"事前に『準備中』『実行開始』の区切りを明確にすると、自分にも周囲にも分かりやすくなります。"}
};
function specificGuidance(key,combinations,tensions){
 const strengths=[],cautions=[],actions=[];
 for(const c of combinations||[]){const g=COMBINATION_GUIDANCE[c.key];if(!g||!g.domains.includes(key))continue;strengths.push(g.strength);cautions.push(g.caution);actions.push(g.action);}
 for(const t of tensions||[]){const g=TENSION_GUIDANCE[t.key];if(!g||!g.domains.includes(key))continue;strengths.push(g.strength);cautions.push(g.caution);actions.push(g.action);}
 return {strengths:uniq(strengths).slice(0,2),cautions:uniq(cautions).slice(0,2),actions:uniq(actions).slice(0,2)};
}

const DOMAIN_GUIDANCE={
 personality:{
  strength:(tags)=>`強みとしては、${tags.length?`「${tags.slice(0,3).join("・")}」`:`考え方と感情のバランス`}を場面に応じて使い分けやすい点が表れています。`,
  caution:(tags)=>`注意点は、${tags.length?`「${tags.slice(0,2).join("・")}」`:`自分なりの考え方`}が強く出る場面では、一度立ち止まって別の見方も確認することです。`,
  action:(tags)=>`活かし方としては、${tags.length?tags.slice(0,2).join("・"):`考える力と感情の反応`}の両方を言葉にして整理すると、持ち味を使いやすくなります。`
 },
 work:{
  strength:(tags)=>`強みとしては、${tags.length?`「${tags.slice(0,3).join("・")}」`:`方向性と積み上げ`}を仕事の進め方へ結びつけやすい点が出ています。`,
  caution:(tags)=>`注意点は、${tags.length?`「${tags.slice(0,2).join("・")}」`:`計画や方向性`}に寄りすぎると、状況変化への切り替えが遅れやすいことです。`,
  action:(tags)=>`活かし方としては、目標を小さな区切りに分け、${tags.length?tags.slice(0,2).join("・"):`考え方と方向性`}を定期的に見直す進め方が合いやすいでしょう。`
 },
 relationships:{
  strength:(tags)=>`強みとしては、${tags.length?`「${tags.slice(0,3).join("・")}」`:`気持ちと距離感`}を対人関係で調整しやすい傾向が表れています。`,
  caution:(tags)=>`注意点は、${tags.length?`「${tags.slice(0,2).join("・")}」`:`気持ちや距離感`}を自分の中だけで処理しすぎず、必要な場面では言葉で確認することです。`,
  action:(tags)=>`活かし方としては、相手への配慮と自分の希望を分けて伝えると、${tags.length?tags.slice(0,2).join("・"):`関係性のバランス`}を活かしやすくなります。`
 },
 action:{
  strength:(tags)=>`強みとしては、${tags.length?`「${tags.slice(0,3).join("・")}」`:`動き出し方と続け方`}を自分のペースで組み立てやすい点が出ています。`,
  caution:(tags)=>`注意点は、${tags.length?`「${tags.slice(0,2).join("・")}」`:`行動と継続`}のどちらかに偏ったときに、目的とのズレを見落とさないことです。`,
  action:(tags)=>`活かし方としては、最初の一歩と継続の仕組みを分けて考え、${tags.length?tags.slice(0,2).join("・"):`行動の特徴`}を無理なく続けられる形に整えるとよいでしょう。`
 }
};

const DOMAIN_DEFS={
 personality:{label:"性格傾向",lines:new Set(["head","heart","life"]),tags:new Set(["思考","感性","現実性","整理","慎重","自立","冷静","感情表現","繊細","柔軟","多角的","集中","要点","率直さ","バランス"])},
 work:{label:"仕事傾向",lines:new Set(["fate","head","sun","wealth"]),tags:new Set(["仕事","方向性","積み上げ","計画","管理","評価","表現","明確な表現","向上","実利","複線化","選択肢","継続","思考","現実性"] )},
 relationships:{label:"対人傾向",lines:new Set(["heart","marriage","fate"]),tags:new Set(["対人","関係性","共感","誠実","理想","バランス","感情表現","距離感","縁","支え","前向き","慎重"] )},
 action:{label:"行動傾向",lines:new Set(["life","head","fate"]),tags:new Set(["行動","活動性","広がり","決断","自立","慎重","準備","継続","転機","再選択","選択肢","方向性","展開","柔軟な進路"] )}
};
function domainInsights(supported,combinations,tensions){
 const out=[];
 for(const [key,def] of Object.entries(DOMAIN_DEFS)){
  const rs=supported.filter(r=>def.lines.has(r.line)&&(r.tags||[]).some(t=>def.tags.has(t)));
  const cs=(combinations||[]).filter(c=>(c.lines||[]).some(l=>def.lines.has(l))&&(c.tags||[]).some(t=>def.tags.has(t)));
  const ts=(tensions||[]).filter(t=>(t.lines||[]).every(l=>def.lines.has(l)));
  const lines=uniq([...rs.map(r=>r.line),...cs.flatMap(c=>c.lines||[]),...ts.flatMap(t=>t.lines||[])]).filter(l=>def.lines.has(l));
  const confs=[...rs.map(r=>Number(r.evidenceConfidence)||0),...cs.map(c=>Number(c.confidence)||0),...ts.map(t=>Number(t.confidence)||0)].filter(x=>x>0);
  const evidence=[...cs.map(c=>c.text),...ts.map(t=>t.text),...rs.map(r=>r.text)].filter(Boolean);
  const tags=uniq([...cs.flatMap(c=>c.tags||[]),...rs.flatMap(r=>r.tags||[])]).filter(t=>def.tags.has(t)).slice(0,4);
  const status=lines.length>=2&&lines.some(l=>PRIMARY.has(l))&&confs.length?"SUPPORTED":"INSUFFICIENT";
  const confidence=status==="SUPPORTED"?clamp(confs.reduce((a,b)=>a+b,0)/confs.length):0;
  let summary;
  if(status!=="SUPPORTED")summary=`${def.label}は、複数線を結びつけて読むだけの根拠がまだ不足しています。`;
  else if(key==="personality")summary=`複数線を合わせると、${tags.length?`「${tags.join("・")}」`:"考え方と感情の使い分け"}が性格傾向の中心として表れています。`;
  else if(key==="work")summary=`仕事面では、${tags.length?`「${tags.join("・")}」`:"方向性と積み上げ方"}を軸に読む組み合わせです。`;
  else if(key==="relationships")summary=`対人面では、${tags.length?`「${tags.join("・")}」`:"気持ちと距離感の取り方"}が複数線から重なって見えます。`;
  else summary=`行動面では、${tags.length?`「${tags.join("・")}」`:"動き出し方と続け方"}を軸に読む組み合わせです。`;
  const guidance=DOMAIN_GUIDANCE[key],specific=specificGuidance(key,cs,ts);
  const strengths=status==="SUPPORTED"&&guidance?(specific.strengths.length?specific.strengths:[guidance.strength(tags)]):[];
  const cautions=status==="SUPPORTED"&&guidance?(specific.cautions.length?specific.cautions:[guidance.caution(tags)]):[];
  const actions=status==="SUPPORTED"&&guidance?(specific.actions.length?specific.actions:[guidance.action(tags)]):[];
  const guidanceSource=status!=="SUPPORTED"?"NONE":specific.strengths.length?"COMBINATION_SPECIFIC":"DOMAIN_FALLBACK";
  out.push({type:"DOMAIN",key,label:def.label,status,confidence,lines,tags,summary,evidence:evidence.slice(0,3),strengths,cautions,actions,guidanceSource});
 }
 return out;
}

function tensionInsights(supported){
 const m=ruleMap(supported),out=[];
 const add=(ids,lines,key,text)=>{const rs=ids.map(id=>m.get(id)).filter(Boolean);if(rs.length===ids.length)out.push({type:"TENSION",key,lines,confidence:Math.min(...rs.map(r=>Number(r.evidenceConfidence)||0)),ruleIds:ids,text});};
 add(["HEAD_STRAIGHT","HEART_CURVED_PROFILE"],["head","heart"],"LOGIC_AND_EMOTION","知能線は整理・現実寄り、感情線は反応性のあるカーブです。どちらかを矛盾として消さず、場面によって理屈と感情を使い分けやすい組み合わせとして読みます。");
 add(["HEAD_LONG","FATE_SHORT"],["head","fate"],"DEEP_THOUGHT_FLEXIBLE_DIRECTION","知能線は長めですが運命線は短めです。深く考える力と、進路を時期ごとに選び直す柔軟さが同居する組み合わせとして読みます。");
 add(["LIFE_NARROW_ARC","HEAD_SEPARATE_LIFE"],["life","head"],"CAUTIOUS_BASE_INDEPENDENT_START","生命線は自分のペースを守る形ですが、知能線の起点は独立傾向です。土台は慎重でも、判断の場面では自分で動き出しやすい二面性として読みます。");
 return out;
}
export function buildPalmSynthesis(feature,rules){
 const supportedRaw=supportedRules(feature,rules),ruleAudit=auditSupportedRules(supportedRaw),supported=ruleAudit.active,relationAudit=auditRelations(feature?.crossLineRelations||[]),themes=sharedThemes(supported),relations=relationInsights(relationAudit.active),ruleCombinations=combinationInsights(supported),geometryCombinations=geometryCombinationInsights({...feature,crossLineRelations:relationAudit.active},supported),combinations=[...ruleCombinations,...geometryCombinations].sort((a,b)=>b.confidence-a.confidence||a.key.localeCompare(b.key)),tensions=tensionInsights(supported),domains=domainInsights(supported,combinations,tensions);
 const supportedLines=uniq(supportedRaw.map(r=>r.line)),primaryLines=supportedLines.filter(x=>PRIMARY.has(x)),secondaryLines=supportedLines.filter(x=>SECONDARY.has(x));
 const confidenceValues=[...supported.map(r=>Number(r.evidenceConfidence)||0),...relations.map(r=>r.confidence),...combinations.map(r=>r.confidence),...tensions.map(r=>r.confidence)];
 const confidence=confidenceValues.length?confidenceValues.reduce((a,b)=>a+b,0)/confidenceValues.length:0;
 let status="INSUFFICIENT"; if(primaryLines.length>=3)status="STRONG";else if(primaryLines.length>=2)status="SUPPORTED";
 let summary;const secondaryText=secondaryLines.length?` 補助線では${secondaryLines.map(x=>label[x]).join("・")}も確認でき、主要線の読みを補強します。`:"";
 if(status==="INSUFFICIENT")summary="主要線のうち、複数線を組み合わせて読むための確度がまだ不足しています。補助線だけで総合像を作らず、確認できた線を個別に表示します。";
 else if(combinations.length)summary=`複数線の組み合わせでは「${combinations.slice(0,2).map(x=>x.text.replace(/。.*$/,'')).join("／")}」が中心です。${secondaryText}`.trim();
 else if(themes.length)summary=`複数線を合わせると、「${themes.slice(0,3).map(x=>x.tag).join("・")}」が共通テーマとして現れています。${secondaryText}`.trim();
 else summary=`${primaryLines.map(x=>label[x]).join("・")}を軸に読むと、単一の線だけに偏らないバランス型の鑑定になります。${secondaryText}`.trim();
 return Object.freeze({version:"palm-synthesis-v8",status,confidence:clamp(confidence),supportedLines,primaryLines,secondaryLines,themes,relations,combinations,tensions,domains,summary,ruleIds:supported.map(r=>r.ruleId),qualityAudit:{version:"palm-synthesis-audit-v1",suppressedRules:ruleAudit.suppressed,ruleConflicts:ruleAudit.conflicts,suppressedRelations:relationAudit.suppressed,relationConflicts:relationAudit.conflicts}});
}
