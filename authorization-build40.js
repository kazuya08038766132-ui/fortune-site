export function createAuthorization({pool,ensureVisitorSession}){
 async function resolve(req,res){
  const sid=ensureVisitorSession(req,res);
  const aq=await pool.query(`SELECT account_id FROM account_sessions WHERE session_key=$1 LIMIT 1`,[sid]);
  return {sid,accountId:aq.rows[0]?.account_id||null};
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
 return {resolve,ownsOrder,membership,activeMembership,customer};
}
