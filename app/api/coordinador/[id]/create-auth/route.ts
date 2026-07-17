import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string | string[] }> }) {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)
        let adminClient: any = null
        try {
            adminClient = createAdminClient()
        } catch (e) {
            console.error('No se pudo crear adminClient:', e)
            return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 })
        }

        // Next.js 15+: `params` es una Promise y hay que resolverla antes de
        // leer sus propiedades (si no, tira "params.id used before await" y
        // el id llega undefined — esto rompía la creación automática de
        // usuario de Auth al editar coordinador).
        const resolvedParams = await params
        // Normalize/sanitize id param
        const rawId = resolvedParams?.id
        let id = Array.isArray(rawId) ? rawId[0] : rawId
        id = typeof id === 'string' ? id.trim().replace(/^"|"$/g, '') : String(id || '')

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!id || id.toLowerCase() === 'undefined' || id.toLowerCase() === 'null' || !uuidRegex.test(id)) {
            console.warn('POST /api/coordinador/[id]/create-auth - id inválido:', rawId)
            return NextResponse.json({ error: `ID no tiene formato UUID válido: ${rawId}` }, { status: 400 })
        }

        // Verificar permiso ADMIN
        try {
            const { data: sessionData } = await supabase.auth.getSession()
            const requestUserId = sessionData?.session?.user?.id
            if (!requestUserId) {
                return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
            }

            const { data: usuarioRow } = await supabase.from('usuarios').select('id').eq('auth_user_id', requestUserId).single()
            if (!usuarioRow) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

            // Bypass para Super Admin, igual que en el resto de la app
            // (obtenerPermisosCRUD en el cliente ya lo hace así). Sin esto,
            // un Super Admin cuyo perfil no tenga filas explícitas en
            // perfil_permiso_modulo para "Módulo Coordinador" quedaba
            // bloqueado aquí por la RPC tiene_permiso, aunque en el resto de
            // la interfaz se le trate como acceso total — esto hacía que
            // "Crear usuario en Auth" fallara en silencio (403) incluso para
            // el admin del sistema.
            const { data: perfilesUsuario } = await adminClient
                .from('usuario_perfil')
                .select('perfiles(nombre)')
                .eq('usuario_id', (usuarioRow as any).id)
                .eq('activo', true)
            const esSuperAdmin = (perfilesUsuario || []).some(
                (p: any) => p.perfiles && typeof p.perfiles.nombre === 'string' && p.perfiles.nombre.toLowerCase() === 'super admin'
            )

            if (!esSuperAdmin) {
                const { data: permiso } = await supabase.rpc('tiene_permiso', {
                    p_usuario_id: (usuarioRow as any).id,
                    p_modulo_nombre: 'Módulo Coordinador',
                    p_permiso_codigo: 'ADMIN',
                })

                if (!permiso) return NextResponse.json({ error: 'No tienes permiso de administrador en el Módulo Coordinador para crear cuentas de acceso' }, { status: 403 })
            }
        } catch (e) {
            console.error('Error verificando permisos:', e)
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        // Leer body (opcional) para permitir override de email
        let body: any = {}
        try {
            body = await request.json()
        } catch (e) {
            body = {}
        }

    // Obtener el coordinador (no leemos password desde la BD)
    const { data: coordRow, error: coordErr } = await adminClient.from('coordinadores').select('id, email, auth_user_id').eq('id', id).single()

        if (coordErr) {
            const msg = (coordErr?.message || '').toLowerCase()
            if (msg.includes('invalid input syntax for type uuid') || msg.includes('invalid input')) {
                console.warn('POST /api/coordinador/[id]/create-auth - uuid parse error from DB:', coordErr.message)
                return NextResponse.json({ error: `ID no tiene formato UUID válido: ${id}` }, { status: 400 })
            }

            console.error('Error obteniendo coordinador:', coordErr)
            return NextResponse.json({ error: 'Coordinador no encontrado' }, { status: 404 })
        }

        if (!coordRow) {
            return NextResponse.json({ error: 'Coordinador no encontrado' }, { status: 404 })
        }

        if (coordRow.auth_user_id) {
            return NextResponse.json({ error: 'El coordinador ya tiene un usuario de autenticación vinculado' }, { status: 400 })
        }

        // El password puede venir en el body (desde el formulario) o generarlo en servidor.
        const email = (body && body.email && String(body.email).trim().length > 0) ? String(body.email).trim() : coordRow.email
        let password = (body && body.password && String(body.password).trim().length > 0) ? String(body.password).trim() : null
        if (!password) {
            // Generar una contraseña segura temporal si no se proporciona (Node crypto)
            try {
                const { randomBytes } = await import('crypto')
                password = `ApoL0-${randomBytes(12).toString('base64url').slice(0,12)}`
            } catch (e) {
                // Fallback seguro
                password = `ApoL0-${Math.random().toString(36).slice(2,14)}`
            }
        }

        try {
            const authAdmin: any = adminClient.auth.admin
            const { data: createdUser, error: createErr } = await authAdmin.createUser({
                email,
                password,
                email_confirm: true,
            })

            if (createErr) {
                const msg = (createErr.message || '').toLowerCase()
                if (msg.includes('already') || msg.includes('duplicate')) {
                    // Vincular con usuario existente y actualizar contraseña
                    const { data: existingAuth, error: findErr } = await adminClient.from('auth.users').select('id').eq('email', email).single()
                    if (findErr || !existingAuth) {
                        console.error('Error buscando usuario existente en Auth:', findErr)
                        return NextResponse.json({ error: 'Error creando usuario en Auth' }, { status: 500 })
                    }

                    const existingId = (existingAuth as any).id

                    if (typeof authAdmin.updateUserById === 'function') {
                        const { error: authUpdateError } = await authAdmin.updateUserById(existingId, { password })
                        if (authUpdateError) {
                            console.error('Error actualizando contraseña en Auth (usuario existente):', authUpdateError)
                            return NextResponse.json({ error: `Error actualizando la contraseña en Auth: ${authUpdateError.message || authUpdateError}` }, { status: 500 })
                        }
                    } else if (typeof authAdmin.updateUser === 'function') {
                        const { error: authUpdateError } = await authAdmin.updateUser(existingId, { password })
                        if (authUpdateError) {
                            console.error('Error actualizando contraseña en Auth (usuario existente):', authUpdateError)
                            return NextResponse.json({ error: `Error actualizando la contraseña en Auth: ${authUpdateError.message || authUpdateError}` }, { status: 500 })
                        }
                    }

                    // Vincular
                    const { data: updatedCoord, error: updateErr } = await adminClient.from('coordinadores').update({ auth_user_id: existingId }).eq('id', id).select().single()
                    if (updateErr) {
                        console.error('Error actualizando coordinador con auth_user_id:', updateErr)
                        return NextResponse.json({ error: 'Error actualizando coordinador' }, { status: 500 })
                    }

                    return NextResponse.json({ ...updatedCoord, _auth_action: { action: 'linked', auth_user_id: existingId } })
                }

                console.error('Error creando usuario en Auth:', createErr)
                return NextResponse.json({ error: 'Error creando usuario en Auth' }, { status: 500 })
            }

            // Usuario creado
            const authUserId = (createdUser as any).user?.id
            const { data: updatedCoord, error: updateErr } = await adminClient.from('coordinadores').update({ auth_user_id: authUserId }).eq('id', id).select().single()

            if (updateErr) {
                console.error('Error actualizando coordinador con auth_user_id:', updateErr)
                // Intentar limpiar usuario creado
                try {
                    await adminClient.auth.admin.deleteUser(authUserId)
                } catch (cleanupErr) {
                    console.error('Error limpiando usuario Auth después de fallo en DB update:', cleanupErr)
                }
                return NextResponse.json({ error: 'Error actualizando coordinador' }, { status: 500 })
            }

            return NextResponse.json({ ...updatedCoord, _auth_action: { action: 'created', auth_user_id: authUserId } })
        } catch (e) {
            console.error('Error creando o vinculando usuario en Auth:', e)
            return NextResponse.json({ error: 'Error creando usuario en Auth' }, { status: 500 })
        }
    } catch (error) {
        console.error('Error en POST /api/coordinador/[id]/create-auth:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
