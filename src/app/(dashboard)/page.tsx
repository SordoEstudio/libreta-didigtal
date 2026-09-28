import { redirect } from 'next/navigation'
import { requireSession, isSuperadmin, getActiveInstitucion } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const session = await requireSession()

  if (isSuperadmin(session)) {
    redirect('/dashboard/instituciones')
  }

  const institucion_id = getActiveInstitucion(session)
  if (!institucion_id) {
    redirect('/sin-institucion')
  }

  const supabase = await createClient()
  const { data: inst } = await supabase
    .from('instituciones')
    .select('slug')
    .eq('id', institucion_id)
    .single()

  if (!inst?.slug) redirect('/sin-institucion')

  redirect(`/dashboard/${inst.slug}`)
}
