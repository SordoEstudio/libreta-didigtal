-- Custom Access Token Hook: enriquece JWT con membresías al login
-- Configurar en: Authentication → Hooks → Custom Access Token Hook
-- Function: public.custom_access_token_hook

CREATE OR REPLACE FUNCTION custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  persona_record RECORD;
  memberships_data JSONB;
BEGIN
  claims := event -> 'claims';

  SELECT p.id, p.nombre, p.email
  INTO persona_record
  FROM personas p
  WHERE p.auth_id = (event ->> 'user_id')::UUID;

  IF persona_record IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', jsonb_build_object(
      'persona_id', null,
      'memberships', '[]'::JSONB,
      'sin_institucion', true
    ));
    RETURN jsonb_set(event, '{claims}', claims);
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'institucion_id', m.institucion_id,
    'rol', m.rol
  ))
  INTO memberships_data
  FROM memberships m
  WHERE m.persona_id = persona_record.id
    AND m.activo = true;

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
