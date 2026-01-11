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
    console.log('🔐 Iniciando creación de usuario Auth para:', email)
    
    // Primero intentar con admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (supabaseUrl && serviceRoleKey) {
      console.log('🔑 Usando admin client para crear usuario...')
      
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
        email_confirm: true, // Confirmar automáticamente
        phone_confirm: true,  // Confirmar teléfono también
        user_metadata: metadata || {}
      })

      if (!error && data.user) {
        console.log('✅ Usuario creado exitosamente con admin client:', data.user.id)
        return { user: data.user, error: null }
      }
      
      console.error('❌ Error con admin client:', {
        message: error?.message,
        status: error?.status,
        name: error?.name
      })
      
      // Si es un error de confirmación de email, intentar crear sin confirmación
      if (error?.message?.includes('confirmation') || error?.message?.includes('email')) {
        console.log('🔄 Reintentando sin confirmación de email...')
        
        const { data: retryData, error: retryError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: false, // No confirmar email
          user_metadata: metadata || {}
        })
        
        if (!retryError && retryData.user) {
          console.log('✅ Usuario creado sin confirmación de email:', retryData.user.id)
          return { user: retryData.user, error: null }
        }
        
        console.warn('⚠️ También falló sin confirmación:', retryError?.message)
      }
      
      return { user: null, error }
    }

    throw new Error('Credenciales de admin no disponibles')

  } catch (error) {
    console.error('❌ Error creando usuario Auth:', error)
    return { 
      user: null, 
      error: error instanceof Error ? error : new Error('Error desconocido creando usuario') 
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