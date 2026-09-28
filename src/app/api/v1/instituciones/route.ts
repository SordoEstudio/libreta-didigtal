import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const CreateSchema = z.object({
  nombre: z.string().min(3),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  tipo: z.enum(['escuela_primaria', 'escuela_secundaria', 'academia', 'instituto', 'club', 'otro']).optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session)) return Err.forbidden()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('instituciones')
    .select('id, nombre, tipo, slug, activa, created_at')
    .is('deleted_at', null)
    .order('nombre')

  if (error) return Err.server(error.message)
  return ok(data)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session)) return Err.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Err.validation(parsed.error.issues[0].message)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('instituciones')
    .insert(parsed.data)
    .select('id, nombre, slug, activa, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return Err.conflict('El slug ya está en uso')
    return Err.server(error.message)
  }
  return created(data)
}
