-- RLS policies missing from initial setup

-- EVALUACIONES (no policies existed — blocked all access)
CREATE POLICY evaluaciones_select ON evaluaciones
  FOR SELECT USING (
    has_any_role(institucion_id, ARRAY['admin', 'docente', 'responsable'])
    OR is_superadmin()
  );

CREATE POLICY evaluaciones_write ON evaluaciones
  FOR INSERT WITH CHECK (
    has_role(institucion_id, 'admin')
    OR has_role(institucion_id, 'docente')
    OR is_superadmin()
  );

CREATE POLICY evaluaciones_update ON evaluaciones
  FOR UPDATE USING (
    has_role(institucion_id, 'admin')
    OR has_role(institucion_id, 'docente')
    OR is_superadmin()
  );

CREATE POLICY evaluaciones_delete ON evaluaciones
  FOR DELETE USING (
    has_role(institucion_id, 'admin')
    OR is_superadmin()
  );

-- ALUMNO_RESPONSABLES (no policies existed)
CREATE POLICY alumno_responsables_select ON alumno_responsables
  FOR SELECT USING (
    persona_id = get_persona_id()
    OR has_role(institucion_id, 'admin')
    OR has_role(institucion_id, 'docente')
    OR is_superadmin()
  );

CREATE POLICY alumno_responsables_write ON alumno_responsables
  FOR INSERT WITH CHECK (
    has_role(institucion_id, 'admin')
    OR is_superadmin()
  );

CREATE POLICY alumno_responsables_delete ON alumno_responsables
  FOR DELETE USING (
    has_role(institucion_id, 'admin')
    OR is_superadmin()
  );
