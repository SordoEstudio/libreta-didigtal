import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { ok, Err } from '@/lib/api'

export async function PATCH(_req: NextRequest) {
  const session = await getSession()
  if (!session) return Err.unauthorized()
  if (!session.persona_id) return Err.forbidden()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notificaciones')
    .update({ leido: true })
    .eq('persona_id', session.persona_id)
    .eq('leido', false)
    .select('id')

  if (error) return Err.server(error.message)
  return ok({ marcadas: data.length })
}
