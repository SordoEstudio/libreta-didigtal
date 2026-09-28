import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  try {
    const { error } = await supabase.from('instituciones').select('count').single()
    return NextResponse.json({
      status: 'ok',
      db: error ? 'error' : 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
