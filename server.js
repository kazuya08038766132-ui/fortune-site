import express from "express";
import Stripe from "stripe";
import pg from "pg";

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3000;
const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;
const priceYen = Number(process.env.DETAIL_PRICE_YEN || 980);

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
app.use(express.json({ limit: "1mb" }));
app.use(express.static("."));
app.get("/", (_req, res) => res.sendFile("index.html", { root: process.cwd() }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

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
