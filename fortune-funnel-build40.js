// RC286: server-only policy and composition. Never put this file on the static allowlist.
import {buildBirthReading} from './birth-reading-service-build40.js';
import {validateBirthDate} from './birth-date-policy-build40.js';
import {composeFriendlyFreeReading} from './free-reading-synthesis-build40.js';
import {buildIntegratedFortuneSynthesis} from './integrated-fortune-synthesis-build40.js';
import {annotatePalmHistoryRows} from './palm-history-read-guard-build40.js';
import crypto from 'node:crypto';

export const FORTUNE_TYPES=Object.freeze(['shichusuimei','name','palm']);
export const FORTUNE_LABELS=Object.freeze({shichusuimei:'四柱推命',name:'姓名判断',palm:'手相'});
export const FUNNEL_SCHEMA='fortune-funnel-v1';
export const fortuneInputDigest=input=>crypto.createHash('sha256').update(JSON.stringify([
 input.familyName,input.givenName,input.birthDate,input.palmAssetId??null,input.palmPhotoSelected===true
])).digest('hex');
const oneLine=s=>String(s||'').replace(/\s+/g,' ').trim();
const excerpt=s=>oneLine(s).split(/(?<=。)/u).slice(0,2).join('').slice(0,140);
const entry=(raw,key)=>raw?.numerology?.entries?.find(x=>x.key===key);
const section=(title,text,value='')=>({title,text,value});

export function normalizeFortuneInput(raw={}){
 const str=k=>typeof raw?.[k]==='string'?raw[k].trim():'';
 const familyName=str('familyName'),givenName=str('givenName'),birthDate=str('birthDate');
 if(!familyName||!givenName||familyName.length>40||givenName.length>40)return {ok:false,status:'INVALID_NAME'};
 const date=validateBirthDate(birthDate);
 if(!date.ok)return {ok:false,status:date.status};
 const id=raw?.palmAssetId;
 if(id!==undefined&&id!==null&&(!Number.isSafeInteger(Number(id))||Number(id)<=0))return {ok:false,status:'INVALID_PALM_ASSET'};
 return {ok:true,input:{familyName,givenName,birthDate,palmAssetId:id==null?null:Number(id),palmPhotoSelected:raw?.palmPhotoSelected===true}};
}

export async function readFreeChoice(pool,accountId){
 if(!accountId)return null;
 const q=await pool.query('SELECT fortune_type,selected_at,reading_input FROM account_free_fortunes WHERE account_id=$1 LIMIT 1',[accountId]);
 return q.rows[0]||null;
}

export async function fixFreeChoice(pool,{accountId,fortuneType,confirmed,input}){
 if(!accountId)return {status:'ACCOUNT_REQUIRED'};
 if(!FORTUNE_TYPES.includes(fortuneType))return {status:'INVALID_FORTUNE_TYPE'};
 if(confirmed!==true)return {status:'CONFIRMATION_REQUIRED'};
 // The unique account key arbitrates simultaneous requests and different devices.
 await pool.query(`INSERT INTO account_free_fortunes(account_id,fortune_type,reading_input)
  VALUES($1,$2,$3) ON CONFLICT(account_id) DO NOTHING`,[accountId,fortuneType,input]);
 const saved=await readFreeChoice(pool,accountId);
 if(!saved||saved.fortune_type!==fortuneType)return {status:'FREE_SELECTION_LOCKED',freeFortuneType:saved?.fortune_type||null};
 await pool.query('UPDATE account_free_fortunes SET reading_input=$2 WHERE account_id=$1',[accountId,input]);
 return {status:'OK',freeFortuneType:saved.fortune_type,selectedAt:saved.selected_at,locked:true};
}

export async function loadVerifiedPalm(pool,accountId,input,readiness){
 if(readiness?.ready!==true)return {status:'MODEL_PENDING',reason:readiness?.missing?.[0]||'PRODUCTION_MANIFEST'};
 if(!input?.palmAssetId)return {status:'PHOTO_REQUIRED',reason:'VERIFIED_PALM_SNAPSHOT_REQUIRED'};
 const q=await pool.query(`SELECT a.id,a.state,s.subject_key,s.reading_version,s.reading,s.reading_sha256,
  s.reading_hash_version,s.record_sha256,s.record_hash_version,s.inference_verified_at,
  s.inference_model_id,s.inference_model_sha256,s.inference_reading_sha256,s.inference_overlay
  FROM palm_assets a JOIN palm_reading_snapshots s ON s.asset_id=a.id AND s.subject_key=a.subject_key
  WHERE a.id=$1 AND a.subject_key=$2 AND a.state='uploaded' LIMIT 1`,[input.palmAssetId,`acct:${accountId}`]);
 const saved=q.rows[0];
 // Existing browser-uploaded history is not proof of independent server inference.
 if(!readiness.evidence?.manifest?.modelId||!/^[a-f0-9]{64}$/.test(readiness.evidence?.model?.sha256||'')||
  !saved?.inference_verified_at||saved.inference_model_id!==readiness.evidence?.manifest?.modelId||
  saved.inference_model_sha256!==readiness.evidence?.model?.sha256||saved.inference_reading_sha256!==saved.reading_sha256)
  return {status:'UNVERIFIED',reason:'SERVER_PALM_INFERENCE_UNVERIFIED'};
 const row=annotatePalmHistoryRows(q.rows)[0];
 if(!row||row._readingEnvelopeValidation?.ok!==true||row._recordBindingValidation?.verified!==true)return {status:'UNVERIFIED',reason:'VERIFIED_PALM_SNAPSHOT_REQUIRED'};
 const r=row.reading;
 if(r?.synthesis?.status!=='SUPPORTED')return {status:'INSUFFICIENT',reason:'PALM_EVIDENCE_INSUFFICIENT'};
 return {status:'OK',reading:r,geometry:saved.inference_overlay||null};
}

function birthVisual(raw){
 const pillars=[['年柱',raw.yearPillar],['月柱',raw.monthPillar],['日柱',raw.dayPillar]];
 const elements=['木','火','土','金','水'].map(element=>({element,count:pillars.filter(([,p])=>p.element===element).length}));
 const yinYang=['陽','陰'].map(label=>({label,count:pillars.filter(([,p])=>p.yinYang===label).length}));
 return {kind:'birth-chart',pillars:pillars.map(([label,p])=>({label,stem:p.stem,branch:p.branch,value:p.label,element:p.element,yinYang:p.yinYang})),dayMaster:raw.dayMaster,elements,yinYang,
  scope:'年・月・日の天干3つの構成です。蔵干・時柱を含む命式全体の強弱や用神の判定ではありません。'};
}

function birthReport(raw,detailed){
 if(raw.status!=='OK')return pendingReport('shichusuimei',raw.status);
 const friendly=composeFriendlyFreeReading({birthCards:raw.freeCards,nameReading:null});
 const sections=friendly.map(x=>section(x.title,x.text,x.value));
 const details=[];
 if(detailed){
  const same=raw.dayMaster.element===raw.monthPillar.element;
  const context=`あなたの中心は${raw.dayMaster.stem}（${raw.dayMaster.yinYang}の${raw.dayMaster.element}）、日常の動きは月柱${raw.monthPillar.label}（${raw.monthPillar.element}）から読みます。`;
  details.push(section('あなたの強みを詳しく',`${context}${same?'中心と日常の天干に同じ五行が重なります。得意なやり方を深めやすい一方、同じ方法にこだわりすぎたときは周囲の意見を取り入れる余地を残してください。':'中心と日常では天干の五行が異なります。一つの性格へまとめず、自分の自然な判断と、周囲に合わせている行動を分けて振り返ると持ち味を見つけやすいでしょう。'}`));
  const actions={
   '恋愛・結婚':'相手に望むことを一つだけ言葉にしてから、相手の望みも聞く時間を作ってみてください。自分に合う関わり方と、相手に合わせて無理をしている部分を分けて確かめることが具体的な一歩になります。',
   '仕事・才能':'最近うまく進んだ仕事を一つ選び、準備・判断・実行のどこで力を発揮したかを振り返ってください。次の仕事ではその部分を先に担当し、成果と負担の両方を見て役割を整えると、強みを再現しやすくなります。',
   '金運':'使ったあとに満足した支出と、勢いだけで決めた支出を分けて見直してください。あなたの判断の傾向を知り、次の大きな支出では予算と見直す時点を先に決めることが、納得できる管理につながります。',
   '対人関係':'気持ちよく付き合えた相手との距離感を思い出してみてください。連絡の頻度や頼みごとの量を無理なく続けられる範囲に整え、早めに希望を伝えることで、あなたの良さが出る関係を育てやすくなります。'
  };
  for(const [title,action] of Object.entries(actions)){
   const c=raw.freeCards.find(x=>x.title===title);
   details.push(section(`${title}を具体的に活かす`, `あなたの${title}で目立つ持ち味は「${c.value}」です。${excerpt(c.text)}${action}`));
  }
  details.push(section('長い目で見た整え方',`年柱${raw.yearPillar.label}は${raw.yearPillar.yinYang}の${raw.yearPillar.element}、月柱${raw.monthPillar.label}は${raw.monthPillar.yinYang}の${raw.monthPillar.element}です。年柱は周囲との接点、月柱は日常の進め方の補助として、日主${raw.dayMaster.stem}と照らします。年代別の大運や具体的な吉日は、必要な条件を満たしていないため作成せず、日常で再現できる長所と調整点に絞って活用してください。`));
 }
 return {type:'shichusuimei',label:FORTUNE_LABELS.shichusuimei,status:'OK',access:detailed?'paid':'free-full',title:friendly[0].value,summary:friendly[0].text,
  visual:birthVisual(raw),sections,detailSections:details,evidence:{pillars:birthVisual(raw).pillars,convention:raw.convention},
  note:'出生時刻を使わず年柱・月柱・日柱・日主を読みます。境界日は推測せず保留します。'};
}

function nameTone(rating){
 return ({大吉:'持ち味を伸ばしやすい傾向です。できていることを言葉や形にして周囲へ伝えるほど、あなたの良さを活かしやすいでしょう。',
  吉:'日々の積み重ねが持ち味になりやすい傾向です。小さな約束を守り、自分に合ったペースで続けることが信頼につながります。',
  半吉:'良い面と調整したい面の両方が出やすい傾向です。急いで結論を出さず、いったん整理してから動くと自分の良さを出しやすくなります。',
  凶:'気を使ったり抱え込んだりすると負担が出やすい傾向です。休む時間と相談する相手を確保し、無理の少ない進め方に整えてみてください。',
  大凶:'負担の大きい環境に合わせ続けると疲れやすい傾向です。結果を人生の決定事項とせず、できる範囲を区切り、環境や役割を見直す手掛かりにしてください。'})[rating]||'未確認の吉凶は推測せず、確認できた根拠だけを読みます。';
}

function nameReport(raw,detailed){
 if(raw.status!=='OK')return pendingReport('name',raw.status);
 const p=entry(raw,'person'),e=entry(raw,'earth'),o=entry(raw,'outer'),t=entry(raw,'total');
 const cat=raw.sansai125?.status==='OK'?raw.sansai125.categories:{};
 const sections=[
  section('あなたの本質',`あなたのお名前で中心となる持ち味は「${p.theme}」です。${nameTone(p.rating)}${cat.personality||''}`,p.theme),
  section('性格と才能',`あなたは「${p.theme}」を自分なりの判断や表現に活かしやすいタイプとして読めます。${nameTone(p.rating)}得意なことを当然と思い込まず、周囲から頼まれた場面を振り返ってみてください。`,p.theme),
  section('仕事運',`仕事では「${p.theme}」があなたの持ち味になります。${cat.work||''}${nameTone(p.rating)}一つの肩書きで適性を決めず、力を出しやすい役割を見つける参考にしてください。`,p.theme),
  section('金運',`長い目で見たお金との付き合い方には「${t.theme}」という傾向があります。${cat.money||''}${nameTone(t.rating)}日々の使い方と将来に残す分を分けて考えると、自分に合う管理を見つけやすくなります。`,t.theme),
  section('恋愛・結婚',`心の動きには「${e.theme}」、人との関わり方の中心には「${p.theme}」が出ています。${cat.loveMarriage||''}${nameTone(e.rating)}安心して本音を話せる関係を少しずつ育ててみてください。`,e.theme),
  section('対人運',`周囲との関係には「${o.theme}」という持ち味が表れます。${cat.relationships||''}${nameTone(o.rating)}無理に好かれようとせず、自分にとって自然な距離感を大切にしてください。`,o.theme),
  section('家庭と身近な関係',`身近な関係では「${e.theme}」が心の土台として働く傾向です。${cat.family||''}${nameTone(e.rating)}小さな希望を早めに言葉にすることが、安心できる関係を作る助けになります。`,e.theme),
  section('長期的な運勢',`若い時期の土台は「${e.theme}」、判断や活動の中心は「${p.theme}」、長い目でのテーマは「${t.theme}」として読み分けます。${nameTone(t.rating)}どれか一つの格だけで人生全体を決めず、今の環境や経験と照らして活用してください。`,t.theme),
  section('あなたの開運ポイント',`あなたの「${p.theme}」を、まずは今日できる小さな行動で活かしてみてください。${nameTone(p.rating)}うまくできたことを一つ記録し、「${t.theme}」という長い目でのテーマにつながる習慣を少しずつ育てることがヒントになります。`,p.theme)
 ];
 const details=[];
 if(detailed){
  for(const x of raw.numerology.entries)details.push(section(`${x.label}から詳しく読む`, `あなたの${x.label}は${x.number}画で、${x.rating}・「${x.theme}」という解釈です。${x.role} ${x.advice} ${nameTone(x.rating)}同じ吉凶でも格の役割が異なるため、他の格や実際の経験と組み合わせて読みます。`,`${x.number}画 ${x.rating}`));
  if(raw.sansai125?.status==='OK')details.push(section('三才配置を重ねた読み',`${raw.sansai125.summary} 天格・人格・地格を「${raw.sansai125.pattern}」として結ぶ補助軸です。五格それぞれの持ち味が、周囲の支えや日常の土台とどう重なるかを確かめる手掛かりにしてください。`,raw.sansai125.type));
  if(raw.yinYang?.status==='OK')details.push(section('陰陽のリズムと調整点',`あなたのお名前の実字は「${raw.yinYang.display}」の配列で、${raw.yinYang.balance}です。陰${raw.yinYang.yinCount}・陽${raw.yinYang.yangCount}を確認しています。行動の勢いと受け止める余地をどちらも意識し、気持ちよく続けられるペースを探してみてください。陰陽の配列だけで能力や将来を断定しません。`));
 }
 return {type:'name',label:'姓名判断',status:'OK',access:detailed?'paid':'free-full',title:`「${p.theme}」があなたの持ち味`,summary:sections[0].text,
  visual:{kind:'name-chart',family:raw.family,given:raw.given,fiveGrid:raw.fiveGrid,numerology:raw.numerology.entries,sansai:raw.sansai,yinYang:raw.yinYang},sections,detailSections:details,
  evidence:raw.calculationEvidence,note:raw.calculationDisclosure.schoolDifference};
}

function palmReport(raw,detailed){
 if(raw.status!=='OK')return pendingReport('palm',raw.status,raw.reason);
 const r=raw.reading;
 const sections=(r.cards||[]).filter(c=>['INTERPRETABLE','DETECTED'].includes(c.status)).map(c=>section(c.label||c.line,c.body,c.tags?.join('・')||''));
 // Preserve confirmed model output; do not fill undetected lines or invent scores.
 if(!sections.length)return pendingReport('palm','INSUFFICIENT','CONFIRMED_LINES_REQUIRED');
 return {type:'palm',label:'手相',status:'OK',access:detailed?'paid':'free-full',title:r.editorial?.headline||'確認できた線から読むあなたの手相',summary:r.overall,
  visual:{kind:'palm-chart',geometry:raw.geometry,confirmedLines:r.historyEvidence?.confirmedLines||[]},sections,
  detailSections:detailed?(r.synthesis?.domains||[]).filter(d=>d.status==='SUPPORTED').map(d=>section(d.label,[d.summary,...(d.strengths||[]),...(d.cautions||[]),...(d.actions||[])].join(' '))):[],
  evidence:{version:r.version,confidence:r.confidence,tags:r.tags},note:r.disclaimer};
}

function pendingReport(type,status,reason=null){
 const message=type==='palm'?'手相の解析結果はまだ確認できていません。線の特徴や運勢を推測せず、検証が完了してから表示します。':status==='BOUNDARY_UNCERTAIN'?'節入り当日のため、出生時刻なしでは柱を確定できません。推測せず判定を保留します。':'必要なデータを確認できないため、鑑定本文を推測せず保留しています。';
 return {type,label:FORTUNE_LABELS[type],status,access:'pending',title:`${FORTUNE_LABELS[type]}の結果`,summary:message,reason,sections:[],detailSections:[],visual:null};
}

export function makeTeaser(type,report){
 let visualHeader=null;
 if(report.status==='OK'){
  visualHeader={kind:report.visual?.kind,label:type==='name'?'お名前と五格の鑑定図':type==='palm'?'確認した主要線の鑑定図':'年柱・月柱・日柱の命式図'};
  if(type==='name')visualHeader.characters=[report.visual.family?.[0],report.visual.given?.[0]].filter(Boolean).map(c=>({char:c.char||c.character,stroke:c.stroke}));
  if(type==='shichusuimei')visualHeader.firstStem=report.visual.pillars?.[0]?.stem||'';
 }
 return {type,label:FORTUNE_LABELS[type],access:'teaser',status:report.status,title:report.title,
  excerpt:excerpt(report.summary),visualHeader,
  lockText:'続きは詳細鑑定で解放'};
}

function integrationReport(raws,reports){
 const missing=FORTUNE_TYPES.filter(t=>raws[t]?.status!=='OK'||reports[t]?.status!=='OK');
 if(missing.length)return {status:'WAITING_FOR_VERIFIED_METHODS',title:'3占術統合総合鑑定',summary:`${missing.map(t=>FORTUNE_LABELS[t]).join('・')}が確認できるまで、3占術の結論を推測せず保留しています。`,sections:[],missing};
 const result=buildIntegratedFortuneSynthesis({premiumBirth:raws.shichusuimei,premiumName:raws.name,palmReading:raws.palm.reading});
 if(result.status!=='SUPPORTED'||result.evidence?.length!==3)return {status:'INSUFFICIENT',title:'3占術統合総合鑑定',summary:'3占術すべての根拠が十分にそろっていないため、総合本文の表示を保留しています。',sections:[]};
 const display=result.paidDisplay;
 const sections=[];
 if(result.portrait?.text)sections.push(section('3つの占術から見るあなたの人物像',result.portrait.text));
 if(display?.opening)sections.push(section('総合鑑定の読み方',display.opening));
 for(const s of display?.sections||[])sections.push(section(s.label,s.text));
 for(const title of ['恋愛・結婚','金運']){
  const b=reports.shichusuimei.sections.find(s=>s.title.startsWith(title));
  const n=reports.name.sections.find(s=>s.title.startsWith(title));
  if(b&&n)sections.push(section(`${title}の読み合わせ`,`四柱推命では「${b.value}」、姓名判断では「${n.value}」が手掛かりです。${excerpt(b.text)}${excerpt(n.text)}この分野は確認できた2占術の根拠を併記し、手相に同じ傾向が出たとは補っていません。`));
 }
 if(display?.closing)sections.push(section('あなたへの行動アドバイス',display.closing));
 return {status:display?.status==='WITHHELD'?'WITHHELD':'OK',title:'3占術統合総合鑑定',summary:result.portrait?.text||result.summary,sections,
  evidence:result.evidence,common:result.domains?.map(d=>({label:d.label,common:d.commonSignals,distinct:d.distinctSignals})),quality:result.reportQuality?.status};
}

export function composeFortuneFunnel({input,freeFortuneType,raws,paid=false}){
 if(!FORTUNE_TYPES.includes(freeFortuneType))throw new Error('free_selection_required');
 const reports={shichusuimei:birthReport(raws.shichusuimei,paid),name:nameReport(raws.name,paid),palm:palmReport(raws.palm,paid)};
 const base={schema:FUNNEL_SCHEMA,status:'OK',fullName:input.familyName+input.givenName,freeFortuneType,paid,inputDigest:fortuneInputDigest(input)};
 const order=[freeFortuneType,...FORTUNE_TYPES.filter(t=>t!==freeFortuneType)];
 if(!paid)return {...base,selected:reports[freeFortuneType],teasers:order.slice(1).map(t=>makeTeaser(t,reports[t])),
  integrationTeaser:{type:'integrated',label:'四柱推命 × 姓名判断 × 手相',access:'teaser',title:'あなたの総合鑑定',
   excerpt:FORTUNE_TYPES.every(t=>reports[t]?.status==='OK')?excerpt(integrationReport(raws,reports).summary): '確認できた占術から、あなたの持ち味を読み比べます。手相が未確認の間は、3占術の総合結論を保留しています。',lockText:'続きは詳細鑑定で解放'},
  cta:{label:'詳細有料鑑定を見る 980円',priceYen:980,href:'checkout-confirm.html'}};
 const comparison=['総合運','恋愛運','仕事運','金運','対人運'].map(label=>({label,cells:FORTUNE_TYPES.map(t=>{
  const r=reports[t];
  const key=({総合運:0,恋愛運:2,仕事運:3,金運:4,対人運:5})[label];
  const selected=t==='shichusuimei'?r.sections[key]:r.sections.find(s=>s.title.startsWith(({総合運:'あなたの本質',恋愛運:'恋愛',仕事運:'仕事',金運:'金運',対人運:'対人'})[label]));
  return {type:t,status:r.status,label:r.status!=='OK'?'未解析':selected?.value||'確認した根拠のみ表示'};
 })}));
 return {...base,reports:order.map(t=>reports[t]),comparison,comparisonRule:'数値や星へ変換せず、各占術の確認済み特徴を併記します。未解析の占術には点数を付けません。',integrated:integrationReport(raws,reports)};
}

export async function calculateFortuneSources({pool,accountId,input,nameRuntime,palmReadiness}){
 return {shichusuimei:buildBirthReading(input.birthDate),name:nameRuntime.reading(input),palm:await loadVerifiedPalm(pool,accountId,input,palmReadiness)};
}
