
window.FORTUNE_DEV_PREVIEW=!!window.FORTUNE_CONFIG?.devMode;
let palmUseConsent=false;
let palmTrainingConsent=false;
let pendingPalmInput=null;

function closePalmConsent(clearFile=false){
 document.getElementById('photoConsentOverlay')?.remove();
 if(clearFile && pendingPalmInput) pendingPalmInput.value='';
 pendingPalmInput=null;
}
function showPalmConsent(input){
 pendingPalmInput=input;
 document.getElementById('photoConsentOverlay')?.remove();
 const ov=document.createElement('div'); ov.id='photoConsentOverlay'; ov.className='photoConsentOverlay';
 ov.innerHTML=`<div class="photoConsentPanel" role="dialog" aria-modal="true">
 <h2>手相写真の利用について</h2>
 <p>選択した写真は、今回の手相鑑定のために解析します。鑑定への利用に同意しない場合は写真を使用しません。</p>
 <label class="consentChoice"><input type="checkbox" id="palmUseConsent"> <b>今回の手相鑑定のために写真を利用することに同意する（必須）</b></label>
 <label class="consentChoice"><input type="checkbox" id="palmTrainConsent"> AI精度改善のための学習利用にも同意する（任意・初期OFF）</label>
 <p class="small">AI学習への同意は任意です。OFFでも鑑定できます。詳しくは <a href="/privacy.html">プライバシーポリシー</a> をご確認ください。</p>
 <div class="photoConsentActions"><button type="button" class="cancel" id="palmConsentCancel">写真を使わない</button><button type="button" id="palmConsentAccept">同意して写真を使用</button></div>
 </div>`;
 document.body.appendChild(ov);
 document.getElementById('palmConsentCancel').onclick=()=>closePalmConsent(true);
 document.getElementById('palmConsentAccept').onclick=()=>{
   if(!document.getElementById('palmUseConsent').checked){alert('鑑定のための写真利用への同意が必要です。');return}
   palmUseConsent=true; palmTrainingConsent=document.getElementById('palmTrainConsent').checked;
   window.Spec195?.recordConsent?.('PALM_READING',true);
   window.Spec195?.recordConsent?.('PALM_AI_TRAINING',palmTrainingConsent);
   closePalmConsent(false);
 };
}

document.addEventListener('DOMContentLoaded',()=>{
 const p=document.getElementById('palm');
 p?.addEventListener('change',()=>{if(p.files?.[0]){palmUseConsent=false;showPalmConsent(p)}});
 const second=document.getElementById('paidSecondPalm');
 second?.addEventListener('change',()=>{if(second.files?.[0]){palmUseConsent=false;showPalmConsent(second)}});
 document.getElementById('devPaidPreview')?.addEventListener('click',()=>{
   document.getElementById('paidPreview').style.display='block';
   if(typeof unlockPaidResultForTest==='function') unlockPaidResultForTest();
 });
 document.getElementById('devMembershipPreview')?.addEventListener('click',()=>{
   localStorage.setItem('fortune_dev_membership','active');
   location.href='/mypage.html?dev=1';
 });
 const n=document.createElement('div');n.className='devNotice';n.textContent='開発確認版：¥980詳細鑑定・月額会員ページは決済なしでプレビューできます。公開時は開発入口をOFFにします。';
 document.querySelector('.publicTopNav')?.after(n);
});


async function palmFeaturesPublicSafe(file,handSide='auto'){
  if(!file) throw new Error('no_file');
  // SPEC195 emergency-safe public path:
  // Do not decode/process pixels here. This guarantees the free reading cannot freeze
  // on Android while the production palm model is still DATA_VERIFY.
  return {
    confidence:0,
    quality:'accepted_limited',
    qualityGate:{
      status:'pass',
      score:.5,
      reasons:[],
      message:'写真は受付できました。現在の手相線AIは検証中のため、主要線は断定せずに表示します。'
    },
    source:file.name||'uploaded-image',
    image:{width:999,height:999,analysisWidth:0,analysisHeight:0,orientation:'unknown',
      hand:{requested:handSide,resolved:'unknown'}},
    life:{score:0,confidence:0,detected:false},
    head:{score:0,confidence:0,detected:false},
    heart:{score:0,confidence:0,detected:false},
    fate:{score:0,confidence:0,detected:false},
    principalLines:{detected:false,reason:'PALM_AI_DATA_VERIFY'}
  };
}

// Override the public fortune flow: only truly unusable photos are rejected.
// Borderline line confidence is handled per-line instead of rejecting the whole palm.
const _fortuneOriginal=window.fortune;

// SPEC195: palm analysis must never block the whole free reading.
function spec195WithTimeout(promise,ms,label='palm-analysis'){
  let timer;
  const timeout=new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error(label+'_timeout')),ms);
  });
  return Promise.race([Promise.resolve(promise),timeout]).finally(()=>clearTimeout(timer));
}

window.fortuneEmbeddedDisabled=async function(){
 const btn=document.getElementById('freeFortuneButton');
 const r=document.getElementById('result');
 const b=document.getElementById('birth')?.value||'';
 const f=document.getElementById('palm')?.files?.[0]||null;
 const t=document.getElementById('theme')?.value||'総合';
 const q=document.getElementById('question')?.value||'';
 if(!b||!f){alert('生年月日と手のひら写真を入力してください');return}
 if(!palmUseConsent){if(btn){btn.disabled=false;btn.textContent='無料鑑定を試す'}showPalmConsent(document.getElementById('palm'));return}
 if(!r){if(btn){btn.disabled=false;btn.textContent='無料鑑定を試す'}return;}
 r.style.display='block';
 r.innerHTML='<p><b>無料鑑定を作成しています…</b></p>';
 try{
   await new Promise(resolve=>setTimeout(resolve,0));
   const num=birthCore(b);
   const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   let birthText='';
   if(num && typeof num==='object' && !num.error){
     birthText=`年柱 ${safe(num.yearPillar||'確認中')}・月柱 ${safe(num.monthPillar||'確認中')}・日柱 ${safe(num.dayPillar||'確認中')}。日主 ${safe(num.dayMaster||'確認中')} ${safe(num.element||'')}`;
   }else{
     birthText='生年月日は受付しました。現在の生年月日エンジンは三柱ベースの開発版です。';
   }
   const nameBlock=(typeof verifiedNameFortune==='function')?verifiedNameFortune():null;
   const nameText=nameBlock?.status==='DATA_VERIFY'
      ? '姓名判断は画数マスター未確認の文字を推測せず「要確認」とします。'
      : '姓名判断データを確認しました。';
   r.innerHTML=`<section class="safeFreeResult">
      <h2>${safe(t)}・無料鑑定</h2>
      <h3>姓名</h3><p>${safe(nameText)}</p>
      <h3>生年月日</h3><p>${birthText}</p>
      <h3>手相</h3><p>手相写真は正常に受付しました。主要線AIは現在検証中のため、線の位置・長さ・濃さを推測して断定しません。</p>
      ${q?`<h3>ご相談</h3><p>${safe(q)}</p>`:''}
      <p class="small">開発確認用 FREE-FLOW-03。手相AIと三占術統合は検証完了後に再接続します。</p>
   </section>`;
   const paid=document.getElementById('paidCta');
   if(paid)paid.style.display='block';
   if(typeof setUserStep==='function')setUserStep(3);
   if(btn){btn.disabled=false;btn.textContent='無料鑑定を試す'}
 }catch(e){
   console.error('FREE_FLOW_03',e);
   r.innerHTML='<div class="captureError"><h3>無料鑑定の表示エラー</h3><p>写真は受付済みです。結果表示処理でエラーが発生しました。</p></div>';
   if(btn){btn.disabled=false;btn.textContent='無料鑑定を試す'}
 }
};
