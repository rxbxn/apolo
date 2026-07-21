'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { aplicarBusquedaPorNombre } from '@/lib/supabase/busqueda'
import type { Database } from '@/lib/supabase/database.types'

type Usuario = Database['public']['Tables']['usuarios']['Row']
type UsuarioInsert = Database['public']['Tables']['usuarios']['Insert']
type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update']

export interface FiltrosPersonas {
    busqueda?:       string
    estado?:         string
    ciudad_id?:      string
    tipo_militante?: string
}

export type PersonaEnriquecida = Usuario & {
    ciudades?:       { nombre: string } | null
    _militante?:     {
        id: string
        coordinador_id:       string | null
        compromiso_marketing: number
        compromiso_cautivo:   number
        compromiso_impacto:   number
        compromiso_difusion?: number
        compromiso_proyecto?: string
    } | null
    _perfil_nombre?: string | null
    _coord_nombre?:  string | null
}

export function usePersonas() {
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState<Error | null>(null)

    function normalizeError(err: unknown): Error {
        if (err instanceof Error) return err
        try {
            if (err && typeof err === 'object') {
                const anyErr = err as any
                if (typeof anyErr.message === 'string' && anyErr.message.length > 0) return new Error(anyErr.message)
                if (typeof anyErr.error   === 'string' && anyErr.error.length   > 0) return new Error(anyErr.error)
                return new Error(JSON.stringify(anyErr))
            }
        } catch { /* ignore */ }
        return new Error('Error desconocido')
    }

    const listar = useCallback(async (
        filtros:  FiltrosPersonas = {},
        page    = 1,
        pageSize = 10,
    ) => {
        try {
            setLoading(true)
            setError(null)

            // Delegar al API route server-side para que el filtro tipo_militante
            // funcione correctamente con count y paginación (evita URLs largas)
            const params = new URLSearchParams()
            params.set('page',     String(page))
            params.set('pageSize', String(pageSize))
            if (filtros.busqueda)       params.set('busqueda',       filtros.busqueda)
            if (filtros.estado)         params.set('estado',         filtros.estado)
            if (filtros.ciudad_id)      params.set('ciudad_id',      filtros.ciudad_id)
            if (filtros.tipo_militante) params.set('tipo_militante', filtros.tipo_militante)

            const res = await fetch(`/api/personas?${params.toString()}`)
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}))
                throw new Error(errBody.error || `HTTP ${res.status}`)
            }

            const result = await res.json()
            return {
                data:       (result.data ?? []) as PersonaEnriquecida[],
                count:      result.count ?? 0,
                page:       result.page ?? page,
                pageSize:   result.pageSize ?? pageSize,
                totalPages: result.totalPages ?? 0,
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
            const { data, error: queryError } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', id)
                .single()
            if (queryError) throw queryError
            return data
        } catch (err) {
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
            // La columna "email" de `usuarios` es NOT NULL en la base real
            // (no lo era en el esquema propuesto), así que enviar null o no
            // enviarla del todo hace que Postgres rechace el insert entero —
            // aunque el formulario nunca la haya pedido como obligatoria. Se
            // fuerza a "" cuando no venga con valor, para no bloquear la
            // creación de personas sin correo.
            const personaConEmail: any = { ...persona }
            if (personaConEmail.email === null || personaConEmail.email === undefined) {
                personaConEmail.email = ''
            }
            const { data, error: insertError } = await (supabase as any)
                .from('usuarios')
                .insert(personaConEmail)
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
            // Mismo caso que en crear(): si el update trae "email" en null
            // (campo vaciado en el formulario), Postgres rechaza todo el
            // update por el constraint NOT NULL — se normaliza a "".
            const personaConEmail: any = { ...persona }
            if ('email' in personaConEmail && personaConEmail.email == null) {
                personaConEmail.email = ''
            }
            const { data, error: updateError } = await (supabase as any)
                .from('usuarios')
                .update(personaConEmail)
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

    const cambiarEstado = useCallback(async (
        id: string,
        nuevoEstado: 'activo' | 'inactivo' | 'suspendido',
    ) => {
        try {
            setLoading(true)
            setError(null)
            const { data, error: updateError } = await (supabase as any)
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
            // Antes esto exigía escribir 3+ letras para traer cualquier cosa,
            // así que al abrir el combobox no se veía nada hasta que el
            // usuario tecleaba — se sentía "roto". Ahora, sin término (o con
            // menos de 3 letras) trae los primeros resultados ordenados por
            // nombre, y a partir de 3 letras sí filtra por lo escrito.
            let query = supabase
                .from('usuarios')
                .select('id, nombres, apellidos, numero_documento')
                .order('nombres', { ascending: true })
                .limit(20)

            if (termino && termino.length >= 3) {
                query = aplicarBusquedaPorNombre(query, termino)
            }

            const { data, error: queryError } = await query
            if (queryError) throw queryError
            return data || []
        } catch (err) {
            // Antes este catch se tragaba el error silenciosamente (solo
            // console.error) y devolvía [] igual que "sin resultados" — eso
            // hacía indistinguible un fallo real (RLS, columna, red) de una
            // búsqueda legítimamente vacía. Ahora se guarda en `error` para
            // que la pantalla que llama pueda mostrarlo.
            const error = err instanceof Error ? err : new Error('Error buscando personas')
            console.error('Error buscando referentes:', error)
            setError(error)
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
        buscarReferentes,
        loading,
        error,
    }
}
