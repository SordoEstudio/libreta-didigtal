-- Seed producción: ejecutar en Supabase SQL Editor después de subir migraciones
-- PASO 1: En Supabase Auth → Users → crear usuario manualmente con tu email
-- PASO 2: Copiar el UUID generado (columna "id" en auth.users) y reemplazar AUTH_UID abajo
-- PASO 3: Ejecutar este script en SQL Editor

-- Ajustar estos valores:
\set SUPERADMIN_AUTH_UID 'REEMPLAZAR-CON-UUID-DE-AUTH.USERS'
\set SUPERADMIN_NOMBRE   'Tu Nombre'
\set SUPERADMIN_EMAIL    'tu@email.com'
\set INST_NOMBRE         'Harvi Digital'
\set INST_SLUG           'harvi-digital'

-- Institución principal
INSERT INTO instituciones (nombre, tipo, slug)
VALUES (:'INST_NOMBRE', 'academia', :'INST_SLUG')
ON CONFLICT (slug) DO NOTHING;

-- Persona superadmin vinculada al auth user
INSERT INTO personas (auth_id, nombre, email)
VALUES (:'SUPERADMIN_AUTH_UID'::UUID, :'SUPERADMIN_NOMBRE', :'SUPERADMIN_EMAIL')
ON CONFLICT (email) DO NOTHING;

-- Membership superadmin
INSERT INTO memberships (persona_id, institucion_id, rol, activo)
SELECT p.id, i.id, 'superadmin', true
FROM personas p, instituciones i
WHERE p.email = :'SUPERADMIN_EMAIL'
  AND i.slug = :'INST_SLUG'
ON CONFLICT DO NOTHING;

-- Año lectivo inicial
INSERT INTO años_lectivos (institucion_id, nombre, activo)
SELECT i.id, '2026', true
FROM instituciones i
WHERE i.slug = :'INST_SLUG'
ON CONFLICT DO NOTHING;

-- Verificar resultado
SELECT p.nombre, p.email, m.rol, i.slug
FROM personas p
JOIN memberships m ON m.persona_id = p.id
JOIN instituciones i ON i.id = m.institucion_id
WHERE p.email = :'SUPERADMIN_EMAIL';
