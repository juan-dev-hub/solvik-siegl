-- ─────────────────────────────────────────────────────────────────────────────
-- Run ALL of this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: all statements use IF NOT EXISTS or OR REPLACE
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Issuers: add slug column ─────────────────────────────────────────────
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- ─── 2. Certificate verifications (view tracking) ────────────────────────────
CREATE TABLE IF NOT EXISTS certificate_verifications (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  certificate_id TEXT NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Digital products (books for sale) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS digital_products (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  issuer_wallet    TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  arweave_tx_id    TEXT UNIQUE NOT NULL,
  cover_arweave_id TEXT,
  price_usdc       BIGINT NOT NULL,        -- in microUSDC (1 USDC = 1_000_000)
  total_copies     INTEGER NOT NULL,
  sold_copies      INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. Digital licenses (purchase records) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS digital_licenses (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id     TEXT NOT NULL,
  buyer_wallet   TEXT NOT NULL,
  cnft_address   TEXT UNIQUE,
  arweave_tx_id  TEXT UNIQUE NOT NULL,
  solana_tx_hash TEXT UNIQUE NOT NULL,
  purchased_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. System config (used for contract_active flag) ────────────────────────
CREATE TABLE IF NOT EXISTS system_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Seed the contract_active key if it doesn't exist
INSERT INTO system_config (key, value)
VALUES ('contract_active', 'false')
ON CONFLICT (key) DO NOTHING;

-- ─── 6. Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_digital_products_issuer  ON digital_products(issuer_wallet);
CREATE INDEX IF NOT EXISTS idx_digital_products_active  ON digital_products(is_active);
CREATE INDEX IF NOT EXISTS idx_digital_licenses_buyer   ON digital_licenses(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_digital_licenses_product ON digital_licenses(product_id);
CREATE INDEX IF NOT EXISTS idx_cert_verifications_cert  ON certificate_verifications(certificate_id);
CREATE INDEX IF NOT EXISTS idx_cert_verifications_at    ON certificate_verifications(verified_at);

-- ─── 7. RPC functions ─────────────────────────────────────────────────────────

-- Atomically increments a wallet's credits (used by /api/credits/purchase)
CREATE OR REPLACE FUNCTION increment_credits(p_wallet TEXT, p_amount INT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE issuers
  SET credits = credits + p_amount
  WHERE wallet_address = p_wallet;
END;
$$;

-- Atomically increments sold_copies for a product (used by /api/products/[id]/purchase)
CREATE OR REPLACE FUNCTION increment_sold_copies(p_product_id TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE digital_products
  SET sold_copies = sold_copies + 1
  WHERE id = p_product_id
    AND sold_copies < total_copies;  -- guard: never exceed total
END;
$$;
