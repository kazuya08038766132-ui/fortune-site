export async function migrateSessionResources(client,{sessionKey,accountId}){
 if(!sessionKey||!accountId)throw new Error('sessionKey and accountId are required');
 const accountSubject=`acct:${accountId}`;
 await client.query(`INSERT INTO account_order_links(account_id,order_id)
   SELECT $1,ao.order_id FROM account_orders ao WHERE ao.session_key=$2
   ON CONFLICT DO NOTHING`,[accountId,sessionKey]);
 await client.query(`INSERT INTO account_membership_links(account_id,stripe_customer_id,stripe_subscription_id)
   SELECT $1,ma.stripe_customer_id,ma.stripe_subscription_id FROM membership_accounts ma
   WHERE ma.session_key=$2 AND ma.stripe_customer_id IS NOT NULL
   ON CONFLICT(account_id,stripe_customer_id) DO UPDATE SET stripe_subscription_id=EXCLUDED.stripe_subscription_id`,[accountId,sessionKey]);
 await client.query(`UPDATE consent_events SET subject_key=$1 WHERE subject_key=$2`,[accountSubject,sessionKey]);
 await client.query(`UPDATE palm_assets SET subject_key=$1,updated_at=NOW() WHERE subject_key=$2 AND state<>'deleted'`,[accountSubject,sessionKey]);
 return {accountSubject};
}
