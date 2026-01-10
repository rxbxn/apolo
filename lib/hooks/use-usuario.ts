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
            } catch (err) {
                console.error('Error cargando usuario:', err)
                setError(err instanceof Error ? err : new Error('Error desconocido'))
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
