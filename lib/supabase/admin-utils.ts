import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/supabase'

interface CreateUserOptions {
  email: string
  password: string
  metadata?: Record<string, any>
}

interface CreateUserResult {
  user: any
  error: Error | null
}

export async function createAuthUser({ email, password, metadata }: CreateUserOptions): Promise<CreateUserResult> {
  try {
    // Primero intentar con admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (supabaseUrl && serviceRoleKey) {
      console.log('🔑 Intentando crear usuario con admin client...')
      
      const adminClient = createClient<Database>(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata
      })

      if (!error && data.user) {
        console.log('✅ Usuario creado con admin client')
        return { user: data.user, error: null }
      }
      
      console.warn('⚠️ Admin client falló, intentando método alternativo:', error?.message)
    }

    // Método alternativo: usar client regular + signup
    console.log('🔄 Usando método alternativo con client regular...')
    
    const publicClient = createClient<Database>(
      supabaseUrl!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Intentar signup con confirmación automática
    const { data, error } = await publicClient.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: undefined // No redirigir
      }
    })

    if (error) {
      console.error('❌ Error en signup alternativo:', error)
      return { user: null, error }
    }

    if (!data.user) {
      return { user: null, error: new Error('No se pudo crear el usuario') }
    }

    // Si el usuario necesita confirmación, intentamos confirmar automáticamente
    if (!data.user.email_confirmed_at && data.user.confirmation_token) {
      console.log('🔄 Intentando confirmar email automáticamente...')
      
      try {
        // Buscar en logs o usar API directa si es posible
        const { error: confirmError } = await publicClient.auth.verifyOtp({
          email,
          token: data.user.confirmation_token || '',
          type: 'signup'
        })
        
        if (confirmError) {
          console.warn('⚠️ No se pudo confirmar email automáticamente:', confirmError.message)
        } else {
          console.log('✅ Email confirmado automáticamente')
        }
      } catch (confirmError) {
        console.warn('⚠️ Error confirmando email:', confirmError)
      }
    }

    console.log('✅ Usuario creado con método alternativo')
    return { user: data.user, error: null }

  } catch (error) {
    console.error('❌ Error general en createAuthUser:', error)
    return { 
      user: null, 
      error: error instanceof Error ? error : new Error('Error desconocido') 
    }
  }
}

export async function deleteAuthUser(userId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return { 
        success: false, 
        error: new Error('Configuración de admin client no disponible') 
      }
    }

    const adminClient = createClient<Database>(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { error } = await adminClient.auth.admin.deleteUser(userId)

    if (error) {
      console.error('❌ Error eliminando usuario de auth:', error)
      return { success: false, error }
    }

    console.log('✅ Usuario de auth eliminado correctamente')
    return { success: true, error: null }

  } catch (error) {
    console.error('❌ Error general en deleteAuthUser:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Error desconocido') 
    }
  }
}