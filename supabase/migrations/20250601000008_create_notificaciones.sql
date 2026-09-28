CREATE TABLE notificaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  persona_id      UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,
  titulo          TEXT NOT NULL,
  contenido       TEXT,
  metadata        JSONB DEFAULT '{}',
  leido           BOOLEAN NOT NULL DEFAULT false,
  enviado_email   BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificaciones_persona
  ON notificaciones(persona_id, leido)
  WHERE leido = false;
CREATE INDEX idx_notificaciones_institucion
  ON notificaciones(institucion_id);
