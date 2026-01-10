import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Instancia singleton del cliente de Supabase
let supabaseInstance: SupabaseClient<Database> | null = null

// Variables de entorno con valores por defecto para evitar errores
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export function createClient(): SupabaseClient<Database> {
    // Si ya existe una instancia, retornarla (patrón singleton)
    if (supabaseInstance) {
        return supabaseInstance
    }

    console.log('🔍 Creando cliente Supabase:', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        urlValue: SUPABASE_URL?.substring(0, 50) + '...',
        keyLength: SUPABASE_ANON_KEY?.length,
        env: process.env.NODE_ENV,
        isServer: typeof window === 'undefined',
        isPlaceholder: SUPABASE_URL === 'https://placeholder.supabase.co'
    })

    // Durante el build O cuando las variables no están disponibles, usar placeholders
    if (SUPABASE_URL === 'https://placeholder.supabase.co' || SUPABASE_ANON_KEY === 'placeholder-key') {
        if (typeof window === 'undefined') {
            // En el servidor/build, usar placeholders sin error
            console.warn('🚧 Using placeholder Supabase credentials during build/server')
            supabaseInstance = createBrowserClient(
                'https://placeholder.supabase.co',
                'placeholder-key',
                {
                    auth: { persistSession: false, autoRefreshToken: false }
                }
            )
            return supabaseInstance
        } else {
            // En el cliente, si las variables son placeholder, mostrar error informativo pero no fallar
            console.error('❌ Supabase environment variables not properly configured in client')
            
            // Crear cliente con placeholders que no falle completamente
            supabaseInstance = createBrowserClient(
                'https://placeholder.supabase.co',
                'placeholder-key',
                {
                    auth: { persistSession: false, autoRefreshToken: false }
                }
            )
            return supabaseInstance
        }
    }

    // Variables válidas - crear cliente normal
    console.log('✅ Creating Supabase client with valid credentials')
    supabaseInstance = createBrowserClient<Database>(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                flowType: 'pkce',
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
            },
            global: {
                headers: {
                    'x-application-name': 'apolo-app',
                },
            },
        }
    )

    return supabaseInstance
}

// Exportar la instancia singleton
export const supabase = createClient()
export default supabase
