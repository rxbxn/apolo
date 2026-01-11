import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
        }

        console.log('🔐 Creando usuario directo via API REST:', email)

        // Obtener credenciales de Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        console.log('🔍 Verificando credenciales:')
        console.log('- URL:', supabaseUrl)
        console.log('- Service Key disponible:', !!serviceKey)
        console.log('- Service Key primeros chars:', serviceKey?.substring(0, 20) + '...')

        if (!serviceKey) {
            return NextResponse.json({ 
                error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado',
                type: 'no_service_key',
                hint: 'Configura la variable de entorno SUPABASE_SERVICE_ROLE_KEY'
            }, { status: 500 })
        }

        // Crear usuario usando la API REST directa con service role
        const authApiUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users`
        console.log('🔗 Endpoint Auth:', authApiUrl)
        const authResponse = await fetch(authApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceKey}`,
                'apikey': serviceKey
            },
            body: JSON.stringify({
                email,
                password,
                email_confirm: true, // Auto confirmar email
                phone_confirm: true, // Auto confirmar teléfono
                user_metadata: {
                    coordinator: true,
                    created_via: 'service_role_api',
                    created_at: new Date().toISOString()
                }
            })
        })

        console.log('📡 Respuesta Auth API status:', authResponse.status)

        if (!authResponse.ok) {
            const errorText = await authResponse.text()
            let errorData
            try {
                errorData = JSON.parse(errorText)
            } catch {
                errorData = { message: errorText }
            }
            
            console.error('❌ Error detallado en API REST de Auth:')
            console.error('- Status:', authResponse.status)
            console.error('- Response:', errorData)
            
            return NextResponse.json({ 
                error: `Error en API de autenticación: ${errorData.message || errorData.error || 'Error desconocido'}`,
                type: 'auth_api_failed',
                status: authResponse.status,
                details: errorData
            }, { status: authResponse.status })
        }

        const userData = await authResponse.json()
        console.log('✅ Usuario creado exitosamente via service role:', userData.id)
        
        return NextResponse.json({ 
            success: true, 
            auth_user_id: userData.id,
            user: userData,
            method: 'service_role_confirmed'
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