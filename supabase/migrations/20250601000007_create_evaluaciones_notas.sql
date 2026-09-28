CREATE TABLE evaluaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  materia_id      UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  periodo_id      UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  tipo            TEXT NOT NULL,
  peso            NUMERIC NOT NULL DEFAULT 1,
  orden           INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT evaluaciones_tipo_check
    CHECK (tipo IN ('parcial', 'final', 'recuperatorio', 'tp', 'concepto'))
);

CREATE INDEX idx_evaluaciones_materia_periodo
  ON evaluaciones(materia_id, periodo_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER evaluaciones_updated_at
  BEFORE UPDATE ON evaluaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE notas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  alumno_id       UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  evaluacion_id   UUID NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
  docente_id      UUID NOT NULL REFERENCES personas(id),
  valor_numerico  NUMERIC,
  valor_literal   TEXT,
  observacion     TEXT,
  fecha_carga     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT notas_unique UNIQUE (alumno_id, evaluacion_id),
  CONSTRAINT notas_valor_check
    CHECK (valor_numerico IS NOT NULL OR valor_literal IS NOT NULL)
);

CREATE INDEX idx_notas_alumno ON notas(alumno_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notas_evaluacion ON notas(evaluacion_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notas_institucion ON notas(institucion_id) WHERE deleted_at IS NULL;

CREATE TRIGGER notas_updated_at
  BEFORE UPDATE ON notas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE notas_historial (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id         UUID NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
  docente_id      UUID NOT NULL REFERENCES personas(id),
  valor_anterior  TEXT,
  valor_nuevo     TEXT,
  observacion     TEXT,
  accion          TEXT NOT NULL DEFAULT 'update',
  modificado_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notas_historial_nota ON notas_historial(nota_id);

CREATE OR REPLACE FUNCTION log_nota_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO notas_historial (nota_id, docente_id, valor_anterior, valor_nuevo, accion)
    VALUES (
      NEW.id,
      NEW.docente_id,
      COALESCE(OLD.valor_numerico::TEXT, OLD.valor_literal),
      COALESCE(NEW.valor_numerico::TEXT, NEW.valor_literal),
      'update'
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO notas_historial (nota_id, docente_id, valor_anterior, valor_nuevo, accion)
    VALUES (
      NEW.id,
      NEW.docente_id,
      NULL,
      COALESCE(NEW.valor_numerico::TEXT, NEW.valor_literal),
      'create'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notas_audit
  AFTER INSERT OR UPDATE ON notas
  FOR EACH ROW EXECUTE FUNCTION log_nota_change();
