function latestConsentMap(rows=[]){
  const out={};
  for(const row of rows){
    if(!out[row.consent_type])out[row.consent_type]={accepted:!!row.accepted,policyVersion:row.policy_version,updatedAt:row.created_at};
  }
  return out;
}

export async function buildAccountDataSummary(pool,{sessionKey,accountId=null,membership=null}){
  const subject=accountId?`acct:${accountId}`:sessionKey;
  const [consents,palm,orders,pref]=await Promise.all([
    pool.query(`SELECT consent_type,accepted,policy_version,created_at FROM consent_events WHERE subject_key=$1 ORDER BY created_at DESC,id DESC`,[subject]),
    pool.query(`SELECT purpose,state,COUNT(*)::int AS count FROM palm_assets WHERE subject_key=$1 GROUP BY purpose,state`,[subject]),
    accountId
      ? pool.query(`SELECT COUNT(*)::int AS count,COUNT(*) FILTER (WHERE o.payment_status='paid' OR o.status='paid')::int AS paid_count FROM account_order_links l JOIN orders o ON o.id=l.order_id WHERE l.account_id=$1`,[accountId])
      : pool.query(`SELECT COUNT(*)::int AS count,COUNT(*) FILTER (WHERE o.payment_status='paid' OR o.status='paid')::int AS paid_count FROM account_orders ao JOIN orders o ON o.id=ao.order_id WHERE ao.session_key=$1`,[sessionKey]),
    accountId
      ? pool.query(`SELECT enabled,send_hour_jst,updated_at FROM daily_fortune_preferences WHERE account_id=$1 LIMIT 1`,[accountId])
      : Promise.resolve({rows:[]})
  ]);

  const palmSummary={reading:{active:0,deletePending:0,deleted:0},aiTraining:{active:0,deletePending:0,deleted:0},total:0};
  for(const row of palm.rows){
    const bucket=row.purpose==='ai_training'?palmSummary.aiTraining:palmSummary.reading;
    const n=Number(row.count||0); palmSummary.total+=n;
    if(row.state==='deleted')bucket.deleted+=n;
    else if(row.state==='delete_pending')bucket.deletePending+=n;
    else bucket.active+=n;
  }
  const orderRow=orders.rows[0]||{count:0,paid_count:0};
  const p=pref.rows[0]||null;
  return {
    stableAccount:!!accountId,
    orders:{total:Number(orderRow.count||0),paid:Number(orderRow.paid_count||0)},
    membership:{status:membership?.subscription_status||'inactive',cancelAtPeriodEnd:!!membership?.cancel_at_period_end,currentPeriodEnd:membership?.current_period_end||null},
    dailyFortune:p?{configured:true,enabled:!!p.enabled,sendHourJst:p.send_hour_jst,updatedAt:p.updated_at}:{configured:false,enabled:false,sendHourJst:null,updatedAt:null},
    consents:latestConsentMap(consents.rows),
    palm:palmSummary
  };
}
