import { requireSession, isSuperadmin, hasAnyRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, BookOpen, Users, BookMarked } from 'lucide-react'

type Params = { params: Promise<{ slug: string }> }

export default async function InstitucionDashboardPage({ params }: Params) {
  const { slug } = await params
  const session = await requireSession()

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('id, nombre, tipo, activa')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (!inst) notFound()

  if (!isSuperadmin(session) && !hasAnyRole(session, inst.id, ['admin', 'docente', 'responsable']))
    redirect('/dashboard')

  const [cursos, alumnos, usuarios, notas] = await Promise.all([
    supabase.from('cursos').select('id', { count: 'exact', head: true }).eq('institucion_id', inst.id).is('deleted_at', null),
    supabase.from('alumnos').select('id', { count: 'exact', head: true }).eq('institucion_id', inst.id).is('deleted_at', null),
    supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('institucion_id', inst.id).eq('activo', true),
    supabase.from('notas').select('id', { count: 'exact', head: true }).eq('institucion_id', inst.id).is('deleted_at', null),
  ])

  const stats = [
    { label: 'Cursos', value: cursos.count ?? 0, icon: BookOpen },
    { label: 'Alumnos', value: alumnos.count ?? 0, icon: GraduationCap },
    { label: 'Usuarios', value: usuarios.count ?? 0, icon: Users },
    { label: 'Notas cargadas', value: notas.count ?? 0, icon: BookMarked },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{inst.nombre}</h1>
        <p className="text-sm text-muted-foreground">{inst.tipo ?? 'Institución educativa'}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value.toLocaleString('es')}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
