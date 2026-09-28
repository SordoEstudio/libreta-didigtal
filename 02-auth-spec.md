# 02 · Auth Spec — Autenticación e implementación
**Libreta Digital SaaS** · Harvi Digital · v1.0

---

## Resumen del modelo

| Aspecto | Decisión |
|---|---|
| Proveedor | Supabase Auth |
| Métodos | Email + contraseña / Google OAuth |
| Sesión | Cookie httpOnly gestionada por Supabase SSR |
| Autorización | JWT + RLS en PostgreSQL |
| Membresías | En `app_metadata` del JWT (via Auth Hook) |

---

## 1. Middleware de protección de rutas

**Archivo:** `src/middleware.ts`

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Rutas públicas (no requieren auth)
const PUBLIC_ROUTES = [
  '/login',
  '/auth/callback',
  '/auth/error',
  '/api/health',
]

// Rutas exclusivas de superadmin
const SUPERADMIN_ROUTES = ['/superadmin']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rutas públicas: pasar sin validar
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Refrescar sesión y obtener usuario
  const { supabaseResponse, user } = await updateSession(request)

  // Sin sesión: redirigir a login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const metadata = user.app_metadata
  const memberships: Array<{ institucion_id: string; rol: string }> =
    metadata?.memberships ?? []

  // Usuario sin institución: pantalla de espera
  if (metadata?.sin_institucion && !pathname.startsWith('/sin-institucion')) {
    return NextResponse.redirect(new URL('/sin-institucion', request.url))
  }

  // Rutas superadmin: validar rol
  if (SUPERADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    const isSuperadmin = memberships.some(m => m.rol === 'superadmin')
    if (!isSuperadmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 2. Helpers de auth

**Archivo:** `src/lib/auth.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type Membership = {
  institucion_id: string
  rol: 'superadmin' | 'admin' | 'docente' | 'responsable'
}

export type SessionUser = {
  auth_id: string
  email: string
  persona_id: string | null
  nombre: string | null
  memberships: Membership[]
  sin_institucion: boolean
}

// Obtener sesión del usuario actual (server component / API route)
export async function getSession(): Promise<SessionUser | null> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return null

  const metadata = user.app_metadata

  return {
    auth_id: user.id,
    email: user.email ?? '',
    persona_id: metadata?.persona_id ?? null,
    nombre: metadata?.nombre ?? null,
    memberships: metadata?.memberships ?? [],
    sin_institucion: metadata?.sin_institucion ?? true,
  }
}

// Obtener sesión o redirigir (para server components protegidos)
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

// Verificar rol en una institución específica
export function hasRole(
  session: SessionUser,
  institucion_id: string,
  roles: Membership['rol'] | Membership['rol'][]
): boolean {
  const allowedRoles = Array.isArray(roles) ? roles : [roles]
  return session.memberships.some(
    m => m.institucion_id === institucion_id && allowedRoles.includes(m.rol)
  )
}

// Verificar si es superadmin
export function isSuperadmin(session: SessionUser): boolean {
  return session.memberships.some(m => m.rol === 'superadmin')
}

// Obtener la primera institución activa del usuario
export function getActiveInstitucion(session: SessionUser): string | null {
  const nonSuperadmin = session.memberships.find(m => m.rol !== 'superadmin')
  return nonSuperadmin?.institucion_id ?? null
}

// Requerir rol específico (para API routes)
export async function requireRole(
  institucion_id: string,
  roles: Membership['rol'] | Membership['rol'][]
): Promise<SessionUser> {
  const session = await requireSession()

  if (isSuperadmin(session)) return session

  if (!hasRole(session, institucion_id, roles)) {
    throw new Error('FORBIDDEN')
  }

  return session
}
```

---

## 3. Páginas de auth

### 3.1 Login page

**Archivo:** `src/app/(auth)/login/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Login con email + contraseña
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  // Login con Google OAuth
  async function handleGoogleLogin() {
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`,
      },
    })

    if (error) {
      setError('Error al conectar con Google')
      setLoading(false)
    }
    // Si no hay error: el browser redirige a Google automáticamente
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <h1 className="text-2xl font-semibold text-center">Libreta Digital</h1>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">o</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full border rounded py-2 flex items-center justify-center gap-2"
        >
          Continuar con Google
        </button>

        <a
          href="/auth/recuperar"
          className="block text-center text-sm text-blue-600"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </div>
    </div>
  )
}
```

### 3.2 Callback de OAuth

**Archivo:** `src/app/auth/callback/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Verificar si el usuario tiene institución vinculada
      const { data: { user } } = await supabase.auth.getUser()
      const sinInstitucion = user?.app_metadata?.sin_institucion

      if (sinInstitucion) {
        return NextResponse.redirect(`${origin}/sin-institucion`)
      }

      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
```

### 3.3 Pantalla sin institución

**Archivo:** `src/app/sin-institucion/page.tsx`

```typescript
export default function SinInstitucionPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md text-center space-y-4 p-8">
        <h1 className="text-xl font-semibold">Cuenta no vinculada</h1>
        <p className="text-gray-600">
          Tu cuenta no está vinculada a ninguna institución todavía.
          Contactá al administrador de tu institución para que te agregue al sistema.
        </p>
        <a href="/login" className="text-blue-600 text-sm">Volver al inicio</a>
      </div>
    </div>
  )
}
```

### 3.4 Logout

**Archivo:** `src/app/api/auth/logout/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!))
}
```

---

## 4. Gestión de usuarios desde el admin (server-side)

Cuando el admin carga un nuevo usuario, se usa el **service role key** para crear el usuario en Supabase Auth y la persona en la tabla `personas`.

**Archivo:** `src/app/api/usuarios/route.ts` (fragmento relevante)

```typescript
import { createClient } from '@supabase/supabase-js'

// Cliente con service role (solo server-side, NUNCA exponer al browser)
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function crearUsuario({
  nombre,
  email,
  rol,
  institucion_id,
  password,
}: {
  nombre: string
  email: string
  rol: string
  institucion_id: string
  password?: string
}) {
  const adminClient = createAdminClient()

  // 1. Verificar si la persona ya existe (puede estar en otra institución)
  const { data: existingPersona } = await adminClient
    .from('personas')
    .select('id, auth_id')
    .eq('email', email)
    .single()

  let persona_id: string

  if (existingPersona) {
    // Ya existe: solo agregar membership
    persona_id = existingPersona.id
  } else {
    // Crear usuario en Supabase Auth
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: password ?? generateTempPassword(),
      email_confirm: true,
      // Si no se provee password, el usuario deberá usar Google OAuth o recuperación
      user_metadata: { nombre },
    })

    if (authError) throw authError

    // Crear persona vinculada
    const { data: newPersona, error: personaError } = await adminClient
      .from('personas')
      .insert({ nombre, email, auth_id: authUser.user.id })
      .select('id')
      .single()

    if (personaError) throw personaError
    persona_id = newPersona.id
  }

  // Crear membership
  const { error: memberError } = await adminClient
    .from('memberships')
    .upsert({ persona_id, institucion_id, rol, activo: true })

  if (memberError) throw memberError

  return { persona_id }
}

function generateTempPassword(): string {
  return Math.random().toString(36).slice(-12) + 'A1!'
}
```

---

## 5. Uso en Server Components

```typescript
// Ejemplo: página protegida que requiere rol admin
// src/app/(app)/cursos/page.tsx

import { requireSession, hasRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function CursosPage({
  params
}: {
  params: { institucion_id: string }
}) {
  const session = await requireSession()
  // requireSession() redirige a /login si no hay sesión

  if (!hasRole(session, params.institucion_id, ['admin', 'docente'])) {
    redirect('/dashboard')
  }

  // ... resto del componente
}
```

---

## 6. Uso en API Routes

```typescript
// src/app/api/cursos/route.ts

import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const institucion_id = request.nextUrl.searchParams.get('institucion_id')

  if (!institucion_id) {
    return NextResponse.json({ error: 'institucion_id requerido' }, { status: 400 })
  }

  try {
    // Valida sesión y rol, lanza Error('FORBIDDEN') si no aplica
    await requireRole(institucion_id, ['admin', 'docente'])
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('cursos')
    .select('*')
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .order('nombre')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
```

---

## 7. Flujos completos

### Login email/contraseña

```
[Formulario] → POST auth (Supabase) → Auth Hook enriquece JWT
→ ¿memberships vacías? → /sin-institucion
→ ¿una institución? → /dashboard
→ ¿múltiples? → /seleccionar-institucion → /dashboard
```

### Login Google OAuth

```
[Click Google] → Redirect Google → Callback Supabase
→ ¿email ya en personas? → match auth_id, mismo flujo arriba
→ ¿email nuevo? → Auth Hook devuelve sin_institucion=true → /sin-institucion
```

### Acceso a ruta protegida sin sesión

```
GET /cursos → middleware detecta sin cookie → redirect /login?redirect=/cursos
→ usuario loguea → redirect a /cursos original
```

### Expiración de sesión

```
Supabase SSR refresca el token automáticamente via middleware
→ si el refresh falla (token revocado) → redirect /login
```

---

*Siguiente documento: `03-api-spec.md` — Especificación completa de endpoints*
