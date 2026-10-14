import {fetchFirstPartySafe,readFirstPartyJson} from './browser-api-safe-build40.js';
import {renderPaidFunnel} from './fortune-funnel-view-build40.js';
const state=document.querySelector('#state'),body=document.querySelector('#paidBody');
const id=new URLSearchParams(location.search).get('order_id');
if(!id){state.textContent='購入した注文をマイページから選んでください。';}
else {
 try{
  const r=await fetchFirstPartySafe(`/api/my-order-reading/${encodeURIComponent(id)}`,{credentials:'same-origin',cache:'no-store'});
  const j=await readFirstPartyJson(r);
  if(!r.ok||j.paid!==true){state.className='status warn';state.textContent=r.status===404?'このアカウントの注文を確認できません。マイページから選び直してください。':r.status===403?'お支払いの確認が完了するまで詳細鑑定は解放されません。':'鑑定データを確認できませんでした。';}
  else {renderPaidFunnel(body,j.reading);state.className='status ok';state.textContent=`${j.reading.fullName}さんの詳細鑑定です。確認できていない占術の結果は保留しています。`;}
 }catch{state.className='status bad';state.textContent='鑑定APIへ接続できませんでした。再度開いてください。';}
}
