"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export interface SolicitudGestion {
    id?: number
    formato_id?: number
    elemento: string
    unidad: string
    categoria: string
    sector: string
    cantidad: number
    orden: number
}

export interface FormatoGestion {
    id?: number
    numero_formulario: string
    militante: string
    dirigente: string
    coordinador: string
    telefono: string
    localidad: string
    receptor: string
    estado_difusion: boolean
    limpio_count: number
    limpio_pendiente: number
    lider_codigo: string
    tipo_gestion: string
    gestor_asignado: string
    solicitud: string
    fecha_necesidad: string // Date string
    autorizacion_total: number
    entregas_fecha: string // Date string
    prioridad: string
    observaciones_prioridad: string
    observaciones_generales: string
    solicitudes?: SolicitudGestion[]
    created_at?: string
    updated_at?: string
    created_by?: string
}

export async function getGestiones() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
        .from("vw_formato_gestion_completo")
        .select("*")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching gestiones:", error)
        return []
    }

    return data
}

export async function getGestionById(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
        .from("vw_formato_gestion_completo")
        .select("*")
        .eq("id", id)
        .single()

    if (error) {
        console.error("Error fetching gestion:", error)
        return null
    }

    return data
}

export async function createGestion(formato: FormatoGestion) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase.rpc("insert_formato_gestion", {
        p_numero_formulario: formato.numero_formulario,
        p_militante: formato.militante,
        p_dirigente: formato.dirigente,
        p_coordinador: formato.coordinador,
        p_telefono: formato.telefono,
        p_localidad: formato.localidad,
        p_receptor: formato.receptor,
        p_estado_difusion: formato.estado_difusion,
        p_limpio_count: formato.limpio_count,
        p_limpio_pendiente: formato.limpio_pendiente,
        p_lider_codigo: formato.lider_codigo,
        p_tipo_gestion: formato.tipo_gestion,
        p_gestor_asignado: formato.gestor_asignado,
        p_solicitud: formato.solicitud,
        p_fecha_necesidad: formato.fecha_necesidad,
        p_autorizacion_total: formato.autorizacion_total,
        p_entregas_fecha: formato.entregas_fecha,
        p_prioridad: formato.prioridad,
        p_observaciones_prioridad: formato.observaciones_prioridad,
        p_observaciones_generales: formato.observaciones_generales,
        p_solicitudes: formato.solicitudes || [],
    })

    if (error) {
        console.error("Error creating gestion:", error)
        throw new Error("Error al crear el formato de gestión")
    }

    revalidatePath("/dashboard/gestion-gerencial")
    return data
}

export async function updateGestion(id: number, formato: FormatoGestion) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // 1. Update main table
    const { error: updateError } = await supabase
        .from("formato_gestion_compromisos")
        .update({
            numero_formulario: formato.numero_formulario,
            militante: formato.militante,
            dirigente: formato.dirigente,
            coordinador: formato.coordinador,
            telefono: formato.telefono,
            localidad: formato.localidad,
            receptor: formato.receptor,
            estado_difusion: formato.estado_difusion,
            limpio_count: formato.limpio_count,
            limpio_pendiente: formato.limpio_pendiente,
            lider_codigo: formato.lider_codigo,
            tipo_gestion: formato.tipo_gestion,
            gestor_asignado: formato.gestor_asignado,
            solicitud: formato.solicitud,
            fecha_necesidad: formato.fecha_necesidad,
            autorizacion_total: formato.autorizacion_total,
            entregas_fecha: formato.entregas_fecha,
            prioridad: formato.prioridad,
            observaciones_prioridad: formato.observaciones_prioridad,
            observaciones_generales: formato.observaciones_generales,
        })
        .eq("id", id)

    if (updateError) {
        console.error("Error updating gestion:", updateError)
        throw new Error("Error al actualizar el formato de gestión")
    }

    // 2. Sync requests (Delete all and re-insert for simplicity, or smart update)
    // For now, let's delete all existing requests for this format and insert the new ones
    // This is safe because we have the full list from the form

    const { error: deleteError } = await supabase
        .from("solicitudes_gestion")
        .delete()
        .eq("formato_id", id)

    if (deleteError) {
        console.error("Error deleting old requests:", deleteError)
        throw new Error("Error al actualizar las solicitudes")
    }

    if (formato.solicitudes && formato.solicitudes.length > 0) {
        const solicitudesToInsert = formato.solicitudes.map((s) => ({
            formato_id: id,
            elemento: s.elemento,
            unidad: s.unidad,
            categoria: s.categoria,
            sector: s.sector,
            cantidad: s.cantidad,
            orden: s.orden,
        }))

        const { error: insertError } = await supabase
            .from("solicitudes_gestion")
            .insert(solicitudesToInsert)

        if (insertError) {
            console.error("Error inserting new requests:", insertError)
            throw new Error("Error al insertar las nuevas solicitudes")
        }
    }

    revalidatePath("/dashboard/gestion-gerencial")
    revalidatePath(`/dashboard/gestion-gerencial/${id}`)
    return true
}

export async function deleteGestion(id: number) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase
        .from("formato_gestion_compromisos")
        .delete()
        .eq("id", id)

    if (error) {
        console.error("Error deleting gestion:", error)
        throw new Error("Error al eliminar el formato de gestión")
    }

    revalidatePath("/dashboard/gestion-gerencial")
    return true
}

export async function getUsuariosForSelect() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombres, apellidos, numero_documento")
        .order("nombres")

    if (error) {
        console.error("Error fetching usuarios:", error)
        return []
    }

    return data
}
