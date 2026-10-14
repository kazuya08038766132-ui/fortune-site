
// RC179: static HTML must not freeze the birth-date upper bound at build day.
const birthDateInput=document.querySelector('#birthDate');
if(birthDateInput?.dataset.maxToday==='true'){
 const now=new Date(), localToday=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 birthDateInput.max=localToday<'2027-12-31'?localToday:'2027-12-31';
}
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
import {renderFreeFunnel} from './fortune-funnel-view-build40.js';
const $=s=>document.querySelector(s);
const serviceState=$('#serviceState');
const palmHistoryOptIn=$('#palmHistoryOptIn'),palmHistoryState=$('#palmHistoryState');
const form=$('#fortuneForm'),results=$('#results'),resultGrid=$('#resultGrid'),summary=$('#resultSummary'),premiumBtn=$('#premiumBtn'),palmFile=$('#palmPhoto'),preview=$('#palmPreview'),palmState=$('#palmState'),palmRetakeBtn=$('#palmRetakeBtn');
let draft=null,palmLocalResult=null,palmReadiness=null,palmRuntimePromise=null,palmAssetId=null;
const birthInput=$('#birthDate');
const todayJst=jstTodayIso();
if(birthInput)birthInput.max=birthDateMaxAllowed({todayJst});

import {fetchFirstPartySafe as fetchSafe,readFirstPartyJson as readJsonSafe} from './browser-api-safe-build40.js';

let publicSystemStatus=null;
(async()=>{try{const r=await fetchSafe('/api/system-status',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw 0;publicSystemStatus=await readJsonSafe(r);if(serviceState){const c=publicSystemStatus.capabilities||{};const pending=[];if(!c.nameReading)pending.push('姓名');if(!c.palmProductionReading)pending.push('手相主要線');if(!c.oneTimeCheckout)pending.push('決済');serviceState.className='status '+(pending.length?'warn':'ok');serviceState.textContent=pending.length?`無料で見る占術を選んで鑑定できます。準備中：${pending.join('・')}`:'主要機能は利用可能です。';}}catch{if(serviceState){serviceState.className='status warn';serviceState.textContent='無料鑑定は続行できます。接続状態の確認APIは現在利用できません。';}}})();

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
palmFile?.addEventListener('change',async()=>{
 const f=palmFile.files?.[0];palmLocalResult=null;palmAssetId=null;if(!f){setPalmUx('EMPTY');return;}
 await clearPalmPreview().catch(()=>{});
 if(!/^image\/(jpeg|png|webp)$/.test(f.type)){setState(palmState,'bad','JPEG / PNG / WebPを選んでください。');return}
 if(f.size>12*1024*1024){setState(palmState,'bad','画像が大きすぎます（12MB以下）。');return}
 preview.src=URL.createObjectURL(f);preview.hidden=false;if(palmRetakeBtn)palmRetakeBtn.hidden=false;setPalmUx('CHECKING');
 try{
  const rt=window.FORTUNE_PALM_RUNTIME||(palmRuntimePromise?await palmRuntimePromise:null);
  if(palmReadiness?.ready&&rt?.ort&&rt?.handLandmarker&&palmReadiness.manifestData){
   setPalmUx('ANALYZING','写真品質を確認し、主要線を解析しています…');
   const flow=await runPalmUserFlow({file:f,evaluateQuality:evaluatePalmPhotoFile,analyzeBase:(file)=>runPalmLocalReading({file,ort:rt.ort,manifest:palmReadiness.manifestData,modelUrl:rt.modelUrl||'./models/palm-principal-lines.onnx',handLandmarker:rt.handLandmarker}),stabilize:async(file,base)=>{setPalmUx('STABILITY_CHECK');return runPalmSingleImageStability({file,baseResult:base,analyzeVariant:(variant)=>runPalmLocalReading({file:variant,ort:rt.ort,manifest:palmReadiness.manifestData,modelUrl:rt.modelUrl||'./models/palm-principal-lines.onnx',handLandmarker:rt.handLandmarker})});}});
   if(flow.status==='READY'){palmLocalResult={...flow.base,status:'READY',feature:flow.feature,reading:flow.reading,rules:flow.rules,synthesis:flow.synthesis,stability:flow.stability,repeatStable:true,selfStabilityMethod:flow.selfStabilityMethod};setPalmUx('READY',flow.step.message);try{const small=await makePalmPreviewBlob(f);await savePalmPreview(small);}catch{}sessionStorage.setItem('fortune:palm-report',JSON.stringify({version:'BUILD-40-RC233',feature:palmLocalResult.feature,reading:palmLocalResult.reading,stability:palmLocalResult.stability||null,repeatStable:true,selfStabilityMethod:palmLocalResult.selfStabilityMethod||null}));if(palmHistoryOptIn?.checked){try{if(palmHistoryState){palmHistoryState.className='status warn';palmHistoryState.textContent='会員履歴へ保存しています…';}const asset=await uploadPalmPrivate(f,{purpose:'reading',saveHistory:true});const snap=buildPalmHistorySnapshot({reading:palmLocalResult.reading,feature:palmLocalResult.feature,stability:palmLocalResult.stability,selfStabilityMethod:palmLocalResult.selfStabilityMethod});await savePalmReadingSnapshot(asset.assetId,snap);palmAssetId=asset.assetId;if(palmHistoryState){palmHistoryState.className='status ok';palmHistoryState.textContent='今回の写真と鑑定結果を会員履歴へ保存しました。';}}catch(e){if(palmHistoryState){palmHistoryState.className='status warn';palmHistoryState.textContent=e?.status===403?'履歴保存は有効な月額会員のみ利用できます。鑑定自体は保存なしで完了しています。':'履歴保存だけ完了できませんでした。鑑定結果には影響ありません。';}}}}
   else {palmLocalResult={status:'RECAPTURE',reason:flow.reason,quality:flow.quality,stability:flow.stability||null,coverage:flow.coverage||null,retakeGuidance:flow.retakeGuidance||null,message:flow.step.message};setPalmUx('RECAPTURE',flow.step.message);return;}
  }else{const q=await evaluatePalmPhotoFile(f);if(!q.acceptable){palmLocalResult={status:'RECAPTURE',reason:'PHOTO_QUALITY',quality:q};setPalmUx('RECAPTURE',palmPhotoQualityMessage(q));return}try{const small=await makePalmPreviewBlob(f);await savePalmPreview(small);}catch{}palmLocalResult={status:'QUALITY_OK_MODEL_PENDING',quality:q};setPalmUx('MODEL_PENDING');}
 }catch(err){palmLocalResult={status:'ERROR',code:err?.message||'PALM_LOCAL_ERROR'};setPalmUx('ERROR');}
});

palmRetakeBtn?.addEventListener('click',()=>{
 palmFile.value='';palmLocalResult=null;palmAssetId=null;preview.removeAttribute('src');preview.hidden=true;palmRetakeBtn.hidden=true;clearPalmPreview().catch(()=>{});sessionStorage.removeItem('fortune:palm-report');setPalmUx('EMPTY','新しい写真を選択してください。');palmFile.click();
});
if(new URLSearchParams(location.search).get('retake')==='1'){document.querySelector('#reading')?.scrollIntoView({block:'start'});setTimeout(()=>palmFile?.click(),250);}

const restoredDraft=loadFortuneDraft();
if(restoredDraft.status==='OK'){
 for(const key of ['familyName','givenName','birthDate'])if($('#'+key)&&!$('#'+key).value)$('#'+key).value=restoredDraft.draft[key]||'';
}
// Local storage restores editable inputs only. It never restores an entitlement or result.
let freeChoice=null,choiceLoaded=false,stableAccount=false,pendingChoice=null;
const labels={shichusuimei:'四柱推命',name:'姓名判断',palm:'手相'};
async function postFortune(path,body){
 const c=await fetchSafe('/api/csrf-token',{credentials:'same-origin',cache:'no-store'});
 if(!c.ok)throw Error('接続状態を確認できませんでした。');
 const {token}=await readJsonSafe(c);
 const r=await fetchSafe(path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':token},body:JSON.stringify(body)});
 const data=await readJsonSafe(r);
 if(!r.ok){const error=new Error(data.message||data.status||data.error||'API_ERROR');error.code=data.status||data.error;throw error;}
 return data;
}
function currentInput(){return {birthDate:$('#birthDate').value,familyName:$('#familyName').value.trim(),givenName:$('#givenName').value.trim(),palmPhotoSelected:!!palmFile.files?.length,palmAssetId};}
async function refreshChoice({restore=true}={}){
 const r=await fetchSafe('/api/free-fortune-selection',{credentials:'same-origin',cache:'no-store'});
 if(!r.ok)throw Error('選択状況を確認できませんでした。');
 const data=await readJsonSafe(r);choiceLoaded=true;stableAccount=data.stableAccount===true;freeChoice=data.freeFortuneType;
 for(const radio of document.querySelectorAll('[name="freeFortuneType"]')){
  const available=data.choices.find(x=>x.type===radio.value)?.available===true;
  radio.disabled=!!freeChoice||!available;radio.checked=freeChoice===radio.value;
 }
 $('#freeAccountLink').hidden=stableAccount;
 $('#freeChoiceState').textContent=freeChoice?`無料で見る占術：${labels[freeChoice]}（確定済み・変更できません）`:stableAccount?'まだ確定していません。無料で詳しく見る占術を1つ選んでください。':'確定するには、マイページでメール確認を完了してください。';
 if(data.choices.find(x=>x.type==='palm')?.available)$('#palmChoiceHelp').textContent='確認できた線から、あなたの持ち味を読む';
 if(data.input&&!restoredDraft.draft){for(const key of ['familyName','givenName','birthDate'])if(!$('#'+key).value)$('#'+key).value=data.input[key]||'';}
 if(restore&&freeChoice&&data.input){
  await showServerReading(data.input);
 }
 return data;
}
function friendlyError(code){return ({ACCOUNT_REQUIRED:'無料選択を確定するには、マイページでメール確認を完了してください。',FREE_SELECTION_LOCKED:'このアカウントの無料占術は確定済みです。選択状況を読み直してください。',MODEL_PENDING:'手相の鑑定は準備中です。無料の選択は確定されていません。',BOUNDARY_UNCERTAIN:'節入り当日のため、出生時刻なしでは柱を断定できません。選択は確定されていません。',UNVERIFIED:'手相の推論結果はまだサーバーで確認できていません。未確認の結果は表示せず保留します。',DATA_VERIFY:'お名前の画数を確認できない文字があります。入力を確認してください。選択は確定されていません。',MASTER_NOT_PRESENT:'姓名判断のデータを確認できませんでした。時間を置いて再度お試しください。'})[code]||'鑑定を完了できませんでした。接続状態と入力を確認してください。';}
async function showServerReading(input){
 const data=await postFortune('/api/free-fortune-reading',{input});
 renderFreeFunnel(resultGrid,data);summary.textContent=`${data.fullName}さんの${labels[data.freeFortuneType]}の無料鑑定`;
 draft={version:'BUILD-40-RC286',...input,freeFortuneType:data.freeFortuneType,inputDigest:data.inputDigest};saveFortuneDraft(draft);
 results.classList.add('show');setState($('#formState'),'ok','選んだ占術の全文を表示しました。ほかの占術と総合鑑定は詳細鑑定で確認できます。');
}
async function runSelectedReading(){
 const input=currentInput();
 const validity=validateBirthDate(input.birthDate,{todayJst});
 if(!validity.ok)return setState($('#formState'),'warn',validity.status==='FUTURE_DATE'?'未来の生年月日は入力できません。':'生年月日は1955年から今日までの正しい日付を入力してください。');
 const chosen=freeChoice||document.querySelector('[name="freeFortuneType"]:checked')?.value;
 if(!choiceLoaded)return setState($('#formState'),'warn','無料選択の確認が完了していません。画面を開き直してください。');
 if(!stableAccount){$('#freeAccountLink').hidden=false;return setState($('#formState'),'warn',friendlyError('ACCOUNT_REQUIRED'));}
 if(!chosen)return setState($('#formState'),'warn','無料で詳しく見る占術を1つ選んでください。');
 if(!freeChoice){pendingChoice={fortuneType:chosen,input};$('#choiceConfirmTitle').textContent=`${labels[chosen]}を無料の占術として確定します`;$('#choiceConfirm').hidden=false;$('#choiceConfirm').focus();return;}
 try{setState($('#formState'),'warn','確定済みの占術で鑑定しています…');await showServerReading(input);results.scrollIntoView({behavior:'smooth',block:'start'});}
 catch(e){setState($('#formState'),'bad',friendlyError(e.code));}
}
form?.addEventListener('submit',async e=>{e.preventDefault();if(!$('#consent').checked)return setState($('#formState'),'warn','入力情報の処理への同意を確認してください。');await runSelectedReading();});
$('#confirmFreeChoice')?.addEventListener('click',async()=>{
 if(!pendingChoice)return;const button=$('#confirmFreeChoice');button.disabled=true;
 try{
  const input=currentInput();if(!form.reportValidity()||!$('#consent').checked)return;
  const data=await postFortune('/api/free-fortune-selection',{fortuneType:pendingChoice.fortuneType,confirmed:true,input});
  freeChoice=data.freeFortuneType;pendingChoice=null;$('#choiceConfirm').hidden=true;
  await showServerReading(input);await refreshChoice({restore:false});results.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){setState($('#formState'),'bad',friendlyError(e.code));if(e.code==='FREE_SELECTION_LOCKED')await refreshChoice().catch(()=>{});}
 finally{button.disabled=false;}
});
$('#cancelFreeChoice')?.addEventListener('click',()=>{pendingChoice=null;$('#choiceConfirm').hidden=true;document.querySelector('[name="freeFortuneType"]:checked')?.focus();});
premiumBtn?.addEventListener('click',()=>{if(!draft||!freeChoice){setState($('#formState'),'warn','先に無料の占術を選んで鑑定してください。');return;}location.href='checkout-confirm.html';});
refreshChoice().catch(()=>{choiceLoaded=false;$('#freeChoiceState').textContent='無料選択の確認に接続できませんでした。接続が戻ってから画面を開き直してください。';});
