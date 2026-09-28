import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: nota } = await supabase
    .from('notas')
    .select('id, institucion_id')
    .eq('id', id)
    .single()

  if (!nota) return Err.notFound()
  if (!isSuperadmin(session) && !hasAnyRole(session, nota.institucion_id, ['admin', 'docente'])) return Err.forbidden()

  const { data, error } = await supabase
    .from('notas_historial')
    .select('id, valor_anterior, valor_nuevo, observacion, modificado_at, docente_id, accion')
    .eq('nota_id', id)
    .order('modificado_at', { ascending: false })

  if (error) return Err.server(error.message)
  return ok(data)
}
