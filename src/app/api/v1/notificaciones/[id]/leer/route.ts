import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!session.persona_id) return Err.forbidden()

  const supabase = await createClient()
  const { data: notif } = await supabase
    .from('notificaciones')
    .select('id, persona_id')
    .eq('id', id)
    .single()

  if (!notif) return Err.notFound()
  if (notif.persona_id !== session.persona_id) return Err.forbidden()

  const { data, error } = await supabase
    .from('notificaciones')
    .update({ leido: true })
    .eq('id', id)
    .select('id, leido')
    .single()

  if (error) return Err.server(error.message)
  return ok(data)
}
