import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const adminClient = createAdminClient()
        
        // Leer los datos del body
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
        }

        console.log('🔐 Creando usuario de Auth:', email)

        // Crear usuario en Auth usando el cliente administrativo
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Confirmar email automáticamente
        })

        if (authError) {
            console.error('Error creando usuario de Auth:', authError)
            return NextResponse.json({ error: authError.message }, { status: 500 })
        }

        console.log('✅ Usuario de Auth creado correctamente:', authUser.user?.id)
        
        return NextResponse.json({ 
            success: true, 
            auth_user_id: authUser.user?.id,
            user: authUser.user
        })
    } catch (error) {
        console.error('Error en POST /api/auth/create-user:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}