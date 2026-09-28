-- Enable RLS on all tables
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

-- Helper: get persona_id from auth.uid()
CREATE OR REPLACE FUNCTION get_persona_id()
RETURNS UUID AS $$
  SELECT id FROM personas WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check role in institution
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

-- Helper: superadmin bypass
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE persona_id = get_persona_id()
      AND rol = 'superadmin'
      AND activo = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PERSONAS
CREATE POLICY personas_select ON personas
  FOR SELECT USING (id = get_persona_id() OR is_superadmin());

CREATE POLICY personas_update ON personas
  FOR UPDATE USING (id = get_persona_id());

-- INSTITUCIONES
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
  FOR UPDATE USING (is_superadmin() OR has_role(id, 'admin'));

-- MEMBERSHIPS
CREATE POLICY memberships_select ON memberships
  FOR SELECT USING (
    persona_id = get_persona_id()
    OR is_superadmin()
    OR has_role(institucion_id, 'admin')
  );

CREATE POLICY memberships_insert ON memberships
  FOR INSERT WITH CHECK (is_superadmin() OR has_role(institucion_id, 'admin'));

CREATE POLICY memberships_update ON memberships
  FOR UPDATE USING (is_superadmin() OR has_role(institucion_id, 'admin'));

-- AÑOS LECTIVOS, PERÍODOS, ESCALAS
CREATE POLICY años_lectivos_tenant ON años_lectivos
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['superadmin', 'admin', 'docente', 'responsable'])
    OR is_superadmin()
  )
  WITH CHECK (has_any_role(institucion_id, ARRAY['admin']) OR is_superadmin());

CREATE POLICY periodos_tenant ON periodos
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['superadmin', 'admin', 'docente', 'responsable'])
    OR is_superadmin()
  )
  WITH CHECK (has_any_role(institucion_id, ARRAY['admin']) OR is_superadmin());

CREATE POLICY escalas_tenant ON escalas
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['superadmin', 'admin', 'docente', 'responsable'])
    OR is_superadmin()
  )
  WITH CHECK (is_superadmin() OR has_role(institucion_id, 'admin'));

CREATE POLICY escala_valores_tenant ON escala_valores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM escalas e
      WHERE e.id = escala_valores.escala_id
        AND (has_any_role(e.institucion_id, ARRAY['admin', 'docente', 'responsable'])
             OR is_superadmin())
    )
  );

-- CURSOS
CREATE POLICY cursos_tenant ON cursos
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['admin', 'docente', 'responsable'])
    OR is_superadmin()
  )
  WITH CHECK (has_role(institucion_id, 'admin') OR is_superadmin());

-- MATERIAS
CREATE POLICY materias_tenant ON materias
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['admin', 'docente', 'responsable'])
    OR is_superadmin()
  )
  WITH CHECK (has_role(institucion_id, 'admin') OR is_superadmin());

CREATE POLICY materia_docentes_select ON materia_docentes
  FOR SELECT USING (
    persona_id = get_persona_id()
    OR has_role(institucion_id, 'admin')
    OR is_superadmin()
  );

CREATE POLICY materia_docentes_write ON materia_docentes
  FOR INSERT WITH CHECK (has_role(institucion_id, 'admin') OR is_superadmin());

-- ALUMNOS
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
  FOR INSERT WITH CHECK (has_role(institucion_id, 'admin') OR is_superadmin());

CREATE POLICY alumnos_update ON alumnos
  FOR UPDATE USING (has_role(institucion_id, 'admin') OR is_superadmin());

-- NOTAS
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
  FOR SELECT USING (has_role(institucion_id, 'admin') OR is_superadmin());

CREATE POLICY notas_docente_select ON notas
  FOR SELECT USING (docente_id = get_persona_id());

CREATE POLICY notas_responsable_select ON notas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM alumno_responsables ar
      WHERE ar.alumno_id = notas.alumno_id
        AND ar.persona_id = get_persona_id()
    )
  );

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

-- NOTIFICACIONES
CREATE POLICY notificaciones_own ON notificaciones
  FOR ALL USING (persona_id = get_persona_id());

CREATE POLICY notificaciones_admin_select ON notificaciones
  FOR SELECT USING (has_role(institucion_id, 'admin') OR is_superadmin());
