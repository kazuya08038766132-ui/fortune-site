export async function applyConsentRevocation(pool,{subject,consentType,accepted,now=new Date()}={}){
  if(accepted!==false)return {revoked:false,queuedAssets:0};
  if(consentType!=='PALM_AI_TRAINING')return {revoked:true,queuedAssets:0};
  if(!subject)throw new Error('subject_required');
  const q=await pool.query(`UPDATE palm_assets
    SET state='delete_pending',
        delete_requested_at=COALESCE(delete_requested_at,$2),
        delete_after=LEAST(COALESCE(delete_after,$2),$2),
        delete_next_attempt_at=NULL,
        delete_last_error=NULL,
        updated_at=NOW()
    WHERE subject_key=$1
      AND purpose='ai_training'
      AND state<>'deleted'
    RETURNING id`,[subject,now]);
  return {revoked:true,queuedAssets:q.rowCount||0};
}
