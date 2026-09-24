import {normalizeEmailForLookup,newVerificationToken,tokenHash,verificationRequestResponse} from "./account-verification-build40.js";
import {newOpaqueId} from "./identity-recovery-build40.js";
import {migrateSessionResources} from "./account-resource-migration-build40.js";

export function createAccountEmailVerification({pool,secret,enqueueEmail,verificationEmail,baseUrl,rateLimiter}){
 if(!secret||secret.length<32)throw Error("VERIFICATION_SECRET must be >=32 chars");
 const generic=verificationRequestResponse();
 async function request(req,res){
  const sid=req.fortuneSid; if(!sid)return res.status(400).json({error:"session_required"});
  const parsed=normalizeEmailForLookup(req.body?.email);
  if(!parsed)return res.json(generic);
  if(rateLimiter){const lim=await rateLimiter.check({email:parsed.lookup,ip:req.ip});if(!lim.allowed)return res.json(generic)}
  const cur=await pool.query(`SELECT ua.verified_email FROM account_sessions s JOIN user_accounts ua ON ua.id=s.account_id WHERE s.session_key=$1 LIMIT 1`,[sid]);
  if(cur.rowCount){
   if(String(cur.rows[0].verified_email||'').toLowerCase()===parsed.lookup)return res.json({...generic,alreadyVerified:true});
   return res.status(409).json({error:"stable_account_already_verified"});
  }
  const token=newVerificationToken(),h=tokenHash(token,secret),c=await pool.connect();
  try{
   await c.query('BEGIN');
   await c.query(`DELETE FROM email_verification_tokens WHERE session_key=$1 AND used_at IS NULL`,[sid]);
   await c.query(`INSERT INTO email_verification_tokens(token_hash,email,session_key,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '30 minutes')`,[h,parsed.lookup,sid]);
   await enqueueEmail(c,{eventKey:`verify-email:${h}`,recipient:parsed.lookup,templateType:'email_verification',payload:verificationEmail({baseUrl,token}),sensitive:true});
   await c.query('COMMIT');return res.json(generic);
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e}finally{c.release()}
 }
 async function consume(req,res){
  const sid=req.fortuneSid,token=String(req.body?.token||'');
  if(!sid||token.length<32)return res.status(400).json({error:"invalid_verification_token"});
  const h=tokenHash(token,secret),c=await pool.connect();
  try{
   await c.query('BEGIN');
   const tq=await c.query(`SELECT email,session_key FROM email_verification_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE`,[h]);
   if(!tq.rowCount){await c.query('ROLLBACK');return res.status(400).json({error:"invalid_or_expired_verification_token"})}
   const row=tq.rows[0];
   if(row.session_key!==sid){await c.query('ROLLBACK');return res.status(409).json({error:"verification_same_browser_required"})}
   const linked=await c.query(`SELECT ua.id,ua.verified_email FROM account_sessions s JOIN user_accounts ua ON ua.id=s.account_id WHERE s.session_key=$1 LIMIT 1`,[sid]);
   if(linked.rowCount&&String(linked.rows[0].verified_email||'').toLowerCase()!==String(row.email).toLowerCase()){await c.query('ROLLBACK');return res.status(409).json({error:"stable_account_already_verified"})}
   let aq=await c.query(`SELECT id FROM user_accounts WHERE LOWER(verified_email)=LOWER($1) LIMIT 1 FOR UPDATE`,[row.email]);
   let accountId=aq.rows[0]?.id;
   if(!accountId){accountId=newOpaqueId();await c.query(`INSERT INTO user_accounts(id,verified_email,email_verified_at) VALUES($1,$2,NOW())`,[accountId,row.email])}
   await migrateSessionResources(c,{sessionKey:sid,accountId});
   await c.query(`UPDATE email_verification_tokens SET used_at=NOW() WHERE token_hash=$1`,[h]);
   await c.query(`DELETE FROM account_sessions WHERE session_key=$1`,[sid]);
   const newSid=newOpaqueId();
   await c.query(`INSERT INTO account_sessions(session_key,account_id) VALUES($1,$2)`,[newSid,accountId]);
   await c.query('COMMIT');
   const secure=process.env.NODE_ENV==='production'?'; Secure':'';
   res.append('Set-Cookie',`fortune_sid=${newSid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`);
   return res.json({ok:true,verified:true});
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e}finally{c.release()}
 }
 return {request,consume};
}
