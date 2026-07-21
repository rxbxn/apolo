import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// Shared UUID regex used for validating UUID inputs
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string | string[] }> }) {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)

        // Next.js 15+: params es una Promise, hay que resolverla antes de
        // leer sus propiedades.
        const resolvedParams = await params
        // Normalize/sanitize id param (handle arrays, quoted values, 'undefined' literal, etc.)
        let rawId = resolvedParams?.id
        console.debug('GET /api/coordinador/[id] request url:', request.url, 'raw params:', resolvedParams)

        // Fallback: si no viene en params, intentar extraer del path de la request
        if (!rawId) {
            try {
                const u = new URL(request.url)
                const match = u.pathname.match(/\/api\/coordinador\/([^\/]+)/)
                if (match && match[1]) rawId = match[1]
            } catch (e) {
                // ignore
            }
        }

        let id = Array.isArray(rawId) ? rawId[0] : rawId
        id = typeof id === 'string' ? id.trim().replace(/^"|"$/g, '') : String(id || '')

        // Validar que el id esté presente y tenga formato UUID
        
        if (!id || id.toLowerCase() === 'undefined' || id.toLowerCase() === 'null' || !uuidRegex.test(id)) {
            console.warn('GET /api/coordinador/[id] - id inválido:', rawId)
            return NextResponse.json({ error: `ID no tiene formato UUID válido: ${rawId}` }, { status: 400 })
        }

        // Obtener el registro directamente desde la tabla coordinadores (evita que la vista oculte registros huérfanos)
        const { data: coordRow, error: coordErr } = await supabase.from('coordinadores').select('*').eq('id', id).single()

        if (coordErr) {
            const msg = (coordErr?.message || '').toLowerCase()
            if (msg.includes('invalid input syntax for type uuid') || msg.includes('invalid input')) {
                console.warn('GET /api/coordinador/[id] - uuid parse error from DB (coordinadores):', coordErr.message)
                return NextResponse.json({ error: `ID no tiene formato UUID válido: ${id}` }, { status: 400 })
            }

            console.error('Error obteniendo coordinador desde tabla:', coordErr)
            return NextResponse.json({ error: 'Coordinador no encontrado' }, { status: 404 })
        }

        if (!coordRow) {
            return NextResponse.json({ error: 'Coordinador no encontrado' }, { status: 404 })
        }

        // NOTA: se eliminó la verificación de permisos estricta para ver credenciales.
        // Ahora siempre permitimos incluir el campo `password` en la respuesta del GET
        // (se intenta leer con adminClient si está disponible, si no con el cliente normal).
        let authUserId: string | null = null

        // Intentar obtener información del usuario asociado (si existe)
        let usuarioInfo: any = null
        try {
            if (coordRow.usuario_id) {
                const { data: uData, error: uErr } = await supabase
                    .from('usuarios')
                    .select('id, nombres, apellidos, numero_documento, tipo_documento, celular, email, ciudad_id, zona_id')
                    .eq('id', coordRow.usuario_id)
                    .single()

                if (!uErr && uData) usuarioInfo = uData
            }
        } catch (e) {
            console.warn('Error obteniendo usuario asociado:', e)
        }

        // Intentar obtener nombre del perfil
        let perfilNombre: string | null = null
        if (coordRow.perfil_id) {
            try {
                const { data: pData, error: pErr } = await supabase.from('perfiles').select('nombre').eq('id', coordRow.perfil_id).single()
                if (!pErr && pData) perfilNombre = (pData as any).nombre
            } catch (e) {
                console.warn('Error obteniendo perfil asociado:', e)
            }
        }

        // Intentar obtener nombre de la ciudad y zona (desde usuarios)
        let ciudadNombre: string | null = null
        let zonaNombre: string | null = null
        try {
            if (usuarioInfo?.ciudad_id) {
                const { data: cData, error: cErr } = await supabase.from('ciudades').select('nombre').eq('id', usuarioInfo.ciudad_id).single()
                if (!cErr && cData) ciudadNombre = (cData as any).nombre
            }
            if (usuarioInfo?.zona_id) {
                const { data: zData, error: zErr } = await supabase.from('zonas').select('nombre').eq('id', usuarioInfo.zona_id).single()
                if (!zErr && zData) zonaNombre = (zData as any).nombre
            }
        } catch (e) {
            console.warn('Error obteniendo ciudad/zona:', e)
        }

        // Intentar obtener nombre de referencia si existe
        let referenciaNombre: string | null = null
        if (coordRow.referencia_coordinador_id) {
            try {
                const { data: refData, error: refErr } = await supabase
                    .from('coordinadores')
                    .select('id, usuario_id')
                    .eq('id', coordRow.referencia_coordinador_id)
                    .single()

                if (!refErr && refData) {
                    const { data: refUser, error: refUserErr } = await supabase
                        .from('usuarios')
                        .select('nombres, apellidos')
                        .eq('id', (refData as any).usuario_id)
                        .single()

                    if (!refUserErr && refUser) referenciaNombre = `${(refUser as any).nombres} ${(refUser as any).apellidos}`
                }
            } catch (e) {
                console.warn('Error obteniendo referencia:', e)
            }
        }

        const assembled = {
            coordinador_id: coordRow.id,
            email: coordRow.email,
            estado: coordRow.estado,
            usuario_id: coordRow.usuario_id,
            nombres: usuarioInfo?.nombres || null,
            apellidos: usuarioInfo?.apellidos || null,
            numero_documento: usuarioInfo?.numero_documento || null,
            tipo_documento: usuarioInfo?.tipo_documento || null,
            celular: usuarioInfo?.celular || null,
            ciudad_nombre: ciudadNombre,
            zona_nombre: zonaNombre,
            rol: perfilNombre || null,
            perfil_id: coordRow.perfil_id,
            referencia_coordinador_id: coordRow.referencia_coordinador_id,
            referencia_id: coordRow.referencia_coordinador_id,
            referencia_nombre: referenciaNombre,
            tipo: coordRow.tipo || null,
            auth_user_id: coordRow.auth_user_id || null,
            creado_en: coordRow.creado_en,
            actualizado_en: coordRow.actualizado_en,
            // marcar si la fila viene sin usuario relacionado
            incomplete: !usuarioInfo,
            // coordinadores.password: columna en texto plano, a petición
            // explícita del equipo, para poder consultar la contraseña de un
            // coordinador desde este formulario. Ya estaba en producción
            // (POST /api/coordinador la escribe desde su creación); antes el
            // GET no la exponía, dejando el botón "ver contraseña" sin nada
            // que mostrar.
            password: coordRow.password || null,
        }

        // Intentar obtener auth_user_id si es posible (adminClient preferido). No exponemos contraseñas.
        try {
            let adminClient: any = null
            try {
                adminClient = createAdminClient()
            } catch (e) {
                adminClient = null
            }

            if (adminClient) {
                const { data: authInfo, error: authInfoErr } = await adminClient.from('coordinadores').select('auth_user_id').eq('id', id).single()
                if (!authInfoErr && authInfo) (assembled as any).auth_user_id = (authInfo as any).auth_user_id || null
            } else {
                const { data: authInfo, error: authInfoErr } = await supabase.from('coordinadores').select('auth_user_id').eq('id', id).single()
                if (!authInfoErr && authInfo) (assembled as any).auth_user_id = (authInfo as any).auth_user_id || null
            }
        } catch (e) {
            console.warn('No se pudo obtener auth_user_id del coordinador:', e)
        }

        return NextResponse.json(assembled)
    } catch (error) {
        console.error('Error en GET /api/coordinador/[id]:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string | string[] }> }) {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)
        let adminClient: any = null
        try {
            adminClient = createAdminClient()
        } catch (e) {
            console.warn('No se pudo crear adminClient; operaciones en Auth serán ignoradas:', e)
            adminClient = null
        }

        // Next.js 15+: params es una Promise, hay que resolverla antes de
        // leer sus propiedades.
        const resolvedParams = await params
        // Normalize/sanitize id param
        const rawId = resolvedParams?.id
        let id = Array.isArray(rawId) ? rawId[0] : rawId
        id = typeof id === 'string' ? id.trim().replace(/^"|"$/g, '') : String(id || '')

        // Validar que el id tenga formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!id || id.toLowerCase() === 'undefined' || id.toLowerCase() === 'null' || !uuidRegex.test(id)) {
            console.warn('PATCH /api/coordinador/[id] - id inválido:', rawId)
            return NextResponse.json({ error: `ID no tiene formato UUID válido: ${rawId}` }, { status: 400 })
        }

        const body = await request.json()

        const { perfil_id, referencia_coordinador_id, estado, tipo, password } = body

        // Normalizar campos UUID: convertir cadena vacía a null; validar formato UUID si se proporciona
        const normalizeUuid = (val: any) => {
            if (val === undefined) return undefined
            if (val === null) return null
            const s = String(val).trim().replace(/^"|"$/g, '')
            if (s === '') return null
            return s
        }

        const perfilIdNorm = normalizeUuid(perfil_id)
        const referenciaIdNorm = normalizeUuid(referencia_coordinador_id)

        if (perfilIdNorm !== undefined && perfilIdNorm !== null && !uuidRegex.test(String(perfilIdNorm))) {
            return NextResponse.json({ error: `perfil_id no tiene formato UUID válido: ${perfil_id}` }, { status: 400 })
        }
        if (referenciaIdNorm !== undefined && referenciaIdNorm !== null && !uuidRegex.test(String(referenciaIdNorm))) {
            return NextResponse.json({ error: `referencia_coordinador_id no tiene formato UUID válido: ${referencia_coordinador_id}` }, { status: 400 })
        }

        // Preparar datos de actualización
        const updateData: any = {}
        if (perfilIdNorm !== undefined) updateData.perfil_id = perfilIdNorm === null ? null : perfilIdNorm
        if (referenciaIdNorm !== undefined) updateData.referencia_coordinador_id = referenciaIdNorm === null ? null : referenciaIdNorm
        if (estado) updateData.estado = estado
        if (tipo) updateData.tipo = tipo

        // Si se proporcionó password y no está vacío, actualizar primero en Auth (si existe auth_user_id)
        // Nota: eliminada la restricción de permisos; la API permitirá actualizar el campo password.
        if (typeof password === 'string' && password.trim() !== '') {
            // La creación (POST /api/coordinador) ya guarda la contraseña en
            // texto plano en coordinadores.password (columna que existe en
            // paralelo a Supabase Auth, por decisión explícita del equipo).
            // La edición no la actualizaba, dejando la columna desincronizada
            // con la contraseña real tras un cambio — se corrige aquí.
            updateData.password = password

            // Obtener auth_user_id y email del coordinador usando adminClient para evitar problemas de RLS
            // Solo intentamos operaciones en Auth si tenemos adminClient
            let createdAuthUserId: string | null = null
            let authAction: { action: string; auth_user_id?: string } | null = null
            if (adminClient) {
                const coordRecordRes = await adminClient.from('coordinadores').select('auth_user_id, email').eq('id', id).single()

                if (coordRecordRes.error) {
                    console.error('Error obteniendo auth_user_id para coordinador:', coordRecordRes.error)
                    return NextResponse.json({ error: `Error al obtener coordinador para actualizar contraseña: ${coordRecordRes.error.message || coordRecordRes.error}` }, { status: 500 })
                }

                const coordRecord: any = coordRecordRes.data
                const email = coordRecord?.email

                const authAdmin: any = adminClient.auth.admin

                // Si existe auth_user_id, actualizar la contraseña en Auth
                if (coordRecord && coordRecord.auth_user_id) {
                    try {
                        if (typeof authAdmin.updateUserById === 'function') {
                            const { error: authUpdateError } = await authAdmin.updateUserById(coordRecord.auth_user_id, { password })
                            if (authUpdateError) {
                                console.error('Error actualizando password en Auth:', authUpdateError)
                                return NextResponse.json({ error: `Error actualizando la contraseña en Auth: ${authUpdateError.message || authUpdateError}` }, { status: 500 })
                            }
                        } else if (typeof authAdmin.updateUser === 'function') {
                            const { error: authUpdateError } = await authAdmin.updateUser(coordRecord.auth_user_id, { password })
                            if (authUpdateError) {
                                console.error('Error actualizando password en Auth:', authUpdateError)
                                return NextResponse.json({ error: `Error actualizando la contraseña en Auth: ${authUpdateError.message || authUpdateError}` }, { status: 500 })
                            }
                        } else {
                            console.warn('API de admin.auth no tiene updateUser/updateUserById; no se pudo actualizar contraseña en Auth por limitación de la librería')
                        }

                        authAction = { action: 'updated', auth_user_id: coordRecord.auth_user_id }

                        // Asegurar que auth_user_id permanezca en la fila tras la actualización
                        if (coordRecord.auth_user_id) {
                            updateData.auth_user_id = coordRecord.auth_user_id
                        }
                    } catch (e) {
                        console.error('Excepción al actualizar contraseña en Auth:', e)
                        return NextResponse.json({ error: 'Error actualizando la contraseña en Auth' }, { status: 500 })
                    }

                } else {
                    // No existe auth_user_id: intentar crear el usuario en Auth o vincular uno existente
                    try {
                        // Intentar crear usuario en Auth
                        const { data: createdUser, error: createErr } = await adminClient.auth.admin.createUser({
                            email,
                            password,
                            email_confirm: true,
                        })

                        if (createErr) {
                            console.error('Error creando usuario en Auth durante actualización:', createErr)
                            const msg = (createErr.message || '').toLowerCase()
                            if (msg.includes('already') || msg.includes('duplicate')) {
                                // Si ya existe usuario en Auth, buscarlo y actualizar contraseña.
                                // IMPORTANTE: `adminClient.from('auth.users')` NO funciona — PostgREST
                                // solo expone el esquema `public` por defecto, así que esa consulta
                                // siempre fallaba (tabla no encontrada) y esta rama devolvía 500 sin
                                // nunca vincular auth_user_id. Esto dejaba coordinadores con cuenta
                                // real en Auth pero `coordinadores.auth_user_id` en null para siempre
                                // (el bug de "0 militantes" / "0 módulos" de fabrizioemiliani@gmail.com).
                                // El fix correcto es usar la API admin de Auth (listUsers) y buscar
                                // por email, paginando por si hay más usuarios que el tamaño de página.
                                try {
                                    let existingId: string | null = null
                                    const emailLower = String(email || '').toLowerCase()
                                    for (let page = 1; page <= 20 && !existingId; page++) {
                                        const { data: pageData, error: listErr } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
                                        if (listErr) {
                                            console.error('Error listando usuarios de Auth tras conflicto:', listErr)
                                            break
                                        }
                                        const users = (pageData as any)?.users || []
                                        const match = users.find((u: any) => (u.email || '').toLowerCase() === emailLower)
                                        if (match) existingId = match.id
                                        if (users.length < 1000) break // última página
                                    }

                                    if (!existingId) {
                                        console.error('No se encontró el usuario existente en Auth tras conflicto de email:', email)
                                        return NextResponse.json({ error: 'Error creando usuario en Auth' }, { status: 500 })
                                    }
                                    if (typeof authAdmin.updateUserById === 'function') {
                                        const { error: authUpdateError } = await authAdmin.updateUserById(existingId, { password })
                                        if (authUpdateError) {
                                            console.error('Error actualizando contraseña en Auth (usuario existente):', authUpdateError)
                                            return NextResponse.json({ error: `Error actualizando la contraseña en Auth: ${authUpdateError.message || authUpdateError}` }, { status: 500 })
                                        }
                                    } else if (typeof authAdmin.updateUser === 'function') {
                                        const { error: authUpdateError } = await authAdmin.updateUser(existingId, { password })
                                        if (authUpdateError) {
                                            console.error('Error actualizando contraseña en Auth (usuario existente):', authUpdateError)
                                            return NextResponse.json({ error: `Error actualizando la contraseña en Auth: ${authUpdateError.message || authUpdateError}` }, { status: 500 })
                                        }
                                    }

                                    // Vincular el auth_user_id en la fila de coordinadores
                                    updateData.auth_user_id = existingId
                                    authAction = { action: 'linked', auth_user_id: existingId }

                                } catch (e) {
                                    console.error('Error manejando conflicto de creación de usuario en Auth:', e)
                                    return NextResponse.json({ error: 'Error creando o vinculando usuario en Auth' }, { status: 500 })
                                }
                            } else {
                                return NextResponse.json({ error: 'Error creando usuario en Auth' }, { status: 500 })
                            }
                        } else {
                            // Usuario creado en Auth: vincularlo
                            updateData.auth_user_id = (createdUser as any).user?.id
                            createdAuthUserId = (createdUser as any).user?.id || null
                            authAction = { action: 'created', auth_user_id: createdAuthUserId ?? undefined }
                        }

                    } catch (e) {
                        console.error('Error creando usuario en Auth durante PATCH:', e)
                        return NextResponse.json({ error: 'Error creando usuario en Auth' }, { status: 500 })
                    }
                }

                // Al llegar aquí intentaremos actualizar la tabla coordinadores usando adminClient (si está disponible) para evitar problemas con RLS
                const targetClient: any = adminClient || supabase

                const { data: updatedCoord, error: updateErr } = await targetClient.from('coordinadores').update(updateData).eq('id', id).select().single()

                if (updateErr) {
                    console.error('Error actualizando coordinador después de manejar Auth:', updateErr)
                    // Si creamos un usuario en Auth y la actualización de DB falló, intentar limpiar el usuario creado
                    if (createdAuthUserId && adminClient) {
                        try {
                            await adminClient.auth.admin.deleteUser(createdAuthUserId)
                        } catch (cleanupErr) {
                            console.error('Error limpiando usuario Auth después de fallo en DB update:', cleanupErr)
                        }
                    }
                    return NextResponse.json({ error: updateErr.message || 'Error actualizando coordinador' }, { status: 500 })
                }

                // Devolver la fila actualizada y detalles de la acción en Auth (si los hay)
                return NextResponse.json({ ...updatedCoord, _auth_action: authAction })
                } else {
                    // Sin adminClient, no podemos operar sobre Auth; no almacenamos la contraseña en la BD.
                    console.warn('adminClient no disponible — no se puede crear/actualizar usuario en Auth desde este entorno')
                }
        }

        // Para el resto de actualizaciones (sin password manejado por adminClient) intentamos actualizar usando adminClient si está disponible
        const targetClient: any = adminClient || supabase

        const { data, error } = await targetClient.from('coordinadores').update(updateData).eq('id', id).select().single()

        if (error) {
            console.error('Error actualizando coordinador:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Actualizar perfil del usuario si cambió
        if (perfil_id !== undefined) {
            const { data: coordinador } = await supabase.from('coordinadores').select('usuario_id').eq('id', id).single()

            if (coordinador) {
                // Desactivar perfiles actuales
                await supabase.from('usuario_perfil').update({ activo: false }).eq('usuario_id', coordinador.usuario_id)

                // Asignar nuevo perfil
                if (perfil_id) {
                    await supabase.from('usuario_perfil').upsert({
                        usuario_id: coordinador.usuario_id,
                        perfil_id,
                        es_principal: true,
                        activo: true,
                    })
                }
            }
        }

        return NextResponse.json({ ...data })
    } catch (error) {
        console.error('Error en PATCH /api/coordinador/[id]:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string | string[] }> }) {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)
        const adminClient = createAdminClient()

        // Next.js 15+: params es una Promise, hay que resolverla antes de
        // leer sus propiedades.
        const resolvedParams = await params
        // Normalize/sanitize email param
        const rawEmail = resolvedParams?.id
        let email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail
        email = typeof email === 'string' ? email.trim().replace(/^"|"$/g, '') : String(email || '')
        
        // Decodificar el email de la URL
        try {
            email = decodeURIComponent(email)
        } catch (e) {
            console.warn('Error decodificando email:', e)
        }

        // Validar que el email tenga formato válido
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email || email.toLowerCase() === 'undefined' || email.toLowerCase() === 'null' || !emailRegex.test(email)) {
            console.warn('DELETE /api/coordinador/[email] - email inválido:', rawEmail, 'decodificado:', email)
            return NextResponse.json({ error: `Email no tiene formato válido: ${rawEmail}` }, { status: 400 })
        }

        // Buscar el coordinador por email para obtener el auth_user_id
        console.log('🔍 Buscando coordinador con email:', email)
        const { data: coordinador } = await supabase.from('coordinadores').select('auth_user_id, id').eq('email', email).single()

        if (!coordinador) {
            console.warn('⚠️ Coordinador no encontrado con email:', email)
            return NextResponse.json({ error: 'Coordinador no encontrado' }, { status: 404 })
        }

        console.log('✅ Coordinador encontrado:', coordinador)

        // Eliminar coordinador usando el ID obtenido
        const { error: deleteError } = await supabase.from('coordinadores').delete().eq('id', coordinador.id)

        if (deleteError) {
            console.error('Error eliminando coordinador:', deleteError)
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        // Eliminar usuario de Auth si existe
        if (coordinador.auth_user_id) {
            const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(coordinador.auth_user_id)

            if (authDeleteError) {
                console.error('Error eliminando usuario de Auth:', authDeleteError)
                // No fallar por esto, ya eliminamos el coordinador
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error en DELETE /api/coordinador/[id]:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
