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

            const response = await fetch(`/api/coordinador/${normalizedId}`)
            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Error al obtener coordinador')
            }

            const data = await response.json()
            return data as Coordinador
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

            const response = await fetch('/api/coordinador', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(coordinadorData),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error al crear coordinador')
            }

            const data = await response.json()
            return data
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

            const response = await fetch(`/api/coordinador/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(coordinadorData),
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || 'Error al actualizar coordinador')
            }

            const data = await response.json()
            return data
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

            // Enviar el email en el body en lugar de la URL
            const response = await fetch('/api/coordinador/eliminar', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error eliminando coordinador')
            }

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

    const buscarDirigentes = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            // 1. Obtener el ID del perfil 'Dirigente'
            const { data: perfilData, error: perfilError } = await supabase
                .from('perfiles')
                .select('id')
                .eq('nombre', 'Dirigente')
                .single()

            if (perfilError || !perfilData) {
                throw new Error("El perfil 'Dirigente' no fue encontrado.")
            }

            const dirigentePerfilId = (perfilData as any).id

            // 2. Buscar todos los coordinadores con ese perfil
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
        loading,
        error,
    }
}
