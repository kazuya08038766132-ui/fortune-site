import {validateDetailCheckoutBinding} from './stripe-session-binding-build40.js';

// A browser redirect, client payload, or a bare orders.payment_status flag is not evidence.
export async function verifyPaidFortuneEvidence(client,order){
 if(String(order?.payment_status||'').toLowerCase()!=='paid'||!order?.stripe_session_id||!order?.paid_at)return false;
 const q=await client.query(`SELECT stripe_event_id,event_type,payload FROM payment_events
  WHERE event_type IN ('checkout.session.completed','checkout.session.async_payment_succeeded')
  AND payload->'data'->'object'->>'id'=$1 ORDER BY created_at DESC LIMIT 5`,[order.stripe_session_id]);
 const attempts=await client.query(`SELECT request_key,resource_id,product_type,stripe_session_id,state FROM checkout_attempts
  WHERE resource_id=$1 AND product_type='detail' ORDER BY created_at DESC LIMIT 1`,[order.id]);
 for(const row of q.rows){
  const event=row.payload,session=event?.data?.object;
  if(event?.id!==row.stripe_event_id||event?.type!==row.event_type||session?.mode!=='payment'||session?.payment_status!=='paid')continue;
  if(validateDetailCheckoutBinding({session,order,attempt:attempts.rows[0]}).ok)return true;
 }
 return false;
}
