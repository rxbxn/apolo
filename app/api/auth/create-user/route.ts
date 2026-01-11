import { NextRequest, NextResponse } from 'next/server'
import { createAuthUser } from '@/lib/supabase/admin-utils'

export async function POST(request: NextRequest) {
    try {
        // Leer los datos del body
        const { email, password, metadata } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
        }

        console.log('🔐 Iniciando creación de usuario de Auth:', email)

        // Usar la nueva función que maneja fallbacks
        const { user, error } = await createAuthUser({ 
            email, 
            password, 
            metadata 
        })

        if (error) {
            console.error('❌ Error creando usuario de Auth:', error.message)
            return NextResponse.json({ 
                error: error.message,
                type: 'auth_creation_failed'
            }, { status: 500 })
        }

        if (!user) {
            return NextResponse.json({ 
                error: 'No se pudo crear el usuario',
                type: 'no_user_returned'
            }, { status: 500 })
        }

        console.log('✅ Usuario de Auth creado correctamente:', user.id)
        
        return NextResponse.json({ 
            success: true, 
            auth_user_id: user.id,
            user: user
        })
    } catch (error) {
        console.error('❌ Error en POST /api/auth/create-user:', error)
        return NextResponse.json({ 
            error: 'Error interno del servidor',
            message: error instanceof Error ? error.message : 'Error desconocido',
            type: 'internal_server_error'
        }, { status: 500 })
    }
}