import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

const PatchSchema = z.object({
  valor_numerico: z.number().optional(),
  valor_literal: z.string().optional(),
  observacion: z.string().optional(),
}).strict()

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: nota } = await supabase
    .from('notas')
    .select('id, institucion_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!nota) return Err.notFound()
  if (!isSuperadmin(session) && !hasAnyRole(session, nota.institucion_id, ['admin', 'docente'])) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { data, error } = await supabase
    .from('notas')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return Err.server(error.message)
  return ok(data)
}
