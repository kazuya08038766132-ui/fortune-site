export async function cleanupRecovery(pool){
 const a=await pool.query(`DELETE FROM recovery_tokens WHERE expires_at < NOW()-INTERVAL '24 hours' OR used_at < NOW()-INTERVAL '24 hours'`);
 const b=await pool.query(`DELETE FROM recovery_rate_limits WHERE hour_bucket < FLOOR(EXTRACT(EPOCH FROM NOW())/3600)-48`);
 return {tokens:a.rowCount||0,rateBuckets:b.rowCount||0};
}
