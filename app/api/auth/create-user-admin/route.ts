import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
        }

        console.log('🔐 Creando usuario con admin client:', email)

        // Usar admin client de Supabase (método original)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        console.log('🔍 Verificando credenciales:')
        console.log('- URL:', supabaseUrl)
        console.log('- Service Key disponible:', !!serviceKey)

        if (!serviceKey) {
            return NextResponse.json({ 
                error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado',
                type: 'no_service_key'
            }, { status: 500 })
        }

        // Crear admin client de Supabase
        const adminClient = createClient(supabaseUrl, serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        })

        console.log('🔑 Admin client creado, intentando createUser...')

        // Usar admin.createUser (método original que funcionaba)
        const { data, error } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto confirmar
            phone_confirm: true,
            user_metadata: {
                coordinator: true,
                created_via: 'admin_client',
                created_at: new Date().toISOString()
            }
        })

        if (error) {
            console.error('❌ Error en admin.createUser:', error)
            return NextResponse.json({ 
                error: `Error creando usuario: ${error.message}`,
                type: 'admin_create_failed',
                details: error
            }, { status: 400 })
        }

        if (!data.user) {
            return NextResponse.json({ 
                error: 'No se pudo crear el usuario',
                type: 'no_user_returned'
            }, { status: 500 })
        }

        console.log('✅ Usuario creado exitosamente con admin client:', data.user.id)
        
        return NextResponse.json({ 
            success: true, 
            auth_user_id: data.user.id,
            user: data.user,
            method: 'admin_client_confirmed'
        })

    } catch (error) {
        console.error('❌ Error en admin client:', error)
        return NextResponse.json({ 
            error: 'Error interno del servidor',
            message: error instanceof Error ? error.message : 'Error desconocido',
            type: 'internal_server_error'
        }, { status: 500 })
    }
}