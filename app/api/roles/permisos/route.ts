// API para administrar la matriz de permisos por rol (perfil_permiso_modulo).
// Permite, desde Gestión de Roles, decidir a qué módulos tiene acceso cada
// perfil y con qué permisos (CREATE/READ/UPDATE/DELETE/EXPORT/IMPORT/APPROVE/ADMIN).

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET: catálogo completo de módulos y permisos, más las asignaciones
// actuales. Si no se pasa perfil_id, solo devuelve el catálogo (módulos y
// permisos) sin asignaciones, útil para inicializar el selector de perfil.
export async function GET(request: Request) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { searchParams } = new URL(request.url)
        const perfilId = searchParams.get("perfil_id")

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

        const { data: perfiles, error: perfilesError } = await supabase
            .from("perfiles")
            .select("*")
            .eq("activo", true)
            .order("nivel_jerarquico", { ascending: true })
        if (perfilesError) return NextResponse.json({ error: perfilesError.message }, { status: 500 })

        let asignaciones: { modulo_id: string; permiso_id: string }[] = []
        if (perfilId) {
            const { data: rows, error: asignError } = await supabase
                .from("perfil_permiso_modulo")
                .select("modulo_id, permiso_id")
                .eq("perfil_id", perfilId)
            if (asignError) return NextResponse.json({ error: asignError.message }, { status: 500 })
            asignaciones = rows || []
        }

        return NextResponse.json({
            modulos: modulos || [],
            permisos: permisos || [],
            perfiles: perfiles || [],
            asignaciones,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// PUT: reemplaza por completo la matriz de permisos de un perfil (borra lo
// existente y vuelve a insertar). Más simple y predecible que hacer un diff
// checkbox por checkbox, y el volumen de filas por perfil es pequeño.
export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { perfil_id, asignaciones } = body as {
            perfil_id: string
            asignaciones: { modulo_id: string; permiso_id: string }[]
        }

        if (!perfil_id) {
            return NextResponse.json({ error: "perfil_id es requerido" }, { status: 400 })
        }
        if (!Array.isArray(asignaciones)) {
            return NextResponse.json({ error: "asignaciones debe ser un arreglo" }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { error: deleteError } = await supabase
            .from("perfil_permiso_modulo")
            .delete()
            .eq("perfil_id", perfil_id)
        if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

        if (asignaciones.length > 0) {
            const filas = asignaciones.map((a) => ({
                perfil_id,
                modulo_id: a.modulo_id,
                permiso_id: a.permiso_id,
            }))
            const { error: insertError } = await supabase
                .from("perfil_permiso_modulo")
                .insert(filas)
            if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: "Permisos actualizados correctamente" })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
