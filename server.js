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
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;
        if (orderId && process.env.DATABASE_URL) {
          await pool.query(
            `UPDATE orders SET status='paid', stripe_session_id=$1 WHERE id=$2`,
            [session.id, orderId]
          );
        }
      }
      res.json({ received: true });
    } catch (e) {
      res.status(400).send(`Webhook Error: ${e.message}`);
    }
  }
);

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
    `INSERT INTO orders(id,status,amount,reading) VALUES($1,'pending',$2,$3)`,
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
    `SELECT id,status,amount,reading,created_at FROM orders WHERE id=$1`,
    [req.params.id]
  );
  if (!rows[0]) return res.sendStatus(404);
  const order = rows[0];
  res.json(order.status === "paid"
    ? order
    : { id: order.id, status: order.status, amount: order.amount, created_at: order.created_at });
});

initDb()
  .then(() => app.listen(port, "0.0.0.0", () => console.log(`fortune-site listening on ${port}`)))
  .catch(err => { console.error(err); process.exit(1); });
