# 00 · Setup de Infraestructura
**Libreta Digital SaaS** · Harvi Digital · v1.0

---

## Prerequisitos

```bash
node >= 18.0.0
npm >= 9.0.0
git
Docker Desktop (activo para Supabase CLI local)
```

Instalar herramientas globales:

```bash
npm install -g supabase        # Supabase CLI
npm install -g vercel          # Vercel CLI
```

---

## 1. Estructura del repositorio

```bash
# Crear repo y estructura base
mkdir libreta-digital && cd libreta-digital
git init

# Crear proyecto Next.js
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

# Instalar dependencias principales
npm install @supabase/supabase-js @supabase/ssr
npm install resend react-email
npm install zod
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge
npm install lucide-react

# Dependencias de dev
npm install -D @types/node
```

Estructura de carpetas a crear manualmente:

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── cursos/
│   │   ├── alumnos/
│   │   ├── materias/
│   │   ├── notas/
│   │   ├── libreta/
│   │   └── layout.tsx
│   ├── (superadmin)/
│   │   ├── instituciones/
│   │   ├── configuracion/
│   │   └── layout.tsx
│   └── api/
│       ├── auth/
│       ├── instituciones/
│       ├── cursos/
│       ├── alumnos/
│       ├── notas/
│       └── notificaciones/
├── components/
│   ├── ui/
│   ├── layout/
│   └── features/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Cliente browser
│   │   ├── server.ts          # Cliente server (SSR)
│   │   └── middleware.ts      # Helper para middleware
│   ├── auth.ts                # Membership resolver y helpers
│   ├── email.ts               # Resend helpers
│   └── validations/
│       ├── auth.ts
│       ├── cursos.ts
│       ├── alumnos.ts
│       └── notas.ts
├── middleware.ts
└── types/
    └── index.ts
supabase/
├── migrations/                # Archivos SQL versionados
├── seed.sql                   # Datos iniciales (superadmin, escalas base)
└── config.toml
```

---

## 2. Supabase: Crear proyectos cloud

### 2.1 Crear proyectos en supabase.com

Ir a [supabase.com](https://supabase.com) y crear **dos proyectos**:

| Proyecto | Nombre sugerido | Región | Uso |
|---|---|---|---|
| Staging | `libreta-digital-staging` | South America (São Paulo) | Testing y QA |
| Producción | `libreta-digital-prod` | South America (São Paulo) | Clientes reales |

### 2.2 Guardar credenciales de cada proyecto

Para cada proyecto, ir a **Settings → API** y copiar:

```bash
# STAGING
STAGING_SUPABASE_URL=https://xxxx.supabase.co
STAGING_SUPABASE_ANON_KEY=eyJ...
STAGING_SUPABASE_SERVICE_ROLE_KEY=eyJ...

# PRODUCCIÓN
PROD_SUPABASE_URL=https://yyyy.supabase.co
PROD_SUPABASE_ANON_KEY=eyJ...
PROD_SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Guardar en un gestor de contraseñas (1Password, Bitwarden). **Nunca commitear al repo.**

---

## 3. Supabase CLI: entorno local

### 3.1 Inicializar Supabase en el proyecto

```bash
# Desde la raíz del proyecto
supabase init

# Vincular con el proyecto de staging (se usa staging como referencia del cloud)
supabase link --project-ref <staging-project-ref>
# El project-ref está en Settings → General de Supabase
```

### 3.2 Configurar `supabase/config.toml`

```toml
# supabase/config.toml
[api]
port = 54321

[db]
port = 54322
major_version = 15

[studio]
port = 54323
enabled = true

[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
jwt_expiry = 3600
enable_signup = true

[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
redirect_uri = "http://localhost:54321/auth/v1/callback"
```

### 3.3 Levantar entorno local

```bash
# Levantar todos los servicios (PostgreSQL, Auth, Storage, Studio)
supabase start

# Output esperado:
# API URL: http://localhost:54321
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# Studio URL: http://localhost:54323
# Anon key: eyJ...
# Service role key: eyJ...
```

El Studio local (http://localhost:54323) permite ver y editar datos como en el dashboard de Supabase cloud.

### 3.4 Variables de entorno locales

Crear `.env.local` en la raíz (ya está en `.gitignore` por Next.js):

```bash
# .env.local

# Supabase local (valores del output de `supabase start`)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # anon key local
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # service role local

# Google OAuth (ver sección 5)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Resend
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. Vercel: Configuración de proyecto

### 4.1 Crear proyecto en Vercel

```bash
# Login y deploy inicial
vercel login
vercel

# Seguir el wizard:
# - Link to existing project? No
# - Project name: libreta-digital
# - Framework: Next.js
# - Root directory: ./
```

### 4.2 Configurar entornos en Vercel dashboard

En **Settings → Environment Variables**, cargar las variables separadas por entorno:

**Preview (staging):**
```bash
NEXT_PUBLIC_SUPABASE_URL        = https://xxxx.supabase.co   [Preview]
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJ...                     [Preview]
SUPABASE_SERVICE_ROLE_KEY       = eyJ...                     [Preview]
RESEND_API_KEY                  = re_...                     [Preview]
NEXT_PUBLIC_APP_URL             = https://staging.libretadigital.com  [Preview]
```

**Production:**
```bash
NEXT_PUBLIC_SUPABASE_URL        = https://yyyy.supabase.co   [Production]
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJ...                     [Production]
SUPABASE_SERVICE_ROLE_KEY       = eyJ...                     [Production]
RESEND_API_KEY                  = re_...                     [Production]
NEXT_PUBLIC_APP_URL             = https://libretadigital.com [Production]
```

### 4.3 Workflow de deploy

```
Branch main      → deploy automático a Production
Branch staging   → deploy automático a Preview (staging URL)
Pull Requests    → preview environment por PR (URL única por PR)
```

Configurar en Vercel → Settings → Git:
- Production branch: `main`
- Preview branches: `staging`, `develop`

---

## 5. Google OAuth: Configuración

### 5.1 Google Cloud Console

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto: `Libreta Digital`
3. Ir a **APIs & Services → Credentials**
4. Crear **OAuth 2.0 Client ID** (tipo: Web application)
5. Configurar:

```
Nombre: Libreta Digital
URIs de origen autorizados:
  - http://localhost:3000
  - https://staging.libretadigital.com
  - https://libretadigital.com

URIs de redireccionamiento autorizados:
  - http://localhost:54321/auth/v1/callback       (local Supabase)
  - https://xxxx.supabase.co/auth/v1/callback    (staging Supabase)
  - https://yyyy.supabase.co/auth/v1/callback    (prod Supabase)
```

6. Copiar `Client ID` y `Client Secret`

### 5.2 Configurar en Supabase (staging y prod)

En cada proyecto Supabase → **Authentication → Providers → Google**:

```
Enable Google provider: ON
Client ID: <del paso anterior>
Client Secret: <del paso anterior>
```

### 5.3 Configurar en Supabase local

Agregar al `.env.local`:

```bash
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

El `config.toml` ya los referencia con `env(GOOGLE_CLIENT_ID)`.

---

## 6. Configurar redirect URLs en Supabase

En cada proyecto Supabase → **Authentication → URL Configuration**:

```
Site URL:
  staging: https://staging.libretadigital.com
  prod:    https://libretadigital.com

Redirect URLs (adicionales):
  https://staging.libretadigital.com/auth/callback
  https://libretadigital.com/auth/callback
  http://localhost:3000/auth/callback
```

---

## 7. Workflow de migraciones

### Regla fundamental
**Nunca editar la base de datos directamente desde el dashboard en staging o prod.**
Toda modificación de esquema va en un archivo de migración.

```bash
# Crear nueva migración
supabase migration new <nombre_descriptivo>
# Crea: supabase/migrations/YYYYMMDDHHMMSS_nombre_descriptivo.sql

# Aplicar migraciones localmente
supabase db push

# Aplicar a staging
supabase db push --linked
# (requiere estar vinculado al proyecto de staging con `supabase link`)

# Para aplicar a prod: vincular temporalmente al proyecto prod
supabase link --project-ref <prod-project-ref>
supabase db push --linked
supabase link --project-ref <staging-project-ref>  # volver a staging
```

### Orden de migraciones (ver doc 01-schema-sql.md)

```
20250601000001_create_instituciones.sql
20250601000002_create_personas_memberships.sql
20250601000003_create_años_lectivos_periodos.sql
20250601000004_create_escalas.sql
20250601000005_create_cursos_materias.sql
20250601000006_create_alumnos.sql
20250601000007_create_evaluaciones_notas.sql
20250601000008_create_notificaciones.sql
20250601000009_rls_policies.sql
20250601000010_auth_hooks.sql
```

---

## 8. Clientes Supabase en Next.js

### 8.1 Cliente browser (`src/lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 8.2 Cliente server (`src/lib/supabase/server.ts`)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

### 8.3 Cliente middleware (`src/lib/supabase/middleware.ts`)

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
```

---

## 9. Verificación del setup

Checklist antes de empezar a escribir código de negocio:

```bash
# 1. Supabase local levantado
supabase status
# ✓ API running: http://localhost:54321
# ✓ DB running: postgresql://...

# 2. Migraciones aplicadas localmente
supabase db push
# ✓ Applying migration...

# 3. Next.js corre sin errores
npm run dev
# ✓ http://localhost:3000

# 4. Variables de entorno cargadas
# Verificar en http://localhost:3000/api/health (crear route básica de health check)

# 5. Google OAuth funciona en local
# Ir a http://localhost:3000/login → "Continuar con Google" → debe redirigir a Google
```

### Route de health check (`src/app/api/health/route.ts`)

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()

  try {
    const { error } = await supabase.from('instituciones').select('count').single()
    return NextResponse.json({
      status: 'ok',
      db: error ? 'error' : 'connected',
      timestamp: new Date().toISOString()
    })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
```

---

## 10. Comandos de referencia rápida

```bash
# Dev
npm run dev                          # Next.js en localhost:3000
supabase start                       # Servicios locales Supabase
supabase stop                        # Detener servicios locales
supabase studio                      # Abrir Studio en browser

# Migraciones
supabase migration new <nombre>      # Nueva migración
supabase db push                     # Aplicar localmente
supabase db push --linked            # Aplicar al cloud vinculado
supabase db diff                     # Ver diferencias no migradas
supabase db reset                    # Resetear DB local (borra todo y reaplica)

# Deploy
vercel                               # Deploy a preview
vercel --prod                        # Deploy a producción
git push origin main                 # Trigger deploy automático a prod
git push origin staging              # Trigger deploy automático a staging

# Tipos TypeScript desde schema Supabase
supabase gen types typescript --local > src/types/database.ts
```

---

*Siguiente documento: `01-schema-sql.md` — Migraciones SQL completas + RLS*
