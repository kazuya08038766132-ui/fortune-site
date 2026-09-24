import {applyConsentRevocation} from './consent-revocation-build40.js';
import {createAuthorizedPalm} from "./palm-authorized-wrapper-build40.js";
import {assertIntegratedAdapters} from "./integrated-adapter-gate-build40.js";
import express from "express";
import crypto from "crypto";
import {authorize,safeNotFound} from "./authorization-kernel-build40.js";
import {assertTransition} from "./workflow-state-guard-build40.js";
import {buildBirthReading} from "./birth-reading-service-build40.js";
import {createNameReadingRuntime} from "./name-master-runtime-build40.js";
import {buildPublicSystemStatus} from "./public-system-status-build40.js";
import {readPublicPilotStatus} from "./public-pilot-status-build40.js";
import {getDailyFortunePreference,saveDailyFortunePreference} from "./daily-fortune-preference-build40.js";
import {getLegalSellerConfig} from "./legal-readiness-build40.js";
import {inspectPalmProductionFiles} from "./palm-production-files-build40.js";
import {createAuthorization} from "./authorization-build40.js";
import {publicStaticMiddleware} from "./public-static-surface-build40.js";
import {securityHeaders} from "./security-headers-build40.js";
import {configureProxyTrust} from "./client-ip-build40.js";
import {requestIdMiddleware,apiNoStore,rateLimit,productionErrorHandler} from "./api-security-build40.js";
import {readCheckoutRequestKey,stripeCheckoutIdempotencyKey,sameCheckoutOwner,reusableCheckout} from "./checkout-idempotency-build40.js";
import {materializePremiumReading} from "./premium-reading-snapshot-build40.js";
import {buildIntegratedFortuneSynthesis} from "./integrated-fortune-synthesis-build40.js";
import {buildAccountDataSummary} from "./account-data-summary-build40.js";

export function createIntegratedBuild40({
 pool,stripe,baseUrl,priceYen=980,membershipPriceYen=490,
 csrf, r2, resend, recovery, verification, readiness, stripeEvents
}){
 assertIntegratedAdapters({pool,csrf,r2,resend,recovery,verification,readiness,stripeEvents,baseUrl});
 const palm=createAuthorizedPalm(r2);
 const nameRuntime=createNameReadingRuntime(process.env.NAME_MASTER_PATH||"name-stroke-corpus-build40.json",process.env.NAME_MASTER_RECEIPT_PATH||"NAME_CORPUS_RECEIPT_BUILD40.json");
 const app=express(); app.disable("x-powered-by"); configureProxyTrust(app); app.use(requestIdMiddleware); app.use(securityHeaders); app.use(apiNoStore);

 // Signature-sensitive endpoints MUST precede JSON parsing.
 app.post("/api/stripe-webhook",express.raw({type:"application/json",limit:"256kb"}),async(req,res)=>{
   if(!stripeEvents?.handleRaw)return res.sendStatus(503);
   return stripeEvents.handleRaw(req,res);
 });
 app.post("/api/resend-webhook",express.raw({type:"application/json",limit:"256kb"}),async(req,res)=>{
   if(!resend?.handleRawWebhook)return res.sendStatus(503);
   return resend.handleRawWebhook(req,res);
 });

 app.use(express.json({limit:"1mb"}));
 if(typeof csrf.touch==="function")app.use(async(req,res,next)=>{try{await csrf.touch(req,res);next()}catch(e){next(e)}});
 app.use(publicStaticMiddleware(process.cwd()));

 function sid(req,res){return csrf.session(req,res)}
 const auth=createAuthorization({pool,ensureVisitorSession:(req,res)=>sid(req,res)});
 function sameOrigin(req,res,next){return csrf.sameOrigin(req,res,next)}
 function csrfGuard(req,res,next){return csrf.guard(req,res,next)}
 const checkoutLimit=rateLimit({name:"checkout",limit:12,windowMs:10*60*1000});
 const subscriptionLimit=rateLimit({name:"subscription",limit:8,windowMs:10*60*1000});
 const nameLimit=rateLimit({name:"name-reading",limit:40,windowMs:10*60*1000});
 const palmLimit=rateLimit({name:"palm",limit:30,windowMs:10*60*1000});

 async function ownedOrder(req,res,id){
   const c=await auth.resolve(req,res);
   return (await auth.ownsOrder(req,res,id))?c:null;
 }
 app.get("/",(_q,res)=>res.sendFile("index.html",{root:process.cwd()}));
 app.get("/api/csrf-token",(req,res)=>res.json({token:csrf.issue(sid(req,res))}));
 app.get("/api/csrf-token-v2",(req,res)=>res.json({token:csrf.issue(sid(req,res))}));
 app.get("/api/readiness",async(req,res)=>{
   if(process.env.NODE_ENV!=="production")return readiness.handle(req,res);
   const probe={statusCode:200,payload:null,status(code){this.statusCode=code;return this},json(payload){this.payload=payload;return this}};
   await readiness.handle(req,probe);
   return res.status(probe.statusCode).json({ok:!!probe.payload?.ok,build:"BUILD-40"});
 });
 app.get("/api/me",async(req,res)=>{
   const c=await auth.resolve(req,res);
   let o;
   if(c.accountId){
     o=await pool.query("SELECT l.order_id,l.created_at,o.payment_status,o.status,o.premium_status,o.paid_at FROM account_order_links l JOIN orders o ON o.id=l.order_id WHERE l.account_id=$1 ORDER BY l.created_at DESC LIMIT 30",[c.accountId]);
   }else{
     o=await pool.query("SELECT ao.order_id,ao.created_at,o.payment_status,o.status,o.premium_status,o.paid_at FROM account_orders ao JOIN orders o ON o.id=ao.order_id WHERE ao.session_key=$1 ORDER BY ao.created_at DESC LIMIT 30",[c.sid]);
   }
   const m=await auth.membership(req,res);
   let verifiedEmail=null;if(c.accountId){const uq=await pool.query("SELECT verified_email FROM user_accounts WHERE id=$1 LIMIT 1",[c.accountId]);verifiedEmail=uq.rows[0]?.verified_email||null;}res.setHeader("Cache-Control","no-store, private");res.json({account:c.accountId?"stable_account":"browser_session",stableAccount:!!c.accountId,verifiedEmail,orders:o.rows,membership:m||{subscription_status:"inactive"}});
 });
 app.get("/api/account/status",async(req,res)=>{
   const s=sid(req,res);
   const q=await pool.query("SELECT account_id FROM account_sessions WHERE session_key=$1 LIMIT 1",[s]);
   res.setHeader("Cache-Control","no-store, private");
   res.json({ok:true,stableAccount:!!q.rows[0]?.account_id});
 });
 app.get("/api/system-status",(_req,res)=>{res.setHeader("Cache-Control","no-store");const palmReadiness=inspectPalmProductionFiles({root:process.cwd()});res.json(buildPublicSystemStatus({stripe,r2,resend,recovery,verification,nameRuntime,palmReadiness}))});
 app.get("/api/pilot-status",(_req,res)=>{res.setHeader("Cache-Control","no-store");res.json(readPublicPilotStatus())});
 app.get("/api/legal-public",(_req,res)=>{const l=getLegalSellerConfig();res.setHeader("Cache-Control","no-store");if(!l.ready)return res.status(503).json({ready:false});res.json({ready:true,sellerName:l.sellerName,sellerAddress:l.sellerAddress,sellerPhone:l.sellerPhone,contactEmail:l.contactEmail})});
 app.get("/api/name-readiness",(_req,res)=>{res.setHeader("Cache-Control","no-store");res.json(nameRuntime.readiness())});
 app.post("/api/name-reading",sameOrigin,nameLimit,csrfGuard,(req,res)=>{
   const familyName=String(req.body?.familyName||"").slice(0,40),givenName=String(req.body?.givenName||"").slice(0,40);
   const result=nameRuntime.reading({familyName,givenName});
   if(result.status==="MASTER_NOT_PRESENT"||result.status==="MASTER_GATE_FAILED"||result.status==="MASTER_LOAD_ERROR")return res.status(503).json(result);
   if(result.status==="INVALID_NAME")return res.status(400).json(result);
   res.setHeader("Cache-Control","no-store, private");res.json(result);
 });
 app.get("/api/membership-status",async(req,res)=>{
   const x=await auth.activeMembership(req,res);
   const m=x.membership||{subscription_status:"inactive",current_period_end:null,cancel_at_period_end:false};
   res.setHeader("Cache-Control","no-store, private");res.json({membership:m,active:x.active});
 });
 app.get("/api/my-data-summary",async(req,res)=>{
   const c=await auth.resolve(req,res);
   const m=await auth.membership(req,res);
   const summary=await buildAccountDataSummary(pool,{sessionKey:c.sid,accountId:c.accountId||null,membership:m});
   res.setHeader("Cache-Control","no-store, private");res.json(summary);
 });
 app.get("/api/daily-fortune-preference",async(req,res)=>{
   const result=await getDailyFortunePreference(pool,sid(req,res));res.setHeader("Cache-Control","no-store, private");
   res.status(result.status==="OK"?200:409).json(result);
 });
 app.post("/api/daily-fortune-preference",sameOrigin,csrfGuard,async(req,res)=>{
   const result=await saveDailyFortunePreference(pool,sid(req,res),{enabled:req.body?.enabled,birthDate:String(req.body?.birthDate||''),sendHourJst:Number(req.body?.sendHourJst)});
   const code=result.status==="OK"?200:result.status==="INVALID_INPUT"?400:409;res.status(code).json(result);
 });

 app.post("/api/create-checkout-session",sameOrigin,checkoutLimit,csrfGuard,async(req,res)=>{
   if(!getLegalSellerConfig().ready)return res.status(503).json({error:"legal_disclosure_unavailable"});
   if(!stripe)return res.status(503).json({error:"stripe_unavailable"});
   const requestKey=readCheckoutRequestKey(req);if(!requestKey)return res.status(400).json({error:"idempotency_key_required"});
   const s=sid(req,res),product="detail";
   let a=(await pool.query("SELECT * FROM checkout_attempts WHERE request_key=$1 LIMIT 1",[requestKey])).rows[0];
   if(a&&!sameCheckoutOwner(a,{sessionKey:s,product}))return res.status(409).json({error:"idempotency_key_conflict"});
   if(reusableCheckout(a))return res.json({url:a.stripe_checkout_url,orderId:a.resource_id,reused:true});
   if(terminalCheckout(a))return res.status(409).json(terminalCheckoutPayload(a));
   let id=a?.resource_id;
   if(!a){
     id=`FT-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
     const c=await pool.connect();try{
       await c.query("BEGIN");
       const ins=await c.query("INSERT INTO checkout_attempts(request_key,session_key,product_type,resource_id,state) VALUES($1,$2,$3,$4,'pending') ON CONFLICT(request_key) DO NOTHING RETURNING request_key",[requestKey,s,product,id]);
       if(ins.rowCount){
         await c.query("INSERT INTO orders(id,status,amount,currency,payment_status,premium_status,reading) VALUES($1,'pending',$2,'jpy','pending','locked',$3)",[id,priceYen,req.body?.reading||{}]);
         await c.query("INSERT INTO account_orders(session_key,order_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[s,id]);
         const authContext=await auth.resolve(req,res);
         if(authContext.accountId)await c.query("INSERT INTO account_order_links(account_id,order_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[authContext.accountId,id]);
       }
       await c.query("COMMIT");
     }catch(e){await c.query("ROLLBACK").catch(()=>{});throw e}finally{c.release()}
     a=(await pool.query("SELECT * FROM checkout_attempts WHERE request_key=$1 LIMIT 1",[requestKey])).rows[0];
     if(!sameCheckoutOwner(a,{sessionKey:s,product}))return res.status(409).json({error:"idempotency_key_conflict"});
     id=a.resource_id;
     if(reusableCheckout(a))return res.json({url:a.stripe_checkout_url,orderId:id,reused:true});
     if(terminalCheckout(a))return res.status(409).json(terminalCheckoutPayload(a));
   }
   try{
     const x=await stripe.checkout.sessions.create({mode:"payment",line_items:[{price_data:{currency:"jpy",unit_amount:priceYen,product_data:{name:"総合占い 詳細鑑定"}},quantity:1}],success_url:`${baseUrl}/success.html?order_id=${encodeURIComponent(id)}`,cancel_url:`${baseUrl}/`,metadata:{orderId:id,checkoutRequestKey:requestKey}},{idempotencyKey:stripeCheckoutIdempotencyKey(product,requestKey)});
     await pool.query("UPDATE orders SET stripe_session_id=$1,updated_at=NOW() WHERE id=$2",[x.id,id]);
     await pool.query("UPDATE checkout_attempts SET stripe_session_id=$1,stripe_checkout_url=$2,state='ready',last_error_code=NULL,updated_at=NOW() WHERE request_key=$3",[x.id,x.url,requestKey]);
     return res.json({url:x.url,orderId:id,reused:false});
   }catch(e){
     await pool.query("UPDATE checkout_attempts SET state='retryable',last_error_code='stripe_session_create_failed',updated_at=NOW() WHERE request_key=$1",[requestKey]).catch(()=>{});
     throw e;
   }
 });
 app.post("/api/create-subscription-checkout",sameOrigin,subscriptionLimit,csrfGuard,async(req,res)=>{
   if(!getLegalSellerConfig().ready)return res.status(503).json({error:"legal_disclosure_unavailable"});
   if(!stripe)return res.status(503).json({error:"stripe_unavailable"});
   const requestKey=readCheckoutRequestKey(req);if(!requestKey)return res.status(400).json({error:"idempotency_key_required"});
   const cxt=await auth.resolve(req,res),s=cxt.sid,product="membership",consentSubject=cxt.accountId?`acct:${cxt.accountId}`:s;
   const consent=await pool.query("SELECT accepted FROM consent_events WHERE subject_key=$1 AND consent_type='MEMBERSHIP_AUTO_RENEW' ORDER BY created_at DESC LIMIT 1",[consentSubject]);
   if(!consent.rowCount||consent.rows[0].accepted!==true)return res.status(409).json({error:"membership_auto_renew_consent_required"});
   let a=(await pool.query("SELECT * FROM checkout_attempts WHERE request_key=$1 LIMIT 1",[requestKey])).rows[0];
   if(a&&!sameCheckoutOwner(a,{sessionKey:s,product}))return res.status(409).json({error:"idempotency_key_conflict"});
   if(reusableCheckout(a))return res.json({url:a.stripe_checkout_url,membershipId:a.resource_id,reused:true});
   if(terminalCheckout(a))return res.status(409).json(terminalCheckoutPayload(a));
   let id=a?.resource_id;
   if(!a){
     id=`MB-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
     const db=await pool.connect();try{
       await db.query("BEGIN");
       const ins=await db.query("INSERT INTO checkout_attempts(request_key,session_key,product_type,resource_id,state) VALUES($1,$2,$3,$4,'pending') ON CONFLICT(request_key) DO NOTHING RETURNING request_key",[requestKey,s,product,id]);
       if(ins.rowCount)await db.query("INSERT INTO memberships(id,status) VALUES($1,'pending')",[id]);
       await db.query("COMMIT");
     }catch(e){await db.query("ROLLBACK").catch(()=>{});throw e}finally{db.release()}
     a=(await pool.query("SELECT * FROM checkout_attempts WHERE request_key=$1 LIMIT 1",[requestKey])).rows[0];
     if(!sameCheckoutOwner(a,{sessionKey:s,product}))return res.status(409).json({error:"idempotency_key_conflict"});
     id=a.resource_id;
     if(reusableCheckout(a))return res.json({url:a.stripe_checkout_url,membershipId:id,reused:true});
     if(terminalCheckout(a))return res.status(409).json(terminalCheckoutPayload(a));
   }
   try{
     const x=await stripe.checkout.sessions.create({mode:"subscription",line_items:[{price_data:{currency:"jpy",unit_amount:membershipPriceYen,recurring:{interval:"month"},product_data:{name:"総合占い プレミアム会員"}},quantity:1}],success_url:`${baseUrl}/membership-success.html?membership_id=${encodeURIComponent(id)}`,cancel_url:`${baseUrl}/checkout-confirm.html?product=membership`,subscription_data:{metadata:{membershipId:id,accountSession:s}},metadata:{membershipId:id,accountSession:s,productKey:"premium_monthly",checkoutRequestKey:requestKey}},{idempotencyKey:stripeCheckoutIdempotencyKey(product,requestKey)});
     await pool.query("UPDATE checkout_attempts SET stripe_session_id=$1,stripe_checkout_url=$2,state='ready',last_error_code=NULL,updated_at=NOW() WHERE request_key=$3",[x.id,x.url,requestKey]);
     return res.json({url:x.url,membershipId:id,reused:false});
   }catch(e){
     await pool.query("UPDATE checkout_attempts SET state='retryable',last_error_code='stripe_session_create_failed',updated_at=NOW() WHERE request_key=$1",[requestKey]).catch(()=>{});
     throw e;
   }
 });
 app.get("/api/my-order-status/:orderId",async(req,res)=>{
   const id=String(req.params.orderId||"").slice(0,120),s=await ownedOrder(req,res,id);if(!s)return safeNotFound(res);
   const q=await pool.query("SELECT id,status,payment_status,premium_status,paid_at FROM orders WHERE id=$1",[id]);if(!q.rowCount)return safeNotFound(res);
   const o=q.rows[0],paymentStatus=String(o.payment_status||o.status||"pending").toLowerCase();
   res.setHeader("Cache-Control","no-store, private");res.json({orderId:o.id,paymentStatus,premiumStatus:o.premium_status||"locked",paidAt:o.paid_at||null,settled:paymentStatus==="paid"});
 });
 app.get("/api/my-order-reading/:orderId",async(req,res)=>{
   const id=String(req.params.orderId||"").slice(0,120),s=await ownedOrder(req,res,id);if(!s)return safeNotFound(res);
   const result=await materializePremiumReading({pool,orderId:id,buildReading:async(stored)=>{
     const birthDate=stored?.birthDate;
     const premiumBirth=birthDate?buildBirthReading(birthDate):{status:"MISSING_BIRTH_DATE"};
     const familyName=String(stored?.familyName||"").slice(0,40),givenName=String(stored?.givenName||"").slice(0,40);
     const premiumName=(familyName&&givenName)?nameRuntime.reading({familyName,givenName}):{status:"MISSING_NAME"};
     const integrated=buildIntegratedFortuneSynthesis({premiumBirth,premiumName,palmReading:stored?.palmReading||stored?.palm?.reading||null});
     return {...stored,premiumBirth,premiumName,integrated,_snapshot:{schema:"premium-reading-v2",materializedAt:new Date().toISOString()}};
   }});
   if(result.status==="NOT_FOUND")return safeNotFound(res);
   if(result.status==="PAYMENT_REQUIRED")return res.status(403).json({error:"payment_required"});
   res.setHeader("Cache-Control","no-store, private");res.json({paid:true,order:{id,premium_status:result.order.premium_status,paid_at:result.order.paid_at},reading:result.reading,snapshotCreated:result.created});
 });
 app.post("/api/my-customer-portal",sameOrigin,csrfGuard,async(req,res)=>{
   if(!stripe)return res.status(503).json({error:"stripe_unavailable"});const m=await auth.customer(req,res);
   if(!m?.stripe_customer_id)return safeNotFound(res);const p=await stripe.billingPortal.sessions.create({customer:m.stripe_customer_id,return_url:`${baseUrl}/mypage.html`});res.json({url:p.url,status:m.subscription_status});
 });
 app.get("/api/my-consents",async(req,res)=>{const c=await auth.resolve(req,res),subject=c.accountId?`acct:${c.accountId}`:c.sid,q=await pool.query("SELECT consent_type,accepted,policy_version,created_at FROM consent_events WHERE subject_key=$1 ORDER BY created_at DESC LIMIT 50",[subject]);res.setHeader("Cache-Control","no-store, private");res.json({events:q.rows})});
 app.post("/api/my-consents",sameOrigin,csrfGuard,async(req,res)=>{const c=await auth.resolve(req,res),subject=c.accountId?`acct:${c.accountId}`:c.sid,t=req.body?.consent_type,a=req.body?.accepted,p=String(req.body?.policy_version||"").slice(0,80);if(!["PALM_READING","PALM_AI_TRAINING","TERMS","MEMBERSHIP_AUTO_RENEW"].includes(t)||typeof a!=="boolean"||!p)return res.status(400).json({error:"invalid_consent_event"});const client=await pool.connect();try{await client.query("BEGIN");const q=await client.query("INSERT INTO consent_events(subject_key,consent_type,accepted,policy_version) VALUES($1,$2,$3,$4) RETURNING id,created_at",[subject,t,a,p]);const revocation=await applyConsentRevocation(client,{subject,consentType:t,accepted:a});await client.query("COMMIT");res.status(201).json({ok:true,...q.rows[0],revocation})}catch(e){await client.query("ROLLBACK").catch(()=>{});throw e}finally{client.release()}});

 app.get("/api/build40/palm/history",palmLimit,(req,res)=>r2.history(req,res,{sessionKey:sid(req,res)}));
 app.post("/api/build40/palm/:id/snapshot",sameOrigin,palmLimit,csrfGuard,(req,res)=>r2.saveSnapshot(req,res,{sessionKey:sid(req,res),assetId:req.params.id}));
 app.post("/api/build40/palm/presign",sameOrigin,palmLimit,csrfGuard,(req,res)=>palm.presign(req,res,{sessionKey:sid(req,res)}));
 app.post("/api/build40/palm/finalize",sameOrigin,palmLimit,csrfGuard,(req,res)=>palm.finalize(req,res,{sessionKey:sid(req,res)}));
 app.post("/api/build40/palm/:id/finalize",sameOrigin,palmLimit,csrfGuard,(req,res)=>{req.body={...(req.body||{}),assetId:req.params.id};return palm.finalize(req,res,{sessionKey:sid(req,res)})});
 app.post("/api/build40/palm/delete",sameOrigin,palmLimit,csrfGuard,(req,res)=>palm.delete(req,res,{sessionKey:sid(req,res)}));
 app.delete("/api/build40/palm/:id",sameOrigin,palmLimit,csrfGuard,(req,res)=>{req.body={...(req.body||{}),assetId:req.params.id};return palm.delete(req,res,{sessionKey:sid(req,res)})});
 app.post("/api/account/verification/request",sameOrigin,csrfGuard,(req,res)=>verification.request(req,res));
 app.post("/api/account/verification/consume",sameOrigin,csrfGuard,(req,res)=>verification.consume(req,res));
 app.post("/api/account/recovery/request",sameOrigin,csrfGuard,(req,res)=>recovery.request(req,res));
 app.post("/api/account/recovery/consume",sameOrigin,csrfGuard,(req,res)=>recovery.consume(req,res));

 // No legacy client-subject consent or registry-only palm routes are mounted.
 app.use("/api",(req,res)=>res.status(404).json({error:"not_found",requestId:req.build40RequestId||null}));
 app.use(productionErrorHandler);
 return app;
}
