const LABEL={life:"生命線",head:"知能線",heart:"感情線",fate:"運命線",sun:"太陽線",wealth:"財運線",marriage:"結婚線"};
const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const uniq=a=>[...new Set(a.filter(Boolean))];
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
function stableHash(input){let h=2166136261>>>0;for(const ch of String(input||"")){h^=ch.codePointAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
const pick=(arr,seed,offset=0)=>arr[(stableHash(`${seed}|${offset}`))%arr.length];
const joinNatural=(a,seed="")=>{const x=uniq(a.map(clean));if(!x.length)return"";if(x.length===1)return x[0];const joins=["、そして","。あわせて","。さらに"];return `${x.slice(0,-1).join("、")}${pick(joins,seed,31)}${x.at(-1)}`;};
function confidenceLabel(v){v=clamp(v);return v>=.86?"高":v>=.72?"中":"参考"}
function narrativeSeed(cards,synthesis){return JSON.stringify({cards:cards.map(c=>({l:c.line,s:c.status,t:c.tags,c:Math.round(clamp(c.confidence)*100)})),themes:(synthesis?.themes||[]).map(x=>x.tag),relations:(synthesis?.relations||[]).map(x=>x.text),status:synthesis?.status||""});}
function buildEditorial(cards,synthesis,overall,overallConfidence){
 const usable=cards.filter(c=>c.status==="INTERPRETABLE");
 const primary=usable.filter(c=>["heart","head","life","fate"].includes(c.line));
 const secondary=usable.filter(c=>!["heart","head","life","fate"].includes(c.line));
 const seed=narrativeSeed(cards,synthesis),variant=stableHash(seed)%4;
 const observed=primary.slice(0,4).map((c,i)=>pick([
   `${c.label}では${c.tags?.slice(0,2).join("・")||"形状上の特徴"}が読み取れます。`,
   `${c.label}からは${c.tags?.slice(0,2).join("・")||"形状上の特徴"}が主な観察点として出ています。`,
   `${c.label}を見ると、${c.tags?.slice(0,2).join("・")||"形状上の特徴"}が確認できます。`
 ],seed,100+i));
 const relationTexts=(synthesis?.relations||[]).slice(0,2).map(x=>x.text);
 const themeTags=(synthesis?.themes||[]).slice(0,3).map(x=>x.tag);
 const keyPoints=uniq([...primary.flatMap(c=>(c.tags||[]).slice(0,2)),...themeTags]).slice(0,5);
 let headline="手相の全体像";
 if(primary.length<2)headline="確認できた線を個別に読む";
 else if(themeTags.length){const t=themeTags.slice(0,3).join("・");headline=pick([`${t}が重なる手相`,`${t}を軸に読む手相`,`${t}が主題として表れる手相`],seed,201);}
 else if(keyPoints.length){const t=keyPoints.slice(0,3).join("・");headline=pick([`${t}が目立つ手相`,`${t}を中心に見ていく手相`,`${t}が印象に残る手相`],seed,202);}
 let overview=overall;
 if(primary.length>=2){const names=primary.map(c=>c.label).join("・");overview=pick([
   `${names}を中心に見ると、${overall}`,
   `${names}を重ねて読むと、${overall}`,
   `主要線のうち${names}を軸にすると、${overall}`
 ],seed,203);}
 const evidence=[...observed,...relationTexts].slice(0,5);
 const names=primary.map(c=>c.label).join("・");
 const sec=secondary.length?secondary.map(c=>c.label).join("・"):"";
 const balance=primary.length>=2?pick([
   `一つの線だけで結論づけず、${names}の重なりを優先して読みます。${sec?`補助線では${sec}も参考にします。`:""}`,
   `${names}を別々に断定せず、共通して現れる傾向を総合の軸にします。${sec?`${sec}は補助的な根拠として扱います。`:""}`,
   `総合判断では${names}の一致点を優先します。${sec?`そのうえで${sec}を補助材料として加えます。`:""}`
 ],seed,204):pick([
   "主要線の読取根拠がまだ限られるため、確認できた線だけを個別に読みます。",
   "総合化するには主要線の根拠が足りないため、今回は見えている線の特徴を中心に示します。",
   "複数線を結びつけるだけの証拠が不足しているため、個別線の観察を優先します。"
 ],seed,205);
 const note=overallConfidence>=.72?pick([
   `今回の総合鑑定confidenceは「${confidenceLabel(overallConfidence)}」です。写真から確認できた線の形・位置関係だけを根拠にしています。`,
   `総合鑑定の確度は「${confidenceLabel(overallConfidence)}」。確認できた線形状と位置関係の範囲で読み解いています。`,
   `今回の確度は「${confidenceLabel(overallConfidence)}」です。画像で観察できた特徴だけを採用し、見えない情報は補っていません。`
 ],seed,206):pick([
   "今回の画像だけでは総合判断の確度が十分ではありません。断定せず、確認できた特徴だけを表示します。",
   "画像上の根拠がまだ弱いため、総合像は控えめに扱い、確認できた特徴だけを示します。",
   "十分な確度に達していないため、未確認の特徴は補わず、観察できた範囲に限定します。"
 ],seed,207);
 const themeSections=(synthesis?.domains||[]).filter(x=>x.status==="SUPPORTED").map(x=>({key:x.key,label:x.label,summary:x.summary,confidence:x.confidence,evidence:(x.evidence||[]).slice(0,2),tags:(x.tags||[]).slice(0,4),strengths:(x.strengths||[]).slice(0,2),cautions:(x.cautions||[]).slice(0,2),actions:(x.actions||[]).slice(0,2),guidanceSource:x.guidanceSource||"NONE"}));
 const audit=synthesis?.qualityAudit||null;
 const explanationSteps=[
   {key:"observe",label:"1. 線を確認",text:primary.length?`${primary.map(c=>c.label).join("・")}の形・位置・連続性など、画像で確認できた特徴を起点にしています。`:"画像から十分に確認できた主要線が限られるため、見えている範囲だけを使っています。"},
   {key:"combine",label:"2. 線を組み合わせる",text:(synthesis?.combinations||[]).length?`${(synthesis.combinations||[]).slice(0,2).map(x=>x.text||x.label||x.id).filter(Boolean).join(" / ")} など、複数線で重なる傾向を総合判断に使っています。`:primary.length>=2?"主要線どうしの共通点を照合し、一つの線だけでは総合傾向にしないようにしています。":"主要線が十分そろっていないため、無理に組み合わせた総合判断はしていません。"},
   {key:"filter",label:"3. 弱い根拠を除く",text:audit&&((audit.suppressedRules||[]).length||(audit.ruleConflicts||[]).length||(audit.suppressedRelations||[]).length||(audit.relationConflicts||[]).length)?"重複した根拠や、ほぼ同じ確度で矛盾した判定は総合鑑定から外しています。":"採用した根拠の間に大きな重複・競合がないことを確認しています。"}
 ];
 const explanationEvidence=uniq([...(synthesis?.combinations||[]).slice(0,3).map(x=>x.text),...(synthesis?.relations||[]).slice(0,2).map(x=>x.text),...evidence]).slice(0,6);
 const quickSummary=uniq([headline,...keyPoints.slice(0,3)]).slice(0,4);
 const detailPolicy=Object.freeze({whyCollapsed:true,evidenceCollapsed:true,lineDetailsCollapsed:true,themeEvidenceCollapsed:true});
 return Object.freeze({version:"palm-editorial-v12",narrativeVariant:`V${variant+1}`,headline,overview,keyPoints,evidence,balance,note,themeSections,explanationSteps,explanationEvidence,quickSummary,detailPolicy,confidenceLabel:confidenceLabel(overallConfidence)});
}
export function composePalmReading(feature,rules,synthesis=null){
 const by={};for(const k of Object.keys(LABEL))by[k]=[];for(const r of rules||[])if(by[r.line])by[r.line].push(r);
 const seedBase=JSON.stringify({lines:Object.entries(feature?.lines||{}).map(([k,v])=>[k,v?.state,Math.round(clamp(v?.confidence)*100)]),rules:(rules||[]).map(r=>[r.line,r.ruleId,r.tags])});
 const cards=[];
 for(const [k,label] of Object.entries(LABEL)){
   const line=feature?.lines?.[k],rs=by[k],confidence=clamp(line?.confidence),evidenceConfidence=clamp(line?.evidence?.semanticConfidence??line?.confidence),seed=`${seedBase}|${k}`;
   if(line?.state!=="DETECTED")cards.push({line:k,label,status:"UNCERTAIN",confidence,evidenceConfidence,title:`${label}は再確認`,body:pick(["この画像では十分な確度で読み取れません。線が存在しないという意味ではありません。","この写真では線を安定して特定できません。見えないことと、線がないことは区別して扱います。","現在の画像条件では判定を保留します。線が存在しないと断定するものではありません。"],seed,1),tags:[],points:[]});
   else if(!rs.length)cards.push({line:k,label,status:"DETECTED",confidence,evidenceConfidence,title:`${label}を確認`,body:pick(["線は確認できましたが、現在の判定基準で強く出ている特徴はありません。","線そのものは確認できていますが、強く意味づけできる特徴はまだ出ていません。","形は読み取れていますが、現時点では目立つ特徴を断定できるほどの根拠はありません。"],seed,2),tags:[],points:[]});
   else {const points=rs.map(x=>x.text);cards.push({line:k,label,status:"INTERPRETABLE",confidence,evidenceConfidence,title:label,body:joinNatural(points,seed),points,tags:[...new Set(rs.flatMap(x=>x.tags||[]))].slice(0,4)});}
 }
 const primary=cards.filter(x=>["life","head","heart"].includes(x.line)&&x.status!=="UNCERTAIN"),tagCount=new Map();for(const r of rules||[])for(const t of r.tags||[])tagCount.set(t,(tagCount.get(t)||0)+1);
 const top=[...tagCount].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,5).map(x=>x[0]);let overall;
 const overallSeed=`${seedBase}|${JSON.stringify(top)}|${synthesis?.status||""}`;
 if(synthesis?.status&&synthesis.status!=="INSUFFICIENT")overall=synthesis.summary;
 else if(primary.length<2)overall=pick(["主要線の読み取り確度が不足しています。より明るい場所で、手のひら全体を正面から撮影すると精度を上げられます。","主要線を総合するには情報が足りません。明るく均一な場所で手のひら全体を正面から撮り直すと判定しやすくなります。"],overallSeed,10);
 else if(top.length)overall=pick([`今回の手相では「${top.slice(0,3).join("・")}」が目立つテーマです。各線を単独で決めつけず、複数の線を合わせた手相占いとして総合的に読みます。`,`複数の線を合わせると「${top.slice(0,3).join("・")}」が中心テーマとして表れています。一つの線だけではなく、重なり方を重視して読みます。`,`今回確認できた主要線では「${top.slice(0,3).join("・")}」が共通して目立ちます。線ごとの特徴より、複数線で重なる傾向を優先します。`],overallSeed,11);
 else overall=pick(["主要線は確認できました。強い偏りよりも、複数の特徴を合わせて見るタイプの手相です。","主要線は読み取れています。単独で強く断定できる特徴より、複数の小さな傾向を合わせて見る構成です。"],overallSeed,12);
 const detected=cards.filter(c=>c.status!=="UNCERTAIN"),cardConfidence=detected.length?detected.reduce((s,c)=>s+Math.min(c.confidence,c.evidenceConfidence),0)/detected.length:0;
 const overallConfidence=synthesis?.status?Math.min(cardConfidence,clamp(synthesis.confidence)):cardConfidence;
 const editorial=buildEditorial(cards,synthesis,overall,overallConfidence);
 return Object.freeze({version:"palm-reading-v15",overall,confidence:clamp(overallConfidence),tags:top,cards,editorial,synthesis:synthesis?{status:synthesis.status,confidence:synthesis.confidence,summary:synthesis.summary,themes:synthesis.themes,relations:synthesis.relations,combinations:synthesis.combinations||[],tensions:synthesis.tensions||[],domains:synthesis.domains||[],supportedLines:synthesis.supportedLines,primaryLines:synthesis.primaryLines||[],secondaryLines:synthesis.secondaryLines||[],qualityAudit:synthesis.qualityAudit||null}:null,ruleTrace:(rules||[]).map(r=>({ruleId:r.ruleId,evidenceConfidence:clamp(r.evidenceConfidence)})),disclaimer:"この鑑定は手相占いとしての伝統的・娯楽的な解釈であり、医学的診断、寿命、将来の確定を行うものではありません。"});
}
