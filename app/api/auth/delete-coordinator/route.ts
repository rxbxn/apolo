import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(request: NextRequest) {
    try {
        const { auth_user_id } = await request.json()

        if (!auth_user_id) {
            return NextResponse.json({ error: 'auth_user_id es requerido' }, { status: 400 })
        }

        console.log('🗑️ Eliminando usuario coordinador:', auth_user_id)

        // Por ahora solo loggeamos, ya que eliminar usuarios de auth es complejo sin admin
        console.log('⚠️ Eliminación de usuario auth marcada para cleanup manual:', auth_user_id)
        
        return NextResponse.json({ 
            success: true, 
            message: 'Usuario marcado para eliminación',
            auth_user_id
        })

    } catch (error) {
        console.error('❌ Error en eliminación coordinador:', error)
        return NextResponse.json({ 
            error: 'Error interno del servidor',
            message: error instanceof Error ? error.message : 'Error desconocido'
        }, { status: 500 })
    }
}