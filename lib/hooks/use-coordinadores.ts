'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

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
                query = query.or(
                    `nombres.ilike.%${filtros.busqueda}%,apellidos.ilike.%${filtros.busqueda}%,numero_documento.ilike.%${filtros.busqueda}%,email.ilike.%${filtros.busqueda}%`
                )
            }

            if (filtros.estado) {
                query = query.eq('estado', filtros.estado)
            }

            if (filtros.perfil_id) {
                query = query.eq('perfil_id', filtros.perfil_id)
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
                console.error('Error actualizando coordinador:', updateError)
                throw new Error(updateError.message || 'Error al actualizar coordinador')
            }

            console.log('✅ Coordinador actualizado exitosamente:', coordinadorActualizado)
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

            const { data, error: queryError } = await supabase
                .from('v_coordinadores_completo')
                .select('coordinador_id, nombres, apellidos, email')
                .or(`nombres.ilike.%${termino}%,apellidos.ilike.%${termino}%,email.ilike.%${termino}%`)
                .limit(10)

            if (queryError) throw queryError

            return data || []
        } catch (err) {
            console.error('Error buscando coordinadores:', err)
            return []
        } finally {
            setLoading(false)
        }
    }, [])

    const buscarPorPerfil = useCallback(async (perfilNombre: string, termino?: string) => {
        try {
            setLoading(true)
            setError(null)

            // Obtener id del perfil. Primero intentar nombre exacto, si no existe intentar una búsqueda parcial (ilike)
            let perfilId: any = null

            const { data: perfilExact, error: perfilExactErr } = await supabase
                .from('perfiles')
                .select('id')
                .eq('nombre', perfilNombre)
                .limit(1)
                .maybeSingle()

            if (!perfilExactErr && perfilExact) {
                perfilId = (perfilExact as any).id
            } else {
                // Fallback: buscar nombres que contengan la palabra (caso-insensible)
                const { data: perfilLike, error: perfilLikeErr } = await supabase
                    .from('perfiles')
                    .select('id, nombre')
                    .ilike('nombre', `%${perfilNombre}%`)
                    .limit(1)
                    .maybeSingle()

                if (!perfilLikeErr && perfilLike) {
                    perfilId = (perfilLike as any).id
                }
            }

            if (!perfilId) {
                console.warn(`Perfil '${perfilNombre}' no encontrado (ni exacto ni parcial).`)
                return []
            }

            let query = supabase
                .from('v_coordinadores_completo')
                .select('coordinador_id, nombres, apellidos, email, perfil_id')
                .eq('perfil_id', perfilId)
                .limit(50)

            if (termino && termino.length > 0) {
                query = query.or(`nombres.ilike.%${termino}%,apellidos.ilike.%${termino}%,email.ilike.%${termino}%`)
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

            // 1. Obtener el ID del perfil 'Dirigente' (case-insensitive)
            const { data: perfilesList, error: perfilError } = await supabase
                .from('perfiles')
                .select('id, nombre')
                .ilike('nombre', 'dirigente')

            if (perfilError) {
                console.warn('Error buscando perfil Dirigente:', perfilError)
            }

            const dirigentePerfilId = perfilesList && perfilesList.length > 0 ? (perfilesList[0] as any).id : null

            if (!dirigentePerfilId) {
                console.warn("El perfil 'Dirigente' no fue encontrado en la tabla perfiles. Mostrando todos los coordinadores como opción.")
                // Fallback: devolver todos los coordinadores (a los puede elegirse como dirigente)
                const { data: allCoords, error: allErr } = await supabase
                    .from('v_coordinadores_completo')
                    .select('coordinador_id, nombres, apellidos, perfil_id')
                    .limit(200)
                if (allErr) { console.error('Error fallback dirigentes:', allErr); return [] }
                return allCoords || []
            }

            // 2. Buscar todos los coordinadores con perfil Dirigente
            const { data, error: queryError } = await supabase
                .from('v_coordinadores_completo')
                .select('coordinador_id, nombres, apellidos, perfil_id')
                .eq('perfil_id', dirigentePerfilId)

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
