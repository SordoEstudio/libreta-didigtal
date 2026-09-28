CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE instituciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  tipo          TEXT,
  direccion     TEXT,
  telefono      TEXT,
  email         TEXT,
  logo_url      TEXT,
  slug          TEXT UNIQUE NOT NULL,
  activa        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_instituciones_slug ON instituciones(slug)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER instituciones_updated_at
  BEFORE UPDATE ON instituciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
