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

        // Crear usuario sin confirmación de email usando autoConfirm
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    coordinator: true
                },
                // Configuraciones para evitar confirmación
                captchaToken: undefined,
                emailRedirectTo: undefined
            }
        })

        if (error) {
            console.error('❌ Error en signup coordinador:', error)
            
            // Si falla el signup regular, intentar con admin si disponible
            console.log('🔄 Intentando con admin client...')
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
            
            if (serviceKey) {
                try {
                    const adminClient = createClient(supabaseUrl, serviceKey, {
                        auth: { autoRefreshToken: false, persistSession: false }
                    })
                    
                    const { data: adminData, error: adminError } = await adminClient.auth.admin.createUser({
                        email,
                        password,
                        email_confirm: true, // Auto confirmar
                        phone_confirm: true,
                        user_metadata: { 
                            coordinator: true,
                            created_by: 'admin'
                        }
                    })
                    
                    if (!adminError && adminData.user) {
                        console.log('✅ Usuario creado con admin client:', adminData.user.id)
                        return NextResponse.json({ 
                            success: true, 
                            auth_user_id: adminData.user.id,
                            user: adminData.user,
                            method: 'admin_confirmed'
                        })
                    } else {
                        console.error('❌ Admin client también falló:', adminError)
                    }
                } catch (adminError) {
                    console.error('❌ Error con admin client:', adminError)
                }
            }
            
            return NextResponse.json({ 
                error: `Error creando usuario: ${error.message}`,
                type: 'signup_failed',
                details: {
                    code: error.status,
                    message: error.message
                }
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