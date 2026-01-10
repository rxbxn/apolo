'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import type { User } from '@supabase/supabase-js'

type Usuario = Database['public']['Tables']['usuarios']['Row']

interface AuthContextType {
    user: User | null
    usuario: Usuario | null
    loading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [usuario, setUsuario] = useState<Usuario | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        try {
            // Verificar sesión actual
            supabase.auth.getSession().then(({ data: { session }, error }) => {
                if (error) {
                    console.error('❌ Error obteniendo sesión:', error)
                    setLoading(false)
                    return
                }
                
                setUser(session?.user ?? null)
                if (session?.user) {
                    cargarUsuario(session.user.id)
                } else {
                    setLoading(false)
                }
            }).catch(error => {
                console.error('❌ Error en getSession:', error)
                setLoading(false)
            })

            // Escuchar cambios de autenticación
            const {
                data: { subscription },
            } = supabase.auth.onAuthStateChange((_event, session) => {
                setUser(session?.user ?? null)
                if (session?.user) {
                    cargarUsuario(session.user.id)
                } else {
                    setUsuario(null)
                    setLoading(false)
                }
            })

            return () => subscription.unsubscribe()
        } catch (error) {
            console.error('❌ Error inicializando AuthProvider:', error)
            setLoading(false)
        }
    }, [])

    async function cargarUsuario(authUserId: string) {
        try {
            const { data: usuarioData, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('auth_user_id', authUserId)
                .single()

            if (error) {
                console.error('Error cargando usuario:', error)
            } else {
                setUsuario(usuarioData)
            }
        } catch (error) {
            console.error('Error en cargarUsuario:', error)
        } finally {
            setLoading(false)
        }
    }

    async function signOut() {
        try {
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
