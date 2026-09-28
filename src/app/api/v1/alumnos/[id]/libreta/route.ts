import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
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

  const { data: notas, error } = await supabase
    .from('notas')
    .select(`
      id, valor_numerico, valor_literal, observacion,
      evaluaciones(
        id, nombre, tipo, peso, orden, periodo_id,
        periodos(id, nombre),
        materias(id, nombre)
      )
    `)
    .eq('alumno_id', alumno_id)
    .is('deleted_at', null)

  if (error) return Err.server(error.message)

  type Periodo = { id: string; nombre: string }
  type Materia = { id: string; nombre: string }
  type Evaluacion = {
    id: string; nombre: string; tipo: string; peso: number; orden: number; periodo_id: string
    periodos: Periodo | null
    materias: Materia | null
  }

  // Nested structure: materia → periodo → evaluaciones
  const materiaMap = new Map<string, {
    materia: Materia
    periodos: Map<string, {
      periodo: Periodo
      evaluaciones: Array<{
        id: string; nombre: string; tipo: string; peso: number; orden: number
        nota: { valor_numerico: number | null; valor_literal: string | null; observacion: string | null } | null
      }>
    }>
  }>()

  for (const nota of notas ?? []) {
    const ev = nota.evaluaciones as Evaluacion | null
    if (!ev?.materias || !ev?.periodos) continue

    const mat = ev.materias
    const per = ev.periodos

    if (!materiaMap.has(mat.id)) {
      materiaMap.set(mat.id, { materia: mat, periodos: new Map() })
    }
    const materiaEntry = materiaMap.get(mat.id)!

    if (!materiaEntry.periodos.has(per.id)) {
      materiaEntry.periodos.set(per.id, { periodo: per, evaluaciones: [] })
    }
    materiaEntry.periodos.get(per.id)!.evaluaciones.push({
      id: ev.id,
      nombre: ev.nombre,
      tipo: ev.tipo,
      peso: ev.peso,
      orden: ev.orden,
      nota: {
        valor_numerico: nota.valor_numerico,
        valor_literal: nota.valor_literal,
        observacion: nota.observacion,
      },
    })
  }

  const libreta = Array.from(materiaMap.values()).map(({ materia, periodos }) => ({
    materia,
    periodos: Array.from(periodos.values()).map(({ periodo, evaluaciones }) => ({
      periodo,
      evaluaciones: evaluaciones.sort((a, b) => a.orden - b.orden),
    })),
  }))

  return ok({ alumno, libreta })
}
