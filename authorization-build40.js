import crypto from 'crypto';
export function createAuthorization({pool,ensureVisitorSession}){
 async function resolve(req,res){
  const sid=ensureVisitorSession(req,res);
  const aq=await pool.query(`SELECT account_id FROM account_sessions WHERE session_key=$1 LIMIT 1`,[sid]);
  return {sid,accountId:aq.rows[0]?.account_id||null};
 }
 async function ensureFreeAccount(req,res){
  const current=await resolve(req,res);
  if(current.accountId)return current;
  const c=await pool.connect();
  try{
   await c.query('BEGIN');
   const locked=await c.query(`SELECT account_id FROM account_sessions WHERE session_key=$1 LIMIT 1 FOR UPDATE`,[current.sid]);
   if(locked.rowCount){
    await c.query('COMMIT');
    return {sid:current.sid,accountId:locked.rows[0].account_id};
   }
   const accountId=`anon_${crypto.randomBytes(18).toString('hex')}`;
   await c.query(`INSERT INTO user_accounts(id) VALUES($1)`,[accountId]);
   await c.query(`INSERT INTO account_sessions(session_key,account_id) VALUES($1,$2)`,[current.sid,accountId]);
   await c.query('COMMIT');
   return {sid:current.sid,accountId};
  }catch(e){
   await c.query('ROLLBACK').catch(()=>{});
   const retry=await resolve(req,res);
   if(retry.accountId)return retry;
   throw e;
  }finally{c.release()}
 }
 async function ownsOrder(req,res,orderId){
  const {sid,accountId}=await resolve(req,res);
  const q=await pool.query(`SELECT 1 WHERE
    EXISTS(SELECT 1 FROM account_orders WHERE session_key=$1 AND order_id=$2)
    OR ($3::text IS NOT NULL AND EXISTS(SELECT 1 FROM account_order_links WHERE account_id=$3 AND order_id=$2))
    LIMIT 1`,[sid,String(orderId),accountId]);
  return !!q.rowCount;
 }
 async function membership(req,res){
  const {sid,accountId}=await resolve(req,res);
  const q=await pool.query(`SELECT ma.stripe_customer_id,ma.subscription_status,ma.current_period_end,ma.cancel_at_period_end
    FROM membership_accounts ma
    WHERE ma.session_key=$1
       OR ($2::text IS NOT NULL AND EXISTS(
          SELECT 1 FROM account_membership_links aml
          WHERE aml.account_id=$2 AND aml.stripe_customer_id=ma.stripe_customer_id))
    ORDER BY ma.updated_at DESC LIMIT 1`,[sid,accountId]);
  return q.rows[0]||{subscription_status:"inactive"};
 }
 async function activeMembership(req,res){
   const m=await membership(req,res);
   return {membership:m,active:["active","trialing"].includes(String(m.subscription_status||""))};
 }
 async function customer(req,res){
   const m=await membership(req,res);
   return m?.stripe_customer_id?{stripe_customer_id:m.stripe_customer_id,subscription_status:m.subscription_status}:null;
 }
 return {resolve,ensureFreeAccount,ownsOrder,membership,activeMembership,customer};
}
