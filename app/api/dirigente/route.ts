import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('API /api/dirigente received:', body)
    const { dirigente_id, coordinador_id } = body || {}

    if (!dirigente_id || !coordinador_id) {
      return NextResponse.json({ error: 'dirigente_id y coordinador_id son requeridos' }, { status: 400 })
    }

    // Insertar en la tabla public.dirigentes, pero primero verificar duplicados
    const supabase = createAdminClient()

    // Verificar si ya existe la relación dirigente-coordinador
    const { data: exists, error: existsError } = await (supabase as any)
      .from('dirigentes')
      .select('id')
      .eq('id_dirigente', dirigente_id)
      .eq('id_coordinador', coordinador_id)
      .limit(1)

    if (existsError) {
      console.error('Error verificando existencia de dirigente:', existsError)
      return NextResponse.json({ error: existsError.message || 'Error verificando existencia' }, { status: 500 })
    }

    if (exists && exists.length > 0) {
      return NextResponse.json({ error: 'La relación dirigente-coordinador ya existe' }, { status: 409 })
    }

    const { data, error } = await (supabase as any)
      .from('dirigentes')
      .insert({ id_dirigente: dirigente_id, id_coordinador: coordinador_id } as any)
      .select()

    if (error) {
      console.error('Error insertando dirigente:', error)
      return NextResponse.json({ error: error.message || 'Error insertando dirigente' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Error en API dirigente:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
