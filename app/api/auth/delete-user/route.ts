import { NextRequest, NextResponse } from 'next/server'
import { deleteAuthUser } from '@/lib/supabase/admin-utils'

export async function DELETE(request: NextRequest) {
    try {
        // Leer el auth_user_id del body o query params
        const { searchParams } = new URL(request.url)
        let authUserId = searchParams.get('auth_user_id') || searchParams.get('userId')
        
        if (!authUserId) {
            const body = await request.json().catch(() => ({}))
            authUserId = body.auth_user_id || body.userId
        }

        if (!authUserId) {
            return NextResponse.json({ error: 'auth_user_id es requerido' }, { status: 400 })
        }

        console.log('�️ Iniciando eliminación de usuario de Auth:', authUserId)

        // Usar la función que maneja fallbacks
        const { success, error } = await deleteAuthUser(authUserId)

        if (!success) {
            console.error('❌ Error eliminando usuario de Auth:', error?.message)
            return NextResponse.json({ 
                error: error?.message || 'Error eliminando usuario',
                type: 'auth_deletion_failed'
            }, { status: 500 })
        }

        console.log('✅ Usuario de Auth eliminado correctamente')
        
        return NextResponse.json({ 
            success: true,
            message: 'Usuario eliminado correctamente'
        })
    } catch (error) {
        console.error('❌ Error en DELETE /api/auth/delete-user:', error)
        return NextResponse.json({ 
            error: 'Error interno del servidor',
            message: error instanceof Error ? error.message : 'Error desconocido',
            type: 'internal_server_error'
        }, { status: 500 })
    }
}