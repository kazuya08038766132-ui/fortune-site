import crypto from 'crypto';
import {Resend} from 'resend';
import {issueCsrfV2,verifyCsrfV2} from './csrf-v2-adapter-build40.js';
import {createR2,makePalmKey,presignPalmPut,headPalm,deletePalm} from './r2-build40.js';
import {createReadiness} from './readiness-build40.js';
import {createRecoveryOps} from './recovery-ops-build40.js';
import {createAccountRecovery} from './account-recovery-build40.js';
import {enqueueEmail} from './email-outbox-build40.js';
import {recoveryEmail} from './recovery-email-build40.js';
import {handleStripeBuild40Event} from './stripe-build40.js';
import {createAccountEmailVerification} from './account-email-verification-service-build40.js';
import {verificationEmail} from './verification-email-build40.js';
import {loadAndValidateDetailCheckoutBinding} from './stripe-session-binding-build40.js';
import {comparePalmHistorySnapshots} from './palm-reproducibility-build40.js';
import {validatePalmHistoryEvidence} from './palm-history-evidence-validator-build40.js';
import {validatePalmReadingEnvelope} from './palm-reading-envelope-validator-build40.js';
import {annotatePalmHistoryRows,buildPalmHistoryItem,selectComparablePalmSnapshots} from './palm-history-read-guard-build40.js';
import {hashPalmReadingCanonical,PALM_READING_HASH_VERSION} from './palm-reading-canonical-hash-build40.js';
import {hashPalmHistoryRecordBinding,PALM_HISTORY_RECORD_HASH_VERSION} from './palm-history-record-binding-build40.js';

function parseCookies(req){
 return Object.fromEntries(String(req.headers?.cookie||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return i<0?[x,'']:[x.slice(0,i),decodeURIComponent(x.slice(i+1))]}));
}
function cookieSession(req,res){
 let sid=String(parseCookies(req).fortune_sid||'');
 if(!/^[a-f0-9]{48}$/.test(sid)){
  sid=crypto.randomBytes(24).toString('hex');
  const secure=process.env.NODE_ENV==='production'?'; Secure':'';
  res.append('Set-Cookie',`fortune_sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`);
 }
 req.fortuneSid=sid; return sid;
}
export function createIntegratedCsrfAdapter(pool){
 const session=(req,res)=>cookieSession(req,res);
 const touch=async(req,res)=>{const sid=session(req,res);await pool.query(`INSERT INTO visitor_accounts(session_key) VALUES($1) ON CONFLICT(session_key) DO UPDATE SET last_seen_at=NOW()`,[sid]);return sid};
 const sameOrigin=(req,res,next)=>{const fetchSite=String(req.headers?.['sec-fetch-site']||'').toLowerCase();if(fetchSite==='cross-site')return res.status(403).json({error:'cross_site_forbidden'});const origin=String(req.headers?.origin||'');if(!origin)return next();const base=process.env.PUBLIC_BASE_URL||'';if(!base)return next();try{if(new URL(origin).origin!==new URL(base).origin)return res.status(403).json({error:'origin_forbidden'})}catch{return res.status(403).json({error:'origin_forbidden'})}next()};
 const guard=(req,res,next)=>{const sid=session(req,res),token=String(req.headers?.['x-csrf-token']||'');if(!verifyCsrfV2(sid,token))return res.status(403).json({error:'csrf_required'});next()};
 return {session,touch,sameOrigin,guard,issue:(sid)=>issueCsrfV2(sid)};
}

export function createIntegratedR2Adapter(pool){
 const raw=createR2();
 const allowed=new Set(['image/jpeg','image/png','image/webp']);
 const maxBytes=12*1024*1024;
 async function ownerSubject(sessionKey){const q=await pool.query(`SELECT account_id FROM account_sessions WHERE session_key=$1 LIMIT 1`,[sessionKey]);return q.rows[0]?.account_id?`acct:${q.rows[0].account_id}`:sessionKey}
 async function row(sessionKey,assetId){const subject=await ownerSubject(sessionKey);const q=await pool.query(`SELECT id,storage_key,content_type,state,purpose,retention_mode FROM palm_assets WHERE id=$1 AND subject_key=$2 LIMIT 1`,[assetId,subject]);return q.rows[0]||null}
 async function activeMembership(sessionKey){const subject=await ownerSubject(sessionKey);if(!subject.startsWith('acct:'))return false;const accountId=subject.slice(5);const q=await pool.query(`SELECT 1 FROM account_membership_links aml JOIN membership_accounts ma ON ma.stripe_customer_id=aml.stripe_customer_id WHERE aml.account_id=$1 AND ma.subscription_status IN ('active','trialing') LIMIT 1`,[accountId]);return !!q.rowCount}
 return {
  configured:!!raw,
  async hasReadingConsent(sessionKey){const subject=await ownerSubject(sessionKey);const q=await pool.query(`SELECT accepted FROM consent_events WHERE subject_key=$1 AND consent_type='PALM_READING' ORDER BY created_at DESC LIMIT 1`,[subject]);return q.rows[0]?.accepted===true},
  async ownsAsset(sessionKey,assetId){return !!(await row(sessionKey,assetId))},
  async headObject(sessionKey,assetId){if(!raw)return {exists:false};const a=await row(sessionKey,assetId);if(!a)return {exists:false};try{const h=await headPalm(raw,a.storage_key);return {exists:true,contentType:String(h.ContentType||''),contentLength:Number(h.ContentLength||0),etag:String(h.ETag||'')}}catch(e){if(e?.$metadata?.httpStatusCode===404||e?.name==='NotFound')return {exists:false};throw e}},
  async presign(req,res,{sessionKey}){if(!raw)return res.status(503).json({error:'r2_unavailable'});const type=String(req.body?.content_type||'').toLowerCase();if(!allowed.has(type))return res.status(415).json({error:'unsupported_content_type'});const wantsHistory=req.body?.save_history===true;if(wantsHistory&&!await activeMembership(sessionKey))return res.status(403).json({error:'membership_required_for_palm_history'});const subject=await ownerSubject(sessionKey);const key=makePalmKey(subject,type),url=await presignPalmPut(raw,key,type);const retention=wantsHistory?'member_history':'ephemeral';const q=await pool.query(`INSERT INTO palm_assets(subject_key,storage_key,purpose,retention_mode,delete_after,state,content_type) VALUES($1,$2,'reading',$3,CASE WHEN $3='member_history' THEN NULL ELSE NOW()+INTERVAL '24 hours' END,'pending_upload',$4) RETURNING id,delete_after,retention_mode`,[subject,key,retention,type]);return res.status(201).json({asset_id:q.rows[0].id,assetId:q.rows[0].id,upload_url:url,expires_in:600,content_type:type,delete_after:q.rows[0].delete_after,retention_mode:q.rows[0].retention_mode})},
  async finalize(_req,res,{sessionKey,assetId,verifiedHead}){const a=await row(sessionKey,assetId);if(!a)return res.status(404).json({error:'not_found'});const h=verifiedHead;if(!allowed.has(h.contentType)||h.contentType!==a.content_type||h.contentLength<1||h.contentLength>maxBytes)return res.status(422).json({error:'upload_verification_failed'});await pool.query(`UPDATE palm_assets SET state='uploaded',content_length=$2,etag=$3,uploaded_at=NOW(),updated_at=NOW() WHERE id=$1`,[assetId,h.contentLength,h.etag||null]);return res.json({ok:true,asset_id:Number(assetId),assetId:Number(assetId),state:'uploaded',size:h.contentLength})},
  async saveSnapshot(req,res,{sessionKey,assetId}){const subject=await ownerSubject(sessionKey);if(!subject.startsWith('acct:')||!await activeMembership(sessionKey))return res.status(403).json({error:'membership_required_for_palm_history'});const a=await row(sessionKey,assetId);if(!a||a.retention_mode!=='member_history'||a.state!=='uploaded')return res.status(409).json({error:'saved_palm_asset_not_ready'});const reading=req.body?.reading;if(!reading||typeof reading!=='object'||Array.isArray(reading))return res.status(422).json({error:'invalid_palm_reading_snapshot'});const rawReading=JSON.stringify(reading);if(Buffer.byteLength(rawReading,'utf8')>256*1024)return res.status(413).json({error:'palm_reading_snapshot_too_large'});const version=String(reading.version||'');const envelopeValidation=validatePalmReadingEnvelope(reading);if(!envelopeValidation.ok)return res.status(422).json({error:envelopeValidation.error==='invalid_history_geometry'?'invalid_palm_history_geometry':envelopeValidation.error==='invalid_history_evidence'?'unstable_palm_reading_snapshot':'invalid_palm_reading_snapshot'});const ev=reading.historyEvidence,evidenceValidation=validatePalmHistoryEvidence(ev);if(!evidenceValidation.ok)return res.status(422).json({error:evidenceValidation.error==='invalid_history_geometry'?'invalid_palm_history_geometry':'unstable_palm_reading_snapshot'});const hash=hashPalmReadingCanonical(reading),recordHash=hashPalmHistoryRecordBinding({assetId,subjectKey:subject,readingVersion:version,readingSha256:hash,readingHashVersion:PALM_READING_HASH_VERSION,historyEvidence:ev});await pool.query(`INSERT INTO palm_reading_snapshots(asset_id,subject_key,reading_version,reading,reading_sha256,reading_hash_version,record_sha256,record_hash_version) VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8) ON CONFLICT(asset_id) DO UPDATE SET subject_key=EXCLUDED.subject_key,reading_version=EXCLUDED.reading_version,reading=EXCLUDED.reading,reading_sha256=EXCLUDED.reading_sha256,reading_hash_version=EXCLUDED.reading_hash_version,record_sha256=EXCLUDED.record_sha256,record_hash_version=EXCLUDED.record_hash_version`,[assetId,subject,version,rawReading,hash,PALM_READING_HASH_VERSION,recordHash,PALM_HISTORY_RECORD_HASH_VERSION]);return res.status(201).json({ok:true,assetId:Number(assetId),readingVersion:version,readingSha256:hash,readingHashVersion:PALM_READING_HASH_VERSION,recordSha256:recordHash,recordHashVersion:PALM_HISTORY_RECORD_HASH_VERSION})},
  async history(_req,res,{sessionKey}){const subject=await ownerSubject(sessionKey);if(!subject.startsWith('acct:')||!await activeMembership(sessionKey))return res.status(403).json({error:'membership_required_for_palm_history'});const q=await pool.query(`SELECT a.id,a.state,a.content_type,a.content_length,a.uploaded_at,a.created_at,s.subject_key AS snapshot_subject_key,s.reading_version,s.reading_sha256,s.reading_hash_version,s.record_sha256,s.record_hash_version,s.reading FROM palm_assets a LEFT JOIN palm_reading_snapshots s ON s.asset_id=a.id AND s.subject_key=a.subject_key WHERE a.subject_key=$1 AND a.retention_mode='member_history' AND a.state<>'deleted' ORDER BY COALESCE(a.uploaded_at,a.created_at) DESC,a.id DESC LIMIT 50`,[subject]);const rows=annotatePalmHistoryRows(q.rows),items=rows.map(buildPalmHistoryItem),selection=selectComparablePalmSnapshots(rows,3),snap=selection.snapshots;let comparison={ready:false,reason:selection.reason};if(selection.ready){const tags=r=>new Set(Array.isArray(r?.tags)?r.tags:[]),conf=r=>Math.min(Number(r?.confidence||0),Number(r?.semanticConfidence??1),Number(r?.evidenceQuality??1)),now=tags(snap[0].reading),prev=tags(snap[1].reading),stable=[...now].filter(x=>prev.has(x)),added=[...now].filter(x=>!prev.has(x)),removed=[...prev].filter(x=>!now.has(x)),c0=conf(snap[0].reading),c1=conf(snap[1].reading),agreement=stable.length/Math.max(1,new Set([...now,...prev]).size),conflict=added.length+removed.length,repeat=comparePalmHistorySnapshots(snap[0].reading,snap[1].reading);let status='STABLE',reason=null,supplementary=[];if(repeat.reason==='LOW_CONFIDENCE'&&conflict){status='RETAKE_REQUIRED';reason='low_confidence_conflict'}else if(repeat.reason==='LINE_GEOMETRY_VARIANCE'){status='RETAKE_REQUIRED';reason='line_geometry_variance'}else if(!repeat.reproducible&&conflict){status='RETAKE_REQUIRED';reason='capture_variance_suspected'}else if(snap.length>=3&&Math.min(c0,c1)>=0.82){const older=tags(snap[2].reading);supplementary=[...now].filter(x=>!prev.has(x)&&!older.has(x));if(supplementary.length)status='OBSERVATION_ONLY'}comparison={ready:true,status,reason,currentAssetId:Number(snap[0].id),previousAssetId:Number(snap[1].id),stableTags:stable,supplementaryTags:status==='OBSERVATION_ONLY'?supplementary:[],agreement:Number(agreement.toFixed(3)),currentConfidence:c0,previousConfidence:c1,note:status==='RETAKE_REQUIRED'?'撮影条件による解析差の可能性があります。鑑定内容は変更せず、同じ条件で再撮影してください。':status==='OBSERVATION_ONLY'?'複数回の撮影で確認できた補助的な特徴です。手相そのものが変化したと断定する表示ではありません。':'前回と今回で主要な鑑定傾向は安定しています。'}}return res.json({ok:true,items,comparison})},
  async delete(_req,res,{sessionKey,assetId}){if(!raw)return res.status(503).json({error:'r2_unavailable'});const a=await row(sessionKey,assetId);if(!a)return res.status(404).json({error:'not_found'});if(a.state==='deleted')return res.json({ok:true,state:'deleted',idempotent:true});
    await pool.query(`UPDATE palm_assets SET state='delete_pending',delete_requested_at=COALESCE(delete_requested_at,NOW()),delete_after=LEAST(COALESCE(delete_after,NOW()),NOW()),delete_next_attempt_at=NULL,delete_last_error=NULL,updated_at=NOW() WHERE id=$1`,[assetId]);
    try{await deletePalm(raw,a.storage_key);await pool.query(`UPDATE palm_assets SET state='deleted',deleted_at=NOW(),delete_next_attempt_at=NULL,delete_last_error=NULL,updated_at=NOW() WHERE id=$1`,[assetId]);return res.json({ok:true,state:'deleted'});}
    catch(e){await pool.query(`UPDATE palm_assets SET state='delete_pending',delete_attempts=COALESCE(delete_attempts,0)+1,delete_next_attempt_at=NOW()+INTERVAL '1 minute',delete_last_error=$2,updated_at=NOW() WHERE id=$1`,[assetId,String(e?.name||e?.code||'delete_failed').slice(0,80)]);return res.status(202).json({ok:true,state:'delete_pending',queued:true});}}
 };
}

export function createIntegratedResendAdapter(pool){
 const deliveryConfigured=!!(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM);
 const webhookConfigured=!!(process.env.RESEND_API_KEY&&process.env.RESEND_WEBHOOK_SECRET);
 const configured=deliveryConfigured&&webhookConfigured;
 return {configured,deliveryConfigured,webhookConfigured,enqueueEmail,async handleRawWebhook(req,res){if(!configured)return res.status(503).send('webhook not configured');const resend=new Resend(process.env.RESEND_API_KEY);const payload=Buffer.isBuffer(req.body)?req.body.toString('utf8'):String(req.body||'');let event;try{event=resend.webhooks.verify({payload,headers:{id:req.get('svix-id'),timestamp:req.get('svix-timestamp'),signature:req.get('svix-signature')},webhookSecret:process.env.RESEND_WEBHOOK_SECRET})}catch{return res.status(400).send('invalid webhook')}const eventId=String(req.get('svix-id')||'');if(!eventId)return res.status(400).send('missing event id');await pool.query(`INSERT INTO email_provider_events(provider,event_id,event_type,provider_message_id,payload) VALUES('resend',$1,$2,$3,$4::jsonb) ON CONFLICT(provider,event_id) DO NOTHING`,[eventId,String(event.type||'unknown'),event?.data?.email_id||event?.data?.id||null,JSON.stringify({type:event.type,data:{email_id:event?.data?.email_id||event?.data?.id||null}})]);return res.sendStatus(200)}};
}

export function createIntegratedStripeEvents(pool,stripe){
 return {async handleRaw(req,res){if(!stripe||!process.env.STRIPE_WEBHOOK_SECRET)return res.status(503).send('webhook not configured');let event;try{event=stripe.webhooks.constructEvent(req.body,req.get('stripe-signature'),process.env.STRIPE_WEBHOOK_SECRET)}catch{return res.status(400).send('invalid webhook')}const c=await pool.connect();try{await c.query('BEGIN');const d=await c.query(`INSERT INTO payment_events(stripe_event_id,event_type,payload) VALUES($1,$2,$3::jsonb) ON CONFLICT(stripe_event_id) DO NOTHING RETURNING stripe_event_id`,[event.id,event.type,JSON.stringify(event)]);if(!d.rowCount){await c.query('COMMIT');return res.sendStatus(200)}const o=event.data.object;
   if(event.type==='checkout.session.completed'&&o.mode!=='subscription'){
    const orderId=o.metadata?.orderId;
    if(orderId&&o.payment_status!=='paid'){
     await c.query(`UPDATE checkout_attempts SET state='processing',last_error_code=NULL,updated_at=NOW() WHERE resource_id=$1 AND product_type='detail'`,[orderId]);
    }
    if(orderId&&o.payment_status==='paid'){
     const binding=await loadAndValidateDetailCheckoutBinding(c,o);
     if(!binding.ok)throw Error(`Stripe session binding failed: ${binding.errors.join(',')}`);
     await c.query(`UPDATE orders SET status='paid',payment_status='paid',premium_status='unlocked',stripe_session_id=$1,paid_at=COALESCE(paid_at,NOW()),updated_at=NOW() WHERE id=$2`,[o.id,orderId]);
     await c.query(`UPDATE checkout_attempts SET state='paid',last_error_code=NULL,updated_at=NOW() WHERE resource_id=$1 AND product_type='detail'`,[orderId]);
    }
   }
   if(event.type==='checkout.session.completed'&&o.mode==='subscription'){
    const membershipId=o.metadata?.membershipId,accountSession=o.metadata?.accountSession,customerId=String(o.customer||''),subscriptionId=String(o.subscription||'');
    if(membershipId){
     await c.query(`UPDATE memberships SET stripe_customer_id=$1,stripe_subscription_id=$2,status='processing',updated_at=NOW() WHERE id=$3`,[customerId,subscriptionId,membershipId]);
     await c.query(`UPDATE checkout_attempts SET state='processing',last_error_code=NULL,updated_at=NOW() WHERE resource_id=$1 AND product_type='membership'`,[membershipId]);
    }
    if(accountSession){
     await c.query(`INSERT INTO visitor_accounts(session_key) VALUES($1) ON CONFLICT DO NOTHING`,[accountSession]);
     await c.query(`INSERT INTO membership_accounts(session_key,stripe_customer_id,stripe_subscription_id,subscription_status,updated_at) VALUES($1,$2,$3,'processing',NOW()) ON CONFLICT(session_key) DO UPDATE SET stripe_customer_id=EXCLUDED.stripe_customer_id,stripe_subscription_id=EXCLUDED.stripe_subscription_id,subscription_status='processing',updated_at=NOW()`,[accountSession,customerId,subscriptionId]);
     const aq=await c.query(`SELECT account_id FROM account_sessions WHERE session_key=$1 LIMIT 1`,[accountSession]);
     if(aq.rowCount&&customerId)await c.query(`INSERT INTO account_membership_links(account_id,stripe_customer_id,stripe_subscription_id) VALUES($1,$2,$3) ON CONFLICT(account_id,stripe_customer_id) DO UPDATE SET stripe_subscription_id=EXCLUDED.stripe_subscription_id`,[aq.rows[0].account_id,customerId,subscriptionId]);
    }
   }
   if(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type)){
    const sub=o,customerId=String(sub.customer||''),periodEnd=sub.current_period_end?new Date(sub.current_period_end*1000):null;
    const membershipId=sub.metadata?.membershipId||`MB-${sub.id}`,accountSession=String(sub.metadata?.accountSession||'');
    const subscriptionStatus=String(sub.status||'inactive');
    await c.query(`INSERT INTO memberships(id,stripe_customer_id,stripe_subscription_id,status,current_period_end,cancel_at_period_end,updated_at) VALUES($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT(stripe_subscription_id) DO UPDATE SET stripe_customer_id=EXCLUDED.stripe_customer_id,status=EXCLUDED.status,current_period_end=EXCLUDED.current_period_end,cancel_at_period_end=EXCLUDED.cancel_at_period_end,updated_at=NOW()`,[membershipId,customerId,sub.id,subscriptionStatus,periodEnd,!!sub.cancel_at_period_end]);
    await c.query(`UPDATE membership_accounts SET stripe_customer_id=$1,subscription_status=$2,current_period_end=$3,cancel_at_period_end=$4,updated_at=NOW() WHERE stripe_subscription_id=$5 OR stripe_customer_id=$1`,[customerId,subscriptionStatus,periodEnd,!!sub.cancel_at_period_end,sub.id]);
    if(!['active','trialing'].includes(subscriptionStatus)){await c.query(`UPDATE palm_assets SET state='delete_pending',delete_requested_at=COALESCE(delete_requested_at,NOW()),delete_after=NOW(),updated_at=NOW() WHERE retention_mode='member_history' AND state<>'deleted' AND subject_key IN (SELECT 'acct:'||aml.account_id::text FROM account_membership_links aml WHERE aml.stripe_customer_id=$1)`,[customerId]);}
    if(accountSession){
     await c.query(`INSERT INTO visitor_accounts(session_key) VALUES($1) ON CONFLICT DO NOTHING`,[accountSession]);
     await c.query(`INSERT INTO membership_accounts(session_key,stripe_customer_id,stripe_subscription_id,subscription_status,current_period_end,cancel_at_period_end,updated_at) VALUES($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT(session_key) DO UPDATE SET stripe_customer_id=EXCLUDED.stripe_customer_id,stripe_subscription_id=EXCLUDED.stripe_subscription_id,subscription_status=EXCLUDED.subscription_status,current_period_end=EXCLUDED.current_period_end,cancel_at_period_end=EXCLUDED.cancel_at_period_end,updated_at=NOW()`,[accountSession,customerId,sub.id,subscriptionStatus,periodEnd,!!sub.cancel_at_period_end]);
     const aq=await c.query(`SELECT account_id FROM account_sessions WHERE session_key=$1 LIMIT 1`,[accountSession]);
     if(aq.rowCount&&customerId)await c.query(`INSERT INTO account_membership_links(account_id,stripe_customer_id,stripe_subscription_id) VALUES($1,$2,$3) ON CONFLICT(account_id,stripe_customer_id) DO UPDATE SET stripe_subscription_id=EXCLUDED.stripe_subscription_id`,[aq.rows[0].account_id,customerId,sub.id]);
    }
    const attemptState=['active','trialing'].includes(subscriptionStatus)?'active':subscriptionStatus==='canceled'?'canceled':'processing';
    await c.query(`UPDATE checkout_attempts SET state=$2,last_error_code=NULL,updated_at=NOW() WHERE resource_id=$1 AND product_type='membership'`,[membershipId,attemptState]);
   }
   if(event.type==='checkout.session.expired'){
    const orderId=o.metadata?.orderId,membershipId=o.metadata?.membershipId;
    if(orderId){
     await c.query(`UPDATE orders SET payment_status='expired',premium_status='locked',updated_at=NOW() WHERE id=$1 AND payment_status<>'paid'`,[orderId]);
     await c.query(`UPDATE checkout_attempts SET state='expired',last_error_code='stripe_checkout_expired',updated_at=NOW() WHERE resource_id=$1 AND product_type='detail'`,[orderId]);
    }
    if(membershipId){
     await c.query(`UPDATE memberships SET status='expired',updated_at=NOW() WHERE id=$1 AND status NOT IN ('active','trialing')`,[membershipId]);
     await c.query(`UPDATE checkout_attempts SET state='expired',last_error_code='stripe_checkout_expired',updated_at=NOW() WHERE resource_id=$1 AND product_type='membership'`,[membershipId]);
    }
   }
   await handleStripeBuild40Event(c,event);
   if(event.type==='checkout.session.async_payment_succeeded'){
    const orderId=o.metadata?.orderId;if(orderId)await c.query(`UPDATE checkout_attempts SET state='paid',last_error_code=NULL,updated_at=NOW() WHERE resource_id=$1 AND product_type='detail'`,[orderId]);
   }
   if(event.type==='checkout.session.async_payment_failed'){
    const orderId=o.metadata?.orderId;if(orderId)await c.query(`UPDATE checkout_attempts SET state='failed',last_error_code='stripe_async_payment_failed',updated_at=NOW() WHERE resource_id=$1 AND product_type='detail'`,[orderId]);
   }
   await c.query('COMMIT');return res.sendStatus(200)
  }catch(e){await c.query('ROLLBACK').catch(()=>{});console.error('stripe webhook failed',e);return res.status(500).send('webhook processing failed')}finally{c.release()}}};
}

export function createIntegratedRecovery(pool){
 if(!process.env.RECOVERY_SECRET||!process.env.RECOVERY_RATE_LIMIT_SECRET)return {configured:false,request:(_q,r)=>r.status(503).json({error:'recovery_unavailable'}),consume:(_q,r)=>r.status(503).json({error:'recovery_unavailable'})};
 const ops=createRecoveryOps(pool);const impl=createAccountRecovery({pool,secret:process.env.RECOVERY_SECRET,enqueueEmail,recoveryEmail,baseUrl:process.env.PUBLIC_BASE_URL,rateLimiter:{check:({email,ip})=>ops.limiter.check({email,ip})}});return {configured:true,...impl};
}
export function createIntegratedReadiness(pool){const handler=createReadiness({pool});return {handle:handler}}

export function createIntegratedVerification(pool,resend){
 if(!process.env.VERIFICATION_SECRET||process.env.VERIFICATION_SECRET.length<32||!process.env.RECOVERY_RATE_LIMIT_SECRET||!process.env.PUBLIC_BASE_URL||!resend?.deliveryConfigured){
  return {configured:false,request:(_q,r)=>r.status(503).json({error:'verification_unavailable'}),consume:(_q,r)=>r.status(503).json({error:'verification_unavailable'})};
 }
 const ops=createRecoveryOps(pool);
 const impl=createAccountEmailVerification({pool,secret:process.env.VERIFICATION_SECRET,enqueueEmail,verificationEmail,baseUrl:process.env.PUBLIC_BASE_URL,rateLimiter:{check:({email,ip})=>ops.limiter.check({email,ip})}});
 return {configured:true,...impl};
}
