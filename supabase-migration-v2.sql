-- ================================================================
-- SOLVIK STUDIO v2 — Migration
-- Run in Supabase SQL Editor
-- ================================================================

-- Drop tables now handled by on-chain contract
DROP TABLE IF EXISTS subscription_plans;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS system_config;
DROP TABLE IF EXISTS credit_packages;

-- Clean legacy columns from issuers
ALTER TABLE issuers DROP COLUMN IF EXISTS credits;
ALTER TABLE issuers DROP COLUMN IF EXISTS plan;
ALTER TABLE issuers DROP COLUMN IF EXISTS plan_renewed_at;
ALTER TABLE issuers DROP COLUMN IF EXISTS plan_expires_at;

-- Add storage tracking columns
ALTER TABLE issuers
  ADD COLUMN IF NOT EXISTS storage_used_bytes  BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_limit_bytes BIGINT DEFAULT 1073741824;

-- Drop legacy attestation column
ALTER TABLE certificates DROP COLUMN IF EXISTS attestation_pda;

-- ── Core tables ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS issuers (
  wallet_address      TEXT PRIMARY KEY,
  institution_name    TEXT NOT NULL DEFAULT 'Sin nombre',
  slug                TEXT UNIQUE,
  sns_domain          TEXT,
  sns_verified        BOOLEAN DEFAULT FALSE,
  storage_used_bytes  BIGINT DEFAULT 0,
  storage_limit_bytes BIGINT DEFAULT 1073741824,
  registered_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificates (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  issuer_wallet    TEXT NOT NULL,
  arweave_tx_id    TEXT UNIQUE NOT NULL,
  cnft_address     TEXT UNIQUE,
  file_name        TEXT NOT NULL,
  file_size_bytes  INTEGER NOT NULL,
  doc_type         TEXT NOT NULL,
  issuer_name      TEXT NOT NULL,
  issued_to        TEXT NOT NULL,
  is_public        BOOLEAN DEFAULT TRUE,
  issued_at        TIMESTAMPTZ DEFAULT NOW(),
  expires_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS certificate_verifications (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  certificate_id TEXT NOT NULL,
  verified_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digital_products (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  issuer_wallet    TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  arweave_tx_id    TEXT UNIQUE NOT NULL,
  cover_arweave_id TEXT,
  price_usdc       BIGINT NOT NULL,
  total_copies     INTEGER NOT NULL,
  sold_copies      INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digital_licenses (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id     TEXT NOT NULL,
  buyer_wallet   TEXT NOT NULL,
  cnft_address   TEXT UNIQUE,
  arweave_tx_id  TEXT UNIQUE NOT NULL,
  solana_tx_hash TEXT UNIQUE NOT NULL,
  purchased_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batch_jobs (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  issuer_wallet TEXT NOT NULL,
  total_files   INTEGER NOT NULL,
  processed     INTEGER DEFAULT 0,
  succeeded     INTEGER DEFAULT 0,
  failed        INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  finished_at   TIMESTAMPTZ
);
