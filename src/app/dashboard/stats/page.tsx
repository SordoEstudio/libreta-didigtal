import { requireSession, isSuperadmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, GraduationCap, Users, BookMarked } from 'lucide-react'

export default async function StatsPage() {
  const session = await requireSession()
  if (!isSuperadmin(session)) redirect('/dashboard')

  const admin = createAdminClient()
  const [instituciones, alumnos, personas, notas] = await Promise.all([
    admin.from('instituciones').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    admin.from('alumnos').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    admin.from('personas').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    admin.from('notas').select('id', { count: 'exact', head: true }).is('deleted_at', null),
  ])

  const stats = [
    { label: 'Instituciones', value: instituciones.count ?? 0, icon: Building2, color: 'text-blue-600' },
    { label: 'Alumnos', value: alumnos.count ?? 0, icon: GraduationCap, color: 'text-green-600' },
    { label: 'Usuarios', value: personas.count ?? 0, icon: Users, color: 'text-purple-600' },
    { label: 'Notas cargadas', value: notas.count ?? 0, icon: BookMarked, color: 'text-orange-600' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Estadísticas globales</h1>
        <p className="text-sm text-muted-foreground">Resumen del sistema</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`size-4 ${stat.color}`} />
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
