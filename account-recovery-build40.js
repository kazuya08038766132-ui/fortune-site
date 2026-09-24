import {normalizeEmail,newOpaqueId,newRecoveryToken,hashRecoveryToken} from "./identity-recovery-build40.js";
import {migrateSessionResources} from "./account-resource-migration-build40.js";
export function createAccountRecovery({pool,secret,enqueueEmail,recoveryEmail,baseUrl,rateLimiter}){
 if(!secret||secret.length<32)throw Error("RECOVERY_SECRET must be >=32 chars");
 const generic={ok:true,message:"該当する場合は確認メールを送信します。"};
 async function request(req,res){
  const rawEmail=normalizeEmail(req.body?.email);
  const valid=/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rawEmail);
  const email=valid?rawEmail:`invalid-${hashRecoveryToken(rawEmail||"empty",secret).slice(0,24)}@invalid.local`;
  if(rateLimiter){
   const limited=await rateLimiter.check({email,ip:req.ipForRecovery||req.ip});
   if(!limited.allowed)return res.json(generic);
  }
  // Keep the database path similar for existing/non-existing/invalid identifiers.
  hashRecoveryToken(email,secret);
  const c=await pool.connect();
  try{
   await c.query("BEGIN");
   const q=await c.query(`SELECT id,verified_email FROM user_accounts WHERE verified_email=$1 LIMIT 1`,[email]);
   if(q.rowCount){
    const token=newRecoveryToken(), tokenHash=hashRecoveryToken(token,secret);
    await c.query(`DELETE FROM recovery_tokens WHERE account_id=$1 AND used_at IS NULL`,[q.rows[0].id]);
    await c.query(`INSERT INTO recovery_tokens(token_hash,account_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '15 minutes')`,[tokenHash,q.rows[0].id]);
    await enqueueEmail(c,{eventKey:`recovery:${tokenHash}`,recipient:email,templateType:"account_recovery",
      payload:recoveryEmail({baseUrl,token}),sensitive:true});
   }
   await c.query("COMMIT"); return res.json(generic);
  }catch(e){await c.query("ROLLBACK").catch(()=>{});throw e}finally{c.release()}
 }
 async function consume(req,res){
  const token=String(req.body?.token||""); if(token.length<32)return res.status(400).json({error:"invalid_recovery_token"});
  const h=hashRecoveryToken(token,secret), oldSid=req.fortuneSid||null, c=await pool.connect();
  try{
   await c.query("BEGIN");
   const q=await c.query(`SELECT account_id FROM recovery_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE`,[h]);
   if(!q.rowCount){await c.query("ROLLBACK");return res.status(400).json({error:"invalid_or_expired_recovery_token"})}
   const accountId=q.rows[0].account_id,newSid=newOpaqueId();
   await c.query(`UPDATE recovery_tokens SET used_at=NOW() WHERE token_hash=$1`,[h]);
   if(oldSid){
    const current=await c.query(`SELECT account_id FROM account_sessions WHERE session_key=$1 LIMIT 1`,[oldSid]);
    if(!current.rowCount)await migrateSessionResources(c,{sessionKey:oldSid,accountId});
    await c.query(`DELETE FROM account_sessions WHERE session_key=$1`,[oldSid]);
   }
   await c.query(`INSERT INTO account_sessions(session_key,account_id) VALUES($1,$2)
     ON CONFLICT(session_key) DO UPDATE SET account_id=EXCLUDED.account_id,last_seen_at=NOW()`,[newSid,accountId]);
   await c.query("COMMIT");
   const secure=process.env.NODE_ENV==="production"?"; Secure":"";
   res.append("Set-Cookie",`fortune_sid=${newSid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`);
   return res.json({ok:true,recovered:true});
  }catch(e){await c.query("ROLLBACK").catch(()=>{});throw e}finally{c.release()}
 }
 return {request,consume};
}
