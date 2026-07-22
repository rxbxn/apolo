'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { aplicarBusquedaPorNombre } from '@/lib/supabase/busqueda'

interface Coordinador {
    coordinador_id: string
    email: string
    estado: string
    tipo: 'Coordinador' | 'Estructurador' | null
    usuario_id: string
    nombres: string
    apellidos: string
    numero_documento: string
    tipo_documento: string
    celular: string | null
    ciudad_nombre: string | null
    zona_nombre: string | null
    rol: string | null
    perfil_id: string | null
    referencia_id: string | null
    referencia_nombre: string | null
    password?: string | null
    auth_user_id?: string | null
    incomplete?: boolean
    creado_en: string
    actualizado_en: string
}

interface FiltrosCoordinadores {
    busqueda?: string
    estado?: string
    perfil_id?: string
    tipo?: string
    ciudad_id?: string
    barrio_id?: string
}

interface CrearCoordinadorData {
    usuario_id: string
    email: string
    password: string
    perfil_id?: string
    referencia_coordinador_id?: string
    tipo: 'Coordinador' | 'Estructurador'
}

interface ActualizarCoordinadorData {
    perfil_id?: string
    referencia_coordinador_id?: string
    estado?: string
    tipo?: 'Coordinador' | 'Estructurador'
    password?: string
}

// crear()/actualizar() escriben coordinadores.perfil_id, pero
// obtenerModulosUsuario (web y APK) consulta PRIMERO la tabla usuario_perfil
// y solo cae a coordinadores.perfil_id si esa tabla no tiene ninguna fila
// activa para el usuario. Si el usuario ya tenía una fila en usuario_perfil
// de antes (ej. cuando era un Militante normal, antes de ser promovido a
// coordinador), esa fila vieja gana silenciosamente y el coordinador queda
// sin ver los módulos de su perfil real, aunque coordinadores.perfil_id
// esté bien puesto. Esta función mantiene usuario_perfil sincronizado:
// desactiva cualquier otro perfil activo del usuario y deja el perfil
// asignado como el único activo/principal.
async function sincronizarUsuarioPerfil(usuarioId: string, perfilId: string) {
    try {
        await supabase
            .from('usuario_perfil')
            .update({ activo: false, fecha_revocacion: new Date().toISOString() })
            .eq('usuario_id', usuarioId)
            .eq('activo', true)
            .neq('perfil_id', perfilId)

        const { error } = await supabase
            .from('usuario_perfil')
            .upsert(
                { usuario_id: usuarioId, perfil_id: perfilId, es_principal: true, activo: true, fecha_revocacion: null },
                { onConflict: 'usuario_id,perfil_id' }
            )

        if (error) {
            console.warn('⚠️ No se pudo sincronizar usuario_perfil:', error)
        }
    } catch (err) {
        console.warn('⚠️ Excepción sincronizando usuario_perfil:', err)
    }
}

export function useCoordinadores() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const listar = useCallback(async (filtros: FiltrosCoordinadores = {}, page = 1, pageSize = 10) => {
        try {
            setLoading(true)
            setError(null)

            let query = supabase
                .from('v_coordinadores_completo')
                .select('*', { count: 'exact' })

            // Aplicar filtros
            if (filtros.busqueda) {
                query = aplicarBusquedaPorNombre(query, filtros.busqueda, ['numero_documento', 'email'])
            }

            if (filtros.estado) {
                query = query.eq('estado', filtros.estado)
            }

            if (filtros.perfil_id) {
                query = query.eq('perfil_id', filtros.perfil_id)
            }

            // La vista v_coordinadores_completo no confirma tener columnas de
            // ubicación propias (solo ciudad_nombre para mostrar), así que el
            // filtro de ciudad/barrio se resuelve igual que en la APK: primero
            // se buscan los usuario_id que caen en ese barrio/ciudad en la
            // tabla usuarios (que sí tiene esas columnas) y se filtra la vista
            // por esos ids.
            if (filtros.ciudad_id || filtros.barrio_id) {
                let usuariosQuery = supabase.from('usuarios').select('id')
                if (filtros.barrio_id) {
                    usuariosQuery = usuariosQuery.eq('barrio_id', filtros.barrio_id)
                } else if (filtros.ciudad_id) {
                    usuariosQuery = usuariosQuery.eq('ciudad_id', filtros.ciudad_id)
                }
                const { data: usuariosData, error: usuariosError } = await usuariosQuery
                if (usuariosError) throw usuariosError
                const usuarioIds = (usuariosData || []).map((u: any) => u.id)
                if (usuarioIds.length === 0) {
                    return { data: [], count: 0, page, pageSize, totalPages: 0 }
                }
                query = query.in('usuario_id', usuarioIds)
            }

            // Paginación
            const from = (page - 1) * pageSize
            const to = from + pageSize - 1
            query = query.range(from, to)

            // Ordenar
            query = query.order('creado_en', { ascending: false })

            const { data, error: queryError, count } = await query

            if (queryError) throw queryError

            return {
                data: (data as Coordinador[]) || [],
                count: count || 0,
                page,
                pageSize,
                totalPages: Math.ceil((count || 0) / pageSize),
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido')
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }, [])

    const obtenerPorId = useCallback(async (id: string) => {
        try {
            setLoading(true)
            setError(null)

            // Normalize id (strip quotes, trim)
            let normalizedId = Array.isArray(id) ? id[0] : id
            normalizedId = typeof normalizedId === 'string' ? normalizedId.trim().replace(/^"|"$/g, '') : String(normalizedId || '')

            // Validar id
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            if (!normalizedId || !uuidRegex.test(normalizedId)) {
                throw new Error(`ID no tiene formato UUID válido: ${id}`)
            }

            // Usar cliente de Supabase directamente para obtener coordinador
            const { data: coordData, error: coordError } = await supabase
                .from('coordinadores')
                .select('*')
                .eq('id', normalizedId)
                .single()

            if (coordError) {
                console.error('Error obteniendo coordinador:', coordError)
                throw new Error('Error al obtener coordinador')
            }

            if (!coordData) {
                throw new Error('Coordinador no encontrado')
            }

            // Obtener información del usuario asociado
            let usuarioInfo: any = null
            if (coordData.usuario_id) {
                const { data: uData } = await supabase
                    .from('usuarios')
                    .select('id, nombres, apellidos, numero_documento, tipo_documento, celular, email, ciudad_id, zona_id')
                    .eq('id', coordData.usuario_id)
                    .single()
                
                if (uData) usuarioInfo = uData
            }

            // Obtener nombre del perfil
            let perfilNombre: string | null = null
            if (coordData.perfil_id) {
                const { data: pData } = await supabase
                    .from('perfiles')
                    .select('nombre')
                    .eq('id', coordData.perfil_id)
                    .single()
                
                if (pData) perfilNombre = pData.nombre
            }

            // Obtener ciudad y zona
            let ciudadNombre: string | null = null
            let zonaNombre: string | null = null
            if (usuarioInfo?.ciudad_id) {
                const { data: cData } = await supabase
                    .from('ciudades')
                    .select('nombre')
                    .eq('id', usuarioInfo.ciudad_id)
                    .single()
                
                if (cData) ciudadNombre = cData.nombre
            }
            if (usuarioInfo?.zona_id) {
                const { data: zData } = await supabase
                    .from('zonas')
                    .select('nombre')
                    .eq('id', usuarioInfo.zona_id)
                    .single()
                
                if (zData) zonaNombre = zData.nombre
            }

            // Obtener referencia
            let referenciaNombre: string | null = null
            if (coordData.referencia_coordinador_id) {
                const { data: refData } = await supabase
                    .from('coordinadores')
                    .select('usuario_id')
                    .eq('id', coordData.referencia_coordinador_id)
                    .single()

                if (refData?.usuario_id) {
                    const { data: refUser } = await supabase
                        .from('usuarios')
                        .select('nombres, apellidos')
                        .eq('id', refData.usuario_id)
                        .single()

                    if (refUser) referenciaNombre = `${refUser.nombres} ${refUser.apellidos}`
                }
            }

            const coordinador = {
                coordinador_id: coordData.id,
                email: coordData.email,
                estado: coordData.estado,
                usuario_id: coordData.usuario_id,
                nombres: usuarioInfo?.nombres || null,
                apellidos: usuarioInfo?.apellidos || null,
                numero_documento: usuarioInfo?.numero_documento || null,
                tipo_documento: usuarioInfo?.tipo_documento || null,
                celular: usuarioInfo?.celular || null,
                ciudad_nombre: ciudadNombre,
                zona_nombre: zonaNombre,
                rol: perfilNombre || null,
                perfil_id: coordData.perfil_id,
                referencia_coordinador_id: coordData.referencia_coordinador_id,
                referencia_id: coordData.referencia_coordinador_id,
                referencia_nombre: referenciaNombre,
                tipo: coordData.tipo || null,
                auth_user_id: coordData.auth_user_id || null,
                creado_en: coordData.creado_en,
                actualizado_en: coordData.actualizado_en,
                incomplete: !usuarioInfo,
                // coordinadores.password (texto plano, a petición del equipo)
                // ya venía en coordData por el select('*'), pero no se estaba
                // incluyendo aquí — por eso el formulario de edición nunca
                // mostraba la contraseña guardada.
                password: coordData.password || null,
            }

            return coordinador as Coordinador
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido')
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }, [])

    const crear = useCallback(async (coordinadorData: CrearCoordinadorData) => {
        try {
            setLoading(true)
            setError(null)

            // Validaciones básicas
            if (!coordinadorData.usuario_id || !coordinadorData.email || !coordinadorData.tipo) {
                throw new Error('Faltan campos requeridos: usuario_id, email y tipo son obligatorios')
            }

            // Validar formato UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            if (!uuidRegex.test(coordinadorData.usuario_id)) {
                throw new Error(`usuario_id no tiene formato UUID válido: ${coordinadorData.usuario_id}`)
            }

            // Verificar que el usuario existe
            const { data: usuario, error: usuarioError } = await supabase
                .from('usuarios')
                .select('id, nombres, apellidos, numero_documento, email')
                .eq('id', coordinadorData.usuario_id)
                .single()

            if (usuarioError || !usuario) {
                console.error(`❌ Usuario no encontrado. ID: ${coordinadorData.usuario_id}, Error:`, usuarioError)
                throw new Error('Usuario no encontrado')
            }

            // Evitar coordinadores duplicados: si esta persona YA tiene una
            // fila en coordinadores, no crear una segunda. Esto fue lo que
            // pasó con "ECO SOMOS TODOS 2" — se creó un segundo coordinador
            // con un login nuevo mientras el original (con los militantes
            // reales asignados) quedó huérfano e inaccesible. Ahora se
            // bloquea con un mensaje claro que dirige a editar el existente.
            const { data: coordinadorExistente } = await supabase
                .from('coordinadores')
                .select('id, email')
                .eq('usuario_id', coordinadorData.usuario_id)
                .maybeSingle()

            if (coordinadorExistente) {
                throw new Error(
                    `Esta persona ya tiene un coordinador creado (email: ${coordinadorExistente.email}). ` +
                    `Edita ese coordinador existente en vez de crear uno nuevo — si no, la cuenta nueva queda ` +
                    `desconectada de los militantes y demás datos ya asignados.`
                )
            }

            // Verificar que el email no esté registrado
            const { data: emailExistente } = await supabase
                .from('coordinadores')
                .select('id')
                .eq('email', coordinadorData.email)
                .single()

            if (emailExistente) {
                throw new Error('El email ya está registrado')
            }

            // Verificar referencia_coordinador_id si se proporciona
            if (coordinadorData.referencia_coordinador_id) {
                if (!uuidRegex.test(coordinadorData.referencia_coordinador_id)) {
                    throw new Error(`referencia_coordinador_id no tiene formato UUID válido: ${coordinadorData.referencia_coordinador_id}`)
                }

                const { data: coordinadorRef, error: refError } = await supabase
                    .from('coordinadores')
                    .select('id')
                    .eq('id', coordinadorData.referencia_coordinador_id)
                    .single()

                if (refError || !coordinadorRef) {
                    throw new Error(`El coordinador de referencia no existe con ID: ${coordinadorData.referencia_coordinador_id}`)
                }
            }

            // 1. Crear usuario en Auth (método directo API)
            let authUserId = null
            if (coordinadorData.password) {
                console.log('🔐 API 1: Creando usuario de autenticación para:', coordinadorData.email)
                
                const authResponse = await fetch('/api/auth/create-user-admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: coordinadorData.email, 
                        password: coordinadorData.password 
                    })
                })

                if (authResponse.ok) {
                    const authResult = await authResponse.json()
                    authUserId = authResult.auth_user_id
                    console.log('✅ Usuario de autenticación creado con ID:', authUserId)
                    console.log('� Método usado:', authResult.method)
                } else {
                    const errorData = await authResponse.json()
                    console.warn('⚠️ No se pudo crear usuario de auth:', errorData.error)
                    console.log('📋 Continuando sin autenticación (se puede agregar después)')
                }
            }

            // 2. Crear coordinador en base de datos
            console.log('📋 API 2: Insertando coordinador en base de datos')
            console.log('📋 Datos del coordinador:', {
                usuario_id: coordinadorData.usuario_id,
                email: coordinadorData.email,
                tipo: coordinadorData.tipo,
                tiene_auth: !!authUserId
            })
            
            // No almacenamos contraseñas en texto plano en la tabla coordinadores por seguridad.
            // Persistimos sólo auth_user_id si se creó el usuario en Auth.
            const coordinadorPayload = {
                usuario_id: coordinadorData.usuario_id,
                email: coordinadorData.email,
                tipo: coordinadorData.tipo,
                perfil_id: coordinadorData.perfil_id || null,
                referencia_coordinador_id: coordinadorData.referencia_coordinador_id || null,
                auth_user_id: authUserId || null // null si no se pudo crear auth
            }

            const { data: coordinadorCreated, error: coordinadorError } = await supabase
                .from('coordinadores')
                .insert(coordinadorPayload)
                .select('*')

            if (coordinadorError) {
                console.error('❌ Error detallado en inserción de coordinador:')
                console.error('- Código:', coordinadorError.code)
                console.error('- Mensaje:', coordinadorError.message)
                console.error('- Detalles:', coordinadorError.details)
                console.error('- Payload enviado:', coordinadorPayload)
                
                // Cleanup: eliminar usuario de Auth si se creó
                if (authUserId) {
                    console.log('🧹 Ejecutando limpieza de usuario de autenticación...')
                    try {
                        await fetch('/api/auth/delete-coordinator', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ auth_user_id: authUserId })
                        })
                        console.log('✅ Usuario de autenticación marcado para eliminación')
                    } catch (cleanupError) {
                        console.warn('⚠️ Error en limpieza de usuario de autenticación:', cleanupError)
                    }
                }
                
                throw new Error(`Error en inserción de coordinador: ${coordinadorError.message}`)
            }

            if (!coordinadorCreated || coordinadorCreated.length === 0) {
                console.error('❌ No se creó ningún coordinador (array vacío)')
                throw new Error('No se insertó ningún registro en coordinadores')
            }

            const coordinador = coordinadorCreated[0] || coordinadorCreated
            console.log('✅ Coordinador creado exitosamente:', coordinador)

            // Mantener usuario_perfil en sync con coordinadores.perfil_id —
            // ver comentario en sincronizarUsuarioPerfil() más arriba.
            if (coordinadorPayload.perfil_id) {
                await sincronizarUsuarioPerfil(coordinadorData.usuario_id, coordinadorPayload.perfil_id)
            }

            // Mensaje según si se creó auth o no
            if (authUserId) {
                console.log('🎉 Coordinador creado CON usuario de autenticación')
            } else {
                console.log('💡 Coordinador creado SIN usuario de autenticación (se puede agregar después)')
            }
            
            return {
                ...coordinador,
                auth_created: !!authUserId,
                auth_user_id: authUserId
            }

        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido')
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }, [])

    const actualizar = useCallback(async (id: string, coordinadorData: ActualizarCoordinadorData) => {
        try {
            setLoading(true)
            setError(null)

            // Validar formato UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            if (!id || !uuidRegex.test(id)) {
                throw new Error(`ID no tiene formato UUID válido: ${id}`)
            }

            // Usar cliente de Supabase directamente
            const { data: coordinadorActualizado, error: updateError } = await supabase
                .from('coordinadores')
                .update(coordinadorData)
                .eq('id', id)
                .select()
                .single()

            if (updateError) {
                // El objeto PostgrestError no siempre serializa bien en el
                // overlay de Next (a veces se ve como "{}"); se loguean los
                // campos explícitos para poder ver el error real.
                console.error('❌ Error actualizando coordinador:')
                console.error('- Código:', updateError.code)
                console.error('- Mensaje:', updateError.message)
                console.error('- Detalles:', updateError.details)
                console.error('- Hint:', updateError.hint)
                console.error('- Payload enviado:', coordinadorData)
                console.error('- ID:', id)
                throw new Error(updateError.message || `Error al actualizar coordinador (código: ${updateError.code || 'desconocido'})`)
            }

            console.log('✅ Coordinador actualizado exitosamente:', coordinadorActualizado)

            // Igual que en crear(): si se cambió el perfil, reflejarlo en
            // usuario_perfil para que obtenerModulosUsuario no siga usando
            // un perfil viejo/desactualizado.
            if (coordinadorData.perfil_id && coordinadorActualizado?.usuario_id) {
                await sincronizarUsuarioPerfil(coordinadorActualizado.usuario_id, coordinadorData.perfil_id)
            }

            return coordinadorActualizado

        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido')
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }, [])

    const eliminar = useCallback(async (email: string) => {
        try {
            setLoading(true)
            setError(null)

            // Usar directamente el cliente de Supabase para mayor confiabilidad
            console.log('🔍 Eliminando coordinador con email:', email)

            // 1. Buscar el coordinador por email para obtener auth_user_id
            const { data: coordinador, error: findError } = await supabase
                .from('coordinadores')
                .select('auth_user_id, id')
                .eq('email', email)
                .single()

            if (findError || !coordinador) {
                console.warn('⚠️ Coordinador no encontrado con email:', email, 'Error:', findError)
                throw new Error('Coordinador no encontrado')
            }

            console.log('✅ Coordinador encontrado:', coordinador)

            // 2. Eliminar de la tabla coordinadores primero
            const { error: deleteError } = await supabase
                .from('coordinadores')
                .delete()
                .eq('id', coordinador.id)

            if (deleteError) {
                console.error('Error eliminando coordinador:', deleteError)
                throw new Error('Error eliminando coordinador de la base de datos')
            }

            console.log('✅ Coordinador eliminado de la tabla')

            // 3. Si tiene auth_user_id, intentar eliminar de Auth (usando API administrativa)
            if (coordinador.auth_user_id) {
                try {
                    console.log('🔥 Intentando eliminar usuario de Auth:', coordinador.auth_user_id)
                    
                    // Usar API de Next.js solo para la eliminación de Auth
                    const response = await fetch('/api/auth/delete-user', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ auth_user_id: coordinador.auth_user_id })
                    })

                    if (!response.ok) {
                        console.warn('⚠️ No se pudo eliminar de Auth, pero coordinador eliminado de BD')
                        // No fallar por esto, ya eliminamos el coordinador de la BD
                    } else {
                        console.log('✅ Usuario eliminado de Auth correctamente')
                    }
                } catch (authError) {
                    console.warn('⚠️ Error eliminando de Auth (no crítico):', authError)
                    // No fallar por esto, ya eliminamos el coordinador de la BD
                }
            }

            console.log('✅ Eliminación completada')
            return true
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido')
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }, [])

    const cambiarEstado = useCallback(async (id: string, nuevoEstado: 'activo' | 'inactivo' | 'suspendido') => {
        try {
            setLoading(true)
            setError(null)

            const { data, error: updateError } = await (supabase as any)
                .from('coordinadores')
                .update({ estado: nuevoEstado })
                .eq('id', id)
                .select()
                .single()

            if (updateError) throw updateError

            return data
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido')
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }, [])

    const buscarCoordinadores = useCallback(async (termino: string) => {
        try {
            setLoading(true)
            setError(null)

            if (!termino || termino.length < 3) return []

            const { data, error: queryError } = await aplicarBusquedaPorNombre(
                supabase.from('v_coordinadores_completo').select('coordinador_id, nombres, apellidos, email'),
                termino,
                ['email'],
            ).limit(10)

            if (queryError) throw queryError

            return data || []
        } catch (err) {
            console.error('Error buscando coordinadores:', err)
            return []
        } finally {
            setLoading(false)
        }
    }, [])

    const buscarPorPerfil = useCallback(async (tipoCoordinador: string, termino?: string) => {
        try {
            setLoading(true)
            setError(null)

            // A pesar del nombre histórico de esta función, filtra por
            // `coordinadores.tipo` ('Coordinador' | 'Estructurador' — el rol
            // real de la jerarquía), NO por un perfil de permisos RBAC.
            // Antes buscaba en la tabla `perfiles` un perfil llamado
            // "Coordinador" y filtraba por perfil_id — eso es el catálogo de
            // permisos, una cosa aparte, y si ningún coordinador real tenía
            // ese perfil de permisos asignado (perfectamente normal: pueden
            // no tener perfil, o tener otro), el combo quedaba vacío aunque
            // sí hubiera coordinadores.
            let query = supabase
                .from('v_coordinadores_completo')
                .select('coordinador_id, nombres, apellidos, email, tipo')
                .eq('tipo', tipoCoordinador)
                .limit(50)

            if (termino && termino.length > 0) {
                query = aplicarBusquedaPorNombre(query, termino, ['email'])
            }

            const { data, error: queryError } = await query

            if (queryError) throw queryError

            return data || []
        } catch (err) {
            console.error('Error buscando por perfil:', err)
            return []
        } finally {
            setLoading(false)
        }
    }, [])

    const buscarDirigentes = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            // Un "dirigente" es cualquier coordinador que aparece como
            // id_dirigente en la tabla `dirigentes` (tiene al menos un
            // coordinador que le reporta). Antes esto se adivinaba con un
            // perfil de permisos RBAC llamado "Dirigente" que puede no
            // existir — cuando no existía, el fallback mostraba TODOS los
            // coordinadores como candidatos a dirigente, lo cual no tiene
            // sentido en una pantalla que sirve justo para asignar quién es
            // dirigente de quién.
            const { data: rels, error: relsError } = await supabase
                .from('dirigentes')
                .select('id_dirigente')

            if (relsError) {
                console.error('Error obteniendo relaciones de dirigentes:', relsError)
                return []
            }

            const dirigenteIds = [...new Set((rels ?? []).map((r: any) => r.id_dirigente).filter(Boolean))]
            if (dirigenteIds.length === 0) return []

            const { data, error: queryError } = await supabase
                .from('v_coordinadores_completo')
                .select('coordinador_id, nombres, apellidos, perfil_id')
                .in('coordinador_id', dirigenteIds)

            if (queryError) throw queryError

            return data || []
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido')
            setError(error)
            console.error('Error buscando dirigentes:', err)
            return []
        } finally {
            setLoading(false)
        }
    }, [])

    return {
        listar,
        obtenerPorId,
        crear,
        actualizar,
        eliminar,
        cambiarEstado,
        buscarCoordinadores,
        buscarDirigentes,
        buscarPorPerfil,
        loading,
        error,
    }
}
