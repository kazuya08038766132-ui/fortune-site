import {FORTUNE_TYPES,FORTUNE_LABELS,normalizeFortuneInput,fortuneInputDigest,readFreeChoice,fixFreeChoice,calculateFortuneSources,composeFortuneFunnel} from './fortune-funnel-build40.js';

export function mountFortuneFunnelRoutes(app,{pool,auth,nameRuntime,getPalmReadiness,sameOrigin,csrfGuard,readingLimit}){
 async function account(req,res){
  const c=typeof auth.ensureFreeAccount==='function'?await auth.ensureFreeAccount(req,res):await auth.resolve(req,res);
  if(!c.accountId){res.status(503).json({status:'ACCOUNT_UNAVAILABLE',error:'free_account_unavailable',message:'無料鑑定の利用情報を保存できませんでした。時間を置いて再度お試しください。'});return null;}
  return c;
 }
 app.get('/api/free-fortune-selection',async(req,res)=>{
  const c=await auth.resolve(req,res),saved=await readFreeChoice(pool,c.accountId),palm=getPalmReadiness();
  res.json({status:'OK',stableAccount:!!c.accountId,freeAccountReady:true,freeFortuneType:saved?.fortune_type||null,locked:!!saved,selectedAt:saved?.selected_at||null,
   choices:FORTUNE_TYPES.map(type=>({type,label:FORTUNE_LABELS[type],available:type==='palm'?palm.ready===true:type==='name'?nameRuntime.readiness().ready===true:true})),
   input:saved?.reading_input||null,inputDigest:saved?.reading_input?fortuneInputDigest(saved.reading_input):null});
 });
 app.post('/api/free-fortune-selection',sameOrigin,readingLimit,csrfGuard,async(req,res)=>{
  const c=await account(req,res);if(!c)return;
  const fortuneType=req.body?.fortuneType,confirmed=req.body?.confirmed;
  if(!FORTUNE_TYPES.includes(fortuneType))return res.status(400).json({status:'INVALID_FORTUNE_TYPE'});
  if(confirmed!==true)return res.status(400).json({status:'CONFIRMATION_REQUIRED'});
  const current=await readFreeChoice(pool,c.accountId);
  if(current&&current.fortune_type!==fortuneType)return res.status(409).json({status:'FREE_SELECTION_LOCKED',freeFortuneType:current.fortune_type});
  const parsed=normalizeFortuneInput(req.body?.input);
  if(!parsed.ok)return res.status(400).json({status:parsed.status});
  const raws=await calculateFortuneSources({pool,accountId:c.accountId,input:parsed.input,nameRuntime,palmReadiness:getPalmReadiness()});
  if(raws[fortuneType].status!=='OK')return res.status(409).json({status:raws[fortuneType].status,reason:raws[fortuneType].reason||null,selectionCommitted:false});
  const result=await fixFreeChoice(pool,{accountId:c.accountId,fortuneType,confirmed,input:parsed.input});
  return res.status(result.status==='OK'?200:409).json(result);
 });
 app.post('/api/free-fortune-reading',sameOrigin,readingLimit,csrfGuard,async(req,res)=>{
  const c=await account(req,res);if(!c)return;
  const choice=await readFreeChoice(pool,c.accountId);
  if(!choice)return res.status(409).json({status:'FREE_SELECTION_REQUIRED'});
  const parsed=normalizeFortuneInput(req.body?.input||choice.reading_input);
  if(!parsed.ok)return res.status(400).json({status:parsed.status});
  const raws=await calculateFortuneSources({pool,accountId:c.accountId,input:parsed.input,nameRuntime,palmReadiness:getPalmReadiness()});
  const result=composeFortuneFunnel({input:parsed.input,freeFortuneType:choice.fortune_type,raws,paid:false});
  await pool.query('UPDATE account_free_fortunes SET reading_input=$2 WHERE account_id=$1',[c.accountId,parsed.input]);
  return res.json(result);
 });
}
