import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, dirigente_id, coordinador_id } = body || {}

    if (!id && !dirigente_id && !coordinador_id) {
      return NextResponse.json({ error: 'Se requiere al menos id o dirigente_id o coordinador_id' }, { status: 400 })
    }

    const admin = createAdminClient()

    let query: any = (admin as any).from('dirigentes').delete()

    if (id) {
      query = query.eq('id', id)
    } else {
      if (dirigente_id) query = query.eq('id_dirigente', dirigente_id)
      if (coordinador_id) query = query.eq('id_coordinador', coordinador_id)
    }

    const { error } = await query

    if (error) {
      console.error('Error eliminando dirigente:', error)
      return NextResponse.json({ error: error.message || 'Error eliminando dirigente' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en DELETE /api/dirigente/eliminar:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
