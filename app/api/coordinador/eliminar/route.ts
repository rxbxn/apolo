import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function DELETE(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)
        const adminClient = createAdminClient()

        // Leer el email del body
        const { email } = await request.json()

        // Validar que el email tenga formato válido
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email || !emailRegex.test(email)) {
            console.warn('DELETE /api/coordinador/eliminar - email inválido:', email)
            return NextResponse.json({ error: `Email no tiene formato válido: ${email}` }, { status: 400 })
        }

        // Buscar el coordinador por email para obtener el auth_user_id
        console.log('🔍 Buscando coordinador con email:', email)
        const { data: coordinador, error: findError } = await adminClient
            .from('coordinadores')
            .select('auth_user_id, id')
            .eq('email', email)
            .single()

        if (findError || !coordinador) {
            console.warn('⚠️ Coordinador no encontrado con email:', email, 'Error:', findError)
            return NextResponse.json({ error: 'Coordinador no encontrado' }, { status: 404 })
        }

        console.log('✅ Coordinador encontrado:', coordinador)

        // Eliminar coordinador usando el ID obtenido
        const { error: deleteError } = await adminClient
            .from('coordinadores')
            .delete()
            .eq('id', coordinador.id)

        if (deleteError) {
            console.error('Error eliminando coordinador:', deleteError)
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        // Eliminar usuario de Auth si existe
        if (coordinador.auth_user_id) {
            console.log('🔥 Eliminando usuario de Auth:', coordinador.auth_user_id)
            const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(coordinador.auth_user_id)

            if (authDeleteError) {
                console.error('Error eliminando usuario de Auth:', authDeleteError)
                // No fallar por esto, ya eliminamos el coordinador
            } else {
                console.log('✅ Usuario eliminado de Auth correctamente')
            }
        }

        console.log('✅ Coordinador eliminado exitosamente')
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error en DELETE /api/coordinador/eliminar:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}