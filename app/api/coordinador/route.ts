import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '10')
        const busqueda = searchParams.get('busqueda') || ''
        const estado = searchParams.get('estado') || ''
        const perfil_id = searchParams.get('perfil_id') || ''

        let query = supabase.from('v_coordinadores_completo').select('*', { count: 'exact' })

        // Aplicar filtros
        if (busqueda) {
            query = query.or(
                `nombres.ilike.%${busqueda}%,apellidos.ilike.%${busqueda}%,numero_documento.ilike.%${busqueda}%,email.ilike.%${busqueda}%`
            )
        }

        if (estado) {
            query = query.eq('estado', estado)
        }

        if (perfil_id) {
            query = query.eq('perfil_id', perfil_id)
        }

        // Paginación
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to).order('creado_en', { ascending: false })

        const { data, error, count } = await query

        if (error) {
            console.error('Error listando coordinadores:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Si no hay resultados en la vista, intentar fallback desde la tabla `coordinadores`
        if ((!data || (Array.isArray(data) && data.length === 0)) && (!count || count === 0)) {
            try {
                // Hacemos un select con joins (LEFT) para incluir coordinadores aunque el usuario relacionado falte
                let fallbackQuery = supabase
                    .from('coordinadores')
                    .select(`*, usuario:usuario_id(nombres,apellidos,numero_documento,tipo_documento,celular,email), perfil:perfil_id(nombre)`, { count: 'exact' })

                if (estado) fallbackQuery = fallbackQuery.eq('estado', estado)
                // Nota: el filtro de búsqueda es aproximado, hacemos el filtrado por email en la tabla y por usuario en memoria
                if (busqueda) fallbackQuery = fallbackQuery.ilike('email', `%${busqueda}%`)

                fallbackQuery = fallbackQuery.range(from, to).order('creado_en', { ascending: false })

                const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery

                if (fallbackError) {
                    console.error('Error en fallback listando coordinadores:', fallbackError)
                    return NextResponse.json({ error: fallbackError.message }, { status: 500 })
                }

                const mapped = (fallbackData || []).map((r: any) => ({
                    coordinador_id: r.id,
                    email: r.email,
                    estado: r.estado,
                    usuario_id: r.usuario_id,
                    nombres: r.usuario?.nombres || null,
                    apellidos: r.usuario?.apellidos || null,
                    numero_documento: r.usuario?.numero_documento || null,
                    tipo_documento: r.usuario?.tipo_documento || null,
                    celular: r.usuario?.celular || null,
                    ciudad_nombre: null,
                    zona_nombre: null,
                    rol: r.perfil?.nombre || null,
                    perfil_id: r.perfil_id,
                    referencia_nombre: null,
                    creado_en: r.creado_en,
                    actualizado_en: r.actualizado_en,
                }))

                return NextResponse.json({
                    data: mapped,
                    count: fallbackCount || 0,
                    page,
                    pageSize,
                    totalPages: Math.ceil(((fallbackCount || 0) / pageSize) || 0),
                })
            } catch (e) {
                console.error('Error en fallback listando coordinadores:', e)
                // Continuar y devolver el resultado original (vacío)
            }
        }

        return NextResponse.json({
            data,
            count,
            page,
            pageSize,
            totalPages: Math.ceil((count || 0) / pageSize),
        })
    } catch (error) {
        console.error('Error en GET /api/coordinador:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        // Logging detallado para debug
        if (process.env.NODE_ENV === 'development') {
            console.log('🔍 POST /api/coordinador - Iniciando creación de coordinador')
            console.log('  Variables de entorno disponibles:')
            console.log('    NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌')
            console.log('    SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌')
        }

        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)

        // Crear admin client con manejo de errores mejorado
        // Este cliente usa SERVICE_ROLE_KEY para crear usuarios en Auth y leer tablas sin restricciones RLS
        let adminClient
        try {
            if (process.env.NODE_ENV === 'development') {
                console.log('🔧 Intentando crear admin client con SERVICE_ROLE_KEY...')
            }
            adminClient = createAdminClient()
            if (process.env.NODE_ENV === 'development') {
                console.log('✅ Admin client creado exitosamente')
            }
        } catch (error: any) {
            console.error('❌ Error creando admin client:', error)
            console.error('  Mensaje:', error.message)
            return NextResponse.json({
                error: error.message || 'Error de configuración de Supabase. Verifique las variables de entorno.'
            }, { status: 500 })
        }

        // Usar adminClient para operaciones que requieren bypass de RLS
        // El cliente normal puede tener restricciones de permisos

        const body = await request.json()

        if (process.env.NODE_ENV === 'development') {
            console.log('📦 Datos recibidos:', {
                usuario_id: body.usuario_id,
                email: body.email,
                tipo: body.tipo,
                tiene_password: !!body.password
            })
        }

        let { usuario_id, email, password, perfil_id, referencia_coordinador_id, tipo } = body

        // Validaciones básicas
        if (!usuario_id || !email || !password || !tipo) {
            return NextResponse.json({
                error: 'Faltan campos requeridos',
                detalles: {
                    usuario_id: !usuario_id ? 'Falta usuario_id' : 'OK',
                    email: !email ? 'Falta email' : 'OK',
                    password: !password ? 'Falta password' : 'OK',
                    tipo: !tipo ? 'Falta tipo' : 'OK'
                }
            }, { status: 400 })
        }

        // Validar formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(usuario_id)) {
            return NextResponse.json({
                error: `usuario_id no tiene formato UUID válido: ${usuario_id}`
            }, { status: 400 })
        }

        // Sanitización de campos UUID vacíos
        if (perfil_id === "") perfil_id = null;
        if (referencia_coordinador_id === "") referencia_coordinador_id = null;

        // Validar referencia_coordinador_id si se proporciona
        // IMPORTANTE: referencia_coordinador_id debe ser un ID de coordinador existente, NO un usuario_id
        if (referencia_coordinador_id) {
            // Validar formato UUID
            if (!uuidRegex.test(referencia_coordinador_id)) {
                return NextResponse.json({
                    error: `referencia_coordinador_id no tiene formato UUID válido: ${referencia_coordinador_id}`
                }, { status: 400 })
            }

            // Verificar que el coordinador de referencia existe
            const { data: coordinadorRef, error: refError } = await (adminClient as any)
                .from('coordinadores')
                .select('id')
                .eq('id', referencia_coordinador_id)
                .single()

            if (refError || !coordinadorRef) {
                return NextResponse.json({
                    error: `El coordinador de referencia no existe con ID: ${referencia_coordinador_id}`
                }, { status: 400 })
            }

            if (process.env.NODE_ENV === 'development') {
                console.log('✅ Coordinador de referencia encontrado:', referencia_coordinador_id)
            }
        } else {
            if (process.env.NODE_ENV === 'development') {
                console.log('ℹ️ No se proporcionó referencia_coordinador_id, se establecerá como null')
            }
        }

        // 1. Verificar que el usuario existe
        // Usar adminClient para evitar problemas con RLS
        if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Buscando usuario con ID:', usuario_id)
        }

        const { data: usuario, error: usuarioError } = await adminClient
            .from('usuarios')
            .select('id, nombres, apellidos, numero_documento, email')
            .eq('id', usuario_id)
            .single()

        if (usuarioError) {
            console.error('❌ Error buscando usuario:', usuarioError)
            console.error('  Código:', usuarioError.code)
            console.error('  Mensaje:', usuarioError.message)
            console.error('  Detalles:', usuarioError.details)
            return NextResponse.json({
                error: `Usuario no encontrado: ${usuarioError.message}`
            }, { status: 404 })
        }

        if (!usuario) {
            console.error('❌ Usuario no encontrado con ID:', usuario_id)
            return NextResponse.json({
                error: `Usuario no encontrado con ID: ${usuario_id}`
            }, { status: 404 })
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('✅ Usuario encontrado:', (usuario as any).nombres, (usuario as any).apellidos)
        }

        // 2. Verificar que el email no esté registrado
        // Usar adminClient para evitar problemas con RLS
        const { data: emailExistente } = await adminClient.from('coordinadores').select('id').eq('email', email).single()

        if (emailExistente) {
            return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 })
        }

        // 2b. Verificar si ya existe un usuario en Auth con el mismo email (evitar intentar crear duplicados)
        try {
            const { data: authUsers, error: authUsersError } = await (adminClient as any)
                .from('auth.users')
                .select('id')
                .eq('email', email)
                .limit(1)

            if (authUsersError) {
                // Logueamos la advertencia pero no bloqueamos la operación; el siguiente createUser manejará cualquier conflicto
                console.warn('Advertencia al verificar auth.users:', authUsersError)
            } else if (authUsers && (Array.isArray(authUsers) ? authUsers.length > 0 : !!authUsers)) {
                return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 })
            }
        } catch (err) {
            console.warn('Error inesperado al verificar auth.users:', err)
        }

        // 3. Crear usuario en Auth usando adminClient (requiere SERVICE_ROLE_KEY)
        if (process.env.NODE_ENV === 'development') {
            console.log('🔧 Creando usuario en Supabase Auth con adminClient...')
        }
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        })

        if (authError) {
            console.error('❌ Error creando usuario en Auth:', authError)
            // Mapear errores de duplicado a un mensaje amigable y status 400
            const errMsg = (authError.message || '').toLowerCase()
            if (errMsg.includes('already') || errMsg.includes('already been registered') || errMsg.includes('duplicate')) {
                return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 })
            }
            // Para otros errores devolver mensaje genérico (no exponer mensajes internos en inglés)
            return NextResponse.json({ error: 'Error creando usuario en Auth' }, { status: 500 })
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('✅ Usuario creado en Auth con ID:', authData.user.id)
        }

        // 4. Crear coordinador en la tabla (usando adminClient para evitar problemas con RLS)
        if (process.env.NODE_ENV === 'development') {
            console.log('🔧 Creando registro en tabla coordinadores...')
        }
        const { data: coordinador, error: coordinadorError } = await (adminClient as any)
            .from('coordinadores')
            .insert({
                usuario_id,
                email,
                // Guardar la contraseña en la columna `password` (se solicitó conservar la contraseña en la tabla coordinadores)
                password,
                auth_user_id: authData.user.id,
                perfil_id,
                referencia_coordinador_id,
                tipo,
            })
            .select()
            .single()

        if (coordinadorError) {
            console.error('❌ Error creando coordinador en tabla:', coordinadorError)
            // Si falla, intentar eliminar el usuario de Auth usando adminClient
            try {
                if (process.env.NODE_ENV === 'development') {
                    console.log('🔧 Limpiando: eliminando usuario de Auth tras error...')
                }
                await adminClient.auth.admin.deleteUser(authData.user.id)
            } catch (deleteError) {
                console.error('❌ Error eliminando usuario auth tras fallo:', deleteError)
            }
            return NextResponse.json({ error: coordinadorError.message }, { status: 500 })
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('✅ Coordinador creado exitosamente con ID:', (coordinador as any)?.id)
        }

        // Nota: En sistemas de prueba devolvemos la contraseña en la respuesta tal como fue almacenada.
         
        // 5. Asignar perfil al usuario si se proporcionó (usando adminClient)
        if (perfil_id) {
            const { error: perfilError } = await (adminClient as any).from('usuario_perfil').insert({
                usuario_id,
                perfil_id,
                es_principal: true,
                activo: true,
            })

            if (perfilError) {
                console.error('Error asignando perfil:', perfilError)
                // No fallar por esto, solo loguear
            }
        }

        return NextResponse.json(coordinador, { status: 201 })
    } catch (error: any) {
        console.error('Error en POST /api/coordinador:', error)
        return NextResponse.json({ error: `Error interno del servidor: ${error.message || error}` }, { status: 500 })
    }
}
