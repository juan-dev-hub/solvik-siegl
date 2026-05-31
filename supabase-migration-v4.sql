-- Migración v4 — Wallets colaboradoras (helpers) para VARDE y Studio
-- Correr en: Supabase Dashboard → SQL Editor

-- Agrega la columna helper_wallets a issuers.
-- Almacena un array de hasta 3 public keys de Solana (TEXT[]).
-- Por defecto vacío — solo los issuers VARDE/Studio pueden usarla.
ALTER TABLE issuers
  ADD COLUMN IF NOT EXISTS helper_wallets TEXT[] DEFAULT '{}';

-- Índice GIN para que la query .contains('helper_wallets', [wallet]) sea eficiente
-- (se ejecuta en cada request de emisión de certificado donde el wallet no es el dueño).
CREATE INDEX IF NOT EXISTS idx_issuers_helper_wallets
  ON issuers USING GIN (helper_wallets);
