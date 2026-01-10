import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'ID de persona requerido' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    
    const { data: persona, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error obteniendo persona:', error)
      return NextResponse.json(
        { error: 'Error obteniendo persona' },
        { status: 500 }
      )
    }

    if (!persona) {
      return NextResponse.json(
        { error: 'Persona no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(persona)
  } catch (error) {
    console.error('Error en API personas/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}