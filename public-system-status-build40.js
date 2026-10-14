import {publicLegalStatus} from "./legal-readiness-build40.js";
import {buildBirthReading} from "./birth-reading-service-build40.js";

const QA_TITLES=["総合タイプ","基本性格","恋愛・結婚","仕事・才能","金運","対人関係","開運アドバイス"];
const QA_BIRTH_CASES=["1988-06-15","1995-10-15","2004-03-15"];

function buildBirthQa(){
  const cases=QA_BIRTH_CASES.map(birthDate=>{
    try{
      const r=buildBirthReading(birthDate);
      const cards=Array.isArray(r?.freeCards)?r.freeCards:[];
      const titles=cards.map(x=>String(x?.title||''));
      const titleOk=QA_TITLES.every((x,i)=>titles[i]===x);
      const contentOk=cards.length===7&&cards.every(x=>String(x?.text||'').replace(/\s/g,'').length>=60);
      const technicalLeak=titles.some(x=>/年柱|月柱|日柱|日主|節入り/.test(x));
      const pass=r?.status==='OK'&&cards.length===7&&titleOk&&contentOk&&!technicalLeak;
      return {birthDate,status:pass?'PASS':'FAIL',readingStatus:r?.status||'UNKNOWN',cardCount:cards.length,titleOk,contentOk,technicalLeak};
    }catch(error){
      return {birthDate,status:'FAIL',error:String(error?.message||error).slice(0,120)};
    }
  });
  return {status:cases.every(x=>x.status==='PASS')?'PASS':'FAIL',cases};
}

function buildNameQa(nameRuntime,nameReadiness){
  if(!nameReadiness?.ready)return {status:'BLOCKED',reason:nameReadiness?.status||'MASTER_NOT_READY'};
  try{
    const r=nameRuntime?.reading?.({familyName:'山田',givenName:'太郎'})||{status:'RUNTIME_UNAVAILABLE'};
    const fiveGrid=r?.fiveGrid;
    const entries=Array.isArray(r?.numerology?.entries)?r.numerology.entries:[];
    const pass=r?.status==='OK'&&Number.isInteger(fiveGrid?.person)&&Number.isInteger(fiveGrid?.total)&&entries.length>=3;
    return {
      status:pass?'PASS':'FAIL',
      readingStatus:r?.status||'UNKNOWN',
      fiveGridReady:!!fiveGrid,
      numerologyEntryCount:entries.length,
      comprehensiveReady:r?.comprehensive?.status==='OK'
    };
  }catch(error){
    return {status:'FAIL',error:String(error?.message||error).slice(0,120)};
  }
}

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

  const birthQa=buildBirthQa();
  const nameQa=buildNameQa(nameRuntime,name);
  const palmQa={
    status:palmReadiness?.ready?'READY':'BLOCKED',
    manifestReady:!!palmReadiness?.manifestReady,
    modelReady:!!palmReadiness?.modelReady,
    handModelReady:!!palmReadiness?.handModelReady,
    missing:Array.isArray(palmReadiness?.missing)?palmReadiness.missing.slice(0,12):[],
    errors:Array.isArray(palmReadiness?.errors)?palmReadiness.errors.slice(0,12):[]
  };
  const qa={
    schema:'build40-public-qa-v1',
    status:birthQa.status==='FAIL'||nameQa.status==='FAIL'?'FAIL':(nameQa.status==='BLOCKED'||palmQa.status==='BLOCKED'?'PASS_WITH_BLOCKERS':'PASS'),
    birth:birthQa,
    name:nameQa,
    palm:palmQa
  };

  return {build:'BUILD-40',publicStatus:notices.length?'DEGRADED':'READY',capabilities,legal:{ready:legal.ready},notices,qa};
}
