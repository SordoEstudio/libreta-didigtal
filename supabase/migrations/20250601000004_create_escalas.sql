CREATE TABLE escalas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  tipo            TEXT NOT NULL,
  min_valor       NUMERIC,
  max_valor       NUMERIC,
  activa          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT escalas_tipo_check
    CHECK (tipo IN ('numerica', 'literal')),
  CONSTRAINT escalas_numerica_check
    CHECK (
      (tipo = 'numerica' AND min_valor IS NOT NULL AND max_valor IS NOT NULL)
      OR tipo = 'literal'
    )
);

CREATE TRIGGER escalas_updated_at
  BEFORE UPDATE ON escalas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE escala_valores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id   UUID NOT NULL REFERENCES escalas(id) ON DELETE CASCADE,
  codigo      TEXT NOT NULL,
  descripcion TEXT,
  orden       INT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT escala_valores_unique UNIQUE (escala_id, codigo)
);

CREATE INDEX idx_escala_valores_escala
  ON escala_valores(escala_id, orden);
