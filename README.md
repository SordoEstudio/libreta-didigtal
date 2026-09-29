# Libreta Digital

SaaS multi-tenant para gestión de libretas de calificaciones escolares.  
Desarrollado por [Harvi Digital](https://harvi.digital).

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Base de datos | Supabase (Postgres + RLS) |
| Auth | Supabase Auth (email/password, Google OAuth) |
| UI | base-ui + Tailwind v4 |
| Email | Resend + React Email |
| Deploy | Vercel |
| Tests | Vitest + Testing Library |

## Setup local

### Requisitos

- Node.js 22+
- Supabase CLI (`npm i -g supabase`)

### 1. Clonar y instalar

```bash
git clone <repo-url>
cd libreta-digital
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
# Completar con valores de tu proyecto Supabase local o cloud
```

### 3. Levantar Supabase local

```bash
supabase start
# Aplica migraciones automáticamente
```

Copiá los valores de `API URL` y `anon key` a `.env.local`.

### 4. Correr en desarrollo

```bash
npm run dev
```

App disponible en `http://localhost:3000`.

## Estructura de carpetas

```
src/
  app/
    (auth)/           # Login, registro
    api/v1/           # REST API — todas las rutas del backend
    auth/             # Callback OAuth, error page
    dashboard/        # Páginas protegidas (layout con sidebar)
    sin-institucion/  # Pantalla para usuarios sin institución asignada
  components/
    ui/               # Componentes base (button, input, select, etc.)
    app-sidebar.tsx   # Sidebar de navegación
  lib/
    auth.ts           # getSession(), requireSession(), hasRole()
    api.ts            # Helpers de respuesta HTTP (ok, created, Err)
    email.ts          # Envío de emails con Resend
    notificaciones.ts # Fire-and-forget para notificar a responsables
    supabase/         # Clientes Supabase (server, client, admin)
  emails/             # Templates React Email
  types/
    database.ts       # Tipos generados desde schema Supabase
supabase/
  migrations/         # Migraciones SQL (se aplican en orden)
```

## Variables de entorno

Ver `.env.example` para referencia completa.

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo servidor) |
| `RESEND_API_KEY` | API key de Resend para emails |
| `EMAIL_FROM` | Dirección de origen de emails |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app |

## Tests

```bash
npm test          # correr una vez
npm run test:watch  # modo watch
```

## Migraciones

Las migraciones viven en `supabase/migrations/` y se aplican en orden por timestamp.

```bash
# Aplicar en local
supabase db push

# Aplicar en producción (vía Supabase CLI)
supabase link --project-ref <prod-ref>
supabase db push --linked

# O via MCP desde Claude Code
# mcp__supabase__apply_migration
```

Nunca modificar migraciones ya aplicadas en producción. Crear una nueva.

## Deploy

El deploy es automático desde `master` vía Vercel.

Variables de entorno a configurar en Vercel > Settings > Environment Variables:
- Producción: todas las variables del `.env.example`
- Preview: puede usar el mismo proyecto Supabase o uno separado

## Roles

| Rol | Permisos |
|-----|---------|
| `superadmin` | Gestiona todas las instituciones |
| `admin` | Gestiona su institución (cursos, alumnos, usuarios) |
| `docente` | Carga notas en sus materias |
| `responsable` | Consulta libreta de sus alumnos (próximamente) |

Una persona puede tener múltiples roles en la misma institución (ej: admin + docente).
