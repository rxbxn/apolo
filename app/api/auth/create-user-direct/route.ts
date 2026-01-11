import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
        }

        console.log('🔐 Creando usuario directo via API REST:', email)

        // Usar la API REST directa de Supabase Auth
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!serviceKey) {
            return NextResponse.json({ 
                error: 'Credenciales de admin no disponibles',
                type: 'no_admin_credentials'
            }, { status: 500 })
        }

        // Crear usuario usando la API REST directa
        const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceKey}`,
                'apikey': serviceKey
            },
            body: JSON.stringify({
                email,
                password,
                email_confirm: true, // Auto confirmar
                phone_confirm: true,
                user_metadata: {
                    coordinator: true,
                    created_via: 'direct_api',
                    created_at: new Date().toISOString()
                }
            })
        })

        if (!authResponse.ok) {
            const errorData = await authResponse.json()
            console.error('❌ Error en API REST de Auth:', errorData)
            return NextResponse.json({ 
                error: `Error en API de autenticación: ${errorData.error || errorData.message}`,
                type: 'auth_api_failed',
                details: errorData
            }, { status: authResponse.status })
        }

        const userData = await authResponse.json()
        console.log('✅ Usuario creado via API REST:', userData.id)
        
        return NextResponse.json({ 
            success: true, 
            auth_user_id: userData.id,
            user: userData,
            method: 'direct_api_confirmed'
        })

    } catch (error) {
        console.error('❌ Error en creación directa:', error)
        return NextResponse.json({ 
            error: 'Error interno del servidor',
            message: error instanceof Error ? error.message : 'Error desconocido',
            type: 'internal_server_error'
        }, { status: 500 })
    }
}