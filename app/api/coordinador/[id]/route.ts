import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest, { params }: { params: { id: string | string[] } }) {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)

        // Normalize/sanitize id param (handle arrays, quoted values, 'undefined' literal, etc.)
        let rawId = params?.id
        console.debug('GET /api/coordinador/[id] request url:', request.url, 'raw params:', params)

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
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
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
        }

        // Añadir password al resultado (siempre intentamos incluirla; se usará adminClient si hay disponible)
        {
            try {
                let adminClient: any = null
                try {
                    adminClient = createAdminClient()
                } catch (e) {
                    adminClient = null
                }

                if (adminClient) {
                    const { data: coordData, error: coordPasswordErr } = await adminClient.from('coordinadores').select('password').eq('id', id).single()
                    if (!coordPasswordErr && coordData && (coordData as any).password) (assembled as any).password = (coordData as any).password

                    const { data: authInfo, error: authInfoErr } = await adminClient.from('coordinadores').select('auth_user_id').eq('id', id).single()
                    if (!authInfoErr && authInfo) (assembled as any).auth_user_id = (authInfo as any).auth_user_id || null
                } else {
                    // Fallback: intentar con el cliente normal (puede fallar por RLS)
                    const { data: coordData, error: coordPasswordErr } = await supabase.from('coordinadores').select('password').eq('id', id).single()
                    if (!coordPasswordErr && coordData && (coordData as any).password) (assembled as any).password = (coordData as any).password

                    const { data: authInfo, error: authInfoErr } = await supabase.from('coordinadores').select('auth_user_id').eq('id', id).single()
                    if (!authInfoErr && authInfo) (assembled as any).auth_user_id = (authInfo as any).auth_user_id || null
                }
            } catch (e) {
                console.warn('No se pudo obtener password/autoinfo del coordinador:', e)
            }
        }

        return NextResponse.json(assembled)
    } catch (error) {
        console.error('Error en GET /api/coordinador/[id]:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string | string[] } }) {
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

        // Normalize/sanitize id param
        const rawId = params?.id
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

        // Preparar datos de actualización
        const updateData: any = {}
        if (perfil_id !== undefined) updateData.perfil_id = perfil_id
        if (referencia_coordinador_id !== undefined) updateData.referencia_coordinador_id = referencia_coordinador_id
        if (estado) updateData.estado = estado
        if (tipo) updateData.tipo = tipo

        // Si se proporcionó password y no está vacío, actualizar primero en Auth (si existe auth_user_id)
        // Nota: eliminada la restricción de permisos; la API permitirá actualizar el campo password.
        if (typeof password === 'string' && password.trim() !== '') {

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
                    } catch (e) {
                        console.error('Excepción al actualizar contraseña en Auth:', e)
                        return NextResponse.json({ error: 'Error actualizando la contraseña en Auth' }, { status: 500 })
                    }

                    // Guardar la contraseña en la tabla coordinadores (texto plano, según requerimiento de prueba)
                    updateData.password = password
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
                                // Si ya existe usuario en Auth, buscarlo y actualizar contraseña
                                try {
                                    const { data: existingAuth, error: findErr } = await adminClient.from('auth.users').select('id').eq('email', email).single()
                                    if (findErr || !existingAuth) {
                                        console.error('Error buscando usuario existente en Auth tras conflicto:', findErr)
                                        return NextResponse.json({ error: 'Error creando usuario en Auth' }, { status: 500 })
                                    }

                                    const existingId = (existingAuth as any).id
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

                        // Guardar la contraseña en la tabla coordinadores (texto plano, según requerimiento de prueba)
                        updateData.password = password
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
                // Sin adminClient, simplemente actualizamos la tabla coordinadores con la nueva contraseña
                console.warn('adminClient no disponible — la actualización de contraseña en Auth será ignorada')
                updateData.password = password
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string | string[] } }) {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)
        const adminClient = createAdminClient()

        // Normalize/sanitize id param
        const rawId = params?.id
        let id = Array.isArray(rawId) ? rawId[0] : rawId
        id = typeof id === 'string' ? id.trim().replace(/^"|"$/g, '') : String(id || '')

        // Validar que el id tenga formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!id || id.toLowerCase() === 'undefined' || id.toLowerCase() === 'null' || !uuidRegex.test(id)) {
            console.warn('DELETE /api/coordinador/[id] - id inválido:', rawId)
            return NextResponse.json({ error: `ID no tiene formato UUID válido: ${rawId}` }, { status: 400 })
        }

        // Obtener el auth_user_id antes de eliminar
        const { data: coordinador } = await supabase.from('coordinadores').select('auth_user_id').eq('id', id).single()

        if (!coordinador) {
            return NextResponse.json({ error: 'Coordinador no encontrado' }, { status: 404 })
        }

        // Eliminar coordinador
        const { error: deleteError } = await supabase.from('coordinadores').delete().eq('id', id)

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
