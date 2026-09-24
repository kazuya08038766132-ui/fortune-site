import {buildDailyFortune,dailyFortuneEmailPayload} from './daily-fortune-build40.js';
import {validateBirthDate} from './birth-date-policy-build40.js';
export async function resolveVerifiedAccount(pool,sessionKey){
 const q=await pool.query(`SELECT ua.id account_id,ua.verified_email FROM account_sessions s JOIN user_accounts ua ON ua.id=s.account_id WHERE s.session_key=$1 AND ua.email_verified_at IS NOT NULL LIMIT 1`,[sessionKey]);
 return q.rows[0]||null;
}
export async function getDailyFortunePreference(pool,sessionKey){
 const a=await resolveVerifiedAccount(pool,sessionKey); if(!a)return {status:'EMAIL_VERIFICATION_REQUIRED',enabled:false};
 const q=await pool.query(`SELECT enabled,birth_date,send_hour_jst,updated_at FROM daily_fortune_preferences WHERE account_id=$1`,[a.account_id]);
 return {status:'OK',verifiedEmail:a.verified_email,preference:q.rows[0]||{enabled:false,birth_date:null,send_hour_jst:8}};
}
export async function saveDailyFortunePreference(pool,sessionKey,{enabled,birthDate,sendHourJst},{todayJst}={}){
 const a=await resolveVerifiedAccount(pool,sessionKey); if(!a)return {status:'EMAIL_VERIFICATION_REQUIRED'};
 const datePolicy=validateBirthDate(birthDate,{todayJst});
 if(typeof enabled!=='boolean'||!datePolicy.ok||!Number.isInteger(sendHourJst)||sendHourJst<5||sendHourJst>11){const status=!datePolicy.ok&&datePolicy.status!=='INVALID_DATE'?datePolicy.status:'INVALID_INPUT';return {status};}
 if(enabled){const m=await pool.query(`SELECT 1 FROM account_sessions s LEFT JOIN membership_accounts ma_session ON ma_session.session_key=s.session_key LEFT JOIN account_membership_links aml ON aml.account_id=s.account_id LEFT JOIN membership_accounts ma_stable ON ma_stable.stripe_customer_id=aml.stripe_customer_id WHERE s.session_key=$1 AND (ma_session.subscription_status IN ('active','trialing') OR ma_stable.subscription_status IN ('active','trialing')) LIMIT 1`,[sessionKey]);if(!m.rowCount)return {status:'ACTIVE_MEMBERSHIP_REQUIRED'};}
 await pool.query(`INSERT INTO daily_fortune_preferences(account_id,enabled,birth_date,send_hour_jst,updated_at) VALUES($1,$2,$3,$4,NOW()) ON CONFLICT(account_id) DO UPDATE SET enabled=EXCLUDED.enabled,birth_date=EXCLUDED.birth_date,send_hour_jst=EXCLUDED.send_hour_jst,updated_at=NOW()`,[a.account_id,enabled,birthDate,sendHourJst]);
 return {status:'OK',enabled,birthDate,sendHourJst};
}
export async function enqueueDailyFortunes(pool,{targetDate,hourJst}){
 const q=await pool.query(`SELECT DISTINCT p.account_id,p.birth_date,p.send_hour_jst,ua.verified_email FROM daily_fortune_preferences p JOIN user_accounts ua ON ua.id=p.account_id WHERE p.enabled=TRUE AND p.send_hour_jst=$1 AND ua.email_verified_at IS NOT NULL AND (EXISTS(SELECT 1 FROM account_sessions s JOIN membership_accounts ma ON ma.session_key=s.session_key WHERE s.account_id=p.account_id AND ma.subscription_status IN ('active','trialing')) OR EXISTS(SELECT 1 FROM account_membership_links aml JOIN membership_accounts ma ON ma.stripe_customer_id=aml.stripe_customer_id WHERE aml.account_id=p.account_id AND ma.subscription_status IN ('active','trialing')))`,[hourJst]);
 let queued=0;
 for(const row of q.rows){const reading=buildDailyFortune({birthDate:String(row.birth_date).slice(0,10),targetDate});if(reading.status!=='OK')continue;const payload=dailyFortuneEmailPayload(reading);const ins=await pool.query(`INSERT INTO email_outbox(event_key,recipient,template_type,payload) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(event_key) DO NOTHING RETURNING id`,[`daily-fortune:${targetDate}:${row.account_id}`,row.verified_email,'DAILY_FORTUNE',JSON.stringify(payload)]);queued+=ins.rowCount||0;}
 return {queued,targetDate,hourJst};
}
