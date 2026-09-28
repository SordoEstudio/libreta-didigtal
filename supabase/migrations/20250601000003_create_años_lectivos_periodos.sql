CREATE TABLE años_lectivos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  fecha_inicio    DATE,
  fecha_fin       DATE,
  activo          BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_años_lectivos_institucion
  ON años_lectivos(institucion_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER años_lectivos_updated_at
  BEFORE UPDATE ON años_lectivos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE periodos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  año_lectivo_id  UUID NOT NULL REFERENCES años_lectivos(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  orden           INT NOT NULL DEFAULT 1,
  fecha_inicio    DATE,
  fecha_fin       DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_periodos_año_lectivo
  ON periodos(año_lectivo_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER periodos_updated_at
  BEFORE UPDATE ON periodos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
