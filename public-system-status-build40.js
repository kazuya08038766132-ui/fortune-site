import {publicLegalStatus} from "./legal-readiness-build40.js";
export function buildPublicSystemStatus({stripe=null,r2=null,resend=null,recovery=null,verification=null,nameRuntime=null,palmReadiness=null,env=process.env}={}){
  const name=nameRuntime?.readiness?.()||{ready:false,status:'MASTER_NOT_PRESENT'};
  const legal=publicLegalStatus(env);
  const capabilities={
    freeBirthReading:true,
    premiumBirthReading:true,
    nameReading:!!name.ready,
    palmPhotoQuality:true,
    palmProductionReading:!!palmReadiness?.ready,
    oneTimeCheckout:!!stripe,
    membershipCheckout:!!stripe,
    palmPrivateUpload:!!r2&&r2.configured!==false,
    emailDelivery:!!resend&&resend.configured!==false,
    accountRecovery:!!recovery&&recovery.configured!==false,
    accountVerification:!!verification&&verification.configured!==false,
    legalDisclosure:legal.ready
  };
  const notices=[];
  if(!capabilities.nameReading)notices.push({code:'NAME_MASTER_PENDING',scope:'name',message:'姓名判断の公式画数masterは準備中です。未確認文字を推測しません。'});
  if(!capabilities.palmProductionReading)notices.push({code:'PALM_MODEL_PENDING',scope:'palm',message:'手相の撮影品質チェックは利用できます。主要線のproduction鑑定はモデル検証完了後に提供します。'});
  if(!capabilities.oneTimeCheckout)notices.push({code:'PAYMENT_PROVIDER_PENDING',scope:'payment',message:'現在、決済接続は準備中です。無料鑑定は利用できます。'});
  if(!capabilities.emailDelivery)notices.push({code:'EMAIL_PROVIDER_PENDING',scope:'email',message:'メール配信は準備中です。鑑定結果は画面・マイページを優先してください。'});
  if(!legal.ready)notices.push({code:'LEGAL_SELLER_PENDING',scope:'legal',message:'事業者氏名・住所・電話番号・連絡先が未設定のため、有料申込みは停止中です。'});
  capabilities.oneTimeCheckout=capabilities.oneTimeCheckout&&legal.ready;
  capabilities.membershipCheckout=capabilities.membershipCheckout&&legal.ready;
  return {build:'BUILD-40',publicStatus:notices.length?'DEGRADED':'READY',capabilities,legal:{ready:legal.ready},notices};
}
