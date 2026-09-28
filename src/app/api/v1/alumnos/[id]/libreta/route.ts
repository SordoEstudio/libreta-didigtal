import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { id: alumno_id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()

  const supabase = await createClient()
  const { data: alumno } = await supabase
    .from('alumnos')
    .select('id, nombre, curso_id, institucion_id')
    .eq('id', alumno_id)
    .is('deleted_at', null)
    .single()

  if (!alumno) return Err.notFound()
  if (!isSuperadmin(session) && !hasAnyRole(session, alumno.institucion_id, ['admin', 'docente', 'responsable']))
    return Err.forbidden()

  const periodo_id = request.nextUrl.searchParams.get('periodo_id')

  const { data: notas, error } = await supabase
    .from('notas')
    .select(`
      id, valor_numerico, valor_literal, observacion, created_at,
      evaluaciones(id, nombre, peso, tipo, periodo_id,
        materias(id, nombre)
      )
    `)
    .eq('alumno_id', alumno_id)
    .is('deleted_at', null)

  if (error) return Err.server(error.message)

  type Evaluacion = {
    id: string; nombre: string; peso: number; tipo: string; periodo_id: string
    materias: { id: string; nombre: string } | null
  }
  type NotaRow = typeof notas extends Array<infer T> ? T : never

  const filteredNotas = periodo_id
    ? notas.filter(n => (n.evaluaciones as Evaluacion | null)?.periodo_id === periodo_id)
    : notas

  const materiaMap = new Map<string, { id: string; nombre: string; notas: NotaRow[] }>()

  for (const nota of filteredNotas) {
    const ev = nota.evaluaciones as Evaluacion | null
    if (!ev?.materias) continue
    const mat = ev.materias
    if (!materiaMap.has(mat.id)) {
      materiaMap.set(mat.id, { id: mat.id, nombre: mat.nombre, notas: [] })
    }
    materiaMap.get(mat.id)!.notas.push(nota)
  }

  const libreta = Array.from(materiaMap.values()).map(mat => ({
    materia_id: mat.id,
    materia_nombre: mat.nombre,
    notas: mat.notas.map(n => ({
      nota_id: n.id,
      valor_numerico: n.valor_numerico,
      valor_literal: n.valor_literal,
      observacion: n.observacion,
      evaluacion: n.evaluaciones,
    })),
  }))

  return ok({ alumno, libreta })
}
