// This file has been cleaned up to provide a functional API for roles without duplicates or old fragments.

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET: Listar usuarios y roles
export async function GET(request: Request) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '10')
        const search = searchParams.get('search') || ''

        // Perfiles
        const { data: perfiles, error: perfilesError } = await supabase
            .from("perfiles")
            .select("*")
            .eq("activo", true)
            .order("nivel_jerarquico", { ascending: true })
        if (perfilesError) return NextResponse.json({ error: perfilesError.message }, { status: 500 })

        // Usuarios con paginación
        let query = supabase
            .from("usuarios")
            .select("id, nombres, apellidos, email, auth_user_id, estado, numero_documento", { count: 'exact' })
            .order("nombres", { ascending: true })

        if (search) {
            query = query.or(`nombres.ilike.%${search}%,apellidos.ilike.%${search}%,email.ilike.%${search}%`)
        }

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        const { data: usuarios, error: usuariosError, count } = await query.range(from, to)
        if (usuariosError) return NextResponse.json({ error: usuariosError.message }, { status: 500 })
        // Asignaciones usuario_perfil
        const { data: usuarioPerfil } = await supabase
            .from("usuario_perfil")
            .select("id, usuario_id, perfil_id, es_principal, activo, perfiles (id, nombre, nivel_jerarquico)")
            .eq("activo", true)
        // user_roles
        const { data: userRoles } = await supabase
            .from("user_roles")
            .select("*")
        // Combinar datos
        const usuariosConRoles = (usuarios || []).map((u: any) => {
            const perfilAsignado = (usuarioPerfil || []).find((up: any) => up.usuario_id === u.id && up.activo)
            const userRole = (userRoles || []).find((ur: any) => ur.user_id === u.auth_user_id)
            return {
                ...u,
                perfil_asignado: perfilAsignado?.perfiles || null,
                perfil_id: perfilAsignado?.perfil_id || null,
                user_role: userRole?.role || null,
            }
        })
        return NextResponse.json({ 
            usuarios: usuariosConRoles, 
            perfiles: perfiles || [], 
            total: count || 0,
            page,
            pageSize
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// POST: Asignar rol a usuario o crear un nuevo rol
export async function POST(request: Request) {
    try {
        const body = await request.json()
        // Crear nuevo rol
        if (body.crear_rol) {
            const { nombre, descripcion, nivel_jerarquico } = body
            if (!nombre || nivel_jerarquico === undefined) {
                return NextResponse.json({ error: "nombre y nivel_jerarquico son requeridos" }, { status: 400 })
            }
            const supabase = createClient(supabaseUrl, supabaseServiceKey)
            const { data: perfil, error } = await supabase
                .from("perfiles")
                .insert({ nombre, descripcion, nivel_jerarquico, activo: true })
                .select()
                .single()
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            return NextResponse.json({ success: true, message: "Rol creado", perfil })
        }
        // Asignar rol a usuario
        const { usuario_id, perfil_id, auth_user_id } = body
        if (!usuario_id || !perfil_id) {
            return NextResponse.json({ error: "usuario_id y perfil_id son requeridos" }, { status: 400 })
        }
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Obtener datos del usuario
        const { data: usuario, error: usuarioError } = await supabase
            .from("usuarios")
            .select("id, nombres, apellidos, email, auth_user_id, numero_documento")
            .eq("id", usuario_id)
            .single()
        if (usuarioError || !usuario) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
        }

        let finalAuthUserId = auth_user_id || usuario.auth_user_id

        // Si no tiene auth_user_id, crear usuario en Supabase Auth
        if (!finalAuthUserId) {
            if (!usuario.email) {
                return NextResponse.json({ error: "El usuario debe tener un email para crear la cuenta de autenticación" }, { status: 400 })
            }

            if (!usuario.numero_documento) {
                return NextResponse.json({ error: "El usuario debe tener número de documento para crear la contraseña temporal" }, { status: 400 })
            }

            try {
                // Crear usuario en Supabase Auth
                const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                    email: usuario.email,
                    password: usuario.numero_documento, // Usar número de documento como contraseña
                    email_confirm: true, // Confirmar email automáticamente
                    user_metadata: {
                        nombres: usuario.nombres,
                        apellidos: usuario.apellidos,
                        numero_documento: usuario.numero_documento,
                        full_name: `${usuario.nombres} ${usuario.apellidos}`
                    }
                })

                if (authError) {
                    console.error('Error creando usuario en auth:', authError)
                    return NextResponse.json({ error: `Error creando cuenta de autenticación: ${authError.message}` }, { status: 500 })
                }

                finalAuthUserId = authUser.user.id

                // Actualizar el auth_user_id en la tabla usuarios
                const { error: updateError } = await supabase
                    .from("usuarios")
                    .update({ auth_user_id: finalAuthUserId })
                    .eq("id", usuario_id)

                if (updateError) {
                    console.error('Error actualizando auth_user_id:', updateError)
                    // No retornamos error aquí porque el usuario ya se creó en auth
                }

            } catch (err: any) {
                console.error('Error en creación de auth user:', err)
                return NextResponse.json({ error: `Error creando usuario de autenticación: ${err.message}` }, { status: 500 })
            }
        }

        // Obtener el nombre del perfil
        const { data: perfil, error: perfilError } = await supabase
            .from("perfiles")
            .select("id, nombre")
            .eq("id", perfil_id)
            .single()
        if (perfilError || !perfil) {
            return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })
        }

        // Desactivar asignaciones anteriores
        await supabase
            .from("usuario_perfil")
            .update({ activo: false, fecha_revocacion: new Date().toISOString() })
            .eq("usuario_id", usuario_id)
            .eq("activo", true)

        // Insertar nueva asignación
        const { data: newAssignment, error: insertError } = await supabase
            .from("usuario_perfil")
            .insert({ usuario_id, perfil_id, es_principal: true, activo: true, fecha_asignacion: new Date().toISOString() })
            .select()
            .single()
        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

        // Actualizar user_roles
        if (finalAuthUserId) {
            await supabase.from("user_roles").delete().eq("user_id", finalAuthUserId)
            await supabase.from("user_roles").insert({
                user_id: finalAuthUserId,
                role: perfil.nombre,
                created_at: new Date().toISOString()
            })
        }

        const message = finalAuthUserId !== (auth_user_id || usuario.auth_user_id)
            ? `Rol "${perfil.nombre}" asignado correctamente. Se creó la cuenta de autenticación para el usuario.`
            : `Rol "${perfil.nombre}" asignado correctamente`

        return NextResponse.json({
            success: true,
            message,
            assignment: newAssignment,
            auth_created: finalAuthUserId !== (auth_user_id || usuario.auth_user_id)
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// PUT: Editar un rol existente
export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { perfil_id, nombre, descripcion, nivel_jerarquico } = body
        if (!perfil_id || !nombre || nivel_jerarquico === undefined) {
            return NextResponse.json({ error: "perfil_id, nombre y nivel_jerarquico son requeridos" }, { status: 400 })
        }
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { data: perfil, error } = await supabase
            .from("perfiles")
            .update({ nombre, descripcion, nivel_jerarquico })
            .eq("id", perfil_id)
            .select()
            .single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, message: "Rol actualizado", perfil })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// DELETE: Quitar rol de usuario o eliminar un rol
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const usuario_id = searchParams.get("usuario_id")
        const auth_user_id = searchParams.get("auth_user_id")
        const perfil_id = searchParams.get("perfil_id")
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        // Eliminar rol (perfil) si se pasa perfil_id
        if (perfil_id) {
            // No eliminar si hay usuarios activos con ese perfil
            const { data: activos, error: activosError } = await supabase
                .from("usuario_perfil")
                .select("id")
                .eq("perfil_id", perfil_id)
                .eq("activo", true)
            if (activosError) return NextResponse.json({ error: activosError.message }, { status: 500 })
            if (activos && activos.length > 0) {
                return NextResponse.json({ error: "No se puede eliminar el rol porque hay usuarios activos con ese rol." }, { status: 400 })
            }
            const { error } = await supabase.from("perfiles").delete().eq("id", perfil_id)
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            return NextResponse.json({ success: true, message: "Rol eliminado" })
        }
        // Quitar rol de usuario
        if (!usuario_id) {
            return NextResponse.json({ error: "usuario_id es requerido" }, { status: 400 })
        }

        // Obtener el auth_user_id del usuario
        const { data: userData } = await supabase
            .from("usuarios")
            .select("auth_user_id")
            .eq("id", usuario_id)
            .single()

        await supabase
            .from("usuario_perfil")
            .update({ activo: false, fecha_revocacion: new Date().toISOString() })
            .eq("usuario_id", usuario_id)
            .eq("activo", true)

        if (userData?.auth_user_id || auth_user_id) {
            await supabase.from("user_roles").delete().eq("user_id", userData?.auth_user_id || auth_user_id)
        }

        return NextResponse.json({ success: true, message: "Rol removido correctamente" })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
