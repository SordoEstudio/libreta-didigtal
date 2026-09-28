import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

const PatchSchema = z.object({
  nombre: z.string().min(1).optional(),
  escala_id: z.string().uuid().nullable().optional(),
  docentes_ids: z.array(z.string().uuid()).optional(),
}).strict()

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: materia } = await supabase
    .from('materias')
    .select('institucion_id')
    .eq('id', id)
    .single()

  if (!materia) return Err.notFound()
  if (!isSuperadmin(session) && !hasRole(session, materia.institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const { docentes_ids, ...materiaData } = parsed.data

  if (Object.keys(materiaData).length > 0) {
    await supabase.from('materias').update(materiaData).eq('id', id)
  }

  if (docentes_ids !== undefined) {
    await supabase.from('materia_docentes').delete().eq('materia_id', id)
    if (docentes_ids.length > 0) {
      await supabase.from('materia_docentes').insert(
        docentes_ids.map(persona_id => ({
          materia_id: id,
          persona_id,
          institucion_id: materia.institucion_id,
        }))
      )
    }
  }

  const { data, error } = await supabase
    .from('materias')
    .select('id, nombre, escala_id')
    .eq('id', id)
    .single()

  if (error) return Err.server(error.message)
  return ok(data)
}
