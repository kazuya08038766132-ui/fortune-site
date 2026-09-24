import {loadAndValidateDetailCheckoutBinding} from './stripe-session-binding-build40.js';
// BUILD-40 Stripe webhook helper.
// Invoke inside the existing transaction AFTER payment_events event-id dedupe.
// Subscription object events remain the authoritative subscription state.
// Invoice events only record renewal health and never grant a new entitlement by themselves.
export async function handleStripeBuild40Event(client,event){
  const obj=event.data.object;

  if(event.type==="checkout.session.async_payment_succeeded"){
    const orderId=obj.metadata?.orderId;
    if(!orderId)return;
    if(obj.payment_status!=="paid")throw new Error("Async session not paid");
    const binding=await loadAndValidateDetailCheckoutBinding(client,obj);
    if(!binding.ok)throw new Error(`Stripe session binding failed: ${binding.errors.join(',')}`);
    await client.query(`UPDATE orders SET status='paid',payment_status='paid',premium_status='unlocked',
      stripe_session_id=$1,paid_at=COALESCE(paid_at,NOW()),updated_at=NOW() WHERE id=$2`,[obj.id,orderId]);
  }

  if(event.type==="checkout.session.async_payment_failed"){
    const orderId=obj.metadata?.orderId;
    if(!orderId)return;
    const binding=await loadAndValidateDetailCheckoutBinding(client,obj);
    if(!binding.ok)throw new Error(`Stripe session binding failed: ${binding.errors.join(',')}`);
    await client.query(`UPDATE orders SET payment_status='failed',premium_status='locked',updated_at=NOW()
      WHERE id=$1 AND payment_status<>'paid'`,[orderId]);
  }

  if(event.type==="invoice.paid" || event.type==="invoice.payment_failed"){
    const customerId=typeof obj.customer==="string"?obj.customer:(obj.customer?.id||null);
    const subscriptionId=typeof obj.subscription==="string"?obj.subscription:(obj.subscription?.id||null);
    const health=event.type==="invoice.paid"?"paid":"payment_failed";
    await client.query(`INSERT INTO membership_payment_events
      (stripe_invoice_id,stripe_customer_id,stripe_subscription_id,event_type,payment_health,payload)
      VALUES($1,$2,$3,$4,$5,$6::jsonb)
      ON CONFLICT(stripe_invoice_id,event_type) DO NOTHING`,
      [String(obj.id||""),customerId,subscriptionId,event.type,health,JSON.stringify(obj)]);
  }
}
