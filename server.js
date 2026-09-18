import express from "express";
import Stripe from "stripe";
import pg from "pg";
import crypto from "crypto";

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3000;
const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;
const priceYen = Number(process.env.DETAIL_PRICE_YEN || 980);
const membershipPriceYen = Number(process.env.MEMBERSHIP_PRICE_YEN || 490);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined
});

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

async function initDb() {
  if (!process.env.DATABASE_URL) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      amount INTEGER NOT NULL,
      reading JSONB,
      stripe_session_id TEXT,
      currency TEXT NOT NULL DEFAULT 'jpy',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      premium_status TEXT NOT NULL DEFAULT 'locked',
      premium_reading JSONB,
      paid_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Safe migrations for databases created by earlier versions.
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'jpy'`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS premium_status TEXT NOT NULL DEFAULT 'locked'`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS premium_reading JSONB`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_session_id)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      current_period_end TIMESTAMPTZ,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

app.post("/api/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.sendStatus(503);
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET
      );
      if (process.env.DATABASE_URL) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const inserted = await client.query(
            `INSERT INTO payment_events(event_id,event_type) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING event_id`,
            [event.id, event.type]
          );
          if (!inserted.rows[0]) {
            await client.query('ROLLBACK');
            return res.json({ received: true, duplicate: true });
          }

          if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const orderId = session.metadata?.orderId;
            if (orderId) {
              const { rows } = await client.query(`SELECT id,amount,currency FROM orders WHERE id=$1 FOR UPDATE`, [orderId]);
              const order = rows[0];
              if (!order) throw new Error('Order not found');
              if (session.payment_status !== 'paid') throw new Error('Stripe session is not paid');
              if (Number(session.amount_total) !== Number(order.amount)) throw new Error('Amount mismatch');
              if ((session.currency || '').toLowerCase() !== (order.currency || 'jpy').toLowerCase()) throw new Error('Currency mismatch');

              await client.query(
                `UPDATE orders SET status='paid', payment_status='paid', premium_status='unlocked', stripe_session_id=$1, paid_at=COALESCE(paid_at,NOW()), updated_at=NOW() WHERE id=$2`,
                [session.id, orderId]
              );
            }
          }
          
          
          if (event.type === "checkout.session.completed") {
            const session=event.data.object;
            if(session.mode === 'subscription'){
              const membershipId=session.metadata?.membershipId;
              const accountSession=session.metadata?.accountSession;
              const customerId=String(session.customer||'');
              const subscriptionId=String(session.subscription||'');
              if(membershipId){
                await client.query(
                  `UPDATE memberships SET stripe_customer_id=$1,stripe_subscription_id=$2,status=CASE WHEN $2<>'' THEN 'processing' ELSE status END,updated_at=NOW() WHERE id=$3`,
                  [customerId,subscriptionId,membershipId]
                );
              }
              if(accountSession && /^[a-f0-9]{48}$/.test(accountSession)){
                await client.query(`INSERT INTO visitor_accounts(session_key) VALUES($1) ON CONFLICT DO NOTHING`,[accountSession]);
                await client.query(`
                  INSERT INTO membership_accounts(session_key,stripe_customer_id,stripe_subscription_id,subscription_status,updated_at)
                  VALUES($1,$2,$3,'processing',NOW())
                  ON CONFLICT(session_key) DO UPDATE SET
                    stripe_customer_id=EXCLUDED.stripe_customer_id,
                    stripe_subscription_id=EXCLUDED.stripe_subscription_id,
                    subscription_status=EXCLUDED.subscription_status,
                    updated_at=NOW()
                `,[accountSession,customerId,subscriptionId]);
              }
            }
          }
          
          if (event.type === 'customer.subscription.created' ||
              event.type === 'customer.subscription.updated' ||
              event.type === 'customer.subscription.deleted') {
            const sub=event.data.object;
            const membershipId=sub.metadata?.membershipId || `MB-${sub.id}`;
            const periodEnd=sub.current_period_end ? new Date(sub.current_period_end*1000) : null;
            await client.query(`
              INSERT INTO memberships(id,stripe_customer_id,stripe_subscription_id,status,current_period_end,cancel_at_period_end,updated_at)
              VALUES($1,$2,$3,$4,$5,$6,NOW())
              ON CONFLICT(stripe_subscription_id) DO UPDATE SET
                stripe_customer_id=EXCLUDED.stripe_customer_id,
                status=EXCLUDED.status,
                current_period_end=EXCLUDED.current_period_end,
                cancel_at_period_end=EXCLUDED.cancel_at_period_end,
                updated_at=NOW()
            `,[membershipId,String(sub.customer||''),sub.id,sub.status,periodEnd,Boolean(sub.cancel_at_period_end)]);
            await client.query(`
              UPDATE membership_accounts SET
                stripe_customer_id=$1,
                subscription_status=$2,
                current_period_end=$3,
                cancel_at_period_end=$4,
                updated_at=NOW()
              WHERE stripe_subscription_id=$5 OR stripe_customer_id=$1
            `,[String(sub.customer||''),String(sub.status||'inactive'),periodEnd,Boolean(sub.cancel_at_period_end),sub.id]);
          }
          
          await client.query('COMMIT');
        } catch (dbError) {
          await client.query('ROLLBACK');
          throw dbError;
        } finally {
          client.release();
        }
      }
      res.json({ received: true });
    } catch (e) {
      res.status(400).send(`Webhook Error: ${e.message}`);
    }
  }
);
app.use((req, _res, next) => {
  console.log("REQUEST:", req.method, req.url);
  next();
});

// ===== SPEC195 production security middleware =====
app.disable("x-powered-by");
app.use((req,res,next)=>{
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy","camera=(self), microphone=(), geolocation=()");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.jsdelivr.net/npm/; connect-src 'self' https://api.stripe.com https://cdn.jsdelivr.net https://cdn.jsdelivr.net/npm/; frame-src https://checkout.stripe.com https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com");
  next();
});
const specRateBuckets=new Map();
function specRateLimit(name,limit,windowMs){
 return (req,res,next)=>{
   const key=name+":"+(req.ip||req.socket?.remoteAddress||"unknown");
   const now=Date.now(),b=specRateBuckets.get(key);
   if(!b||now-b.start>=windowMs){specRateBuckets.set(key,{start:now,count:1});return next()}
   if(b.count>=limit)return res.status(429).json({error:"rate_limited"});
   b.count++;next();
 };
}
app.use("/api/create-checkout-session",specRateLimit("checkout",12,10*60*1000));
app.use("/api/create-subscription-checkout",specRateLimit("subscription",8,10*60*1000));
app.use("/api/consent-events",specRateLimit("consent",40,10*60*1000));
app.use("/api/account-orders/claim",specRateLimit("claim",20,10*60*1000));

app.use(express.json({ limit: "1mb" }));
app.use(express.static("."));
app.get("/", (_req, res) => res.sendFile("index.html", { root: process.cwd() }));
app.get("/api/health", (_req, res) => res.json({ ok: true, spec: "SPEC_V1_195_FREEZE" }));
app.get("/api/spec", (_req,res) => res.json({
  spec:"SPEC_V1_195_FREEZE",
  products:{free:0,detail_one_time:priceYen,membership_monthly:membershipPriceYen},
  serverFixedPricing:true
}));

app.post("/api/create-checkout-session", async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Stripe is not configured yet." });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Database is not configured." });

  const orderId = `FT-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  const reading = req.body?.reading || {};

  await pool.query(
    `INSERT INTO orders(id,status,amount,currency,payment_status,premium_status,reading) VALUES($1,'pending',$2,'jpy','pending','locked',$3)`,
    [orderId, priceYen, reading]
  );

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "jpy",
        unit_amount: priceYen,
        product_data: { name: "総合占い 詳細鑑定" }
      },
      quantity: 1
    }],
    success_url: `${baseUrl}/success.html?order_id=${encodeURIComponent(orderId)}`,
    cancel_url: `${baseUrl}/`,
    metadata: { orderId }
  });

  await pool.query(`UPDATE orders SET stripe_session_id=$1 WHERE id=$2`, [session.id, orderId]);
  res.json({ url: session.url, orderId });
});


app.post("/api/create-subscription-session", async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Stripe is not configured yet." });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Database is not configured." });

  const membershipId = `MB-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  await pool.query(`INSERT INTO memberships(id,status) VALUES($1,'pending')`, [membershipId]);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{
      price_data: {
        currency: "jpy",
        unit_amount: membershipPriceYen,
        recurring: { interval: "month" },
        product_data: { name: "総合占い プレミアム会員" }
      },
      quantity: 1
    }],
    success_url: `${baseUrl}/membership-success.html?membership_id=${encodeURIComponent(membershipId)}`,
    cancel_url: `${baseUrl}/`,
    subscription_data: { metadata: { membershipId } },
    metadata: { membershipId, productKey: "premium_monthly" }
  });
  res.json({ url: session.url, membershipId });
});


app.post("/api/create-customer-portal",requireSameOrigin,requireCsrf,async(req,res)=>{
  if(process.env.NODE_ENV==="production") return res.status(404).json({error:"use_owned_customer_portal"});
  if (!stripe) return res.status(503).json({ error:"Stripe is not configured yet." });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error:"Database is not configured." });
  const membershipId=req.body?.membershipId;
  if(!membershipId) return res.status(400).json({error:"membershipId is required"});
  const {rows}=await pool.query(`SELECT stripe_customer_id FROM memberships WHERE id=$1`,[membershipId]);
  if(!rows[0]?.stripe_customer_id) return res.status(404).json({error:"Membership customer not found"});
  const portal=await stripe.billingPortal.sessions.create({
    customer:rows[0].stripe_customer_id,
    return_url:`${baseUrl}/`
  });
  res.json({url:portal.url});
});

app.get("/api/membership/:id", async (req,res) => {
  if (!process.env.DATABASE_URL) return res.status(503).json({ error:"Database is not configured." });
  const {rows}=await pool.query(`SELECT id,status,current_period_end,cancel_at_period_end,created_at FROM memberships WHERE id=$1`,[req.params.id]);
  if(!rows[0]) return res.sendStatus(404);
  res.json(rows[0]);
});

app.get("/api/order/:id", async (req, res) => {
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Database is not configured." });
  const { rows } = await pool.query(
    `SELECT id,status,amount,currency,payment_status,premium_status,reading,premium_reading,paid_at,created_at FROM orders WHERE id=$1`,
    [req.params.id]
  );
  if (!rows[0]) return res.sendStatus(404);
  const order = rows[0];
  const paid = order.payment_status === "paid" || order.status === "paid";
  res.json(paid
    ? order
    : { id: order.id, status: order.status, payment_status: order.payment_status, premium_status: order.premium_status, amount: order.amount, currency: order.currency, created_at: order.created_at });
});

// Stores a generated premium reading only for an already-paid order.
app.post("/api/order/:id/premium-reading", async (req, res) => {
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Database is not configured." });
  const premiumReading = req.body?.premiumReading;
  if (!premiumReading) return res.status(400).json({ error: "premiumReading is required." });

  const { rows } = await pool.query(`SELECT payment_status,status FROM orders WHERE id=$1`, [req.params.id]);
  const order = rows[0];
  if (!order) return res.sendStatus(404);
  if (order.payment_status !== "paid" && order.status !== "paid") {
    return res.status(403).json({ error: "PREMIUM_REQUIRED" });
  }

  const updated = await pool.query(
    `UPDATE orders SET premium_reading=$1, premium_status='ready', updated_at=NOW() WHERE id=$2 RETURNING id,premium_status,premium_reading`,
    [premiumReading, req.params.id]
  );
  res.json(updated.rows[0]);
});

initDb()
  .then(() => app.listen(port, "0.0.0.0", () => console.log(`fortune-site listening on ${port}`)))
  .catch(err => { console.error(err); process.exit(1); });



// ===== SPEC195 persistence / consent / reading artifacts =====
async function ensureSpec195Tables(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS consent_events (
      id BIGSERIAL PRIMARY KEY,
      subject_key TEXT NOT NULL,
      consent_type TEXT NOT NULL,
      accepted BOOLEAN NOT NULL,
      policy_version TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS consent_events_subject_idx ON consent_events(subject_key, created_at DESC);
    CREATE TABLE IF NOT EXISTS reading_artifacts (
      id BIGSERIAL PRIMARY KEY,
      order_id TEXT,
      artifact_type TEXT NOT NULL,
      schema_version TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS reading_artifacts_order_idx ON reading_artifacts(order_id);
    CREATE TABLE IF NOT EXISTS palm_assets (
      id BIGSERIAL PRIMARY KEY,
      subject_key TEXT NOT NULL,
      storage_key TEXT NOT NULL UNIQUE,
      purpose TEXT NOT NULL CHECK (purpose IN ('reading','ai_training')),
      delete_after TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS palm_assets_delete_idx ON palm_assets(delete_after);
  `);
}
ensureSpec195Tables().catch(e=>console.error("SPEC195 migration failed",e));

function cleanSubjectKey(v){
  const x=String(v||"").trim();
  return /^[A-Za-z0-9:_-]{8,128}$/.test(x)?x:null;
}
function cleanConsentType(v){
  const allowed=new Set(["PALM_READING","PALM_AI_TRAINING","TERMS","MEMBERSHIP_AUTO_RENEW"]);
  return allowed.has(v)?v:null;
}
app.post("/api/consent-events", requireSameOrigin,requireCsrf, async (req,res)=>{
  try{
    const subject=cleanSubjectKey(req.body?.subject_key);
    const type=cleanConsentType(req.body?.consent_type);
    const accepted=req.body?.accepted;
    const policy=String(req.body?.policy_version||"").slice(0,80);
    if(!subject||!type||typeof accepted!=="boolean"||!policy) return res.status(400).json({error:"invalid_consent_event"});
    const q=await pool.query(
      `INSERT INTO consent_events(subject_key,consent_type,accepted,policy_version)
       VALUES($1,$2,$3,$4) RETURNING id,created_at`,
      [subject,type,accepted,policy]
    );
    res.status(201).json({ok:true,id:q.rows[0].id,created_at:q.rows[0].created_at});
  }catch(e){console.error(e);res.status(500).json({error:"consent_store_failed"})}
});

app.get("/api/consent-events/:subject", async (req,res)=>{
  try{
    const subject=cleanSubjectKey(req.params.subject);
    if(!subject)return res.status(400).json({error:"invalid_subject"});
    const q=await pool.query(
      `SELECT consent_type,accepted,policy_version,created_at FROM consent_events
       WHERE subject_key=$1 ORDER BY created_at DESC LIMIT 50`,[subject]);
    res.json({events:q.rows});
  }catch(e){console.error(e);res.status(500).json({error:"consent_read_failed"})}
});

// Paid artifacts are never unlocked by a success URL alone.
app.get("/api/paid-reading/:orderId", async (req,res)=>{
  if(process.env.NODE_ENV==="production") return res.status(404).json({error:"use_account_owned_reading"});
  try{
    const orderId=String(req.params.orderId||"").slice(0,120);
    const oq=await pool.query(`SELECT id,status FROM orders WHERE id::text=$1 LIMIT 1`,[orderId]);
    if(!oq.rowCount || String(oq.rows[0].status||"").toLowerCase()!=="paid") return res.status(403).json({error:"payment_required"});
    const aq=await pool.query(
      `SELECT schema_version,payload,created_at FROM reading_artifacts
       WHERE order_id=$1 AND artifact_type='PREMIUM_READING' ORDER BY created_at DESC LIMIT 1`,[orderId]);
    if(!aq.rowCount)return res.status(404).json({error:"reading_not_ready"});
    res.json({paid:true,reading:aq.rows[0]});
  }catch(e){console.error(e);res.status(500).json({error:"paid_reading_failed"})}
});

app.post("/api/reading-artifacts", async (req,res)=>{
  try{
    const orderId=String(req.body?.order_id||"").slice(0,120);
    const schema=String(req.body?.schema_version||"").slice(0,80);
    const payload=req.body?.payload;
    if(!orderId||!schema||!payload||typeof payload!=="object")return res.status(400).json({error:"invalid_artifact"});
    const oq=await pool.query(`SELECT status FROM orders WHERE id::text=$1 LIMIT 1`,[orderId]);
    if(!oq.rowCount || String(oq.rows[0].status||"").toLowerCase()!=="paid")return res.status(403).json({error:"payment_required"});
    const q=await pool.query(
      `INSERT INTO reading_artifacts(order_id,artifact_type,schema_version,payload)
       VALUES($1,'PREMIUM_READING',$2,$3::jsonb) RETURNING id,created_at`,
      [orderId,schema,JSON.stringify(payload)]);
    res.status(201).json({ok:true,id:q.rows[0].id,created_at:q.rows[0].created_at});
  }catch(e){console.error(e);res.status(500).json({error:"artifact_store_failed"})}
});

// Storage registry only: actual private-object upload/delete adapter is still required.
app.post("/api/palm-assets/register", async (req,res)=>{
  try{
    const subject=cleanSubjectKey(req.body?.subject_key);
    const storageKey=String(req.body?.storage_key||"").trim().slice(0,300);
    const purpose=req.body?.purpose==="ai_training"?"ai_training":"reading";
    if(!subject||!storageKey)return res.status(400).json({error:"invalid_asset"});
    // Reading originals: 30 days. AI-training assets require explicit current opt-in and have no automatic 30-day reading expiry.
    if(purpose==="ai_training"){
      const cq=await pool.query(`SELECT accepted FROM consent_events WHERE subject_key=$1 AND consent_type='PALM_AI_TRAINING' ORDER BY created_at DESC LIMIT 1`,[subject]);
      if(!cq.rowCount||cq.rows[0].accepted!==true)return res.status(403).json({error:"ai_training_consent_required"});
    }
    const deleteAfter=purpose==="reading"?new Date(Date.now()+30*86400000):null;
    const q=await pool.query(
      `INSERT INTO palm_assets(subject_key,storage_key,purpose,delete_after)
       VALUES($1,$2,$3,$4) ON CONFLICT(storage_key) DO UPDATE SET purpose=EXCLUDED.purpose,delete_after=EXCLUDED.delete_after
       RETURNING id,delete_after`,[subject,storageKey,purpose,deleteAfter]);
    res.status(201).json({ok:true,id:q.rows[0].id,delete_after:q.rows[0].delete_after,storage_adapter:"NOT_CONNECTED"});
  }catch(e){console.error(e);res.status(500).json({error:"asset_register_failed"})}
});

app.get("/api/retention/due", async (req,res)=>{
  // Development audit endpoint only; never returns image bytes.
  if(process.env.NODE_ENV==="production")return res.status(404).end();
  try{
    const q=await pool.query(`SELECT id,storage_key,delete_after FROM palm_assets WHERE delete_after IS NOT NULL AND delete_after<=NOW() ORDER BY delete_after LIMIT 100`);
    res.json({due:q.rows,storage_adapter:"NOT_CONNECTED"});
  }catch(e){res.status(500).json({error:"retention_audit_failed"})}
});



function privateNoStore(_req,res,next){res.setHeader("Cache-Control","no-store, private");next();}
app.use("/api/me",privateNoStore);
app.use("/api/membership-status",privateNoStore);
app.use("/api/my-paid-reading",privateNoStore);
app.use("/api/consent-events",privateNoStore);

// ===== SPEC195 account ownership / membership / history =====
// Production identity is intentionally based on a server-issued opaque browser session.
// This is not a full login system yet; it prevents trusting an arbitrary client-supplied subject key.

function parseCookies(req){
  return Object.fromEntries(String(req.headers.cookie||"").split(";").map(x=>x.trim()).filter(Boolean).map(x=>{
    const i=x.indexOf("="); return i<0?[x,""]:[x.slice(0,i),decodeURIComponent(x.slice(i+1))];
  }));
}
function ensureVisitorSession(req,res){
  const cookies=parseCookies(req);
  let sid=String(cookies.fortune_sid||"");
  if(!/^[a-f0-9]{48}$/.test(sid)){
    sid=crypto.randomBytes(24).toString("hex");
    const secure=process.env.NODE_ENV==="production"?"; Secure":"";
    res.append("Set-Cookie",`fortune_sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`);
  }
  return sid;
}
async function ensureAccountTables(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitor_accounts(
      session_key TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS account_orders(
      session_key TEXT NOT NULL REFERENCES visitor_accounts(session_key) ON DELETE CASCADE,
      order_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(session_key,order_id)
    );
    CREATE INDEX IF NOT EXISTS account_orders_session_idx ON account_orders(session_key,created_at DESC);
    CREATE TABLE IF NOT EXISTS membership_accounts(
      session_key TEXT PRIMARY KEY REFERENCES visitor_accounts(session_key) ON DELETE CASCADE,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      subscription_status TEXT NOT NULL DEFAULT 'inactive',
      current_period_end TIMESTAMPTZ,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
ensureAccountTables().catch(e=>console.error("account migration failed",e));

async function touchAccount(req,res){
  const sid=ensureVisitorSession(req,res);
  await pool.query(`INSERT INTO visitor_accounts(session_key) VALUES($1)
    ON CONFLICT(session_key) DO UPDATE SET last_seen_at=NOW()`,[sid]);
  return sid;
}
app.get("/api/me",async(req,res)=>{
  try{
    const sid=await touchAccount(req,res);
    const mq=await pool.query(`SELECT subscription_status,current_period_end,cancel_at_period_end
      FROM membership_accounts WHERE session_key=$1`,[sid]);
    const oq=await pool.query(`SELECT ao.order_id,o.status,ao.created_at
      FROM account_orders ao LEFT JOIN orders o ON o.id::text=ao.order_id
      WHERE ao.session_key=$1 ORDER BY ao.created_at DESC LIMIT 30`,[sid]);
    res.json({account:"browser_session",membership:mq.rows[0]||{subscription_status:"inactive"},orders:oq.rows});
  }catch(e){console.error(e);res.status(500).json({error:"account_read_failed"})}
});
app.post("/api/account-orders/claim",requireSameOrigin,requireCsrf,async(req,res)=>{
  try{
    const sid=await touchAccount(req,res);
    const orderId=String(req.body?.order_id||"").slice(0,120);
    if(!orderId)return res.status(400).json({error:"invalid_order"});
    const q=await pool.query(`SELECT id,status FROM orders WHERE id::text=$1 LIMIT 1`,[orderId]);
    if(!q.rowCount||String(q.rows[0].status||"").toLowerCase()!=="paid")return res.status(403).json({error:"payment_required"});
    await pool.query(`INSERT INTO account_orders(session_key,order_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[sid,orderId]);
    res.json({ok:true});
  }catch(e){console.error(e);res.status(500).json({error:"order_claim_failed"})}
});
app.get("/api/my-paid-reading/:orderId",async(req,res)=>{
  try{
    const sid=await touchAccount(req,res),orderId=String(req.params.orderId||"").slice(0,120);
    const own=await pool.query(`SELECT 1 FROM account_orders WHERE session_key=$1 AND order_id=$2`,[sid,orderId]);
    if(!own.rowCount)return res.status(403).json({error:"not_owned"});
    const oq=await pool.query(`SELECT status FROM orders WHERE id::text=$1 LIMIT 1`,[orderId]);
    if(!oq.rowCount||String(oq.rows[0].status||"").toLowerCase()!=="paid")return res.status(403).json({error:"payment_required"});
    const aq=await pool.query(`SELECT schema_version,payload,created_at FROM reading_artifacts
      WHERE order_id=$1 AND artifact_type='PREMIUM_READING' ORDER BY created_at DESC LIMIT 1`,[orderId]);
    if(!aq.rowCount)return res.status(404).json({error:"reading_not_ready"});
    res.json({paid:true,reading:aq.rows[0]});
  }catch(e){console.error(e);res.status(500).json({error:"reading_read_failed"})}
});
app.get("/api/membership-status",async(req,res)=>{
  try{
    const sid=await touchAccount(req,res);
    const q=await pool.query(`SELECT subscription_status,current_period_end,cancel_at_period_end
      FROM membership_accounts WHERE session_key=$1`,[sid]);
    const m=q.rows[0]||{subscription_status:"inactive",current_period_end:null,cancel_at_period_end:false};
    res.json({membership:m,active:["active","trialing"].includes(m.subscription_status)});
  }catch(e){res.status(500).json({error:"membership_read_failed"})}
});


// ===== SPEC195 CSRF for browser-session state changes =====
const csrfTokens=new Map();
function csrfForSession(sid){
  let t=csrfTokens.get(sid);
  if(!t){t=crypto.randomBytes(24).toString("hex");csrfTokens.set(sid,t)}
  return t;
}
app.get("/api/csrf-token",async(req,res)=>{
  try{const sid=await touchAccount(req,res);res.json({token:csrfForSession(sid)})}
  catch(e){res.status(500).json({error:"csrf_init_failed"})}
});

function requireSameOrigin(req,res,next){
  const origin=String(req.headers.origin||"");
  if(!origin)return next(); // non-browser/test clients; CSRF token still required where configured
  const expected=process.env.PUBLIC_BASE_URL;
  if(expected){
    try{
      if(new URL(origin).origin!==new URL(expected).origin)return res.status(403).json({error:"origin_forbidden"});
    }catch(_){return res.status(403).json({error:"origin_forbidden"})}
  }
  next();
}

function requireCsrf(req,res,next){
  const sid=ensureVisitorSession(req,res);
  const expected=csrfTokens.get(sid),got=String(req.headers["x-csrf-token"]||"");
  if(!expected||got.length!==expected.length)return res.status(403).json({error:"csrf_required"});
  try{
    if(!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(got)))return res.status(403).json({error:"csrf_required"});
  }catch(_){return res.status(403).json({error:"csrf_required"})}
  next();
}

// ===== SPEC195 product contract / purchase confirmation =====
const SPEC195_PRODUCTS = Object.freeze({
  detail: {
    id: "detail",
    name: "総合詳細鑑定",
    amount: 980,
    currency: "jpy",
    recurring: false,
    delivery: "決済確認後、原則として直ちに提供",
    chapters: [
      "Ⅰ あなたという人","Ⅱ 運命バランス","Ⅲ 掌","Ⅳ 姓名","Ⅴ 生年月日",
      "Ⅵ 仕事と才能","Ⅶ 財と金運","Ⅷ 愛情・人間関係","Ⅸ 人生の転機",
      "Ⅹ 二つの手","最終章 三占術統合"
    ]
  },
  membership: {
    id: "membership",
    name: "月額会員",
    amount: 490,
    currency: "jpy",
    recurring: true,
    interval: "month",
    delivery: "決済確認後、会員機能を提供",
    cancellation: "マイページの会員管理から解約"
  }
});

app.get("/api/products", (_req,res) => {
  res.json({spec:"SPEC_V1_195_FREEZE",products:SPEC195_PRODUCTS});
});

app.get("/api/purchase-confirm/:product", (req,res) => {
  const p=SPEC195_PRODUCTS[req.params.product];
  if(!p) return res.status(404).json({error:"unknown_product"});
  res.json({
    product:p,
    confirmationRequired:true,
    terms:"/terms.html",
    legal:"/legal.html",
    refund:"/refund.html"
  });
});


// ===== SPEC195 membership lifecycle persistence =====
async function persistMembershipBySubscription(sub){
  if(!sub?.id)return;
  const customerId=typeof sub.customer==="string"?sub.customer:sub.customer?.id;
  const periodEnd=sub.current_period_end?new Date(sub.current_period_end*1000):null;
  await pool.query(`
    UPDATE membership_accounts SET
      stripe_customer_id=COALESCE($1,stripe_customer_id),
      stripe_subscription_id=$2,
      subscription_status=$3,
      current_period_end=$4,
      cancel_at_period_end=$5,
      updated_at=NOW()
    WHERE stripe_subscription_id=$2 OR stripe_customer_id=$1
  `,[customerId||null,sub.id,String(sub.status||"inactive"),periodEnd,!!sub.cancel_at_period_end]);
}
async function linkMembershipSession(sessionKey,customerId,subscriptionId,status="active"){
  if(!sessionKey)return;
  await pool.query(`INSERT INTO visitor_accounts(session_key) VALUES($1) ON CONFLICT DO NOTHING`,[sessionKey]);
  await pool.query(`
    INSERT INTO membership_accounts(session_key,stripe_customer_id,stripe_subscription_id,subscription_status,updated_at)
    VALUES($1,$2,$3,$4,NOW())
    ON CONFLICT(session_key) DO UPDATE SET stripe_customer_id=EXCLUDED.stripe_customer_id,
      stripe_subscription_id=EXCLUDED.stripe_subscription_id,subscription_status=EXCLUDED.subscription_status,updated_at=NOW()
  `,[sessionKey,customerId||null,subscriptionId||null,status]);
}

app.get("/api/readiness",async(_req,res)=>{
  const checks={database:false,stripeConfigured:!!process.env.STRIPE_SECRET_KEY,webhookConfigured:!!process.env.STRIPE_WEBHOOK_SECRET,
    publicBaseUrlConfigured:!!process.env.PUBLIC_BASE_URL,r2Configured:!!(process.env.R2_ACCOUNT_ID&&process.env.R2_BUCKET_NAME)};
  try{await pool.query("SELECT 1");checks.database=true}catch(_){}
  const critical=checks.database;
  res.status(critical?200:503).json({ok:critical,spec:"SPEC_V1_195_FREEZE",checks});
});


// ===== SPEC195 live-route compatibility =====
app.post("/api/create-subscription-checkout", requireSameOrigin, async (req,res)=>{
  // Compatibility endpoint for the SPEC195 purchase-confirm UI.
  // Uses the same server-fixed ¥490 Stripe construction as the live subscription route.
  if (!stripe) return res.status(503).json({ error:"Stripe is not configured yet." });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error:"Database is not configured." });
  const sid=await touchAccount(req,res);
  const membershipId=`MB-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  await pool.query(`INSERT INTO memberships(id,status) VALUES($1,'pending')`,[membershipId]);
  const session=await stripe.checkout.sessions.create({
    mode:"subscription",
    line_items:[{price_data:{currency:"jpy",unit_amount:490,recurring:{interval:"month"},
      product_data:{name:"総合占い プレミアム会員"}},quantity:1}],
    success_url:`${baseUrl}/membership-success.html?membership_id=${encodeURIComponent(membershipId)}`,
    cancel_url:`${baseUrl}/checkout-confirm.html?product=membership`,
    subscription_data:{metadata:{membershipId,accountSession:sid}},
    metadata:{membershipId,productKey:"premium_monthly",accountSession:sid}
  });
  res.json({url:session.url,membershipId});
});


// ===== SPEC195 paid reading bridge to live orders =====
app.get("/api/my-order-reading/:orderId", privateNoStore, async(req,res)=>{
  try{
    const sid=await touchAccount(req,res),id=String(req.params.orderId||"").slice(0,120);
    const own=await pool.query(`SELECT 1 FROM account_orders WHERE session_key=$1 AND order_id=$2`,[sid,id]);
    if(!own.rowCount)return res.status(403).json({error:"not_owned"});
    const q=await pool.query(`SELECT id,status,payment_status,premium_status,premium_reading,reading,paid_at
      FROM orders WHERE id=$1 LIMIT 1`,[id]);
    if(!q.rowCount)return res.sendStatus(404);
    const o=q.rows[0],paid=String(o.payment_status||o.status||"").toLowerCase()==="paid";
    if(!paid)return res.status(403).json({error:"payment_required"});
    res.json({paid:true,order:{id:o.id,premium_status:o.premium_status,paid_at:o.paid_at},
      reading:o.premium_reading||o.reading||null});
  }catch(e){console.error(e);res.status(500).json({error:"reading_read_failed"})}
});


app.post("/api/my-customer-portal",requireSameOrigin,requireCsrf,async(req,res)=>{
  try{
    if(!stripe)return res.status(503).json({error:"Stripe is not configured yet."});
    const sid=await touchAccount(req,res);
    const q=await pool.query(`SELECT stripe_customer_id,subscription_status FROM membership_accounts WHERE session_key=$1 LIMIT 1`,[sid]);
    const m=q.rows[0];
    if(!m?.stripe_customer_id)return res.status(404).json({error:"membership_customer_not_found"});
    const portal=await stripe.billingPortal.sessions.create({
      customer:m.stripe_customer_id,
      return_url:`${baseUrl}/mypage.html`
    });
    res.json({url:portal.url,status:m.subscription_status});
  }catch(e){console.error(e);res.status(500).json({error:"portal_failed"})}
});
