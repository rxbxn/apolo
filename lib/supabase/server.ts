import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export function createClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: any) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: any) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}

export function createAdminClient() {
    // Intentar múltiples formas de acceder a las variables de entorno
    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL

    const supabaseServiceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

    // Logging para debug (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Debug - Variables de entorno disponibles:')
        console.log('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ definida' : '❌ no definida')
        console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✅ definida' : '❌ no definida')
    }

    // Validación detallada
    if (!supabaseUrl) {
        throw new Error(
            'NEXT_PUBLIC_SUPABASE_URL is required to create a Supabase client!\n\n' +
            'Please add it to your .env.local file:\n' +
            'NEXT_PUBLIC_SUPABASE_URL=your-project-url\n\n' +
            'Find this value at: https://supabase.com/dashboard/project/_/settings/api'
        )
    }

    if (!supabaseServiceRoleKey) {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY is required to create a Supabase admin client!\n\n' +
            'Please add it to your .env.local file:\n' +
            'SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n\n' +
            'Find this value at: https://supabase.com/dashboard/project/_/settings/api\n\n' +
            '⚠️ IMPORTANT: This key should NOT have NEXT_PUBLIC_ prefix as it\'s a server-only secret.'
        )
    }

    return createSupabaseClient<Database>(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}
