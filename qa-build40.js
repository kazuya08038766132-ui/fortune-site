import {verifiedSectionalTerms} from './birth-boundary-registry-build40.js';
import {boundaryForDateOnly} from './birth-boundary-engine-build40.js';
import {yearBoundaryDateOnly} from './birth-year-boundary-build40.js';
import {sexagenaryYear,sexagenaryMonth,composeFreeBirthCards} from './fortune-reading-build40.js';
import {evaluatePalmPhotoFile,palmPhotoQualityMessage} from './palm-photo-quality-build40.js';
import {probePalmProductionReadiness} from './palm-production-readiness-build40.js';
import {initializePalmBrowserRuntime} from './palm-runtime-autoload-build40.js';
import {runPalmLocalReading} from './palm-local-reading-build40.js';
import {makePalmPreviewBlob} from './palm-local-preview-store-build40.js';
import {fetchFirstPartySafe as fetchSafe,readFirstPartyJson as readJsonSafe} from './browser-api-safe-build40.js';

const $=s=>document.querySelector(s);
const EXPECTED_TITLES=["総合タイプ","基本性格","恋愛・結婚","仕事・才能","金運","対人関係","開運アドバイス"];
const BIRTH_CASES=["1988-06-15","1995-10-15","2004-03-15","2017-08-15","2025-12-15"];
const DB='fortune-qa-fixtures-build40',STORE='fixture',KEY='palm-v1',MAX_AGE=30*24*60*60*1000;
let lastReport={schema:'build40-browser-qa-v1',status:'NOT_RUN'};

function setState(el,kind,text){el.className=`status ${kind}`;el.textContent=text}
function safeText(x){return String(x??'')}
function openDb(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error('QA_DB_OPEN'));
 });
}
async function saveFixture(blob){
 const db=await openDb();
 await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({blob,createdAt:Date.now()},KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('QA_DB_WRITE'));});
 db.close();
}
async function loadFixture(){
 const db=await openDb();
 const v=await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(KEY);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||new Error('QA_DB_READ'));});
 db.close();
 if(!v?.blob)return null;
 if(!Number.isFinite(v.createdAt)||Date.now()-v.createdAt>MAX_AGE){await clearFixture();return null}
 return v;
}
async function clearFixture(){
 const db=await openDb();
 await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('QA_DB_DELETE'));});
 db.close();
}
function renderJson(){
 $('#qaJson').textContent=JSON.stringify(lastReport,null,2);
 try{localStorage.setItem('fortune:qa:last',JSON.stringify(lastReport))}catch{}
}
function birthCase(birthDate){
 const year=Number(birthDate.slice(0,4));
 const pack=verifiedSectionalTerms(year);
 if(pack.status!=='VERIFIED')return {birthDate,status:'FAIL',reason:'BOUNDARY_PACK'};
 const risshun=pack.terms.find(x=>x.term==='立春');
 const yb=yearBoundaryDateOnly({birthDate,risshunDate:risshun?.date});
 const mb=boundaryForDateOnly({birthDate,terms:pack.terms});
 if(yb.status!=='OK'||mb.status!=='OK')return {birthDate,status:'FAIL',reason:`BOUNDARY_${yb.status}_${mb.status}`};
 const yp=sexagenaryYear(yb.pillarYear),mp=sexagenaryMonth(yb.pillarYear,mb.monthNo);
 const cards=composeFreeBirthCards({yearPillar:yp,monthPillar:mp,boundary:mb,birthDate});
 const titles=cards.map(x=>x.title);
 const titleOk=EXPECTED_TITLES.every((x,i)=>titles[i]===x);
 const contentOk=cards.length===7&&cards.every(x=>safeText(x.text).replace(/\s/g,'').length>=60);
 const technicalLeak=titles.some(x=>/年柱|月柱|日柱|日主|節入り/.test(x));
 const pass=cards.length===7&&titleOk&&contentOk&&!technicalLeak;
 return {birthDate,status:pass?'PASS':'FAIL',cardCount:cards.length,titleOk,contentOk,technicalLeak,preview:cards.map(x=>({title:x.title,value:x.value}))};
}
function runBirthQa(){
 const cases=BIRTH_CASES.map(birthCase);
 const status=cases.every(x=>x.status==='PASS')?'PASS':'FAIL';
 setState($('#birthQaState'),status==='PASS'?'ok':'bad',status==='PASS'?`PASS｜${cases.length}プロフィール × 7項目`:'FAIL｜無料7項目に不整合があります');
 $('#birthQaDetails').textContent=cases.map(x=>`${x.birthDate}: ${x.status} (${x.cardCount||0} cards)`).join(' / ');
 return {status,cases};
}
async function readServerStatus(){
 const r=await fetchSafe('/api/system-status',{credentials:'same-origin',cache:'no-store'});
 if(!r.ok)throw Error(`SYSTEM_STATUS_${r.status}`);
 return readJsonSafe(r);
}
async function runNameQa(system){
 const cap=system?.capabilities?.nameReading===true;
 if(!cap){
  const x={status:'BLOCKED',reason:system?.qa?.name?.reason||'NAME_MASTER_PENDING'};
  setState($('#nameQaState'),'warn','BLOCKED｜姓名masterが未準備');
  $('#nameQaDetails').textContent=safeText(x.reason);
  return x;
 }
 try{
  const c=await fetchSafe('/api/csrf-token',{credentials:'same-origin',cache:'no-store'});
  if(!c.ok)throw Error(`CSRF_${c.status}`);
  const {token}=await readJsonSafe(c);
  const r=await fetchSafe('/api/name-reading',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':token},body:JSON.stringify({familyName:'山田',givenName:'太郎'})});
  const body=await readJsonSafe(r);
  const pass=r.ok&&body?.status==='OK'&&Number.isInteger(body?.fiveGrid?.person)&&Number.isInteger(body?.fiveGrid?.total);
  const x={status:pass?'PASS':'FAIL',httpStatus:r.status,readingStatus:body?.status||'UNKNOWN',fiveGrid:body?.fiveGrid||null,numerologyEntryCount:Array.isArray(body?.numerology?.entries)?body.numerology.entries.length:0};
  setState($('#nameQaState'),pass?'ok':'bad',pass?'PASS｜山田太郎の姓名判断API':'FAIL｜姓名判断API');
  $('#nameQaDetails').textContent=pass?`人格${body.fiveGrid.person} / 総格${body.fiveGrid.total} / 81数理 ${x.numerologyEntryCount}件`:`status=${x.readingStatus}`;
  return x;
 }catch(error){
  const x={status:'FAIL',error:safeText(error?.message||error)};
  setState($('#nameQaState'),'bad',`FAIL｜${x.error}`);
  return x;
 }
}
async function refreshPalmFixtureState(){
 try{
  const v=await loadFixture();
  if(!v){
   setState($('#palmQaState'),'warn','QA用写真なし｜一度だけ保存すれば30日再利用できます');
   $('#palmFixturePreview').hidden=true;
   return null;
  }
  const img=$('#palmFixturePreview');
  if(img.dataset.url)URL.revokeObjectURL(img.dataset.url);
  const url=URL.createObjectURL(v.blob);img.dataset.url=url;img.src=url;img.hidden=false;
  const days=Math.max(0,Math.floor((Date.now()-v.createdAt)/(24*60*60*1000)));
  setState($('#palmQaState'),'ok',`QA用写真あり｜保存から${days}日`);
  return v;
 }catch(error){
  setState($('#palmQaState'),'bad',`保存写真確認エラー｜${safeText(error?.message||error)}`);
  return null;
 }
}
async function runPalmQa(){
 const fixture=await loadFixture();
 const readiness=await probePalmProductionReadiness().catch(error=>({ready:false,error:safeText(error?.message||error)}));
 if(!fixture){
  const x={status:'NO_FIXTURE',productionReady:!!readiness?.ready};
  setState($('#palmQaState'),'warn','QA用写真なし｜一度だけ写真を保存してください');
  $('#palmQaDetails').textContent=readiness?.ready?'productionモデル: READY':'productionモデル: BLOCKED';
  return x;
 }
 const file=new File([fixture.blob],'qa-palm.jpg',{type:fixture.blob.type||'image/jpeg'});
 try{
  const quality=await evaluatePalmPhotoFile(file);
  const base={photoQualityAcceptable:!!quality?.acceptable,qualityMessage:palmPhotoQualityMessage(quality),productionReady:!!readiness?.ready};
  if(!quality?.acceptable){
   const x={status:'RECAPTURE',...base};
   setState($('#palmQaState'),'warn','写真品質QA：撮り直し判定');
   $('#palmQaDetails').textContent=x.qualityMessage;
   return x;
  }
  if(!readiness?.ready){
   const x={status:'QUALITY_PASS_MODEL_BLOCKED',...base,missing:readiness?.missing||[],errors:readiness?.errors||[]};
   setState($('#palmQaState'),'warn','写真品質 PASS｜productionモデルは未昇格');
   $('#palmQaDetails').textContent=x.qualityMessage;
   return x;
  }
  setState($('#palmQaState'),'warn','手相runtimeで解析中…');
  const rt=await initializePalmBrowserRuntime();
  const result=await runPalmLocalReading({file,ort:rt.ort,manifest:readiness.manifestData,modelUrl:rt.modelUrl||'./models/palm-principal-lines.onnx',handLandmarker:rt.handLandmarker});
  const x={status:'INFERENCE_DONE',...base,resultStatus:result?.status||'OK',detectedLines:Object.values(result?.feature?.lines||{}).filter(v=>v?.state==='DETECTED').length};
  setState($('#palmQaState'),'ok',`手相QA完了｜検出主要線 ${x.detectedLines}`);
  $('#palmQaDetails').textContent=`runtime=${x.resultStatus} / ${x.qualityMessage}`;
  return x;
 }catch(error){
  const x={status:'FAIL',productionReady:!!readiness?.ready,error:safeText(error?.message||error)};
  setState($('#palmQaState'),'bad',`手相QA FAIL｜${x.error}`);
  return x;
 }
}
async function runAllQa(){
 setState($('#overallState'),'warn','QA実行中…');
 const report={schema:'build40-browser-qa-v1',executedAt:new Date().toISOString(),birth:runBirthQa(),server:null,name:null,palm:null};
 try{
  const system=await readServerStatus();
  report.server={status:system?.qa?.status||system?.publicStatus||'UNKNOWN',build:system?.build||null,qa:system?.qa||null,capabilities:system?.capabilities||null};
  setState($('#serverQaState'),system?.qa?.status==='FAIL'?'bad':'ok',`server QA: ${report.server.status}`);
  $('#serverQaDetails').textContent=`Birth=${system?.qa?.birth?.status||'?'} / Name=${system?.qa?.name?.status||'?'} / Palm=${system?.qa?.palm?.status||'?'}`;
  report.name=await runNameQa(system);
 }catch(error){
  report.server={status:'FAIL',error:safeText(error?.message||error)};
  report.name={status:'SKIPPED'};
  setState($('#serverQaState'),'bad',`FAIL｜${report.server.error}`);
 }
 report.palm=await runPalmQa();
 const hardFail=[report.birth?.status,report.server?.status,report.name?.status,report.palm?.status].includes('FAIL');
 report.status=hardFail?'FAIL':'PASS_WITH_BLOCKERS';
 if(!hardFail&&report.birth?.status==='PASS'&&report.server?.status==='PASS'&&report.name?.status==='PASS'&&report.palm?.status==='INFERENCE_DONE')report.status='PASS';
 lastReport=report;renderJson();
 setState($('#overallState'),report.status==='FAIL'?'bad':report.status==='PASS'?'ok':'warn',`QA結果：${report.status}`);
}
$('#runAllQa')?.addEventListener('click',runAllQa);
$('#copyQa')?.addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(JSON.stringify(lastReport,null,2));setState($('#overallState'),'ok','QA結果をコピーしました');}
 catch{setState($('#overallState'),'warn','コピーできませんでした。下のQAレポートを長押しコピーしてください。');}
});
$('#savePalmFixture')?.addEventListener('click',async()=>{
 const f=$('#palmFixtureInput')?.files?.[0];
 if(!f)return setState($('#palmQaState'),'warn','保存する写真を選んでください');
 if(!/^image\/(jpeg|png|webp)$/.test(f.type)||f.size>12*1024*1024)return setState($('#palmQaState'),'bad','JPEG / PNG / WebP、12MB以下の写真を選んでください');
 try{
  const blob=await makePalmPreviewBlob(f);
  await saveFixture(blob);
  $('#palmFixtureInput').value='';
  await refreshPalmFixtureState();
  setState($('#palmQaState'),'ok','QA用写真を端末内に保存しました｜30日再利用できます');
 }catch(error){setState($('#palmQaState'),'bad',`保存失敗｜${safeText(error?.message||error)}`)}
});
$('#runPalmQa')?.addEventListener('click',async()=>{const x=await runPalmQa();lastReport={...lastReport,palm:x,executedAt:new Date().toISOString()};renderJson();});
$('#clearPalmFixture')?.addEventListener('click',async()=>{await clearFixture();await refreshPalmFixtureState();});
refreshPalmFixtureState();
try{
 const prior=JSON.parse(localStorage.getItem('fortune:qa:last')||'null');
 if(prior){lastReport=prior;renderJson();}
}catch{}
