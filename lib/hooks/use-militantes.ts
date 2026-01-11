'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Militante {
    militante_id: string
    usuario_id: string
    nombres: string
    apellidos: string
    numero_documento: string
    tipo_documento: string
    celular: string | null
    usuario_email: string | null
    tipo: string
    coordinador_id: string | null
    coordinador_email: string | null
    coordinador_nombre: string | null
    compromiso_marketing: string | null
    compromiso_cautivo: string | null
    compromiso_impacto: string | null
    formulario: string | null
    perfil_id: string | null
    perfil_nombre: string | null
    ciudad_nombre: string | null
    zona_nombre: string | null
    estado: string
    creado_en: string
    actualizado_en: string
}

interface FiltrosMilitantes {
    busqueda?: string
    estado?: string
}

interface CrearMilitanteData {
    usuario_id: string
    tipo: string
    coordinador_id?: string
    compromiso_marketing?: string
    compromiso_cautivo?: string
    compromiso_impacto?: string
    formulario?: string
    perfil_id?: string
}

interface ActualizarMilitanteData {
    tipo?: string
    coordinador_id?: string
    compromiso_marketing?: string
    compromiso_cautivo?: string
    compromiso_impacto?: string
    formulario?: string
    perfil_id?: string
    estado?: string
}

export function useMilitantes() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    async function listar(filtros: FiltrosMilitantes = {}, page = 1, pageSize = 10) {
        try {
            setLoading(true)
            setError(null)

            // Usar directamente el cliente de Supabase en lugar de la API route
            let query = supabase
                .from('v_militantes_completo')
                .select('*', { count: 'exact' })

            // Aplicar filtros
            if (filtros.busqueda) {
                query = query.or(`nombres.ilike.%${filtros.busqueda}%,apellidos.ilike.%${filtros.busqueda}%,numero_documento.ilike.%${filtros.busqueda}%`)
            }

            if (filtros.estado) {
                query = query.eq('estado', filtros.estado)
            }

            if (filtros.tipo) {
                query = query.eq('tipo', filtros.tipo)
            }

            if (filtros.coordinador_id) {
                query = query.eq('coordinador_id', filtros.coordinador_id)
            }

            // Paginación
            const from = (page - 1) * pageSize
            const to = from + pageSize - 1

            const { data, error, count } = await query
                .order('creado_en', { ascending: false })
                .range(from, to)

            if (error) throw error

            return {
                data: (data as Militante[]) || [],
                count: count || 0,
                page,
                pageSize,
                totalPages: Math.ceil((count || 0) / pageSize),
            }
        } catch (err) {
            console.error('Error completo en listar militantes:', err)
            const error = err instanceof Error ? err : new Error(`Error desconocido: ${JSON.stringify(err)}`)
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    async function obtenerPorId(id: string) {
        try {
            setLoading(true)
            setError(null)
            // Fetch militante directly from the table (avoid relying on v_militantes_completo view)
            const { data: militanteRow, error: militanteError } = await supabase
                .from('militantes')
                .select('*')
                .eq('id', id)
                .single()

            if (militanteError) {
                console.debug('Supabase query error in obtenerPorId (militantes):', militanteError)
                throw militanteError
            }

            const m: any = militanteRow || {}

            // Batch fetch related records where possible
            let usuario: any = null
            if (m.usuario_id) {
                const { data: uData } = await supabase.from('usuarios').select('id, nombres, apellidos, numero_documento, tipo_documento, celular, email, ciudad_id, zona_id, compromiso_marketing, compromiso_cautivo, compromiso_impacto').eq('id', m.usuario_id).single()
                usuario = uData || null
            }

            let perfilNombre: string | null = null
            if (m.perfil_id) {
                const { data: pData } = await supabase.from('perfiles').select('id, nombre').eq('id', m.perfil_id).single()
                perfilNombre = pData ? (pData as any).nombre : null
            }

            // coordinador lookup
            let coordinadorNombre: string | null = null
            let coordinadorEmail: string | null = null
            if (m.coordinador_id) {
                const { data: coordData } = await supabase.from('coordinadores').select('id, usuario_id, email').eq('id', m.coordinador_id).single()
                if (coordData) {
                    coordinadorEmail = (coordData as any).email || null
                    const coordUsuarioId = (coordData as any).usuario_id
                    if (coordUsuarioId) {
                        const { data: cu } = await supabase.from('usuarios').select('nombres, apellidos').eq('id', coordUsuarioId).single()
                        if (cu) coordinadorNombre = `${(cu as any).nombres || ''} ${(cu as any).apellidos || ''}`.trim() || null
                    }
                }
            }

            // tipo resolution (try by id then by codigo)
            let tipoDescripcion: string | null = null
            let tipoCodigo: any = null
            if (m.tipo !== undefined && m.tipo !== null) {
                const tipoRaw = String(m.tipo)
                // try by id
                let tipoRow: any = null
                try {
                    const { data: tById } = await supabase.from('tipos_militante').select('id, codigo, descripcion').eq('id', tipoRaw).single()
                    tipoRow = tById || null
                } catch (_) {
                    // ignore
                }
                if (!tipoRow) {
                    try {
                        const { data: tByCodigo } = await supabase.from('tipos_militante').select('id, codigo, descripcion').eq('codigo', tipoRaw).single()
                        tipoRow = tByCodigo || null
                    } catch (_) {
                        // ignore
                    }
                }
                if (tipoRow) {
                    tipoDescripcion = tipoRow.descripcion
                    tipoCodigo = tipoRow.codigo
                } else {
                    tipoDescripcion = m.tipo
                    tipoCodigo = String(m.tipo)
                }
            }

            const result: any = {
                ...m,
                militante_id: m.id,
                usuario_id: m.usuario_id,
                nombres: usuario ? usuario.nombres : null,
                apellidos: usuario ? usuario.apellidos : null,
                numero_documento: usuario ? usuario.numero_documento : null,
                tipo_documento: usuario ? usuario.tipo_documento : null,
                celular: usuario ? usuario.celular : null,
                usuario_email: usuario ? usuario.email : null,
                ciudad_nombre: null,
                zona_nombre: null,
                perfil_nombre: perfilNombre || null,
                coordinador_nombre: coordinadorNombre,
                coordinador_email: coordinadorEmail,
                tipo: m.tipo,
                tipo_descripcion: tipoDescripcion,
                tipo_codigo: tipoCodigo,
            }

            return result as Militante
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido')
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    async function crear(militanteData: CrearMilitanteData) {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/militante', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(militanteData),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error al crear militante')
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
    }

    async function actualizar(id: string, militanteData: ActualizarMilitanteData) {
        try {
            setLoading(true)
            setError(null)

            // Use server API to perform atomic update and sync usuarios
            const response = await fetch('/api/militante', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...militanteData }),
            })

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'Error actualizando militante' }))
                throw new Error(err?.error || 'Error actualizando militante')
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
    }

    async function eliminar(id: string) {
        try {
            setLoading(true)
            setError(null)

            // Usar cliente de Supabase directamente
            const { error: deleteError } = await supabase
                .from('militantes')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError

            return true
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido')
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    async function cambiarEstado(id: string, nuevoEstado: 'activo' | 'inactivo' | 'suspendido') {
        try {
            setLoading(true)
            setError(null)

            // Use the server API to update status to avoid client typing issues and to
            // leverage server-side sync logic (users <-> militantes)
            const res = await fetch('/api/militante', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, estado: nuevoEstado }),
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Error actualizando estado' }))
                throw new Error(err?.error || 'Error actualizando estado')
            }

            const data = await res.json()
            return data
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido')
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    return {
        listar,
        obtenerPorId,
        crear,
        actualizar,
        eliminar,
        cambiarEstado,
        loading,
        error,
    }
}

