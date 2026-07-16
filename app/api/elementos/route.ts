import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configura tu conexión a Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  // `gestion_elementos` reemplaza a la vieja tabla `elementos`, que no
  // tenía ningún panel de administración (nadie podía agregarle datos) —
  // ver cambios/CREAR_CATALOGOS_GESTION.sql y Configuración → Gestión
  // Gerencial.
  const { data, error } = await supabase
    .from('gestion_elementos')
    .select('*')
    .order('nombre', { ascending: true })

  if (error) {
    // Si la migración aún no se corrió, no romper el formulario.
    if (/does not exist|relation .* does not exist/i.test(error.message || '')) {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
