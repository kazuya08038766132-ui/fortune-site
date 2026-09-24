import {Resend} from "resend";
import {sealSensitive,openSensitive} from "./sensitive-outbox-build40.js";
export async function enqueueEmail(client,{eventKey,recipient,templateType,payload,sensitive=false}){
 const stored=sensitive?{sensitive:sealSensitive(payload)}:payload;
 await client.query(`INSERT INTO email_outbox(event_key,recipient,template_type,payload)
   VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(event_key) DO NOTHING`,
   [eventKey,recipient,templateType,JSON.stringify(stored)]);
}
export async function pumpEmailOutbox(pool,{limit=10}={}){
 if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)return {configured:false,sent:0};
 const resend=new Resend(process.env.RESEND_API_KEY); let sent=0;
 for(let n=0;n<limit;n++){
  const c=await pool.connect(); let row;
  try{
   await c.query("BEGIN");
   const q=await c.query(`SELECT * FROM email_outbox WHERE status IN ('pending','retry_wait') AND next_attempt_at<=NOW()
     ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1`);
   row=q.rows[0]; if(!row){await c.query("ROLLBACK");break}
   await c.query(`UPDATE email_outbox SET status='sending',attempts=attempts+1,updated_at=NOW() WHERE id=$1`,[row.id]);
   await c.query("COMMIT");
  }catch(e){await c.query("ROLLBACK").catch(()=>{});c.release();throw e}
  c.release();
  try{
   const p=row.payload?.sensitive?openSensitive(row.payload.sensitive):row.payload;
   const result=await resend.emails.send({from:process.env.EMAIL_FROM,to:[row.recipient],subject:p.subject,html:p.html,text:p.text},
    {idempotencyKey:row.event_key});
   await pool.query(`UPDATE email_outbox SET status='sent',provider_message_id=$2,sent_at=NOW(),updated_at=NOW(),
     last_error=NULL,payload='{}'::jsonb WHERE id=$1`,[row.id,result?.data?.id||null]); sent++;
  }catch(e){
   const attempts=Number(row.attempts)+1, dead=attempts>=8, delay=Math.min(3600,30*(2**Math.min(attempts,7)));
   await pool.query(`UPDATE email_outbox SET status=$2,last_error=$3,next_attempt_at=NOW()+($4||' seconds')::interval,updated_at=NOW() WHERE id=$1`,
    [row.id,dead?'dead_letter':'retry_wait',String(e?.message||e).slice(0,1000),String(delay)]);
  }
 }
 return {configured:true,sent};
}
