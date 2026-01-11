'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CrearCoordinadorData {
    usuario_id: string
    email: string
    password: string
    perfil_id?: string | null
    referencia_coordinador_id?: string | null
    tipo: 'Coordinador' | 'Estructurador'
}

export async function crearCoordinadorAction(coordinadorData: CrearCoordinadorData) {
    try {
        // Crear admin client con manejo de errores mejorado
        const adminClient = createAdminClient()

        let { usuario_id, email, password, perfil_id, referencia_coordinador_id, tipo } = coordinadorData

        // Validaciones básicas
        if (!usuario_id || !email || !password || !tipo) {
            throw new Error('Faltan campos requeridos: usuario_id, email, password y tipo son obligatorios')
        }

        // Validar formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(usuario_id)) {
            throw new Error(`usuario_id no tiene formato UUID válido: ${usuario_id}`)
        }

        // Sanitización de campos UUID vacíos
        if (perfil_id === "") perfil_id = null
        if (referencia_coordinador_id === "") referencia_coordinador_id = null

        // Validar referencia_coordinador_id si se proporciona
        if (referencia_coordinador_id) {
            if (!uuidRegex.test(referencia_coordinador_id)) {
                throw new Error(`referencia_coordinador_id no tiene formato UUID válido: ${referencia_coordinador_id}`)
            }

            // Verificar que el coordinador de referencia existe
            const { data: coordinadorRef, error: refError } = await adminClient
                .from('coordinadores')
                .select('id')
                .eq('id', referencia_coordinador_id)
                .single()

            if (refError || !coordinadorRef) {
                throw new Error(`El coordinador de referencia no existe con ID: ${referencia_coordinador_id}`)
            }
        }

        // 1. Verificar que el usuario existe
        const { data: usuario, error: usuarioError } = await adminClient
            .from('usuarios')
            .select('id, nombres, apellidos, numero_documento, email')
            .eq('id', usuario_id)
            .single()

        if (usuarioError || !usuario) {
            console.error('❌ Error buscando usuario:', usuarioError)
            throw new Error(`Usuario no encontrado: ${usuarioError?.message || 'No existe'}`)
        }

        // 2. Verificar que el email no esté registrado
        const { data: emailExistente } = await adminClient
            .from('coordinadores')
            .select('id')
            .eq('email', email)
            .single()

        if (emailExistente) {
            throw new Error('El email ya está registrado')
        }

        // 2b. Verificar si ya existe un usuario en Auth con el mismo email
        try {
            const { data: authUsers, error: authUsersError } = await adminClient
                .from('auth.users')
                .select('id')
                .eq('email', email)
                .limit(1)

            if (!authUsersError && authUsers && (Array.isArray(authUsers) ? authUsers.length > 0 : !!authUsers)) {
                throw new Error('El email ya está registrado en el sistema de autenticación')
            }
        } catch (err) {
            console.warn('Error verificando auth.users:', err)
            // Continuar, el createUser manejará cualquier conflicto
        }

        // 3. Crear usuario en Auth usando adminClient
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        })

        if (authError) {
            console.error('❌ Error creando usuario en Auth:', authError)
            const errMsg = (authError.message || '').toLowerCase()
            if (errMsg.includes('already') || errMsg.includes('duplicate')) {
                throw new Error('El email ya está registrado')
            }
            throw new Error('Error creando usuario en el sistema de autenticación')
        }

        // 4. Crear coordinador en la tabla
        const { data: coordinador, error: coordinadorError } = await adminClient
            .from('coordinadores')
            .insert({
                usuario_id,
                email,
                password, // Guardar contraseña en la tabla según requerimiento
                auth_user_id: authData.user.id,
                perfil_id,
                referencia_coordinador_id,
                tipo,
            })
            .select()
            .single()

        if (coordinadorError) {
            console.error('❌ Error creando coordinador en tabla:', coordinadorError)
            // Si falla, limpiar el usuario de Auth
            try {
                await adminClient.auth.admin.deleteUser(authData.user.id)
            } catch (deleteError) {
                console.error('❌ Error limpiando usuario auth tras fallo:', deleteError)
            }
            throw new Error(coordinadorError.message)
        }

        // 5. Asignar perfil al usuario si se proporcionó
        if (perfil_id) {
            const { error: perfilError } = await adminClient
                .from('usuario_perfil')
                .insert({
                    usuario_id,
                    perfil_id,
                    es_principal: true,
                    activo: true,
                })

            if (perfilError) {
                console.error('Error asignando perfil:', perfilError)
                // No fallar por esto, solo loguear
            }
        }

        // Revalidar caché de coordinadores
        revalidatePath('/dashboard/coordinador')
        
        return coordinador

    } catch (error: any) {
        console.error('Error en crearCoordinadorAction:', error)
        throw new Error(error.message || 'Error interno del servidor')
    }
}