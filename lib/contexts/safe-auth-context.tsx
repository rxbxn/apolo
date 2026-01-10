'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Database } from '@/lib/supabase/database.types'
import type { User } from '@supabase/supabase-js'

type Usuario = Database['public']['Tables']['usuarios']['Row']

interface AuthContextType {
    user: User | null
    usuario: Usuario | null
    loading: boolean
    error: string | null
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function SafeAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [usuario, setUsuario] = useState<Usuario | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true

        async function initializeAuth() {
            try {
                // Verificar que las variables de entorno estén disponibles
                if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
                    throw new Error('Supabase configuration missing')
                }

                // Importar dinámicamente el cliente de Supabase
                const { supabase } = await import('@/lib/supabase/client')
                
                // Verificar sesión actual
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                
                if (sessionError) {
                    throw sessionError
                }

                if (mounted) {
                    setUser(session?.user ?? null)
                    setError(null)
                    setLoading(false)
                }

                // Escuchar cambios de autenticación
                const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                    if (mounted) {
                        setUser(session?.user ?? null)
                        setError(null)
                    }
                })

                return () => subscription.unsubscribe()
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Authentication error')
                    setLoading(false)
                }
                console.error('❌ Error inicializando autenticación:', err)
            }
        }

        initializeAuth()

        return () => {
            mounted = false
        }
    }, [])

    async function signOut() {
        try {
            const { supabase } = await import('@/lib/supabase/client')
            await supabase.auth.signOut()
            setUser(null)
            setUsuario(null)
            window.location.href = '/login'
        } catch (error) {
            console.error('Error en logout:', error)
        }
    }

    const value = {
        user,
        usuario,
        loading,
        error,
        signOut,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider')
    }
    return context
}