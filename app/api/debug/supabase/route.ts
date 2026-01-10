import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Quick check for env vars used by createAdminClient
    const hasUrl = !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
    const hasServiceKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY)

    if (!hasUrl || !hasServiceKey) {
      return NextResponse.json({ ok: false, message: 'Missing SUPABASE env vars', hasUrl, hasServiceKey })
    }

    // Try to create admin client and run a lightweight query
    const admin = createAdminClient()
    try {
      const { data, error } = await (admin as any).from('militantes').select('id, usuario_id').limit(1)
      if (error) {
        return NextResponse.json({ ok: false, message: 'Query error', error: String(error) }, { status: 500 })
      }
      return NextResponse.json({ ok: true, message: 'connected', sample: data || [] })
    } catch (err) {
      return NextResponse.json({ ok: false, message: 'Admin query exception', error: String(err) }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'Unexpected error', error: String(err) }, { status: 500 })
  }
}
