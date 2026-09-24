import crypto from "crypto";
function digest(secret,value){return crypto.createHmac("sha256",secret).update(String(value||"")).digest("hex")}
export function recoveryRateLimiter({pool,secret}){
 if(!secret||secret.length<32)throw Error("RECOVERY_RATE_LIMIT_SECRET must be >=32 chars");
 async function check({email,ip}){
  const nowBucket=Math.floor(Date.now()/3600000), emailKey=digest(secret,`e:${String(email||"").trim().toLowerCase()}`),
        ipKey=digest(secret,`i:${String(ip||"")}`);
  const c=await pool.connect(); let emailCount=0,ipCount=0;
  try{
   await c.query("BEGIN");
   for(const [kind,key] of [["email",emailKey],["ip",ipKey]]){
    const q=await c.query(`INSERT INTO recovery_rate_limits(kind,bucket_key,hour_bucket,count,updated_at)
      VALUES($1,$2,$3,1,NOW()) ON CONFLICT(kind,bucket_key,hour_bucket)
      DO UPDATE SET count=recovery_rate_limits.count+1,updated_at=NOW() RETURNING count`,[kind,key,nowBucket]);
    if(kind==="email")emailCount=Number(q.rows[0].count);else ipCount=Number(q.rows[0].count);
   }
   await c.query("COMMIT");
   return {allowed:emailCount<=5&&ipCount<=20,emailCount,ipCount};
  }catch(e){await c.query("ROLLBACK").catch(()=>{});throw e}finally{c.release()}
 }
 return {check};
}
