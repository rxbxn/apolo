import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configura tu conexión a Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  const { data, error } = await supabase
    .from('elementos')
    .select('*')
    .order('nombre', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
