CREATE TABLE alumnos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  persona_id      UUID REFERENCES personas(id),
  curso_id        UUID REFERENCES cursos(id),
  nombre          TEXT NOT NULL,
  email           TEXT,
  fecha_nacimiento DATE,
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_alumnos_institucion
  ON alumnos(institucion_id)
  WHERE deleted_at IS NULL AND activo = true;
CREATE INDEX idx_alumnos_curso
  ON alumnos(curso_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER alumnos_updated_at
  BEFORE UPDATE ON alumnos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE alumno_responsables (
  alumno_id       UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  persona_id      UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  relacion        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (alumno_id, persona_id)
);

CREATE INDEX idx_alumno_responsables_persona
  ON alumno_responsables(persona_id);
