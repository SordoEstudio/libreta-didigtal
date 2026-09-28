-- Datos iniciales para desarrollo local

INSERT INTO personas (id, auth_id, nombre, email) VALUES
  ('00000000-0000-0000-0000-000000000001', null, 'Harvi Superadmin', 'admin@harvi.com');

INSERT INTO instituciones (id, nombre, tipo, slug) VALUES
  ('00000000-0000-0000-0000-000000000010', 'Academia Demo', 'academia', 'academia-demo');

INSERT INTO memberships (persona_id, institucion_id, rol) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'superadmin');

INSERT INTO años_lectivos (id, institucion_id, nombre, activo) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', '2026', true);

INSERT INTO periodos (institucion_id, año_lectivo_id, nombre, orden) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', '1er Trimestre', 1),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', '2do Trimestre', 2),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', '3er Trimestre', 3);

INSERT INTO escalas (id, institucion_id, nombre, tipo, min_valor, max_valor) VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010', 'Numérica 1-10', 'numerica', 1, 10);
