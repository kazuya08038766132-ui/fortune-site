const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const uniq=a=>[...new Set((a||[]).filter(Boolean))];
const stableHash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return h>>>0};
const pick=(seed,a)=>a[stableHash(seed)%a.length];
const ELEMENT_COPY={木:'成長や柔軟性',火:'表現や行動',土:'安定や基盤',金:'整理や判断',水:'洞察や流動性'};
const DOMAIN_LABEL={personality:'性格傾向',work:'仕事傾向',relations:'対人傾向',action:'行動傾向'};
const DOMAIN_GUIDANCE={
 personality:{strength:'複数の占術から見える特徴を一つに決めつけず、考え方や感じ方の幅として扱える点が持ち味です。',caution:'一つの特徴だけを自分の性格だと固定せず、場面による違いも残して読むことが大切です。',action:'共通して出ている特徴は意識しつつ、実際の経験と照らして自分に合う使い方を選ぶと活かしやすいでしょう。'},
 work:{strength:'複数の視点から確認できた特徴を、仕事の進め方や役割選びのヒントとして使いやすい構成です。',caution:'占い上の傾向だけで適職や成功を断定せず、経験・技能・環境と合わせて考えることが大切です。',action:'得意だと感じる進め方を小さく試し、実際の成果や負担感を見ながら調整すると活かしやすいでしょう。'},
 relations:{strength:'対人面を一方向から決めつけず、感情・距離感・周囲との関わりを複数の視点で見られる点が強みです。',caution:'相手の気持ちや関係の将来を占いだけで決めず、実際の対話や状況確認を優先することが大切です。',action:'自分が大切にしたいことと相手への配慮を分けて言葉にすると、特徴を関係づくりへ活かしやすいでしょう。'},
 action:{strength:'動き出し方・続け方・切り替え方を複数の占術から見比べ、自分に合う行動パターンを探しやすい点が持ち味です。',caution:'勢いや慎重さのどちらか一方を正解にせず、状況に応じて使い分ける余地を残すことが大切です。',action:'小さく始める条件と見直す時点を先に決め、実際の手応えに合わせて続け方を調整すると活かしやすいでしょう。'}
};
const DOMAIN_HINT={
 personality:['性格','思考','判断','安定','洞察','柔軟','知性','感受','自立','意志','内省','個性','包容','整理'],
 work:['仕事','達成','発展','計画','管理','実行','継続','積み重ね','研究','実業','方向性','評価','成功','才知'],
 relations:['対人','調和','協力','信頼','周囲','包容','感情','関係','援助','孤立','中庸','表現'],
 action:['行動','前進','挑戦','変化','実行','持続','柔軟','転換','再設計','伸長','進取','自立']
};
function birthEvidence(b){
 if(b?.status!=='OK')return null;
 const d=b.dayPillar||{},m=b.monthPillar||{},cards=b.premiumCards||[];
 const tags=uniq([d.element&&ELEMENT_COPY[d.element],m.element&&ELEMENT_COPY[m.element],...cards.map(x=>x?.value)]).slice(0,8);
 return {method:'birth',label:'生年月日',confidence:1,summary:`日主${d.dayMaster||d.stem||''}（${d.element||''}）を軸に、月柱${m.label||''}を重ねて読みます。`,tags,domains:{personality:tags,work:tags,relations:tags,action:tags}};
}
function nameEvidence(n){
 if(n?.status!=='OK')return null;
 const entries=n.numerology?.entries||[];const themes=uniq(entries.slice(0,5).map(x=>x.theme));
 const by={personality:[],work:[],relations:[],action:[]};
 for(const x of entries){const t=x.theme;if(!t)continue;if(['person','earth','total'].includes(x.key))by.personality.push(t);if(['person','total'].includes(x.key))by.work.push(t);if(['outer','person','earth'].includes(x.key))by.relations.push(t);if(['person','earth','total'].includes(x.key))by.action.push(t);}
 return {method:'name',label:'姓名判断',confidence:1,summary:`五格（天${n.fiveGrid?.heaven}・人${n.fiveGrid?.person}・地${n.fiveGrid?.earth}・外${n.fiveGrid?.outer}・総${n.fiveGrid?.total}）を確認しました。`,tags:themes,domains:by};
}
function palmEvidence(p){
 if(!p||!['palm-reading-v15','palm-reading-v14','palm-reading-v13','palm-reading-v12'].includes(p.version)||p.synthesis?.status!=='SUPPORTED')return null;
 const c=clamp(p.confidence);if(c<.62)return null;
 const tags=uniq([...(p.tags||[]),...(p.editorial?.keyPoints||[])].map(x=>typeof x==='string'?x:x?.tag)).slice(0,8);
 const by={personality:[],work:[],relations:[],action:[]};
 const keyMap={personality:'personality',work:'work',relations:'relations',action:'action',性格傾向:'personality',仕事傾向:'work',対人傾向:'relations',行動傾向:'action'};
 for(const d of p.synthesis?.domains||[]){const k=keyMap[d.key]||keyMap[d.label];if(k&&d.status==='SUPPORTED')by[k].push(d.summary,...(d.tags||[]));}
 return {method:'palm',label:'手相',confidence:c,summary:p.editorial?.overview||p.synthesis?.summary||'確認できた主要線を組み合わせて読みました。',tags,domains:by};
}
function domainSignals(e,domain){const direct=uniq(e.domains?.[domain]||[]).filter(Boolean);if(direct.length)return direct.slice(0,3);return e.tags.filter(t=>DOMAIN_HINT[domain].some(h=>String(t).includes(h))).slice(0,3);}
const CONCEPT_PATTERNS={
 personality:[['adaptive',/柔軟|調和|包容|感受/,'柔軟に調整する傾向'],['analytical',/判断|整理|知性|思考|洞察/,'考えを整理する傾向'],['independent',/自立|意志|個性|表現/,'自分の軸を保つ傾向']],
 work:[['steady',/継続|積み|安定|基盤/,'積み重ねを重視する傾向'],['planning',/計画|管理|整理|判断|知略/,'段取りを整える傾向'],['initiative',/行動|挑戦|発展|実行|進取/,'機会を見て動く傾向']],
 relations:[['harmony',/調和|協力|包容|支え|信頼/,'関係の調和を重視する傾向'],['dialogue',/感情|対話|表現|関係/,'対話で確かめる傾向'],['distance',/自立|距離|孤立|判断/,'適切な距離を保つ傾向']],
 action:[['deliberate',/慎重|思考|判断|整理|計画/,'考えてから動く傾向'],['active',/行動|実行|挑戦|前進|進取/,'動きながら確かめる傾向'],['adaptive',/柔軟|変化|転換|再設計/,'状況に応じて切り替える傾向'],['persistent',/継続|持続|安定|積み/,'継続を重視する傾向']]
};
function conceptsFor(key,signals){const text=(signals||[]).join('・');return (CONCEPT_PATTERNS[key]||[]).filter(([,re])=>re.test(text)).map(([id,,label])=>({id,label}));}
function agreementProfile(key,rows){
 const map=new Map();for(const r of rows)for(const c of conceptsFor(key,r.signals)){const x=map.get(c.id)||{concept:c.id,label:c.label,methods:[],evidence:[]};if(!x.methods.includes(r.method))x.methods.push(r.method);x.evidence.push(`${r.label}：${r.signals.join('・')}`);map.set(c.id,x)}
 const common=[...map.values()].filter(x=>x.methods.length>=2);
 const commonMethods=new Map();for(const c of common)for(const m of c.methods){const set=commonMethods.get(m)||new Set();set.add(c.concept);commonMethods.set(m,set)}
 const distinct=rows.map(r=>{const cs=conceptsFor(key,r.signals);const commonIds=commonMethods.get(r.method)||new Set();const unique=cs.filter(c=>!commonIds.has(c.id));return {method:r.method,label:r.label,signals:r.signals,concepts:unique};}).filter(x=>x.concepts.length||!conceptsFor(key,x.signals).length);
 return {commonSignals:common,distinctSignals:distinct};
}
function signalTone(key,text){
 const t=String(text||'');
 const map={
  personality:[[/柔軟|調和|包容|感受/,'柔らかく受け止めながら調整する力'],[/判断|整理|知性|思考|洞察/,'考えを整理して見通しを立てる力'],[/自立|意志|個性|表現/,'自分の軸を保ちながら表現する力']],
  work:[[/継続|積み|安定|基盤/,'積み重ねを形にする力'],[/計画|管理|整理|判断|知略/,'段取りを整えて進める力'],[/行動|挑戦|発展|実行|進取/,'機会を見て動き出す力']],
  relations:[[/調和|協力|包容|支え|信頼/,'相手とのバランスを整える力'],[/感情|対話|表現|関係/,'気持ちを言葉や態度で確かめる力'],[/自立|距離|孤立|判断/,'必要な距離を保って関わる力']],
  action:[[/慎重|思考|判断|整理|計画/,'考えてから動く慎重さ'],[/行動|実行|挑戦|前進|進取/,'動きながら確かめる実行力'],[/柔軟|変化|転換|再設計/,'状況に合わせて切り替える柔軟さ'],[/継続|持続|安定|積み/,'一度決めたことを続ける粘り強さ']]
 };
 for(const [re,v] of map[key]||[])if(re.test(t))return v;
 return {personality:'自分なりの考え方を組み立てる力',work:'自分に合う進め方を整える力',relations:'相手との関わり方を調整する力',action:'状況を見ながら進め方を選ぶ力'}[key];
}
function variedGuidance(key,rows,profile){
 const seed=key+'|'+rows.map(r=>r.label+':'+r.signals.join('|')).join('||');
 const raw=rows.flatMap(r=>r.signals).join('・');
 const tone=signalTone(key,raw);
 const lead=rows.map(r=>`${r.label}では「${r.signals.slice(0,2).join('・')}」`).join('、');
 const commonText=(profile?.commonSignals||[]).map(x=>x.label).join('・');
 const distinctText=(profile?.distinctSignals||[]).map(x=>`${x.label}では${x.concepts.length?x.concepts.map(c=>c.label).join('・'):x.signals.slice(0,1).join('・')}`).join('、');
 const feature=commonText?pick(seed+'f',[`複数の占術で共通して「${commonText}」が確認できます。${distinctText?`一方、${distinctText}という違いも残っています。`:''}`,`今回の${DOMAIN_LABEL[key]}では「${commonText}」が共通点です。${distinctText?`占術ごとの違いとして、${distinctText}も確認できます。`:''}`]):pick(seed+'f',[`${lead}がそれぞれ異なる角度の手掛かりとして出ています。`,`今回の${DOMAIN_LABEL[key]}では明確な共通特徴へ無理にまとめず、${lead}を別々の特徴として読みます。`]);
 const evidenceCue=rows.map(r=>`${r.label}の「${r.signals.slice(0,2).join('・')}」`).join('、');
 const strength=pick(seed+'s',[`この組み合わせでは、${tone}が持ち味として表れやすいでしょう。手掛かりの並びは${evidenceCue}です。`,`複数の占術を重ねると、${tone}を活かしやすい傾向として読めます。今回は${evidenceCue}がその根拠です。`,`共通する流れとして、${tone}が強みになりやすい組み合わせです。${evidenceCue}を一緒に見ることで、このテーマでの表れ方を絞り込めます。`,`今回の${DOMAIN_LABEL[key]}では、${evidenceCue}という並びから、${tone}を持ち味として読みます。`]);
 const cautionBase={personality:'一つの特徴だけで自分を固定せず、場面による違いも残して見る',work:'占いだけで適職や成果を決めず、技能・経験・環境も合わせて見る',relations:'相手の気持ちや関係の先を決めつけず、実際の対話を優先する',action:'慎重さと勢いのどちらかを正解にせず、状況に応じて切り替える'}[key];
 const actionBase={personality:'実際に自然にできた場面を振り返り、共通して出た特徴を使える状況から試す',work:'小さな役割や作業で試し、成果と負担感の両方を見て進め方を調整する',relations:'自分が大切にしたいことを短く言葉にし、相手の反応も確かめながら距離感を整える',action:'小さく始める条件と見直す時点を決め、手応えに応じて続け方を変える'}[key];
 const cue=rows.map(r=>r.signals[0]).filter(Boolean).slice(0,2).join('・');
 const caution=pick(seed+'c',[`注意点は、${cautionBase}ことです。`,`「${cue}」という手掛かりがあっても、${cautionBase}ことを忘れないでください。`,`今回の${DOMAIN_LABEL[key]}は「${cue}」が目立ちますが、${cautionBase}読み方が安全です。`,`特徴を活かす前提として、${cautionBase}ことがポイントです。`]);
 const action=pick(seed+'a',[`活かすなら、${actionBase}とよいでしょう。`,`「${cue}」を意識するなら、まずは${actionBase}方法が試しやすいでしょう。`,`実生活では、${actionBase}ところから確かめると、今回の「${cue}」を検証できます。`,`次の一歩としては、${actionBase}ことを一つだけ選んで試すのが現実的です。`]);
 const methodCue=rows.map(r=>`${r.label}では${r.signals.slice(0,2).join('・')}`).join('、');
 const domainLens={personality:'考え方の組み立て方',work:'役割の選び方と仕事の進め方',relations:'距離感と対話の取り方',action:'動き始める条件と続け方'}[key];
 const differentiator=pick(seed+'d',[`このテーマ固有の読み分けでは、${methodCue}という組み合わせを「${domainLens}」の手掛かりとして扱います。`,`特に${domainLens}を見るときは、${methodCue}の並びを今回固有の根拠として残します。`,`${methodCue}が同時に出ているため、${domainLens}では一つの特徴だけでなく、この組み合わせ自体を判断材料にします。`]);
 return {feature,strength,caution,action,differentiator,variant:`V${stableHash(seed)%4+1}`,tone};
}

function buildPortrait(evidence,domains){
 const supported=(domains||[]).filter(x=>x.status==='SUPPORTED');
 if(supported.length<2)return null;
 const common=[];
 for(const d of supported)for(const c of d.commonSignals||[]){if(!common.some(x=>x.concept===c.concept))common.push({...c,domain:d.key,domainLabel:d.label});}
 const methodSet=new Set(evidence.map(x=>x.method));
 const seed=supported.map(d=>`${d.key}:${(d.commonSignals||[]).map(x=>x.concept).join(',')}:${d.narrativeTone||''}`).join('|');
 const anchors=common.slice(0,3).map(x=>x.label);
 const tones=uniq(supported.map(x=>x.narrativeTone)).slice(0,3);
 let headline='複数の視点から見るあなたの人物像';
 let text;
 if(anchors.length){
  const core=anchors.join('・');
  text=pick(seed+'portrait',[
   `今回の鑑定では、${core}が複数の占術・テーマをまたいで現れています。${tones.length?`そのため、${tones.join('、')}を場面に応じて使い分ける人物像として読むことができます。`:''}`,
   `${core}が今回の総合鑑定で重なって見える中心的な特徴です。${tones.length?`一方で、${tones.join('、')}という異なる面もあり、一つの性格だけでは表し切れない構成です。`:''}`
  ]);
 }else{
  const samples=supported.slice(0,3).map(d=>`${d.label}では${d.narrativeTone}`).join('、');
  text=`今回は全テーマを通じて同じ特徴が重なるというより、${samples}がそれぞれ別の角度から現れています。無理に一つの性格へまとめず、場面によって表れ方が変わる人物像として読みます。`;
 }
 return {status:'SUPPORTED',headline,text,confidence:Math.min(...supported.map(x=>x.confidence)),methods:[...methodSet],commonAnchors:anchors,domains:supported.map(x=>x.key),note:'総合人物像は、2つ以上の横断テーマが成立した場合だけ生成し、共通点がないときは無理に共通性を作りません。'};
}

function buildReadingStory(portrait,domains){
 const supported=(domains||[]).filter(x=>x.status==='SUPPORTED');
 if(!portrait||portrait.status!=='SUPPORTED'||supported.length<2)return null;
 const order=['personality','work','relations','action'];
 const rows=order.map(k=>supported.find(x=>x.key===k)).filter(Boolean);
 const seed=rows.map(x=>`${x.key}:${x.narrativeVariant}:${x.narrativeTone}`).join('|')+'|'+(portrait.commonAnchors||[]).join('|');
 const anchor=(portrait.commonAnchors||[])[0]||rows[0]?.narrativeTone||'確認できた特徴';
 const leadDomain=rows.slice().sort((a,b)=>b.confidence-a.confidence)[0];
 const opening=pick(seed+'open:'+anchor,[
  `ここからは、上の人物像で確認した「${anchor}」が、考え方・仕事・人との関わり・動き方にどう表れやすいかを順に見ていきます。`,
  `続いて「${anchor}」を手掛かりに、同じ人物像が4つのテーマでどう形を変えるかを読み解きます。`,
  `人物像の中心にある「${anchor}」を、ここからは日常の4つの場面へ分けて確認します。`,
  `${leadDomain?.label||'各テーマ'}で見えた「${leadDomain?.narrativeTone||anchor}」も手掛かりにしながら、人物像を場面別に具体化していきます。`,
  `総合像を一つの性格に固定せず、「${anchor}」がどの場面で強く出やすいかを4テーマで見比べます。`,
  `ここからの本文では「${anchor}」を軸に、強み・注意点・活かし方までテーマごとに整理します。`
 ]);
 const transitions={
  personality:['まず性格面では、','考え方の土台を見ると、'],
  work:['その傾向を仕事の場面へ移すと、','仕事の進め方では、'],
  relations:['一方、人との関わりでは、','対人面に目を向けると、'],
  action:['そして実際に動く場面では、','最後に行動の取り方を見ると、']
 };
 const sections=rows.map((d,i)=>({key:d.key,label:d.label,text:`${pick(seed+d.key,transitions[d.key])}${d.feature} ${d.strength} ${d.differentiator||''} ${d.caution} ${d.action}`,confidence:d.confidence,methods:d.methods}));
 const lead=rows.slice().sort((a,b)=>b.confidence-a.confidence)[0];
 const closing=pick(seed+'close:'+anchor,[
  `全体では、${anchor}を軸にしつつ、${lead?.label||'各テーマ'}で確認できた傾向を実際の場面に合わせて使い分ける読み方が合っています。しっくりくる部分から試し、経験に照らして調整してください。`,
  `${lead?.label||'今回の鑑定'}で見えた${lead?.narrativeTone||anchor}を手がかりに、強みは活かせる場面を増やし、注意点は状況に応じて整える材料として使ってください。一つの型に決めつける必要はありません。`,
  `今回重なった${anchor}は、すべての場面で同じ形に出るとは限りません。${rows[rows.length-1]?.label||'行動面'}まで含め、どの場面で活きやすいかを確かめながら自分なりの使い方を選ぶのが自然です。`,
  `${anchor}という軸と、テーマごとに異なる表れ方の両方を残して読むのが今回のポイントです。結果を結論にせず、今の自分に当てはまる部分を整理する材料として活用してください。`,
  `${lead?.narrativeTone||anchor}が強く出る場面と、別の面が必要になる場面を分けて考えると、今回の結果を実生活へつなげやすくなります。まずは一つ、試しやすい行動から確かめてみてください。`,
  `複数の占術で確認できた${anchor}を土台にしながらも、場面ごとの差は残しておくのが大切です。得意な使い方を伸ばし、合わない部分は無理に採用せず、経験を基準に調整してください。`
 ]);
 return {status:'SUPPORTED',headline:'総合鑑定ストーリー',opening,sections,closing,confidence:Math.min(portrait.confidence,...rows.map(x=>x.confidence)),methods:uniq(rows.flatMap(x=>x.methods)),note:'検証済みの横断テーマだけを人物像から4領域へつなぎ、未成立テーマは物語の穴埋めに使用しません。'};
}

function normalizeSentence(s){return String(s||'').replace(/\s+/g,' ').replace(/[「」『』（）()・、。！？!?]/g,'').trim();}
function editorializeStory(story,portrait,domains,evidence){
 if(!story||story.status!=='SUPPORTED')return null;
 const seen=new Set();
 const keep=text=>{const n=normalizeSentence(text);if(!n||seen.has(n))return false;seen.add(n);return true};
 const opening=story.opening;
 keep(opening);
 const sections=[];
 for(const x of story.sections||[]){
  const bits=String(x.text||'').split(/(?<=。)/).map(v=>v.trim()).filter(Boolean);
  const compact=[];
  for(const b of bits){if(keep(b))compact.push(b)}
  sections.push({...x,text:compact.join(' ')});
 }
 const closing=keep(story.closing)?story.closing:'';
 const sourceNotes=(evidence||[]).map(x=>({method:x.method,label:x.label,text:x.summary,confidence:x.confidence}));
 return {version:'paid-editorial-v1',status:'SUPPORTED',order:['portrait','story','sources','details'],opening,sections,closing,sourceNotes,hiddenByDefault:['themes','domainsRaw'],note:'有料画面では同じ内容をテーマ・ドメイン・ストーリーで重複表示せず、本文を先に、根拠を後に配置します。'};
}

function semanticTokens(text){
 return uniq(String(text||'').replace(/[「」『』（）()、。！？!?：:／/・\s]/g,' ').split(' ').flatMap(x=>x.match(/[一-龠々ぁ-んァ-ヶA-Za-z0-9]{2,}/g)||[]).map(x=>x.toLowerCase())).filter(x=>!['今回','鑑定','占術','特徴','傾向','ことです','でしょう','読みます','確認できます'].includes(x));
}
function tokenSimilarity(a,b){
 const A=new Set(semanticTokens(a)),B=new Set(semanticTokens(b));if(!A.size||!B.size)return 0;
 let inter=0;for(const x of A)if(B.has(x))inter++;return inter/Math.max(1,Math.min(A.size,B.size));
}
function evidenceGrounding(section,domain){
 const text=String(section?.text||'');const evidence=[...(domain?.evidence||[]),...(domain?.commonSignals||[]).map(x=>x.label),...(domain?.distinctSignals||[]).flatMap(x=>x.signals||[]),domain?.narrativeTone].filter(Boolean);
 const concepts=uniq(evidence.flatMap(semanticTokens));
 const matched=concepts.filter(x=>text.includes(x));
 return {conceptCount:concepts.length,matchedCount:matched.length,matched:matched.slice(0,12),ratio:concepts.length?matched.length/concepts.length:0};
}
export function assessPaidReportQuality(portrait,editorial,domains=[]){
 if(!portrait||!editorial||editorial.status!=='SUPPORTED')return null;
 const body=[portrait.text,editorial.opening,...(editorial.sections||[]).map(x=>x.text),editorial.closing].filter(Boolean);
 const normalized=body.map(normalizeSentence);
 const issues=[];
 const duplicates=normalized.filter((x,i)=>x&&normalized.indexOf(x)!==i);
 if(duplicates.length)issues.push({code:'DUPLICATE_BLOCK',count:new Set(duplicates).size});
 const characters=body.join('').replace(/\s/g,'').length;
 if(characters<700)issues.push({code:'REPORT_TOO_THIN',characters,min:700});
 if((editorial.sections||[]).length<4)issues.push({code:'MISSING_CORE_SECTIONS',count:(editorial.sections||[]).length,min:4});
 const shortSections=(editorial.sections||[]).filter(x=>String(x.text||'').replace(/\s/g,'').length<100).map(x=>x.key);
 if(shortSections.length)issues.push({code:'THIN_SECTION',sections:shortSections});
 const prohibited=body.join('').match(/必ず|絶対|成功する|結婚する|離婚する|寿命/g)||[];
 if(prohibited.length)issues.push({code:'DETERMINISTIC_LANGUAGE',terms:uniq(prohibited)});
 const sourceCount=(editorial.sourceNotes||[]).length;
 if(sourceCount<2)issues.push({code:'INSUFFICIENT_SOURCE_NOTES',sourceCount,min:2});

 // RC151 semantic-density checks: catch paraphrase padding and sections detached from observed evidence.
 const sections=editorial.sections||[];const near=[];
 for(let i=0;i<sections.length;i++)for(let j=i+1;j<sections.length;j++){
  const similarity=tokenSimilarity(sections[i].text,sections[j].text);
  if(similarity>=.72)near.push({a:sections[i].key,b:sections[j].key,similarity:Number(similarity.toFixed(3))});
 }
 if(near.length)issues.push({code:'SEMANTIC_NEAR_DUPLICATE',pairs:near});
 const grounding=sections.map(x=>{const d=(domains||[]).find(v=>v.key===x.key);return {key:x.key,...evidenceGrounding(x,d)}});
 const ungrounded=grounding.filter(x=>x.conceptCount>=2&&x.matchedCount<1).map(x=>x.key);
 if(ungrounded.length)issues.push({code:'WEAK_EVIDENCE_GROUNDING',sections:ungrounded});
 const sectionTokens=sections.map(x=>new Set(semanticTokens(x.text)));
 const all=sectionTokens.flatMap(x=>[...x]);const unique=new Set(all);
 const semanticDiversity=all.length?unique.size/all.length:0;
 if(sections.length>=4&&semanticDiversity<.28)issues.push({code:'LOW_SEMANTIC_DIVERSITY',ratio:Number(semanticDiversity.toFixed(3)),min:.28});
 return {version:'paid-report-quality-v2',status:issues.length?'FAIL':'PASS',metrics:{characters,sections:sections.length,sourceCount,duplicateBlocks:new Set(duplicates).size,nearDuplicatePairs:near.length,semanticDiversity:Number(semanticDiversity.toFixed(3)),grounding},issues,note:'完成レポートの文章量・主要4テーマ・完全/意味近似重複・根拠接続・意味語彙の多様性・断定表現・根拠数を機械検査します。意味品質はヒューリスティック検査であり、鑑定内容の正しさを保証するものではありません。'};
}



const AUTO_REPAIRABLE_QUALITY_ISSUES=new Set(['DUPLICATE_BLOCK','REPORT_TOO_THIN','THIN_SECTION','SEMANTIC_NEAR_DUPLICATE','WEAK_EVIDENCE_GROUNDING','LOW_SEMANTIC_DIVERSITY','DETERMINISTIC_LANGUAGE']);
function stripDeterministicLanguage(text){
 return String(text||'').replace(/必ず|絶対/g,'').replace(/成功する/g,'前進につながる可能性がある').replace(/結婚する/g,'関係が深まる可能性がある').replace(/離婚する/g,'関係を見直す可能性がある').replace(/寿命/g,'長期的な傾向');
}
function repairSectionFromEvidence(domain){
 const d=domain||{};const evidence=(d.evidence||[]).filter(Boolean);const common=(d.commonSignals||[]).map(x=>x?.label).filter(Boolean);const distinct=(d.distinctSignals||[]).flatMap(x=>x?.signals||[]).filter(Boolean);const observed=uniq([...common,...distinct,d.narrativeTone].filter(Boolean)).slice(0,4);
 const lead=evidence.length?`このテーマでは、${evidence.slice(0,2).join(' ／ ')}という確認済みの根拠があります。`:'このテーマは、確認できた複数の占術の根拠だけから読みます。';
 const observedText=observed.length?`そこからは、${observed.join('・')}という要素が読み取れます。`:'';
 return stripDeterministicLanguage(`${lead}${observedText}${d.feature||''} ${d.strength||''} ${d.caution||''} ${d.action||''}`.replace(/\s+/g,' ').trim());
}
export function repairPaidEditorial(editorial,domains=[],quality){
 if(!editorial||editorial.status!=='SUPPORTED'||!quality||quality.status!=='FAIL')return null;
 const issueCodes=uniq((quality.issues||[]).map(x=>x.code));
 const unsafe=issueCodes.filter(x=>!AUTO_REPAIRABLE_QUALITY_ISSUES.has(x));
 if(unsafe.length)return {version:'paid-report-auto-repair-v1',status:'NOT_REPAIRABLE',reason:'UNSAFE_OR_STRUCTURAL_ISSUE',issueCodes,unrepairedIssues:unsafe,editorial:null};
 const byKey=new Map((domains||[]).filter(x=>x?.status==='SUPPORTED').map(x=>[x.key,x]));
 const repairedSections=(editorial.sections||[]).map(section=>{
  const d=byKey.get(section.key);if(!d)return {...section,text:stripDeterministicLanguage(section.text)};
  return {...section,text:repairSectionFromEvidence(d)};
 });
 const repaired={...editorial,version:'paid-editorial-v2',opening:stripDeterministicLanguage(editorial.opening),sections:repairedSections,closing:stripDeterministicLanguage(editorial.closing),qualityStatus:'RECHECK_REQUIRED',repair:{version:'paid-report-auto-repair-v1',triggerIssues:issueCodes,note:'表示直前の自動修復は、確認済みdomain evidenceから再構成できる文章品質問題だけを対象にします。構造・根拠不足は推測で修復しません。'}};
 return {version:'paid-report-auto-repair-v1',status:'REPAIRED',issueCodes,unrepairedIssues:[],editorial:repaired};
}

function safeFallbackText(key,domain){
 const label=domain?.label||DOMAIN_LABEL[key]||'このテーマ';
 const evidence=Array.isArray(domain?.evidence)?domain.evidence.filter(Boolean):[];
 const common=(domain?.commonSignals||[]).map(x=>x?.label).filter(Boolean);
 const distinct=(domain?.distinctSignals||[]).flatMap(x=>x?.signals||[]).filter(Boolean);
 const observed=uniq([...common,...distinct]).slice(0,3);
 const basis=evidence.length?`確認できた根拠は「${evidence.slice(0,2).join(' ／ ')}」です。`:'確認できた範囲の根拠だけを使います。';
 const focus=observed.length?`特に ${observed.join('・')} という特徴が見えています。`:`${label}は、複数の占術で確認できた範囲に限定して読みます。`;
 const actions={personality:'場面ごとに自分が考えやすい進め方を確かめ、無理に一つの性格像へ決めつけないことが活かし方になります。',work:'仕事では、実際の役割や環境と照らしながら、確認できた強みを一つずつ試す材料として使ってください。',relations:'対人面では、相手との関係や状況による違いを残しながら、しっくりくる関わり方を確かめてください。',action:'行動面では、今の状況に合う進め方を小さく試し、結果を見ながら調整する読み方が安全です。'};
 return `${basis}${focus}${actions[key]||'実際の経験と照らして、しっくりくる部分だけを判断材料として使ってください。'}`;
}
function buildSafePaidFallback(portrait,editorial,domains=[],quality){
 if(!editorial||editorial.status!=='SUPPORTED'||!quality||quality.status!=='FAIL')return null;
 const rows=(domains||[]).filter(x=>x?.status==='SUPPORTED');
 if(rows.length<2)return {version:'paid-report-safe-fallback-v1',status:'WITHHELD',reason:'INSUFFICIENT_SUPPORTED_DOMAINS',opening:'総合鑑定本文は品質基準を満たさなかったため表示を保留します。',sections:[],closing:'確認できていない内容を補って表示することはしません。'};
 const sections=rows.map(d=>({key:d.key,label:d.label,text:safeFallbackText(d.key,d),confidence:d.confidence,methods:d.methods}));
 const sourceNotes=(editorial.sourceNotes||[]).slice();
 return {version:'paid-report-safe-fallback-v1',status:'SAFE_FALLBACK',opening:'通常の総合鑑定本文が品質基準を満たさなかったため、確認済みの根拠だけから簡潔に再構成しました。断定せず、実際の経験と照らすための参考として読んでください。',sections,closing:'ここでは品質基準を満たさなかった文章をそのまま表示せず、確認できた根拠だけを残しています。情報が不足する部分は推測で埋めません。',sourceNotes,triggerIssues:(quality.issues||[]).map(x=>x.code),note:'品質ゲートFAIL時専用。元のFAIL本文をユーザー向け本文として流用せず、検証済みdomain evidenceから保守的に再構成します。'};
}

function buildDomains(evidence){
 const out=[];
 for(const key of Object.keys(DOMAIN_LABEL)){
  const rows=evidence.map(e=>({method:e.method,label:e.label,signals:domainSignals(e,key)})).filter(x=>x.signals.length);
  if(rows.length<2)continue;
  const confidence=Math.min(...rows.map(r=>evidence.find(e=>e.method===r.method).confidence));
  const evidenceText=rows.map(r=>`${r.label}：${r.signals.join('・')}`);
  const profile=agreementProfile(key,rows);
  const g=variedGuidance(key,rows,profile);
  out.push({key,label:DOMAIN_LABEL[key],status:'SUPPORTED',confidence,summary:`${rows.map(r=>r.label).join('・')}の複数の視点から、${DOMAIN_LABEL[key]}を重ねて確認します。`,feature:g.feature,strength:g.strength,caution:g.caution,action:g.action,differentiator:g.differentiator,narrativeVariant:g.variant,narrativeTone:g.tone,commonSignals:profile.commonSignals,distinctSignals:profile.distinctSignals,evidence:evidenceText,methods:rows.map(r=>r.method),note:'異なる占術の語彙を同一視せず、各占術で確認できた特徴を並べた総合解釈です。'});
 }
 return out;
}
export function assessPaidReportCohort(results=[]){
 const usable=(results||[]).filter(x=>x?.status==='SUPPORTED'&&x?.paidDisplay);
 const pairs=[];
 for(let i=0;i<usable.length;i++)for(let j=i+1;j<usable.length;j++){
  const a=usable[i],b=usable[j];
  const sectionMap=x=>Object.fromEntries((x.paidDisplay?.sections||[]).map(s=>[s.key,String(s.text||'')]));
  const A=sectionMap(a),B=sectionMap(b);const keys=uniq([...Object.keys(A),...Object.keys(B)]);
  const perSection=keys.map(key=>({key,similarity:Number(tokenSimilarity(A[key]||'',B[key]||'').toFixed(3))}));
  const mean=perSection.length?perSection.reduce((n,x)=>n+x.similarity,0)/perSection.length:1;
  const identical=keys.filter(k=>normalizeSentence(A[k])&&normalizeSentence(A[k])===normalizeSentence(B[k]));
  const full=x=>[x.portrait?.text,x.paidDisplay?.opening,...(x.paidDisplay?.sections||[]).map(s=>s.text),x.paidDisplay?.closing].filter(Boolean).join(' ');
  pairs.push({a:i,b:j,meanSimilarity:Number(mean.toFixed(3)),fullReportSimilarity:Number(tokenSimilarity(full(a),full(b)).toFixed(3)),identicalSections:identical,sections:perSection});
 }
 const high=pairs.filter(x=>x.meanSimilarity>=.82||x.identicalSections.length>=3);
 const distinctPortraits=new Set(usable.map(x=>normalizeSentence(x.portrait?.text))).size;
 const distinctClosings=new Set(usable.map(x=>normalizeSentence(x.paidDisplay?.closing))).size;
 const distinctOpenings=new Set(usable.map(x=>normalizeSentence(x.paidDisplay?.opening))).size;
 const maxFullReportSimilarity=pairs.length?Math.max(...pairs.map(x=>x.fullReportSimilarity)):0;
 const sortedFull=pairs.slice().sort((a,b)=>b.fullReportSimilarity-a.fullReportSimilarity);
 const similarityBands={ge090:pairs.filter(x=>x.fullReportSimilarity>=.90).length,ge085:pairs.filter(x=>x.fullReportSimilarity>=.85).length,ge080:pairs.filter(x=>x.fullReportSimilarity>=.80).length};
 const worstPairs=sortedFull.slice(0,10).map(x=>({a:x.a,b:x.b,fullReportSimilarity:x.fullReportSimilarity,meanSimilarity:x.meanSimilarity,highestSection:x.sections.slice().sort((a,b)=>b.similarity-a.similarity)[0]||null}));
 const issues=[];
 if(usable.length<4)issues.push({code:'COHORT_TOO_SMALL',count:usable.length,min:4});
 if(high.length)issues.push({code:'CROSS_PROFILE_OVER_SIMILAR',pairs:high.map(x=>({a:x.a,b:x.b,meanSimilarity:x.meanSimilarity,identicalSections:x.identicalSections}))});
 if(usable.length>=4&&distinctPortraits<2)issues.push({code:'PORTRAIT_COLLAPSE',distinctPortraits});
 if(usable.length>=4&&distinctClosings<2)issues.push({code:'CLOSING_COLLAPSE',distinctClosings});
 if(usable.length>=20&&distinctOpenings<6)issues.push({code:'OPENING_COLLAPSE',distinctOpenings});
 if(usable.length>=20&&maxFullReportSimilarity>=.90)issues.push({code:'FULL_REPORT_OVER_SIMILAR',maxFullReportSimilarity});
 return {version:'paid-report-cohort-differentiation-v4',status:issues.length?'FAIL':'PASS',metrics:{profiles:usable.length,pairs:pairs.length,distinctPortraits,distinctOpenings,distinctClosings,maxMeanSimilarity:pairs.length?Math.max(...pairs.map(x=>x.meanSimilarity)):0,maxFullReportSimilarity,similarityBands,worstPairs},pairs,issues,note:'複数の仮想入力を横断比較し、個別QAでは見えないテンプレート収束を検出します。占い内容の正しさではなく、入力差が有料鑑定の文章差へ反映されているかを検査します。'};
}

export function buildIntegratedFortuneSynthesis({premiumBirth,premiumName,palmReading}={}){
 const evidence=[birthEvidence(premiumBirth),nameEvidence(premiumName),palmEvidence(palmReading)].filter(Boolean);const unavailable=[];
 if(!evidence.some(x=>x.method==='birth'))unavailable.push({method:'birth',label:'生年月日',reason:premiumBirth?.status||'UNAVAILABLE'});
 if(!evidence.some(x=>x.method==='name'))unavailable.push({method:'name',label:'姓名判断',reason:premiumName?.status||'UNAVAILABLE'});
 if(!evidence.some(x=>x.method==='palm'))unavailable.push({method:'palm',label:'手相',reason:palmReading?.synthesis?.status||'UNAVAILABLE'});
 if(evidence.length<2)return {version:'integrated-fortune-v17',status:'INSUFFICIENT',confidence:0,headline:'個別鑑定を表示しています',summary:'2種類以上の検証済み鑑定がそろっていないため、占術をまたぐ総合判断は行いません。',evidence,unavailable,themes:[],domains:[]};
 const confidence=Math.min(...evidence.map(x=>x.confidence)),labels=evidence.map(x=>x.label),themes=[];
 themes.push({label:'複数の視点',text:`${labels.join('・')}の${evidence.length}つの鑑定結果を並べ、共通点と違いを確認できる形にまとめました。`,methods:evidence.map(x=>x.method)});
 const tagRows=evidence.filter(x=>x.tags.length).map(x=>({label:x.label,tags:x.tags.slice(0,3)}));if(tagRows.length>=2)themes.push({label:'各占術の注目点',text:tagRows.map(x=>`${x.label}：${x.tags.join('・')}`).join(' ／ '),methods:evidence.map(x=>x.method)});
 const domains=buildDomains(evidence);const portrait=buildPortrait(evidence,domains);const story=buildReadingStory(portrait,domains);const editorial=editorializeStory(story,portrait,domains,evidence);const initialReportQuality=assessPaidReportQuality(portrait,editorial,domains);if(editorial&&initialReportQuality)editorial.qualityStatus=initialReportQuality.status;const autoRepair=initialReportQuality?.status==='FAIL'?repairPaidEditorial(editorial,domains,initialReportQuality):null;const repairedEditorial=autoRepair?.status==='REPAIRED'?autoRepair.editorial:null;const repairedReportQuality=repairedEditorial?assessPaidReportQuality(portrait,repairedEditorial,domains):null;if(repairedEditorial&&repairedReportQuality)repairedEditorial.qualityStatus=repairedReportQuality.status;const reportQuality=repairedReportQuality||initialReportQuality;const safeFallback=buildSafePaidFallback(portrait,repairedEditorial||editorial,domains,reportQuality);const paidDisplay=initialReportQuality?.status==='PASS'?editorial:(repairedReportQuality?.status==='PASS'?repairedEditorial:safeFallback);return {version:'integrated-fortune-v17',status:'SUPPORTED',confidence,headline:`${labels.join(' × ')}の総合鑑定`,summary:'異なる占術の結果を一つの結論に無理に寄せず、それぞれの根拠を残したまま総合表示しています。',portrait,story,editorial,initialReportQuality,autoRepair,repairedEditorial,repairedReportQuality,reportQuality,safeFallback,paidDisplay,evidence,unavailable,themes,domains};
}
