CREATE TABLE personas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     UUID UNIQUE,
  nombre      TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  telefono    TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_personas_email ON personas(email)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_personas_auth_id ON personas(auth_id)
  WHERE auth_id IS NOT NULL;

CREATE TRIGGER personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id      UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  rol             TEXT NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT memberships_rol_check
    CHECK (rol IN ('superadmin', 'admin', 'docente', 'responsable')),
  CONSTRAINT memberships_unique
    UNIQUE (persona_id, institucion_id, rol)
);

CREATE INDEX idx_memberships_persona ON memberships(persona_id)
  WHERE activo = true;
CREATE INDEX idx_memberships_institucion ON memberships(institucion_id)
  WHERE activo = true;

CREATE TRIGGER memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
