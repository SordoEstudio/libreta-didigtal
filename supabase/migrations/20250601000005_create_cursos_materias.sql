CREATE TABLE cursos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  año_lectivo_id  UUID NOT NULL REFERENCES años_lectivos(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  nivel           TEXT,
  turno           TEXT,
  escala_id       UUID REFERENCES escalas(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_cursos_institucion
  ON cursos(institucion_id, año_lectivo_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER cursos_updated_at
  BEFORE UPDATE ON cursos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE materias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  curso_id        UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  escala_id       UUID REFERENCES escalas(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_materias_curso
  ON materias(curso_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER materias_updated_at
  BEFORE UPDATE ON materias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE materia_docentes (
  materia_id      UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  persona_id      UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (materia_id, persona_id)
);
