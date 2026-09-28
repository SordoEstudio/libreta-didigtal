import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession, isSuperadmin } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

export async function GET(_req: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session)) return Err.forbidden()

  const admin = createAdminClient()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [instituciones, alumnos, personas, notas] = await Promise.all([
    admin.from('instituciones').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    admin.from('alumnos').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('activo', true),
    admin.from('personas').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    admin.from('notas').select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', startOfMonth.toISOString()),
  ])

  return ok({
    instituciones_activas: instituciones.count ?? 0,
    total_alumnos: alumnos.count ?? 0,
    total_usuarios: personas.count ?? 0,
    notas_cargadas_ultimo_mes: notas.count ?? 0,
  })
}
