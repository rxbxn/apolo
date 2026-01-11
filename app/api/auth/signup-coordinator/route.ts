import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
        }

        console.log('🔐 Creando usuario coordinador para:', email)

        // Usar el cliente público de Supabase para signup
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Intentar signup con email automáticamente confirmado
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    coordinator: true, // Marcar como coordinador
                    auto_confirm: true
                }
            }
        })

        if (error) {
            console.error('❌ Error en signup coordinador:', error)
            return NextResponse.json({ 
                error: error.message,
                type: 'signup_failed'
            }, { status: 400 })
        }

        if (!data.user) {
            return NextResponse.json({ 
                error: 'No se pudo crear el usuario',
                type: 'no_user_returned'
            }, { status: 500 })
        }

        console.log('✅ Usuario coordinador creado:', data.user.id)
        
        return NextResponse.json({ 
            success: true, 
            auth_user_id: data.user.id,
            user: data.user,
            needs_confirmation: !data.user.email_confirmed_at
        })

    } catch (error) {
        console.error('❌ Error en signup coordinador:', error)
        return NextResponse.json({ 
            error: 'Error interno del servidor',
            message: error instanceof Error ? error.message : 'Error desconocido',
            type: 'internal_server_error'
        }, { status: 500 })
    }
}