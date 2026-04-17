'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type Usuario = Database['public']['Tables']['usuarios']['Row']
type UsuarioInsert = Database['public']['Tables']['usuarios']['Insert']
type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update']

interface FiltrosPersonas {
    busqueda?: string
    estado?: string
    ciudad_id?: string
    zona_id?: string
    perfil_id?: string
}

export function usePersonas() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    function normalizeError(err: unknown): Error {
        if (err instanceof Error) return err
        try {
            if (err && typeof err === 'object') {
                // Supabase errors often have a 'message' property
                const anyErr = err as any
                if (typeof anyErr.message === 'string' && anyErr.message.length > 0) return new Error(anyErr.message)
                if (typeof anyErr.error === 'string' && anyErr.error.length > 0) return new Error(anyErr.error)
                // Fallback to JSON
                return new Error(JSON.stringify(anyErr))
            }
        } catch (e) {
            // ignore
        }
        return new Error('Error desconocido')
    }

    const listar = useCallback(async (filtros: FiltrosPersonas = {}, page = 1, pageSize = 10) => {
        try {
            setLoading(true)
            setError(null)

            let query = supabase
                .from('usuarios')
                .select('*, ciudades(nombre), zonas(nombre)', { count: 'exact' })

            // Aplicar filtros
            if (filtros.busqueda) {
                query = query.or(
                    `nombres.ilike.%${filtros.busqueda}%,apellidos.ilike.%${filtros.busqueda}%,numero_documento.ilike.%${filtros.busqueda}%`
                )
            }

            if (filtros.estado) {
                query = query.eq('estado', filtros.estado)
            }

            if (filtros.ciudad_id) {
                query = query.eq('ciudad_id', filtros.ciudad_id)
            }

            if (filtros.zona_id) {
                query = query.eq('zona_id', filtros.zona_id)
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
                data: data || [],
                count: count || 0,
                page,
                pageSize,
                totalPages: Math.ceil((count || 0) / pageSize),
            }
        } catch (err) {
            const error = normalizeError(err)
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

            console.log('🔍 usePersonas.obtenerPorId - fetching user ID:', id)
            
            // Verificar que Supabase esté inicializado correctamente
            if (!supabase || !supabase.from) {
                throw new Error('Supabase client not properly initialized')
            }

            const { data, error: queryError } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', id)
                .single()

            if (queryError) {
                console.error('❌ Supabase query error:', queryError)
                throw queryError
            }

            console.log('✅ Usuario fetched successfully:', data)
            return data
        } catch (err) {
            console.error('❌ Error in obtenerPorId:', err)
            const error = normalizeError(err)
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }, [])

    const crear = useCallback(async (persona: UsuarioInsert) => {
        try {
            setLoading(true)
            setError(null)

            const { data, error: insertError } = await supabase
                .from('usuarios')
                .insert(persona)
                .select()
                .single()

            if (insertError) throw insertError

            return data
        } catch (err) {
            const error = normalizeError(err)
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }, [])

    const actualizar = useCallback(async (id: string, persona: UsuarioUpdate) => {
        try {
            setLoading(true)
            setError(null)

            const { data, error: updateError } = await supabase
                .from('usuarios')
                .update(persona)
                .eq('id', id)
                .select()
                .single()

            if (updateError) throw updateError

            return data
        } catch (err) {
            const error = normalizeError(err)
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }, [])

    const eliminar = useCallback(async (id: string) => {
        try {
            setLoading(true)
            setError(null)

            const { error: deleteError } = await supabase.from('usuarios').delete().eq('id', id)

            if (deleteError) throw deleteError

            return true
        } catch (err) {
            const error = normalizeError(err)
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

            const { data, error: updateError } = await supabase
                .from('usuarios')
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

    const buscarReferentes = useCallback(async (termino: string) => {
        try {
            setLoading(true)
            setError(null)

            if (!termino || termino.length < 3) return []

            const { data, error: queryError } = await supabase
                .from('usuarios')
                .select('id, nombres, apellidos, numero_documento')
                .or(`nombres.ilike.%${termino}%,apellidos.ilike.%${termino}%,numero_documento.ilike.%${termino}%`)
                .limit(10)

            if (queryError) throw queryError

            return data || []
        } catch (err) {
            console.error('Error buscando referentes:', err)
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
        buscarReferentes, // Added
        loading,
        error,
    }
}
