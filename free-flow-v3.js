(() => {
  "use strict";
  const BUILD="FREE-FLOW-03";
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function setButton(btn,text,disabled=false){
    if(!btn)return;
    btn.textContent=text;
    btn.disabled=disabled;
  }
  function resultBox(){
    return document.getElementById("result");
  }
  function showMessage(html){
    const r=resultBox();
    if(!r)return false;
    r.style.display="block";
    r.innerHTML=html;
    r.scrollIntoView({behavior:"smooth",block:"start"});
    return true;
  }

  async function runFreeReading(){
    const btn=document.getElementById("freeFortuneButton");
    setButton(btn,"鑑定処理を開始しました…",true);

    const birth=document.getElementById("birth")?.value||"";
    const palm=document.getElementById("palm")?.files?.[0]||null;
    const theme=document.getElementById("theme")?.value||"総合";
    const question=document.getElementById("question")?.value||"";

    if(!birth||!palm){
      showMessage('<div class="captureError"><h3>入力を確認してください</h3><p>生年月日と利き手の手のひら写真が必要です。</p></div>');
      setButton(btn,"無料鑑定を試す",false);
      return;
    }

    // Consent is required by SPEC. If the legacy consent UI is available, use it.
    try{
      if(typeof palmUseConsent!=="undefined" && !palmUseConsent){
        if(typeof showPalmConsent==="function"){
          showPalmConsent(document.getElementById("palm"));
          showMessage('<div class="notice"><b>写真利用の同意を確認してください。</b><br>同意後、もう一度「無料鑑定を試す」を押してください。</div>');
        }else{
          showMessage('<div class="captureError"><h3>同意画面の起動エラー</h3><p>写真利用の同意処理を確認しています。</p></div>');
        }
        setButton(btn,"無料鑑定を試す",false);
        return;
      }
    }catch(e){
      console.error(BUILD,"consent",e);
      showMessage('<div class="captureError"><h3>同意処理のエラー</h3><p>写真はまだ解析していません。</p></div>');
      setButton(btn,"無料鑑定を試す",false);
      return;
    }

    showMessage('<p><b>無料鑑定を作成しています…</b></p>');

    // Isolation test: image-analysis and legacy fusion are intentionally not invoked here.
    // Birth engine is optional; failure falls back without blocking the UI.
    let birthText="生年月日は受付しました。現在の生年月日エンジンは三柱ベースの開発版です。";
    try{
      if(typeof birthCore==="function"){
        const n=birthCore(birth);
        if(n && typeof n==="object" && !n.error){
          birthText=`年柱 ${esc(n.yearPillar||"確認中")}・月柱 ${esc(n.monthPillar||"確認中")}・日柱 ${esc(n.dayPillar||"確認中")}。日主 ${esc(n.dayMaster||"確認中")} ${esc(n.element||"")}`;
        }
      }
    }catch(e){ console.error(BUILD,"birth",e); }

    const q=question?`<h3>ご相談</h3><p>${esc(question)}</p>`:"";
    showMessage(`<section class="safeFreeResult">
      <h2>${esc(theme)}・無料鑑定</h2>
      <h3>姓名</h3><p>姓名判断は、画数マスター未確認の文字を推測せず「要確認」とします。</p>
      <h3>生年月日</h3><p>${birthText}</p>
      <h3>手相</h3><p>手相写真は正常に受付しました。主要線AIは検証中のため、線の位置・長さ・濃さを推測して断定しません。</p>
      ${q}
      <p class="small">開発確認用 ${BUILD}。クリック経路を旧コードから完全分離しています。</p>
    </section>`);
    const paid=document.getElementById("paidCta");
    if(paid)paid.style.display="block";
    setButton(btn,"無料鑑定を試す",false);
  }

  function boot(){
    const btn=document.getElementById("freeFortuneButton");
    if(!btn){
      console.error(BUILD,"button not found");
      return;
    }
    btn.addEventListener("click",runFreeReading,{passive:false});
    btn.dataset.controller=BUILD;
    window.freeReadingV3=runFreeReading;
    console.info(BUILD,"controller ready");
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();