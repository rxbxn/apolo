"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export interface SolicitudGestion {
    id?: string
    formulario_id?: string
    elemento: string
    unidad: string
    categoria: string
    sector: string
    cantidad: number
    orden: number
}

export interface FormularioGestion {
    id?: string
    numero_formulario: string
    fecha_necesidad: string
    prioridad: string
    militante_id?: string
    dirigente_id?: string
    coordinador_id?: string
    telefono?: string
    localidad_id?: string
    localidad?: string
    receptor?: string
    estado_difusion?: string
    limpio_conteo?: number
    limpio_pendiente?: number
    codigo_lider?: string
    tipo_gestion?: string
    gestor_asignado?: string
    detalle_solicitud?: string
    autorizacion_total?: number
    fecha_entrega?: string
    observaciones_prioridad?: string
    observaciones_generales?: string
    estado?: string
    solicitudes?: SolicitudGestion[]
    creado_en?: string
    actualizado_en?: string
    creado_por?: string
}

export async function getGestiones() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        const { data: dataTabla, error: errorTabla } = await supabase
            .from("formularios_gestion")
            .select("*")
            .order("creado_en", { ascending: false })

        if (errorTabla) {
            console.error("Error fetching gestiones:", errorTabla)
            return []
        }

        return dataTabla || []

    } catch (error) {
        console.error("Error in getGestiones:", error)
        return []
    }
}

export async function getGestionById(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        console.log("Buscando formulario con ID:", id)

        if (!id || id === 'undefined' || id === 'null') {
            console.error("ID invalido:", id)
            return null
        }

        const { data: formulario, error: formularioError } = await supabase
            .from("formularios_gestion")
            .select("*")
            .eq("id", id)
            .single()

        if (formularioError) {
            console.error("Error en consulta:", formularioError)
            return null
        }

        if (!formulario) {
            console.error("No se encontro formulario:", id)
            return null
        }

        console.log("Formulario encontrado:", formulario.numero_formulario)

        const { data: solicitudes, error: solicitudesError } = await supabase
            .from("solicitudes_gestion")
            .select("*")
            .eq("formulario_id", id)
            .order("orden")

        if (solicitudesError) {
            console.error("Error obteniendo solicitudes:", solicitudesError)
        }

        return {
            ...formulario,
            solicitudes: solicitudes || []
        }

    } catch (error) {
        console.error("Error general en getGestionById:", error)
        return null
    }
}

export async function createGestion(formulario: FormularioGestion) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        const { data, error } = await supabase
            .from("formularios_gestion")
            .insert(formulario)
            .select()
            .single()

        if (error) {
            console.error("Error creating gestion:", error)
            throw error
        }

        revalidatePath("/dashboard/gestion-gerencial")
        return data
    } catch (error) {
        console.error("Error in createGestion:", error)
        throw error
    }
}

export async function updateGestion(id: string, formulario: Partial<FormularioGestion>) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        const { data, error } = await supabase
            .from("formularios_gestion")
            .update(formulario)
            .eq("id", id)
            .select()
            .single()

        if (error) {
            console.error("Error updating gestion:", error)
            throw error
        }

        revalidatePath("/dashboard/gestion-gerencial")
        return data
    } catch (error) {
        console.error("Error in updateGestion:", error)
        throw error
    }
}

// Generar número de formulario automático
export async function generarNumeroFormulario(): Promise<string> {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        // Obtener el último número de formulario
        const { data, error } = await supabase
            .from("formularios_gestion")
            .select("numero_formulario")
            .order("numero_formulario", { ascending: false })
            .limit(1)

        if (error) {
            console.error("Error obteniendo último número:", error)
            return "GG-001"
        }

        if (!data || data.length === 0) {
            return "GG-001"
        }

        const ultimoNumero = data[0].numero_formulario
        const numeroActual = parseInt(ultimoNumero.split("-")[1]) || 0
        const siguienteNumero = numeroActual + 1

        return `GG-${siguienteNumero.toString().padStart(3, "0")}`
    } catch (error) {
        console.error("Error en generarNumeroFormulario:", error)
        return "GG-001"
    }
}

// Obtener militantes activos
export async function getMilitantesActivos() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        const { data, error } = await supabase
            .from("militantes")
            .select("id, coordinador_id, dirigente_id, usuarios!militantes_usuario_id_fkey(nombres, apellidos, numero_documento)")
            .eq("estado", "activo")

        if (error) {
            console.error("Error obteniendo militantes:", error)
            return []
        }

        // Transformar los datos al formato que espera el componente.
        // coordinador_id/dirigente_id se incluyen para poder autocompletar
        // esos campos cuando se selecciona un militante en Gestión Gerencial.
        return (data || []).map((militante: any) => ({
            id: militante.id,
            nombre: militante.usuarios ?
                `${militante.usuarios.nombres} ${militante.usuarios.apellidos}` :
                'Usuario desconocido',
            documento: militante.usuarios?.numero_documento || 'Sin documento',
            coordinador_id: militante.coordinador_id || null,
            dirigente_id: militante.dirigente_id || null,
        }))
    } catch (error) {
        console.error("Error en getMilitantesActivos:", error)
        return []
    }
}

// Obtener coordinadores activos
export async function getCoordinadoresActivos() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        const { data, error } = await supabase
            .from("coordinadores")
            .select("id, tipo, usuarios!coordinadores_usuario_id_fkey(nombres, apellidos)")
            .eq("estado", "activo")

        if (error) {
            console.error("Error obteniendo coordinadores:", error)
            return []
        }

        // Transformar los datos al formato que espera el componente
        return (data || []).map((coordinador: any) => ({
            id: coordinador.id,
            nombre: coordinador.usuarios ? 
                `${coordinador.usuarios.nombres} ${coordinador.usuarios.apellidos}` : 
                'Usuario desconocido',
            tipo: coordinador.tipo || 'coordinador'
        }))
    } catch (error) {
        console.error("Error en getCoordinadoresActivos:", error)
        return []
    }
}

// Obtener dirigentes: un "dirigente" en este sistema es cualquier
// coordinador que aparece como id_dirigente en la tabla `dirigentes` (es
// decir, tiene al menos un coordinador que reporta a él). Antes esto se
// adivinaba filtrando coordinadores.tipo === 'dirigente' (imposible: el
// CHECK de esa columna solo admite 'Coordinador'/'Estructurador') o
// perfiles.nombre === 'Dirigente' (depende de un perfil de permisos RBAC
// que puede no existir) — cuando fallaba, devolvía dirigentes inventados
// ("Dirigente Temporal 1/2" con ids "temp-1"/"temp-2" que ni siquiera son
// UUID). Se quitaron esos fallbacks: si no hay dirigentes reales, la lista
// simplemente viene vacía.
export async function getDirigentes() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        const { data: rels, error: relsError } = await supabase
            .from("dirigentes")
            .select("id_dirigente")

        if (relsError) {
            console.error("Error obteniendo relaciones de dirigentes:", relsError)
            return []
        }

        const dirigenteIds = [...new Set((rels || []).map((r: any) => r.id_dirigente).filter(Boolean))]
        if (dirigenteIds.length === 0) return []

        const { data, error } = await supabase
            .from("coordinadores")
            .select("id, usuarios!coordinadores_usuario_id_fkey(nombres, apellidos, email)")
            .in("id", dirigenteIds)

        if (error) {
            console.error("Error obteniendo dirigentes:", error)
            return []
        }

        return (data || []).map((dirigente: any) => ({
            id: dirigente.id,
            nombre: dirigente.usuarios ?
                `${dirigente.usuarios.nombres} ${dirigente.usuarios.apellidos}` :
                'Usuario desconocido',
            perfil_nombre: 'Dirigente',
        }))
    } catch (error) {
        console.error("Error en getDirigentes:", error)
        return []
    }
}

// Obtener opciones del catálogo.
//
// La tabla real `catalogo_gestion` es plana: una fila = un ítem completo
// (id, elemento, unidad, categoria, sector, creado_en) — NO una fila por
// combinación (tipo, valor) como asumía el diseño anterior (ese diseño
// normalizado con columnas tipo/codigo/nombre fue reemplazado, ver
// schema_apolo_v2.sql). Antes esta función ignoraba por completo el
// parámetro `tipo` y devolvía SIEMPRE la tabla entera sin filtrar; el
// formulario luego leía `.nombre`/`.codigo` (columnas que no existen en la
// tabla real), así que cada SelectItem terminaba con value=undefined —
// eso disparaba el warning de "key" duplicada de React dentro del <select>
// oculto que usa Radix para espejar el valor en un <select> nativo.
//
// "tipo_gestion" no tiene tabla catálogo real en el schema vigente (no hay
// admin ni columna para eso), así que se mantiene como lista fija.
export async function getCatalogoOpciones(tipo?: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    if (tipo === 'tipo_gestion') {
        return [
            { id: "TG001", codigo: "TG001", nombre: "Gestión Administrativa" },
            { id: "TG002", codigo: "TG002", nombre: "Gestión Operativa" },
            { id: "TG003", codigo: "TG003", nombre: "Gestión de Comunicación" },
        ]
    }

    const columnaPorTipo: Record<string, string> = {
        elemento: "elemento",
        unidad: "unidad",
        categoria: "categoria",
        sector: "sector",
    }
    const columna = columnaPorTipo[tipo || ""]
    if (!columna) return []

    try {
        const { data, error } = await supabase
            .from("catalogo_gestion")
            .select(columna)

        if (error) {
            console.error(`Error obteniendo catálogo (${tipo}):`, error)
            return []
        }

        const valores = [...new Set(
            (data || [])
                .map((fila: any) => fila[columna])
                .filter((v: any) => v !== null && v !== undefined && v !== "")
        )].sort((a: any, b: any) => String(a).localeCompare(String(b)))

        // id/nombre/codigo únicos y estables: el propio valor sirve de key.
        return valores.map((valor) => ({ id: valor, nombre: valor, codigo: valor }))
    } catch (error) {
        console.error(`Error en getCatalogoOpciones(${tipo}):`, error)
        return []
    }
}

// Obtener localidades
export async function getLocalidades() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        const { data, error } = await supabase
            .from("lugares")
            .select("id, nombre, codigo, tipo, departamento")
            .eq("estado", "activo")
            .order("nombre")

        if (error) {
            console.error("Error obteniendo lugares:", error)
            return [
                { id: "temp-1", nombre: "Bogotá", codigo: "BOG" },
                { id: "temp-2", nombre: "Medellín", codigo: "MED" },
                { id: "temp-3", nombre: "Cali", codigo: "CAL" },
                { id: "temp-4", nombre: "Barranquilla", codigo: "BAQ" }
            ]
        }

        // Transformar al formato que espera el componente
        return (data || []).map((lugar: any) => ({
            id: lugar.id,
            nombre: lugar.nombre,
            codigo: lugar.codigo || lugar.tipo || lugar.departamento?.substring(0, 3) || 'LOC'
        }))
    } catch (error) {
        console.error("Error en getLocalidades:", error)
        return [
            { id: "temp-1", nombre: "Bogotá", codigo: "BOG" },
            { id: "temp-2", nombre: "Medellín", codigo: "MED" }
        ]
    }
}