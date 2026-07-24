-- Idempotent extras that Drizzle can't express: extensions, the accent-insensitive
-- generated search column + its trigram index, and a PostGIS geography column for
-- radius queries. Applied via `pnpm db:extras` (src/scripts/apply-sql.ts) after
-- migrations. Safe to run repeatedly.

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Customers: accent-insensitive full-text search ──────────────────────────
-- `search_text` folds name + phone + address into one lowered, unaccented string
-- so a query like "nha xuong" matches "Nhà Xưởng". `unaccent(...)` must be marked
-- IMMUTABLE to be usable in a generated column, so we wrap it.

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT unaccent('unaccent', $1) $$;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (
    immutable_unaccent(lower(
      coalesce(name, '') || ' ' || coalesce(phone, '') || ' ' ||
      coalesce(alt_phone, '') || ' ' || coalesce(address, '')
    ))
  ) STORED;

CREATE INDEX IF NOT EXISTS customers_search_text_trgm_idx
  ON customers USING gin (search_text gin_trgm_ops);

-- ── Customers: geography point for radius search (route planning) ────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE WHEN lat IS NOT NULL AND lng IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS customers_geog_idx ON customers USING gist (geog);

-- ── Branches: geography point ───────────────────────────────────────────────
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE WHEN lat IS NOT NULL AND lng IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS branches_geog_idx ON branches USING gist (geog);
