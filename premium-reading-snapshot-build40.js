export async function materializePremiumReading({pool,orderId,buildReading}){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const q=await client.query(`SELECT id,status,payment_status,premium_status,premium_reading,reading,paid_at
      FROM orders WHERE id=$1 FOR UPDATE`,[orderId]);
    if(!q.rowCount){await client.query('ROLLBACK');return {status:'NOT_FOUND'}}
    const o=q.rows[0];
    const paid=String(o.payment_status||o.status||'').toLowerCase()==='paid';
    if(!paid){await client.query('ROLLBACK');return {status:'PAYMENT_REQUIRED'}}
    if(o.premium_reading){
      await client.query('COMMIT');
      return {status:'READY',created:false,order:o,reading:o.premium_reading};
    }
    const reading=await buildReading(o.reading||{});
    const saved=await client.query(`UPDATE orders SET premium_reading=$1,premium_status='ready',updated_at=NOW()
      WHERE id=$2 RETURNING id,premium_status,paid_at,premium_reading`,[reading,orderId]);
    await client.query('COMMIT');
    return {status:'READY',created:true,order:saved.rows[0],reading:saved.rows[0].premium_reading};
  }catch(e){
    try{await client.query('ROLLBACK')}catch(_){}
    throw e;
  }finally{client.release()}
}
