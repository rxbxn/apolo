import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
    try {
        const adminClient = createAdminClient()
        
        // Leer el auth_user_id del body
        const { auth_user_id } = await request.json()

        if (!auth_user_id) {
            return NextResponse.json({ error: 'auth_user_id es requerido' }, { status: 400 })
        }

        console.log('🔥 Eliminando usuario de Auth:', auth_user_id)

        // Eliminar usuario de Auth usando el cliente administrativo
        const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(auth_user_id)

        if (authDeleteError) {
            console.error('Error eliminando usuario de Auth:', authDeleteError)
            return NextResponse.json({ error: authDeleteError.message }, { status: 500 })
        }

        console.log('✅ Usuario eliminado de Auth correctamente')
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error en DELETE /api/auth/delete-user:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}