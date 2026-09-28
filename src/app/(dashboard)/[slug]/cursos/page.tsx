import { requireSession, isSuperadmin, hasAnyRole, hasRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import NuevoCursoSheet from './nuevo-curso-sheet'

type Params = { params: Promise<{ slug: string }> }

export default async function CursosPage({ params }: Params) {
  const { slug } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, nombre')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) notFound()
  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente', 'responsable']))
    redirect('/dashboard')

  const { data: añosLectivos } = await supabase
    .from('años_lectivos')
    .select('id, nombre, activo')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('nombre', { ascending: false })

  const añoActivo = añosLectivos?.find(a => a.activo) ?? añosLectivos?.[0]

  const { data: cursos } = añoActivo
    ? await supabase
        .from('cursos')
        .select('id, nombre, nivel, turno')
        .eq('institucion_id', inst.id)
        .eq('año_lectivo_id', añoActivo.id)
        .is('deleted_at', null)
        .order('nombre')
    : { data: [] }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cursos</h1>
          <p className="text-sm text-muted-foreground">
            {añoActivo?.nombre ?? 'Sin año lectivo'} · {cursos?.length ?? 0} cursos
          </p>
        </div>
        {(isSuperadmin(session) || hasRole(session, inst.id, 'admin')) && añoActivo && (
          <NuevoCursoSheet instId={inst.id} añoLectivoId={añoActivo.id} />
        )}
      </div>

      {!añoActivo && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <BookOpen className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No hay año lectivo activo.</p>
        </div>
      )}

      {añoActivo && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cursos?.map(curso => (
            <Card key={curso.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{curso.nombre}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  {curso.nivel && <Badge variant="outline">{curso.nivel}</Badge>}
                  {curso.turno && <Badge variant="secondary">{curso.turno}</Badge>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  render={<Link href={`/dashboard/${slug}/cursos/${curso.id}`} />}
                >
                  <BookOpen data-icon="inline-start" />
                  Ver materias
                </Button>
              </CardContent>
            </Card>
          ))}

          {(!cursos || cursos.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center gap-3 py-16 text-center">
              <BookOpen className="size-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">Sin cursos para este año lectivo.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
