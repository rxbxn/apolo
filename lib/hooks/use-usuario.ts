'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type Usuario = Database['public']['Tables']['usuarios']['Row']

export function useUsuario() {
    const [usuario, setUsuario] = useState<Usuario | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        async function cargarUsuario() {
            try {
                setLoading(true)
                setError(null)

                // Obtener sesión actual
                const {
                    data: { session },
                    error: sessionError,
                } = await supabase.auth.getSession()

                if (sessionError) throw sessionError

                if (!session) {
                    setUsuario(null)
                    setLoading(false)
                    return
                }

                // Buscar usuario en tabla usuarios por auth_user_id
                const { data: usuarioData, error: usuarioError } = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('auth_user_id', session.user.id)
                    .single()

                if (usuarioError) {
                    // Si no existe el usuario en la tabla, podría ser un usuario nuevo
                    if (usuarioError.code === 'PGRST116') {
                        setUsuario(null)
                    } else {
                        throw usuarioError
                    }
                } else {
                    setUsuario(usuarioData)
                }
            } catch (err: any) {
                // Ignore empty throw object or PGRST116 (user not found)
                if (err && typeof err === 'object') {
                    const keys = Object.keys(err);
                    const isPostgrestNoRows = err.code === 'PGRST116' || err.details?.includes('contains 0 rows');
                    if (keys.length === 0 && !err.message && !isPostgrestNoRows) {
                        setError(null);
                    } else if (isPostgrestNoRows) {
                        setError(null);
                    } else {
                        console.error('Error cargando usuario:', err.message || err);
                        setError(err instanceof Error ? err : new Error(err.message || 'Error desconocido'));
                    }
                } else {
                    console.error('Error cargando usuario:', err);
                    setError(new Error(String(err)));
                }
            } finally {
                setLoading(false)
            }
        }

        cargarUsuario()

        // Suscribirse a cambios de autenticación
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                cargarUsuario()
            } else {
                setUsuario(null)
                setLoading(false)
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    return { usuario, loading, error }
}
