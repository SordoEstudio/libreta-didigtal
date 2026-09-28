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

export async function getSession(): Promise<SessionUser | null> {
  const supabase = await createClient()
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

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

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

export function isSuperadmin(session: SessionUser): boolean {
  return session.memberships.some(m => m.rol === 'superadmin')
}

export function hasAnyRole(
  session: SessionUser,
  institucion_id: string,
  roles: Membership['rol'][]
): boolean {
  return session.memberships.some(
    m => m.institucion_id === institucion_id && roles.includes(m.rol)
  )
}

export function getActiveInstitucion(session: SessionUser): string | null {
  const nonSuperadmin = session.memberships.find(m => m.rol !== 'superadmin')
  return nonSuperadmin?.institucion_id ?? null
}

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
