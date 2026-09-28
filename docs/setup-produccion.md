# Setup Producción

## Prerequisitos

- Cuenta Supabase (supabase.com)
- Cuenta Vercel (vercel.com)
- Cuenta Resend (resend.com)
- Proyecto Google Cloud (console.cloud.google.com)
- Supabase CLI: `npm i -g supabase`
- Vercel CLI: `npm i -g vercel`

---

## D1 — Supabase Cloud

### Crear proyectos

1. supabase.com → New project
   - Nombre: `libreta-staging` | Región: **South America (São Paulo)**
   - Repetir para `libreta-prod`

2. Por cada proyecto → **Settings → API** → copiar:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### Subir migraciones

```bash
# Staging
supabase link --project-ref <staging-ref>
supabase db push --linked

# Prod
supabase link --project-ref <prod-ref>
supabase db push --linked
```

### Activar Custom Access Token Hook

En **cada** proyecto (staging + prod):

1. Authentication → Hooks → **Custom Access Token**
2. Activar → seleccionar función: `public.custom_access_token_hook`
3. Guardar

> ⚠️ Sin este hook `session.persona_id` es `undefined` y todas las rutas autenticadas fallan.

### Permisos adicionales para el hook

Ejecutar en SQL Editor de cada proyecto:

```sql
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
```

---

## D2 — Google OAuth

### Google Cloud Console

1. console.cloud.google.com → seleccionar/crear proyecto
2. APIs & Services → Credentials → **Create Credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorized redirect URIs — agregar ambas:
   ```
   https://<staging-ref>.supabase.co/auth/v1/callback
   https://<prod-ref>.supabase.co/auth/v1/callback
   ```
5. Copiar **Client ID** y **Client Secret**

### Activar en Supabase

Por cada proyecto (staging + prod):

1. Authentication → Providers → **Google** → Enable
2. Pegar Client ID y Client Secret
3. Guardar

---

## D3 — Resend (email transaccional)

1. resend.com → **Domains → Add Domain** → ingresar tu dominio
2. Agregar los registros DNS indicados (MX, TXT, DKIM)
3. Esperar verificación (~5 min)
4. **API Keys → Create API Key**
   - Nombre: `libreta-prod`
   - Permission: **Sending access**
5. Copiar la key → `RESEND_API_KEY`

Variables resultantes:
```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=Libreta Digital <notificaciones@tudominio.com>
```

---

## D4 — Vercel

### Conectar repositorio

```bash
vercel link
# seleccionar equipo y crear proyecto nuevo
```

### Cargar variables de entorno

```bash
# Producción
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add RESEND_API_KEY production
vercel env add EMAIL_FROM production
vercel env add NEXT_PUBLIC_APP_URL production

# Preview (staging)
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add SUPABASE_SERVICE_ROLE_KEY preview
vercel env add RESEND_API_KEY preview
vercel env add EMAIL_FROM preview
vercel env add NEXT_PUBLIC_APP_URL preview
```

O desde el dashboard: **Project → Settings → Environment Variables**.

Valores para `NEXT_PUBLIC_APP_URL`:
- Production: `https://tudominio.com`
- Preview: `https://<proyecto>.vercel.app`

### Google OAuth redirect URI en Vercel

Agregar al Google OAuth Client:
```
https://tudominio.com/auth/callback
https://<proyecto>.vercel.app/auth/callback
```

---

## D5 — Seed superadmin en producción

### Paso 1: crear usuario en Supabase Auth

1. Supabase Dashboard → Authentication → Users → **Add user**
2. Email: tu email, generar password temporal
3. Copiar el UUID del usuario creado

### Paso 2: ejecutar seed

Editar `scripts/seed-prod.sql`:
- Reemplazar `SUPERADMIN_AUTH_UID` con el UUID copiado
- Ajustar nombre, email, institución

Ejecutar en **SQL Editor** de Supabase:
- Copiar y pegar el contenido del script (sin las directivas `\set`)
- O ejecutar via psql:
  ```bash
  psql "postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
    -f scripts/seed-prod.sql
  ```

---

## Verificación

```bash
# Health check staging
curl https://<preview-url>.vercel.app/api/health
# → {"status":"ok","db":"connected"}

# Health check prod
curl https://tudominio.com/api/health
# → {"status":"ok","db":"connected"}
```

Si `db` retorna error: verificar que las env vars apuntan al proyecto correcto.

---

## Orden de ejecución

```
D1 (Supabase) → D2 (Google OAuth) → D3 (Resend) → D4 (Vercel env) → D5 (seed) → verificación
```
