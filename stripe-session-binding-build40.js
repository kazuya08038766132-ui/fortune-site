export function validateDetailCheckoutBinding({session,order,attempt}){
 const errors=[];
 const sid=String(session?.id||'');
 const orderId=String(session?.metadata?.orderId||'');
 const requestKey=String(session?.metadata?.checkoutRequestKey||'');
 if(!sid)errors.push('missing_stripe_session_id');
 if(!orderId||orderId!==String(order?.id||''))errors.push('order_id_mismatch');
 if(Number(session?.amount_total)!==Number(order?.amount))errors.push('amount_mismatch');
 if(String(session?.currency||'').toLowerCase()!==String(order?.currency||'jpy').toLowerCase())errors.push('currency_mismatch');
 if(order?.stripe_session_id&&String(order.stripe_session_id)!==sid)errors.push('order_session_mismatch');
 if(!attempt)errors.push('checkout_attempt_missing');
 else{
  if(String(attempt.resource_id||'')!==String(order?.id||''))errors.push('attempt_resource_mismatch');
  if(String(attempt.product_type||'')!=='detail')errors.push('attempt_product_mismatch');
  if(!attempt.stripe_session_id||String(attempt.stripe_session_id)!==sid)errors.push('attempt_session_mismatch');
  if(!requestKey||String(attempt.request_key||'')!==requestKey)errors.push('attempt_request_key_mismatch');
 }
 return {ok:errors.length===0,errors};
}

export async function loadAndValidateDetailCheckoutBinding(client,session,{lock=true}={}){
 const orderId=String(session?.metadata?.orderId||'');
 if(!orderId)return {ok:false,errors:['missing_order_id'],order:null,attempt:null};
 const lockSql=lock?' FOR UPDATE':'';
 const oq=await client.query(`SELECT id,amount,currency,stripe_session_id,payment_status FROM orders WHERE id=$1${lockSql}`,[orderId]);
 const order=oq.rows[0]||null;
 if(!order)return {ok:false,errors:['order_not_found'],order:null,attempt:null};
 const aq=await client.query(`SELECT request_key,resource_id,product_type,stripe_session_id,state FROM checkout_attempts WHERE resource_id=$1 AND product_type='detail' ORDER BY created_at DESC LIMIT 1${lockSql}`,[orderId]);
 const attempt=aq.rows[0]||null;
 return {...validateDetailCheckoutBinding({session,order,attempt}),order,attempt};
}
