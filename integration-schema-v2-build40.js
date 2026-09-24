export async function ensureIntegrationSchema(pool){
 // Canonical identity/ownership tables are created by ensureBuild40Schema().
 // This migration only extends legacy palm_assets columns used by the protected R2 route layer.
 await pool.query(`ALTER TABLE palm_assets ADD COLUMN IF NOT EXISTS upload_state TEXT NOT NULL DEFAULT 'legacy_registered'`);
 await pool.query(`ALTER TABLE palm_assets ADD COLUMN IF NOT EXISTS expected_content_type TEXT`);
 await pool.query(`ALTER TABLE palm_assets ADD COLUMN IF NOT EXISTS verified_content_type TEXT`);
 await pool.query(`ALTER TABLE palm_assets ADD COLUMN IF NOT EXISTS verified_size BIGINT`);
 await pool.query(`ALTER TABLE palm_assets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
}
