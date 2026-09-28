import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession, isSuperadmin } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session)) return Err.forbidden()

  const admin = createAdminClient()

  const [instituciones, alumnos, personas, notas] = await Promise.all([
    admin.from('instituciones').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    admin.from('alumnos').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    admin.from('personas').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    admin.from('notas').select('id', { count: 'exact', head: true }).is('deleted_at', null),
  ])

  return ok({
    instituciones: instituciones.count ?? 0,
    alumnos: alumnos.count ?? 0,
    personas: personas.count ?? 0,
    notas: notas.count ?? 0,
  })
}
