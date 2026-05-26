-- Migration v3: public page settings for issuers
ALTER TABLE issuers
  ADD COLUMN IF NOT EXISTS page_active   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS page_headline text,
  ADD COLUMN IF NOT EXISTS page_tagline  text,
  ADD COLUMN IF NOT EXISTS page_about    text,
  ADD COLUMN IF NOT EXISTS page_cta      text;
