export async function ensureRuntimeSchema(pool){
 const qs=[
 `CREATE TABLE IF NOT EXISTS orders(
   id TEXT PRIMARY KEY,status TEXT NOT NULL DEFAULT 'pending',amount INTEGER NOT NULL,
   reading JSONB,stripe_session_id TEXT,currency TEXT NOT NULL DEFAULT 'jpy',
   payment_status TEXT NOT NULL DEFAULT 'pending',premium_status TEXT NOT NULL DEFAULT 'locked',
   premium_reading JSONB,paid_at TIMESTAMPTZ,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
 `CREATE TABLE IF NOT EXISTS payment_events(
   stripe_event_id TEXT PRIMARY KEY,event_type TEXT NOT NULL,payload JSONB NOT NULL DEFAULT '{}'::jsonb,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
 `CREATE TABLE IF NOT EXISTS memberships(
   id TEXT PRIMARY KEY,stripe_customer_id TEXT,stripe_subscription_id TEXT UNIQUE,
   status TEXT NOT NULL DEFAULT 'pending',current_period_end TIMESTAMPTZ,
   cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
 `CREATE TABLE IF NOT EXISTS visitor_accounts(
   session_key TEXT PRIMARY KEY,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
 `CREATE TABLE IF NOT EXISTS account_orders(
   session_key TEXT NOT NULL REFERENCES visitor_accounts(session_key) ON DELETE CASCADE,
   order_id TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(session_key,order_id))`,
 `CREATE TABLE IF NOT EXISTS membership_accounts(
   session_key TEXT PRIMARY KEY REFERENCES visitor_accounts(session_key) ON DELETE CASCADE,
   stripe_customer_id TEXT,stripe_subscription_id TEXT,subscription_status TEXT NOT NULL DEFAULT 'inactive',
   current_period_end TIMESTAMPTZ,cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
 `CREATE TABLE IF NOT EXISTS consent_events(
   id BIGSERIAL PRIMARY KEY,subject_key TEXT NOT NULL,consent_type TEXT NOT NULL,accepted BOOLEAN NOT NULL,
   policy_version TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
 `CREATE INDEX IF NOT EXISTS consent_events_subject_idx ON consent_events(subject_key,created_at DESC)`,
 `CREATE TABLE IF NOT EXISTS palm_assets(
   id BIGSERIAL PRIMARY KEY,subject_key TEXT NOT NULL,storage_key TEXT NOT NULL UNIQUE,
   purpose TEXT NOT NULL DEFAULT 'reading',delete_after TIMESTAMPTZ,state TEXT NOT NULL DEFAULT 'pending_upload',
   content_type TEXT,content_length BIGINT,etag TEXT,uploaded_at TIMESTAMPTZ,deleted_at TIMESTAMPTZ,
   delete_requested_at TIMESTAMPTZ,delete_attempts INTEGER NOT NULL DEFAULT 0,delete_next_attempt_at TIMESTAMPTZ,delete_last_error TEXT,
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
 `ALTER TABLE palm_assets ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'pending_upload'`,
 `ALTER TABLE palm_assets ADD COLUMN IF NOT EXISTS retention_mode TEXT NOT NULL DEFAULT 'ephemeral'`,
 `CREATE TABLE IF NOT EXISTS palm_reading_snapshots(
   id BIGSERIAL PRIMARY KEY,asset_id BIGINT NOT NULL UNIQUE REFERENCES palm_assets(id) ON DELETE CASCADE,subject_key TEXT NOT NULL,
   reading_version TEXT NOT NULL,reading JSONB NOT NULL,reading_sha256 TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
 `ALTER TABLE palm_reading_snapshots ADD COLUMN IF NOT EXISTS reading_hash_version TEXT NOT NULL DEFAULT 'legacy-json-v1'`,
 `ALTER TABLE palm_reading_snapshots ADD COLUMN IF NOT EXISTS record_sha256 TEXT`,
 `ALTER TABLE palm_reading_snapshots ADD COLUMN IF NOT EXISTS record_hash_version TEXT NOT NULL DEFAULT 'legacy-record-v1'`,
 `CREATE INDEX IF NOT EXISTS palm_reading_snapshots_subject_idx ON palm_reading_snapshots(subject_key,created_at DESC)`,
 `ALTER TABLE palm_assets ADD COLUMN IF NOT EXISTS delete_requested_at TIMESTAMPTZ`,
 `ALTER TABLE palm_assets ADD COLUMN IF NOT EXISTS delete_attempts INTEGER NOT NULL DEFAULT 0`,
 `ALTER TABLE palm_assets ADD COLUMN IF NOT EXISTS delete_next_attempt_at TIMESTAMPTZ`,
 `ALTER TABLE palm_assets ADD COLUMN IF NOT EXISTS delete_last_error TEXT`,
 `CREATE INDEX IF NOT EXISTS palm_assets_delete_retry_idx ON palm_assets(delete_next_attempt_at) WHERE state='delete_pending'`,
 `CREATE INDEX IF NOT EXISTS palm_assets_owner_state_idx ON palm_assets(subject_key,state,created_at DESC)`,
 `CREATE TABLE IF NOT EXISTS checkout_attempts(
   request_key TEXT PRIMARY KEY,session_key TEXT NOT NULL,product_type TEXT NOT NULL,resource_id TEXT NOT NULL,
   stripe_session_id TEXT,stripe_checkout_url TEXT,state TEXT NOT NULL DEFAULT 'pending',last_error_code TEXT,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
 `CREATE INDEX IF NOT EXISTS checkout_attempts_session_idx ON checkout_attempts(session_key,created_at DESC)`,
 `CREATE TABLE IF NOT EXISTS membership_payment_events(
   id BIGSERIAL PRIMARY KEY,stripe_invoice_id TEXT NOT NULL,stripe_customer_id TEXT,stripe_subscription_id TEXT,
   event_type TEXT NOT NULL,payment_health TEXT NOT NULL,payload JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   UNIQUE(stripe_invoice_id,event_type))`,
 `CREATE TABLE IF NOT EXISTS email_provider_events(
   provider TEXT NOT NULL DEFAULT 'resend',event_id TEXT NOT NULL,event_type TEXT NOT NULL,
   provider_message_id TEXT,payload JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(provider,event_id))`
 ];
 for(const q of qs)await pool.query(q);
}
