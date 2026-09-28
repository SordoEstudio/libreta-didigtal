import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('instituciones')
      .select('id', { head: true, count: 'exact' })

    if (error) {
      return NextResponse.json({ status: 'error', db: error.message }, { status: 503 })
    }

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ status: 'error', db: String(err) }, { status: 503 })
  }
}
