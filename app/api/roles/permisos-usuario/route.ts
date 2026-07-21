// API para administrar permisos de módulo POR USUARIO (usuario_permiso_modulo).
// Mismo patrón que /api/roles/permisos (por perfil), pero acá se le da acceso
// a módulos ADICIONALES a un usuario puntual, sin depender de su perfil.

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET: catálogo de módulos y permisos, más las asignaciones puntuales del
// usuario (si se pasa usuario_id) y los módulos que ya le llegan por su
// perfil (informativo, para no duplicar en la UI lo que ya tiene por rol).
export async function GET(request: Request) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { searchParams } = new URL(request.url)
        const usuarioId = searchParams.get("usuario_id")

        const { data: modulos, error: modulosError } = await supabase
            .from("modulos")
            .select("*")
            .eq("activo", true)
            .order("orden", { ascending: true, nullsFirst: false })
        if (modulosError) return NextResponse.json({ error: modulosError.message }, { status: 500 })

        const { data: permisos, error: permisosError } = await supabase
            .from("permisos")
            .select("*")
            .order("codigo", { ascending: true })
        if (permisosError) return NextResponse.json({ error: permisosError.message }, { status: 500 })

        let asignaciones: { modulo_id: string; permiso_id: string }[] = []
        let modulosPorPerfil: { modulo_id: string; permiso_id: string }[] = []

        if (usuarioId) {
            const { data: rows, error: asignError } = await supabase
                .from("usuario_permiso_modulo")
                .select("modulo_id, permiso_id")
                .eq("usuario_id", usuarioId)
            if (asignError) return NextResponse.json({ error: asignError.message }, { status: 500 })
            asignaciones = rows || []

            // Módulos que ya tiene por su perfil activo — se muestran en la UI
            // como referencia (no editables acá, se editan en "Permisos por rol").
            const { data: perfilActivo } = await supabase
                .from("usuario_perfil")
                .select("perfil_id")
                .eq("usuario_id", usuarioId)
                .eq("activo", true)
                .limit(1)
                .maybeSingle()

            if (perfilActivo?.perfil_id) {
                const { data: rowsPerfil } = await supabase
                    .from("perfil_permiso_modulo")
                    .select("modulo_id, permiso_id")
                    .eq("perfil_id", perfilActivo.perfil_id)
                modulosPorPerfil = rowsPerfil || []
            }
        }

        return NextResponse.json({
            modulos: modulos || [],
            permisos: permisos || [],
            asignaciones,
            modulosPorPerfil,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// PUT: reemplaza por completo los permisos puntuales de un usuario (borra lo
// existente en usuario_permiso_modulo y vuelve a insertar) — igual de simple
// y predecible que el equivalente por perfil.
export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { usuario_id, asignaciones } = body as {
            usuario_id: string
            asignaciones: { modulo_id: string; permiso_id: string }[]
        }

        if (!usuario_id) {
            return NextResponse.json({ error: "usuario_id es requerido" }, { status: 400 })
        }
        if (!Array.isArray(asignaciones)) {
            return NextResponse.json({ error: "asignaciones debe ser un arreglo" }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { error: deleteError } = await supabase
            .from("usuario_permiso_modulo")
            .delete()
            .eq("usuario_id", usuario_id)
        if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

        if (asignaciones.length > 0) {
            const filas = asignaciones.map((a) => ({
                usuario_id,
                modulo_id: a.modulo_id,
                permiso_id: a.permiso_id,
            }))
            const { error: insertError } = await supabase
                .from("usuario_permiso_modulo")
                .insert(filas)
            if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: "Permisos del usuario actualizados correctamente" })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
