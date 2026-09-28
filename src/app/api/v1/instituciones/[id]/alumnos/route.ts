import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  persona_id: z.string().uuid().optional(),
  nombre: z.string().min(1),
  email: z.string().email().optional(),
  fecha_nacimiento: z.string().date().optional(),
  curso_id: z.string().uuid().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { id: institucion_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasAnyRole(session, institucion_id, ['admin', 'docente', 'responsable']))
    return Err.forbidden()

  const sp = request.nextUrl.searchParams
  const curso_id = sp.get('curso_id')
  const q = sp.get('q')
  const activo = sp.get('activo')

  const supabase = await createClient()
  let query = supabase
    .from('alumnos')
    .select('id, nombre, email, fecha_nacimiento, activo, curso_id, persona_id')
    .eq('institucion_id', institucion_id)
    .is('deleted_at', null)
    .order('nombre')

  if (curso_id) query = query.eq('curso_id', curso_id)
  if (activo !== null && activo !== undefined) query = query.eq('activo', activo === 'true')
  if (q) query = query.or(`nombre.ilike.%${q}%,email.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return Err.server(error.message)
  return ok(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id: institucion_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasRole(session, institucion_id, 'admin')) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('alumnos')
    .insert({ ...parsed.data, institucion_id })
    .select('id, nombre')
    .single()

  if (error) return Err.server(error.message)
  return created(data)
}
