import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasRole, hasAnyRole } from '@/lib/auth'
import { ok, created, Err } from '@/lib/api'

const EscalaValorSchema = z.object({
  codigo: z.string().min(1),
  descripcion: z.string().optional(),
  orden: z.number().int(),
})

const CreateSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('numerica'),
    nombre: z.string().min(1),
    min_valor: z.number(),
    max_valor: z.number(),
  }),
  z.object({
    tipo: z.literal('literal'),
    nombre: z.string().min(1),
    valores: z.array(EscalaValorSchema).min(1),
  }),
])

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: institucion_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!isSuperadmin(session) && !hasAnyRole(session, institucion_id, ['admin', 'docente']))
    return Err.forbidden()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('escalas')
    .select('id, nombre, tipo, min_valor, max_valor, activa, escala_valores(codigo, descripcion, orden)')
    .eq('institucion_id', institucion_id)
    .eq('activa', true)
    .order('nombre')

  if (error) return Err.server(error.message)

  const formatted = data.map(e => ({
    ...e,
    valores: (e.escala_valores ?? []).sort((a, b) => a.orden - b.orden),
    escala_valores: undefined,
  }))
  return ok(formatted)
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

  type NumericalData = { tipo: 'numerica'; nombre: string; min_valor: number; max_valor: number }
  type LiteralData = { tipo: 'literal'; nombre: string; valores: { codigo: string; descripcion?: string; orden: number }[] }

  const d = parsed.data as NumericalData | LiteralData
  const valores = d.tipo === 'literal' ? d.valores : undefined

  const { data: escala, error } = await supabase
    .from('escalas')
    .insert({
      nombre: d.nombre,
      tipo: d.tipo,
      min_valor: d.tipo === 'numerica' ? d.min_valor : null,
      max_valor: d.tipo === 'numerica' ? d.max_valor : null,
      institucion_id,
    })
    .select('id, nombre, tipo')
    .single()

  if (error) return Err.server(error.message)

  if (valores && valores.length > 0) {
    const { error: vError } = await supabase
      .from('escala_valores')
      .insert(valores.map(v => ({ codigo: v.codigo, descripcion: v.descripcion ?? null, orden: v.orden, escala_id: escala.id })))

    if (vError) return Err.server(vError.message)
  }

  return created(escala)
}
