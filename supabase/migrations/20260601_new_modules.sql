-- Módulo de suscripciones de contenido (tipo Patreon)
CREATE TABLE IF NOT EXISTS creators (
  wallet_address       TEXT PRIMARY KEY,
  display_name         TEXT,
  slug                 TEXT UNIQUE,
  bio                  TEXT,
  storage_account      TEXT,
  storage_gb           NUMERIC(20,6) DEFAULT 0,
  monthly_volume_usdc  NUMERIC(20,6) DEFAULT 0,
  current_plan         TEXT DEFAULT 'launch',
  plan_price_usdc      NUMERIC(10,2) DEFAULT 29,
  subscribers_count    INTEGER DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creator_subscriptions (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  creator_wallet    TEXT NOT NULL REFERENCES creators(wallet_address),
  subscriber_wallet TEXT NOT NULL,
  usdc_per_month    NUMERIC(10,2) NOT NULL,
  started_at        TIMESTAMPTZ DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  solana_tx_hash    TEXT,
  auto_renew        BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS creator_content (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  creator_wallet  TEXT NOT NULL REFERENCES creators(wallet_address),
  title           TEXT NOT NULL,
  description     TEXT,
  shadow_url      TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  is_premium      BOOLEAN DEFAULT FALSE,
  thumbnail_url   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Vault personal
CREATE TABLE IF NOT EXISTS vault_accounts (
  wallet_address  TEXT PRIMARY KEY,
  storage_gb      NUMERIC(20,6) DEFAULT 0,
  storage_used_gb NUMERIC(20,6) DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  renewal_reserve NUMERIC(20,6) DEFAULT 0,
  shadow_account  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vault_files (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_wallet    TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  shadow_url      TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_type       TEXT NOT NULL,
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Reserva de renovación por issuer
ALTER TABLE issuers
  ADD COLUMN IF NOT EXISTS renewal_reserve_usdc  NUMERIC(20,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_expires_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_purchased_gb  NUMERIC(20,6) DEFAULT 0;
