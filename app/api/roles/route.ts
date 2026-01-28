// This file has been cleaned up to provide a functional API for roles without duplicates or old fragments.
"use server"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET: Listar usuarios y roles
export async function GET() {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        // Perfiles
        const { data: perfiles, error: perfilesError } = await supabase
            .from("perfiles")
            .select("*")
            .eq("activo", true)
            .order("nivel_jerarquico", { ascending: true })
        if (perfilesError) return NextResponse.json({ error: perfilesError.message }, { status: 500 })
        // Usuarios
        const { data: usuarios, error: usuariosError } = await supabase
            .from("usuarios")
            .select("id, nombres, apellidos, email, auth_user_id, estado")
            .order("nombres", { ascending: true })
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
        return NextResponse.json({ usuarios: usuariosConRoles, perfiles: perfiles || [] })
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
        // Actualizar user_roles si corresponde
        if (auth_user_id) {
            await supabase.from("user_roles").delete().eq("user_id", auth_user_id)
            await supabase.from("user_roles").insert({ user_id: auth_user_id, role: perfil.nombre, created_at: new Date().toISOString() })
        }
        return NextResponse.json({ success: true, message: `Rol "${perfil.nombre}" asignado correctamente`, assignment: newAssignment })
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
        await supabase
            .from("usuario_perfil")
            .update({ activo: false, fecha_revocacion: new Date().toISOString() })
            .eq("usuario_id", usuario_id)
            .eq("activo", true)
        if (auth_user_id) {
            await supabase.from("user_roles").delete().eq("user_id", auth_user_id)
        }
        return NextResponse.json({ success: true, message: "Rol removido correctamente" })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
