import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
    try {
        const adminClient = createAdminClient()

        // Leer el id del body
        const { id } = await request.json()

        // Validar que el ID esté presente
        if (!id) {
            console.warn('DELETE /api/militante/eliminar - ID faltante')
            return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
        }

        console.log('🔍 Eliminando militante con ID:', id)

        // Eliminar militante usando el cliente administrativo
        const { error: deleteError } = await adminClient
            .from('militantes')
            .delete()
            .eq('id', id)

        if (deleteError) {
            console.error('Error eliminando militante:', deleteError)
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        console.log('✅ Militante eliminado exitosamente')
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error en DELETE /api/militante/eliminar:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}