export function createReadiness({pool}){
 return async function readiness(_req,res){
  const checks={
   database:false,
   publicBaseUrl:!!process.env.PUBLIC_BASE_URL,
   stripe:!!process.env.STRIPE_SECRET_KEY,
   stripeWebhook:!!process.env.STRIPE_WEBHOOK_SECRET,
   csrf:!!process.env.CSRF_SECRET,
   r2:!!(process.env.R2_ACCOUNT_ID&&process.env.R2_ACCESS_KEY_ID&&process.env.R2_SECRET_ACCESS_KEY&&process.env.R2_BUCKET),
   resend:!!(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM),
   resendWebhook:!!process.env.RESEND_WEBHOOK_SECRET,
   recovery:!!(process.env.RECOVERY_SECRET&&process.env.RECOVERY_RATE_LIMIT_SECRET&&process.env.OUTBOX_ENCRYPTION_KEY)
  };
  try{await pool.query("SELECT 1");checks.database=true}catch{}
  const ok=Object.values(checks).every(Boolean);
  res.status(ok?200:503).json({ok,build:"BUILD-40",checks});
 }
}
