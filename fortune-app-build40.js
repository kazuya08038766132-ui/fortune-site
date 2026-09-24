
// RC179: static HTML must not freeze the birth-date upper bound at build day.
const birthDateInput=document.querySelector('#birthDate');
if(birthDateInput?.dataset.maxToday==='true'){
 const now=new Date(), localToday=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 birthDateInput.max=localToday<'2027-12-31'?localToday:'2027-12-31';
}
import {verifiedSectionalTerms} from './birth-boundary-registry-build40.js';
import {boundaryForDateOnly} from './birth-boundary-engine-build40.js';
import {yearBoundaryDateOnly} from './birth-year-boundary-build40.js';
import {sexagenaryYear,sexagenaryMonth,composeFreeBirthCards} from './fortune-reading-build40.js';
import {evaluatePalmPhotoFile,palmPhotoQualityMessage} from './palm-photo-quality-build40.js';
import {probePalmProductionReadiness} from './palm-production-readiness-build40.js';
import {runPalmLocalReading} from './palm-local-reading-build40.js';
import {makePalmPreviewBlob,savePalmPreview,clearPalmPreview} from './palm-local-preview-store-build40.js';
import {palmUxState} from './palm-ux-state-build40.js';
import {initializePalmBrowserRuntime} from './palm-runtime-autoload-build40.js';
import {saveFortuneDraft,loadFortuneDraft} from './fortune-draft-store-build40.js';
import {runPalmSingleImageStability} from './palm-single-image-stability-build40.js';
import {runPalmUserFlow} from './palm-flow-controller-build40.js';
import {uploadPalmPrivate,savePalmReadingSnapshot} from './palm-upload-client-build40.js';
import {buildPalmHistorySnapshot} from './palm-history-snapshot-build40.js';
import {validateBirthDate,jstTodayIso,birthDateMaxAllowed} from './birth-date-policy-build40.js';
const $=s=>document.querySelector(s);
const serviceState=$('#serviceState');
const palmHistoryOptIn=$('#palmHistoryOptIn'),palmHistoryState=$('#palmHistoryState');
const form=$('#fortuneForm'),results=$('#results'),resultGrid=$('#resultGrid'),summary=$('#resultSummary'),premiumBtn=$('#premiumBtn'),palmFile=$('#palmPhoto'),preview=$('#palmPreview'),palmState=$('#palmState'),palmRetakeBtn=$('#palmRetakeBtn');
let draft=null,palmLocalResult=null,palmReadiness=null,palmRuntimePromise=null;
const birthInput=$('#birthDate');
const todayJst=jstTodayIso();
if(birthInput)birthInput.max=birthDateMaxAllowed({todayJst});

import {fetchFirstPartySafe as fetchSafe,readFirstPartyJson as readJsonSafe} from './browser-api-safe-build40.js';

let publicSystemStatus=null;
(async()=>{try{const r=await fetchSafe('/api/system-status',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw 0;publicSystemStatus=await readJsonSafe(r);if(serviceState){const c=publicSystemStatus.capabilities||{};const pending=[];if(!c.nameReading)pending.push('姓名');if(!c.palmProductionReading)pending.push('手相主要線');if(!c.oneTimeCheckout)pending.push('決済');serviceState.className='status '+(pending.length?'warn':'ok');serviceState.textContent=pending.length?`無料生年月日鑑定は利用できます。準備中：${pending.join('・')}`:'主要機能は利用可能です。';}}catch{if(serviceState){serviceState.className='status warn';serviceState.textContent='無料鑑定は続行できます。接続状態の確認APIは現在利用できません。';}}})();

probePalmProductionReadiness().then(async r=>{
 palmReadiness=r;
 if(r.ready){
  setPalmUx('ANALYZING','productionモデル資産を確認しました。ブラウザ解析runtimeを準備しています…');
  palmRuntimePromise=initializePalmBrowserRuntime().then(rt=>(window.FORTUNE_PALM_RUNTIME=rt,rt)).catch(err=>{console.warn('Palm runtime init failed',err);return null});
  const rt=await palmRuntimePromise;
  if(palmState&&!palmFile?.files?.length)setState(palmState,rt?'ok':'bad',rt?'準備完了｜手相モデルは利用可能です。写真を選ぶとブラウザ内で解析します。':'runtime読込失敗｜手相モデル資産はありますが、ブラウザruntimeを起動できませんでした。');
 }else if(palmState&&!palmFile?.files?.length)setPalmUx('EMPTY','撮影品質チェックは利用できます。productionモデル資産は未昇格のため、線の鑑定は保留します。');
}).catch(()=>{});
function esc(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function setState(el,kind,text){el.className=`status ${kind}`;el.textContent=text}
function setPalmUx(key,detail=''){const x=palmUxState(key,detail);setState(palmState,x.kind,`${x.label}｜${x.message}`);palmState.dataset.palmUx=key;return x}
async function nameReading(familyName,givenName){
 try{
  const c=await fetchSafe('/api/csrf-token',{credentials:'same-origin',cache:'no-store'});if(!c.ok)return {status:'API_UNAVAILABLE'};const {token}=await readJsonSafe(c);
  const r=await fetchSafe('/api/name-reading',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':token},body:JSON.stringify({familyName,givenName})});
  if(!r.ok)return {status:'API_UNAVAILABLE'};return await readJsonSafe(r);
 }catch{return {status:'API_UNAVAILABLE'}}
}
palmFile?.addEventListener('change',async()=>{
 const f=palmFile.files?.[0];palmLocalResult=null;if(!f){setPalmUx('EMPTY');return;}
 await clearPalmPreview().catch(()=>{});
 if(!/^image\/(jpeg|png|webp)$/.test(f.type)){setState(palmState,'bad','JPEG / PNG / WebPを選んでください。');return}
 if(f.size>12*1024*1024){setState(palmState,'bad','画像が大きすぎます（12MB以下）。');return}
 preview.src=URL.createObjectURL(f);preview.hidden=false;if(palmRetakeBtn)palmRetakeBtn.hidden=false;setPalmUx('CHECKING');
 try{
  const rt=window.FORTUNE_PALM_RUNTIME||(palmRuntimePromise?await palmRuntimePromise:null);
  if(palmReadiness?.ready&&rt?.ort&&rt?.handLandmarker&&palmReadiness.manifestData){
   setPalmUx('ANALYZING','写真品質を確認し、主要線を解析しています…');
   const flow=await runPalmUserFlow({file:f,evaluateQuality:evaluatePalmPhotoFile,analyzeBase:(file)=>runPalmLocalReading({file,ort:rt.ort,manifest:palmReadiness.manifestData,modelUrl:rt.modelUrl||'./models/palm-principal-lines.onnx',handLandmarker:rt.handLandmarker}),stabilize:async(file,base)=>{setPalmUx('STABILITY_CHECK');return runPalmSingleImageStability({file,baseResult:base,analyzeVariant:(variant)=>runPalmLocalReading({file:variant,ort:rt.ort,manifest:palmReadiness.manifestData,modelUrl:rt.modelUrl||'./models/palm-principal-lines.onnx',handLandmarker:rt.handLandmarker})});}});
   if(flow.status==='READY'){palmLocalResult={...flow.base,status:'READY',feature:flow.feature,reading:flow.reading,rules:flow.rules,synthesis:flow.synthesis,stability:flow.stability,repeatStable:true,selfStabilityMethod:flow.selfStabilityMethod};setPalmUx('READY',flow.step.message);try{const small=await makePalmPreviewBlob(f);await savePalmPreview(small);}catch{}sessionStorage.setItem('fortune:palm-report',JSON.stringify({version:'BUILD-40-RC233',feature:palmLocalResult.feature,reading:palmLocalResult.reading,stability:palmLocalResult.stability||null,repeatStable:true,selfStabilityMethod:palmLocalResult.selfStabilityMethod||null}));if(palmHistoryOptIn?.checked){try{if(palmHistoryState){palmHistoryState.className='status warn';palmHistoryState.textContent='会員履歴へ保存しています…';}const asset=await uploadPalmPrivate(f,{purpose:'reading',saveHistory:true});const snap=buildPalmHistorySnapshot({reading:palmLocalResult.reading,feature:palmLocalResult.feature,stability:palmLocalResult.stability,selfStabilityMethod:palmLocalResult.selfStabilityMethod});await savePalmReadingSnapshot(asset.assetId,snap);if(palmHistoryState){palmHistoryState.className='status ok';palmHistoryState.textContent='今回の写真と鑑定結果を会員履歴へ保存しました。';}}catch(e){if(palmHistoryState){palmHistoryState.className='status warn';palmHistoryState.textContent=e?.status===403?'履歴保存は有効な月額会員のみ利用できます。鑑定自体は保存なしで完了しています。':'履歴保存だけ完了できませんでした。鑑定結果には影響ありません。';}}}}
   else {palmLocalResult={status:'RECAPTURE',reason:flow.reason,quality:flow.quality,stability:flow.stability||null,coverage:flow.coverage||null,retakeGuidance:flow.retakeGuidance||null,message:flow.step.message};setPalmUx('RECAPTURE',flow.step.message);return;}
  }else{const q=await evaluatePalmPhotoFile(f);if(!q.acceptable){palmLocalResult={status:'RECAPTURE',reason:'PHOTO_QUALITY',quality:q};setPalmUx('RECAPTURE',palmPhotoQualityMessage(q));return}try{const small=await makePalmPreviewBlob(f);await savePalmPreview(small);}catch{}palmLocalResult={status:'QUALITY_OK_MODEL_PENDING',quality:q};setPalmUx('MODEL_PENDING');}
 }catch(err){palmLocalResult={status:'ERROR',code:err?.message||'PALM_LOCAL_ERROR'};setPalmUx('ERROR');}
});

palmRetakeBtn?.addEventListener('click',()=>{
 palmFile.value='';palmLocalResult=null;preview.removeAttribute('src');preview.hidden=true;palmRetakeBtn.hidden=true;clearPalmPreview().catch(()=>{});sessionStorage.removeItem('fortune:palm-report');setPalmUx('EMPTY','新しい写真を選択してください。');palmFile.click();
});
if(new URLSearchParams(location.search).get('retake')==='1'){document.querySelector('#reading')?.scrollIntoView({block:'start'});setTimeout(()=>palmFile?.click(),250);}

const restoredDraft=loadFortuneDraft();
if(restoredDraft.status==='OK'){
 const d=restoredDraft.draft;
 if($('#familyName')&&!$('#familyName').value) $('#familyName').value=d.familyName||'';
 if($('#givenName')&&!$('#givenName').value) $('#givenName').value=d.givenName||'';
 if($('#birthDate')&&!$('#birthDate').value) $('#birthDate').value=d.birthDate||'';
 if(d.birthDate&&d.familyName&&d.givenName&&Array.isArray(d.freeCards)){
  draft=d;
  const restored=[...d.freeCards];
  const nr=d.nameReading;
  if(nr?.status==='OK'){
   const g=nr.fiveGrid;const chars=[...(nr.family||[]),...(nr.given||[])];restored.push({title:'姓名判断・画数',value:chars.map(x=>`${x.char}${x.stroke}`).join(' / '),text:'前回の鑑定で使用した各文字の画数です。'});restored.push({title:'姓名判断・五格',value:`天${g.heaven} / 人${g.person} / 地${g.earth} / 外${g.outer} / 総${g.total}`,text:'前回の無料鑑定をこのタブ内から復元しました。'});
   for(const x of nr.numerology?.entries||[])restored.push({title:`${x.label}・${x.theme}`,value:`${x.number}画 ${x.rating}`,text:`${x.role} ${x.advice}`});
   if(nr.sansai?.status==='OK')restored.push({title:'三才配置',value:`${nr.sansai.pattern}・${nr.sansai.balance}`,text:`天格→人格：${nr.sansai.success.relation} / 人格→地格：${nr.sansai.foundation.relation}`});
   if(nr.yinYang?.status==='OK')restored.push({title:'陰陽配列',value:`${nr.yinYang.display}・${nr.yinYang.balance}`,text:`陰${nr.yinYang.yinCount}・陽${nr.yinYang.yangCount}。実字のみで判定します。`});
  }
  resultGrid.innerHTML=restored.map(c=>`<article class="card result-card"><h3>${esc(c.title)} <span class="pill">${esc(c.value)}</span></h3><p>${esc(c.text)}</p></article>`).join('');
  summary.textContent=`${d.familyName}${d.givenName}さんの前回の鑑定結果です。`;
  results.classList.add('show');
  setState($('#formState'),'ok','このタブ内に保存されていた無料鑑定を復元しました。必要なら入力を変更して再鑑定できます。');
 }
}

form?.addEventListener('submit',async e=>{
 e.preventDefault();const birthDate=$('#birthDate').value,familyName=$('#familyName').value.trim(),givenName=$('#givenName').value.trim(),consent=$('#consent').checked;
 if(!birthDate||!familyName||!givenName||!consent)return setState($('#formState'),'bad','生年月日・姓・名・利用目的への同意を確認してください。');
 const datePolicy=validateBirthDate(birthDate,{todayJst});
 if(!datePolicy.ok){const msg=datePolicy.status==='FUTURE_DATE'?'未来の生年月日は入力できません。':datePolicy.status==='OUT_OF_VERIFIED_RANGE'?'現在の検証済み生年月日範囲は1955年から今日までです。この日付は推測せず保留します。':'生年月日を正しい日付で入力してください。';return setState($('#formState'),'warn',msg)}
 const year=Number(birthDate.slice(0,4)),pack=verifiedSectionalTerms(year);if(pack.status!=='VERIFIED')return setState($('#formState'),'warn','現在の検証済み生年月日範囲は1955〜2027年です。この日付は推測せず保留します。');
 const risshun=pack.terms.find(x=>x.term==='立春'),yearBoundary=yearBoundaryDateOnly({birthDate,risshunDate:risshun.date}),monthBoundary=boundaryForDateOnly({birthDate,terms:pack.terms});
 if(yearBoundary.status!=='OK'||monthBoundary.status!=='OK'){setState($('#formState'),'warn','節入り当日の可能性があるため、出生時刻なしでは柱を断定しません。');draft={birthDate,familyName,givenName,status:'BOUNDARY_UNCERTAIN'};saveFortuneDraft(draft);return}
 const y=sexagenaryYear(yearBoundary.pillarYear),m=sexagenaryMonth(yearBoundary.pillarYear,monthBoundary.monthNo),cards=composeFreeBirthCards({yearPillar:y,monthPillar:m,boundary:monthBoundary});
 setState($('#formState'),'warn','生年月日鑑定を生成し、姓名masterを確認しています…');
 const nr=await nameReading(familyName,givenName);const nameCards=[];
 if(nr.status==='OK'){
  const g=nr.fiveGrid;const chars=[...(nr.family||[]),...(nr.given||[])];nameCards.push({title:'姓名判断・画数',value:chars.map(x=>`${x.char}${x.stroke}`).join(' / '),text:'KANJIDIC2採用画数を基準に、各文字の画数と計算根拠を表示します。流派によって画数や仮数の扱いが異なる場合があります。'});nameCards.push({title:'姓名判断・五格',value:`天${g.heaven} / 人${g.person} / 地${g.earth} / 外${g.outer} / 総${g.total}`,text:'一字姓・一字名では五格計算用の仮数1を使用します。人格・総格には加えません。'});
  for(const x of nr.numerology?.entries||[])nameCards.push({title:`${x.label}・${x.theme}`,value:`${x.number}画 ${x.rating}`,text:`${x.role} ${x.advice}`});
  if(nr.calculationEvidence?.characters?.length){const ce=nr.calculationEvidence;const chars=ce.characters.map(x=>`${x.character} ${x.stroke}画${x.alternateStrokeCounts?.length?`（別候補:${x.alternateStrokeCounts.join('/')}画）`:''}`).join(' / ');nameCards.push({title:'採用画数・計算根拠',value:chars,text:`天格 ${ce.fiveGrid.heaven}｜人格 ${ce.fiveGrid.person}｜地格 ${ce.fiveGrid.earth}｜外格 ${ce.fiveGrid.outer}｜総格 ${ce.fiveGrid.total}。${Object.values(ce.formula).join('。')}。`});}
  if(nr.sansai?.status==='OK')nameCards.push({title:'三才配置',value:`${nr.sansai.pattern}・${nr.sansai.balance}`,text:`天格→人格：${nr.sansai.success.relation}。人格→地格：${nr.sansai.foundation.relation}。五格の下一桁を木火土金水へ対応させる伝統的な補助判定です。`});
  if(nr.yinYang?.status==='OK')nameCards.push({title:'陰陽配列',value:`${nr.yinYang.display}・${nr.yinYang.balance}`,text:`奇数=陽、偶数=陰として実際の文字だけを並べます。陰${nr.yinYang.yinCount}・陽${nr.yinYang.yangCount}。五格用の仮数1は配列へ加えません。`});
  if(nr.sansai125?.status==='OK')nameCards.push({title:'三才125配置・個別解釈',value:`${nr.sansai125.pattern}・${nr.sansai125.type}`,text:nr.sansai125.summary});
  if(nr.comprehensive?.status==='OK'){const c=nr.comprehensive;nameCards.push({title:'姓名判断・総合',value:c.headline,text:c.sections.personality});nameCards.push({title:'仕事・才能',value:'人格＋三才',text:c.sections.talentWork});nameCards.push({title:'金運',value:'総格＋三才',text:c.sections.money});nameCards.push({title:'対人運',value:'外格＋三才',text:c.sections.relationships});nameCards.push({title:'恋愛・結婚',value:'地格＋人格＋三才',text:c.sections.loveMarriage});nameCards.push({title:'家庭運',value:'地格＋三才',text:c.sections.family});nameCards.push({title:'年代別の見方',value:'地格 → 人格 → 総格',text:c.sections.lifeStages});}
 }else if(nr.status==='DATA_VERIFY'){
  nameCards.push({title:'姓名判断',value:'要確認',text:'画数masterで確認できない文字が含まれるため、推測せず保留しました。'});
 }else{
  nameCards.push({title:'姓名判断',value:'準備中',text:'公式KANJIDIC2 masterがこの実行環境に未配置のため、画数を推測せず保留しています。'});
 }
 const palmCards=[];
 if(palmLocalResult?.status==='READY'){const detected=Object.values(palmLocalResult.feature?.lines||{}).filter(x=>x?.state==='DETECTED').length;palmCards.push({title:'手相・主要線',value:`${detected}線を確認`,text:'productionモデルで確認できた主要線のみを表示します。低信頼の線は断定しません。'});}
 else if(palmLocalResult?.status==='RECAPTURE')palmCards.push({title:'手相',value:'撮り直し推奨',text:palmLocalResult.message||palmLocalResult.retakeGuidance?.message||palmPhotoQualityMessage(palmLocalResult.quality)});
 else if(palmFile.files?.length)palmCards.push({title:'手相',value:'判定保留',text:'写真品質は確認済みですが、productionモデル未昇格のため主要線を推測しません。'});
 const all=[...cards,...nameCards,...palmCards];
 draft={version:'BUILD-40-RC233',birthDate,familyName,givenName,fullName:familyName+givenName,yearBoundary,monthBoundary,yearPillar:y,monthPillar:m,freeCards:cards,nameReading:nr,palm:{photoSelected:!!palmFile.files?.length,readingStatus:palmLocalResult?.status||'NOT_SELECTED',quality:palmLocalResult?.quality||null}};
 saveFortuneDraft(draft);resultGrid.innerHTML=all.map(c=>`<article class="card result-card"><h3>${esc(c.title)} <span class="pill">${esc(c.value)}</span></h3><p>${esc(c.text)}</p></article>`).join('')+(palmLocalResult?.status==='READY'?`<article class="card result-card"><h3>手相レポート <span class="pill">READY</span></h3><p>検出線のオーバーレイと詳細カードを確認できます。</p><p><a class="btn ghost" href="palm-report-build40.html">手相レポートを開く</a></p></article>`:'');summary.textContent=`${familyName}${givenName}さんの鑑定結果です。`;results.classList.add('show');setState($('#formState'),'ok',nr.status==='OK'?'生年月日＋姓名五格・81数理を生成しました。':'生年月日鑑定を生成しました。姓名は未確認データを推測せず保留しています。');results.scrollIntoView({behavior:'smooth',block:'start'});
});
premiumBtn?.addEventListener('click',()=>{if(!draft){setState($('#formState'),'warn','先に無料鑑定を実行してください。');return}location.href='checkout-confirm.html'});
