# Setup Producción

Un solo entorno cloud. Local usa `supabase start` (Docker).

| Entorno | Supabase | Vercel |
|---------|----------|--------|
| Local | `supabase start` | `npm run dev` |
| Prod | cloud project | production deploy |

## Prerequisitos

```bash
npm i -g supabase vercel
```

- Cuenta Supabase (supabase.com)
- Cuenta Vercel (vercel.com)
- Cuenta Resend (resend.com)
- Proyecto Google Cloud (console.cloud.google.com)

---

## D1 — Supabase Cloud

### Crear proyecto

1. supabase.com → **New project**
   - Nombre: `libreta-prod`
   - Región: **South America (São Paulo)**
   - Guardar la database password

2. **Settings → API** → copiar:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### Subir migraciones

```bash
supabase link --project-ref <prod-ref>
supabase db push --linked
```

### Activar Custom Access Token Hook

1. Authentication → Hooks → **Custom Access Token**
2. Activar → función: `public.custom_access_token_hook`
3. Guardar

> ⚠️ Sin este hook `session.persona_id` es `undefined` — todas las rutas autenticadas fallan silenciosamente.

Permisos adicionales (ejecutar en SQL Editor):

```sql
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
```

---

## D2 — Google OAuth

### Google Cloud Console

1. console.cloud.google.com → proyecto → APIs & Services → Credentials
2. **Create Credentials → OAuth 2.0 Client ID** → Web application
3. Authorized redirect URIs:
   ```
   https://<prod-ref>.supabase.co/auth/v1/callback
   https://tudominio.com/auth/callback
   ```
4. Copiar **Client ID** y **Client Secret**

### Activar en Supabase

Authentication → Providers → **Google** → Enable → pegar credenciales → Save.

---

## D3 — Resend

1. resend.com → **Domains → Add Domain** → ingresar dominio
2. Agregar registros DNS (MX, TXT, DKIM) → esperar verificación (~5 min)
3. **API Keys → Create API Key** → Sending access
4. Copiar key → `RESEND_API_KEY`

```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=Libreta Digital <notificaciones@tudominio.com>
```

---

## D4 — Vercel

### Conectar repo

```bash
vercel link
```

### Variables de entorno (production)

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add RESEND_API_KEY production
vercel env add EMAIL_FROM production
vercel env add NEXT_PUBLIC_APP_URL production
# valor: https://tudominio.com
```

O desde el dashboard: **Project → Settings → Environment Variables**.

### Dominio custom (opcional)

Project → Settings → Domains → Add → seguir instrucciones DNS.

---

## D5 — Seed superadmin

### Paso 1: crear usuario en Supabase Auth

Supabase Dashboard → Authentication → Users → **Add user**
- Email: tu email
- Auto Confirm User: ✓
- Copiar el **UUID** generado

### Paso 2: ejecutar seed

Editar `scripts/seed-prod.sql` — reemplazar valores:
- `SUPERADMIN_AUTH_UID` → UUID copiado
- `SUPERADMIN_NOMBRE`, `SUPERADMIN_EMAIL`
- `INST_NOMBRE`, `INST_SLUG`

Copiar el contenido (sin las líneas `\set`) y ejecutar en **SQL Editor** de Supabase.

---

## Verificación

```bash
curl https://tudominio.com/api/health
# → {"status":"ok","db":"connected","timestamp":"..."}
```

Si `status: "error"`: verificar env vars de Supabase en Vercel.

---

## Deploy

```bash
git push origin main
# Vercel detecta push → build automático → deploy a producción
```

O manual: `vercel --prod`
