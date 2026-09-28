# 01 · Schema SQL — Migraciones + RLS
**Libreta Digital SaaS** · Harvi Digital · v1.0

Cada sección es un archivo de migración independiente.
Ejecutar en orden. Nunca modificar migraciones ya aplicadas — crear una nueva.

---

## Migración 01 — Instituciones

**Archivo:** `supabase/migrations/20250601000001_create_instituciones.sql`

```sql
-- Extensión para UUIDs (ya activa en Supabase, incluida por completitud)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE instituciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  tipo          TEXT,
  -- 'escuela_primaria' | 'escuela_secundaria' | 'academia' | 'instituto' | 'club' | 'otro'
  direccion     TEXT,
  telefono      TEXT,
  email         TEXT,
  logo_url      TEXT,
  slug          TEXT UNIQUE NOT NULL,
  -- URL-friendly, ej: "instituto-san-martin"
  -- se usa en rutas: /app/[slug]/dashboard
  activa        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

-- Índice para búsquedas por slug (frecuente en cada request)
CREATE INDEX idx_instituciones_slug ON instituciones(slug)
  WHERE deleted_at IS NULL;

-- Trigger para updated_at automático
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
```

---

## Migración 02 — Personas y Membresías

**Archivo:** `supabase/migrations/20250601000002_create_personas_memberships.sql`

```sql
-- Tabla de perfiles extendidos (Supabase Auth gestiona credenciales)
CREATE TABLE personas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     UUID UNIQUE,
  -- Referencia a auth.users. NULL si la persona fue cargada
  -- por el admin pero aún no creó cuenta
  nombre      TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  telefono    TEXT,
  avatar_url  TEXT,
  -- Puede venir del perfil Google OAuth
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

-- ─────────────────────────────────────────────────────────

-- Vinculación persona ↔ institución con rol
CREATE TABLE memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id      UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  rol             TEXT NOT NULL,
  -- 'superadmin' | 'admin' | 'docente' | 'responsable'
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
```

---

## Migración 03 — Años lectivos y Períodos

**Archivo:** `supabase/migrations/20250601000003_create_años_lectivos_periodos.sql`

```sql
CREATE TABLE años_lectivos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  -- ej: "2026", "Ciclo 2026", "Año lectivo 2026"
  fecha_inicio    DATE,
  fecha_fin       DATE,
  activo          BOOLEAN NOT NULL DEFAULT false,
  -- solo un año activo por institución (enforced en aplicación)
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

-- ─────────────────────────────────────────────────────────

-- Períodos de evaluación (completamente libres por institución)
CREATE TABLE periodos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  año_lectivo_id  UUID NOT NULL REFERENCES años_lectivos(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  -- ej: "1er Trimestre", "Módulo A", "1er Cuatrimestre", "Ciclo Inicial"
  orden           INT NOT NULL DEFAULT 1,
  -- para ordenar en UI
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
```

---

## Migración 04 — Escalas de calificación

**Archivo:** `supabase/migrations/20250601000004_create_escalas.sql`

```sql
-- Escala de calificación por institución
CREATE TABLE escalas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  -- ej: "Numérica 1-10", "Conceptual MB/B/R/I"
  tipo            TEXT NOT NULL,
  -- 'numerica' | 'literal'
  min_valor       NUMERIC,
  -- solo para tipo numérico
  max_valor       NUMERIC,
  -- solo para tipo numérico
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

-- ─────────────────────────────────────────────────────────

-- Valores de escalas literales
CREATE TABLE escala_valores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id   UUID NOT NULL REFERENCES escalas(id) ON DELETE CASCADE,
  codigo      TEXT NOT NULL,
  -- ej: "MB", "B", "R", "I" | "A", "B", "C", "D"
  descripcion TEXT,
  -- ej: "Muy Bueno", "Bueno", "Regular", "Insuficiente"
  orden       INT NOT NULL,
  -- para ordenar de mayor a menor en UI
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT escala_valores_unique UNIQUE (escala_id, codigo)
);

CREATE INDEX idx_escala_valores_escala
  ON escala_valores(escala_id)
  ORDER BY orden;
```

---

## Migración 05 — Cursos y Materias

**Archivo:** `supabase/migrations/20250601000005_create_cursos_materias.sql`

```sql
CREATE TABLE cursos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  año_lectivo_id  UUID NOT NULL REFERENCES años_lectivos(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  -- ej: "3ro A", "Sub-15 Fútbol", "Nivel 2 Inglés", "Avanzado Piano"
  nivel           TEXT,
  turno           TEXT,
  -- 'mañana' | 'tarde' | 'noche' | null
  escala_id       UUID REFERENCES escalas(id),
  -- escala por defecto para el curso (puede sobreescribirse por materia)
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

-- ─────────────────────────────────────────────────────────

CREATE TABLE materias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  curso_id        UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  escala_id       UUID REFERENCES escalas(id),
  -- sobreescribe la escala del curso si se especifica
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

-- ─────────────────────────────────────────────────────────

-- Docentes asignados a una materia (muchos a muchos)
CREATE TABLE materia_docentes (
  materia_id      UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  persona_id      UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  -- desnormalizado para RLS
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (materia_id, persona_id)
);
```

---

## Migración 06 — Alumnos

**Archivo:** `supabase/migrations/20250601000006_create_alumnos.sql`

```sql
CREATE TABLE alumnos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  persona_id      UUID REFERENCES personas(id),
  -- NULL si el alumno no tiene cuenta (menor de edad sin acceso)
  curso_id        UUID REFERENCES cursos(id),
  nombre          TEXT NOT NULL,
  -- desnormalizado para mostrar sin join cuando persona_id es NULL
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

-- ─────────────────────────────────────────────────────────

-- Responsables vinculados a un alumno
CREATE TABLE alumno_responsables (
  alumno_id       UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  persona_id      UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  -- desnormalizado para RLS
  relacion        TEXT,
  -- 'madre' | 'padre' | 'tutor' | 'otro'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (alumno_id, persona_id)
);

CREATE INDEX idx_alumno_responsables_persona
  ON alumno_responsables(persona_id);
```

---

## Migración 07 — Evaluaciones y Notas

**Archivo:** `supabase/migrations/20250601000007_create_evaluaciones_notas.sql`

```sql
-- Evaluaciones definidas por el docente/admin para cada materia y período
CREATE TABLE evaluaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  materia_id      UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  periodo_id      UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  -- ej: "Parcial 1", "TP 3", "Exposición Oral", "Final", "Recuperatorio"
  tipo            TEXT NOT NULL,
  -- 'parcial' | 'final' | 'recuperatorio' | 'tp' | 'concepto'
  peso            NUMERIC NOT NULL DEFAULT 1,
  -- para promedio ponderado futuro
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

-- ─────────────────────────────────────────────────────────

CREATE TABLE notas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  alumno_id       UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  evaluacion_id   UUID NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
  docente_id      UUID NOT NULL REFERENCES personas(id),
  valor_numerico  NUMERIC,
  -- NULL si la escala es literal
  valor_literal   TEXT,
  -- NULL si la escala es numérica
  observacion     TEXT,
  fecha_carga     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT notas_unique UNIQUE (alumno_id, evaluacion_id),
  -- una sola nota por alumno por evaluación
  CONSTRAINT notas_valor_check
    CHECK (valor_numerico IS NOT NULL OR valor_literal IS NOT NULL)
  -- al menos un valor debe estar presente
);

CREATE INDEX idx_notas_alumno
  ON notas(alumno_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_notas_evaluacion
  ON notas(evaluacion_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_notas_institucion
  ON notas(institucion_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER notas_updated_at
  BEFORE UPDATE ON notas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────

-- Auditoría de cambios en notas
CREATE TABLE notas_historial (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id         UUID NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
  docente_id      UUID NOT NULL REFERENCES personas(id),
  valor_anterior  TEXT,
  -- serializado como string independientemente del tipo
  valor_nuevo     TEXT,
  observacion     TEXT,
  accion          TEXT NOT NULL DEFAULT 'update',
  -- 'create' | 'update' | 'delete'
  modificado_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notas_historial_nota
  ON notas_historial(nota_id);

-- Trigger automático para registrar cambios en notas
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
```

---

## Migración 08 — Notificaciones

**Archivo:** `supabase/migrations/20250601000008_create_notificaciones.sql`

```sql
CREATE TABLE notificaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  persona_id      UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,
  -- 'nueva_nota' | 'mensaje' | 'aviso'
  titulo          TEXT NOT NULL,
  contenido       TEXT,
  metadata        JSONB DEFAULT '{}',
  -- datos extra según tipo (ej: {alumno_id, materia_nombre, nota_valor})
  leido           BOOLEAN NOT NULL DEFAULT false,
  enviado_email   BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificaciones_persona
  ON notificaciones(persona_id, leido)
  WHERE leido = false;
CREATE INDEX idx_notificaciones_institucion
  ON notificaciones(institucion_id);
```

---

## Migración 09 — Políticas RLS

**Archivo:** `supabase/migrations/20250601000009_rls_policies.sql`

```sql
-- ============================================================
-- Habilitar RLS en todas las tablas de negocio
-- ============================================================

ALTER TABLE instituciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE años_lectivos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE escala_valores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE materias               ENABLE ROW LEVEL SECURITY;
ALTER TABLE materia_docentes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumno_responsables    ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_historial        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships            ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas               ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Función helper: obtener persona_id desde auth.uid()
-- ============================================================

CREATE OR REPLACE FUNCTION get_persona_id()
RETURNS UUID AS $$
  SELECT id FROM personas WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Función helper: verificar rol en institución
-- ============================================================

CREATE OR REPLACE FUNCTION has_role(inst_id UUID, required_rol TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE persona_id = get_persona_id()
      AND institucion_id = inst_id
      AND rol = required_rol
      AND activo = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_any_role(inst_id UUID, roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE persona_id = get_persona_id()
      AND institucion_id = inst_id
      AND rol = ANY(roles)
      AND activo = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Función helper: superadmin bypass
-- ============================================================

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE persona_id = get_persona_id()
      AND rol = 'superadmin'
      AND activo = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PERSONAS — ver propio perfil + superadmin ve todos
-- ============================================================

CREATE POLICY personas_select ON personas
  FOR SELECT USING (
    id = get_persona_id()
    OR is_superadmin()
  );

CREATE POLICY personas_update ON personas
  FOR UPDATE USING (id = get_persona_id());

-- ============================================================
-- INSTITUCIONES — superadmin: todo | resto: solo las suyas
-- ============================================================

CREATE POLICY instituciones_select ON instituciones
  FOR SELECT USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM memberships
      WHERE persona_id = get_persona_id()
        AND institucion_id = instituciones.id
        AND activo = true
    )
  );

CREATE POLICY instituciones_insert ON instituciones
  FOR INSERT WITH CHECK (is_superadmin());

CREATE POLICY instituciones_update ON instituciones
  FOR UPDATE USING (
    is_superadmin()
    OR has_role(id, 'admin')
  );

-- ============================================================
-- MEMBERSHIPS — superadmin y admin gestionan
-- ============================================================

CREATE POLICY memberships_select ON memberships
  FOR SELECT USING (
    persona_id = get_persona_id()
    OR is_superadmin()
    OR has_role(institucion_id, 'admin')
  );

CREATE POLICY memberships_insert ON memberships
  FOR INSERT WITH CHECK (
    is_superadmin()
    OR has_role(institucion_id, 'admin')
  );

CREATE POLICY memberships_update ON memberships
  FOR UPDATE USING (
    is_superadmin()
    OR has_role(institucion_id, 'admin')
  );

-- ============================================================
-- AÑOS LECTIVOS, PERÍODOS, ESCALAS — aislados por institución
-- ============================================================

CREATE POLICY años_lectivos_tenant ON años_lectivos
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['superadmin', 'admin', 'docente', 'responsable'])
    OR is_superadmin()
  )
  WITH CHECK (
    has_any_role(institucion_id, ARRAY['admin'])
    OR is_superadmin()
  );

CREATE POLICY periodos_tenant ON periodos
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['superadmin', 'admin', 'docente', 'responsable'])
    OR is_superadmin()
  )
  WITH CHECK (
    has_any_role(institucion_id, ARRAY['admin'])
    OR is_superadmin()
  );

CREATE POLICY escalas_tenant ON escalas
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['superadmin', 'admin', 'docente', 'responsable'])
    OR is_superadmin()
  )
  WITH CHECK (
    is_superadmin()
    OR has_role(institucion_id, 'admin')
  );

CREATE POLICY escala_valores_tenant ON escala_valores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM escalas e
      WHERE e.id = escala_valores.escala_id
        AND (has_any_role(e.institucion_id, ARRAY['admin', 'docente', 'responsable'])
             OR is_superadmin())
    )
  );

-- ============================================================
-- CURSOS — lectura: todos los roles | escritura: admin
-- ============================================================

CREATE POLICY cursos_tenant ON cursos
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['admin', 'docente', 'responsable'])
    OR is_superadmin()
  )
  WITH CHECK (
    has_role(institucion_id, 'admin')
    OR is_superadmin()
  );

-- ============================================================
-- MATERIAS — lectura: todos | escritura: admin
-- ============================================================

CREATE POLICY materias_tenant ON materias
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['admin', 'docente', 'responsable'])
    OR is_superadmin()
  )
  WITH CHECK (
    has_role(institucion_id, 'admin')
    OR is_superadmin()
  );

-- MATERIA_DOCENTES — docente ve las suyas; admin ve todas
CREATE POLICY materia_docentes_select ON materia_docentes
  FOR SELECT USING (
    persona_id = get_persona_id()
    OR has_role(institucion_id, 'admin')
    OR is_superadmin()
  );

CREATE POLICY materia_docentes_write ON materia_docentes
  FOR INSERT WITH CHECK (
    has_role(institucion_id, 'admin')
    OR is_superadmin()
  );

-- ============================================================
-- ALUMNOS — docente y admin: todos de su institución
--           responsable: solo sus alumnos vinculados
-- ============================================================

CREATE POLICY alumnos_admin_docente ON alumnos
  FOR SELECT USING (
    has_any_role(institucion_id, ARRAY['admin', 'docente'])
    OR is_superadmin()
  );

CREATE POLICY alumnos_responsable ON alumnos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM alumno_responsables ar
      WHERE ar.alumno_id = alumnos.id
        AND ar.persona_id = get_persona_id()
    )
  );

CREATE POLICY alumnos_write ON alumnos
  FOR INSERT WITH CHECK (
    has_role(institucion_id, 'admin')
    OR is_superadmin()
  );

CREATE POLICY alumnos_update ON alumnos
  FOR UPDATE USING (
    has_role(institucion_id, 'admin')
    OR is_superadmin()
  );

-- ============================================================
-- NOTAS — docente: carga y edita sus notas
--         responsable: solo lee las de sus alumnos
--         admin: lee todas
-- ============================================================

CREATE POLICY notas_docente_write ON notas
  FOR INSERT WITH CHECK (
    docente_id = get_persona_id()
    AND has_role(institucion_id, 'docente')
  );

CREATE POLICY notas_docente_update ON notas
  FOR UPDATE USING (
    docente_id = get_persona_id()
    AND has_role(institucion_id, 'docente')
  );

CREATE POLICY notas_admin_select ON notas
  FOR SELECT USING (
    has_role(institucion_id, 'admin')
    OR is_superadmin()
  );

CREATE POLICY notas_docente_select ON notas
  FOR SELECT USING (
    docente_id = get_persona_id()
  );

CREATE POLICY notas_responsable_select ON notas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM alumno_responsables ar
      WHERE ar.alumno_id = notas.alumno_id
        AND ar.persona_id = get_persona_id()
    )
  );

-- NOTAS HISTORIAL — lectura: admin y docente propietario
CREATE POLICY notas_historial_select ON notas_historial
  FOR SELECT USING (
    docente_id = get_persona_id()
    OR EXISTS (
      SELECT 1 FROM notas n
      WHERE n.id = notas_historial.nota_id
        AND has_role(n.institucion_id, 'admin')
    )
    OR is_superadmin()
  );

-- ============================================================
-- NOTIFICACIONES — cada usuario ve solo las suyas
-- ============================================================

CREATE POLICY notificaciones_own ON notificaciones
  FOR ALL USING (persona_id = get_persona_id());

CREATE POLICY notificaciones_admin_select ON notificaciones
  FOR SELECT USING (
    has_role(institucion_id, 'admin')
    OR is_superadmin()
  );
```

---

## Migración 10 — Auth Hooks

**Archivo:** `supabase/migrations/20250601000010_auth_hooks.sql`

```sql
-- ============================================================
-- Hook: cuando un usuario hace login, crear persona si no existe
-- y enriquecer el JWT con sus membresías
-- ============================================================

-- Esta función se ejecuta via Supabase Auth Hook
-- Configurar en: Authentication → Hooks → Custom Access Token Hook

CREATE OR REPLACE FUNCTION custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  persona_record RECORD;
  memberships_data JSONB;
BEGIN
  claims := event -> 'claims';

  -- Obtener persona vinculada al auth_id
  SELECT p.id, p.nombre, p.email
  INTO persona_record
  FROM personas p
  WHERE p.auth_id = (event ->> 'user_id')::UUID;

  IF persona_record IS NULL THEN
    -- Persona no existe todavía (primer login con Google de usuario no cargado)
    -- Devolver claims sin membresías
    claims := jsonb_set(claims, '{app_metadata}', jsonb_build_object(
      'persona_id', null,
      'memberships', '[]'::JSONB,
      'sin_institucion', true
    ));
    RETURN jsonb_set(event, '{claims}', claims);
  END IF;

  -- Obtener membresías activas
  SELECT jsonb_agg(jsonb_build_object(
    'institucion_id', m.institucion_id,
    'rol', m.rol
  ))
  INTO memberships_data
  FROM memberships m
  WHERE m.persona_id = persona_record.id
    AND m.activo = true;

  -- Inyectar en app_metadata del JWT
  claims := jsonb_set(claims, '{app_metadata}', jsonb_build_object(
    'persona_id', persona_record.id,
    'nombre', persona_record.nombre,
    'memberships', COALESCE(memberships_data, '[]'::JSONB),
    'sin_institucion', false
  ));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION custom_access_token_hook TO supabase_auth_admin;
```

> **⚠️ Configurar el hook en Supabase Dashboard:**
> Authentication → Hooks → Custom Access Token Hook
> Function: `public.custom_access_token_hook`

---

## Seed inicial

**Archivo:** `supabase/seed.sql`

```sql
-- Datos iniciales para desarrollo local

-- Superadmin Harvi
INSERT INTO personas (id, auth_id, nombre, email) VALUES
  ('00000000-0000-0000-0000-000000000001', null, 'Harvi Superadmin', 'admin@harvi.com');

-- Institución de prueba
INSERT INTO instituciones (id, nombre, tipo, slug) VALUES
  ('00000000-0000-0000-0000-000000000010', 'Academia Demo', 'academia', 'academia-demo');

-- Membership superadmin
INSERT INTO memberships (persona_id, institucion_id, rol) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'superadmin');

-- Año lectivo activo
INSERT INTO años_lectivos (id, institucion_id, nombre, activo) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', '2026', true);

-- Períodos de prueba
INSERT INTO periodos (institucion_id, año_lectivo_id, nombre, orden) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', '1er Trimestre', 1),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', '2do Trimestre', 2),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', '3er Trimestre', 3);

-- Escala numérica
INSERT INTO escalas (id, institucion_id, nombre, tipo, min_valor, max_valor) VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010', 'Numérica 1-10', 'numerica', 1, 10);
```

---

## Generar tipos TypeScript

Después de aplicar las migraciones, generar tipos automáticos:

```bash
supabase gen types typescript --local > src/types/database.ts
```

Este archivo se regenera cada vez que cambia el schema. No editar manualmente.

---

*Siguiente documento: `02-auth-spec.md` — Implementación completa de autenticación*
