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
            .select("id, usuarios!militantes_usuario_id_fkey(nombres, apellidos, numero_documento)")
            .eq("estado", "activo")

        if (error) {
            console.error("Error obteniendo militantes:", error)
            return []
        }

        // Transformar los datos al formato que espera el componente
        return (data || []).map((militante: any) => ({
            id: militante.id,
            nombre: militante.usuarios ? 
                `${militante.usuarios.nombres} ${militante.usuarios.apellidos}` : 
                'Usuario desconocido',
            documento: militante.usuarios?.numero_documento || 'Sin documento'
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

// Obtener dirigentes (son coordinadores con perfil dirigente)
export async function getDirigentes() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        const { data, error } = await supabase
            .from("coordinadores")
            .select(`
                id, 
                tipo,
                usuario_id,
                perfil_id,
                usuarios!coordinadores_usuario_id_fkey(nombres, apellidos, email),
                perfiles!coordinadores_perfil_id_fkey(nombre)
            `)
            .eq("estado", "activo")

        if (error) {
            console.error("Error obteniendo dirigentes:", error)
            return [
                { id: "temp-1", nombre: "Dirigente Temporal 1", perfil_nombre: "Dirigente General" },
                { id: "temp-2", nombre: "Dirigente Temporal 2", perfil_nombre: "Dirigente Regional" }
            ]
        }

        // Filtrar por perfil "Dirigente" y transformar los datos
        const dirigentes = (data || [])
            .filter((coordinador: any) => 
                coordinador.perfiles?.nombre === "Dirigente" || 
                coordinador.tipo === "dirigente"
            )
            .map((dirigente: any) => ({
                id: dirigente.id,
                nombre: dirigente.usuarios ? 
                    `${dirigente.usuarios.nombres} ${dirigente.usuarios.apellidos}` : 
                    'Usuario desconocido',
                perfil_nombre: dirigente.perfiles?.nombre || 'Dirigente'
            }))

        // Si no hay dirigentes, devolver datos temporales
        if (dirigentes.length === 0) {
            return [
                { id: "temp-1", nombre: "Dirigente Temporal 1", perfil_nombre: "Dirigente" }
            ]
        }

        return dirigentes
    } catch (error) {
        console.error("Error en getDirigentes:", error)
        return [
            { id: "temp-1", nombre: "Dirigente Temporal 1", perfil_nombre: "Dirigente General" }
        ]
    }
}

// Obtener opciones del catálogo
export async function getCatalogoOpciones(tipo?: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        const { data, error } = await supabase
            .from("catalogo_gestion")
            .select("*")

        if (error) {
            console.error("Error obteniendo catálogo:", error)
            // Fallback: crear datos de prueba basados en el tipo solicitado
            if (tipo === 'elemento') {
                return [
                    { id: "1", elemento: "Computadora", unidad: "Unidades", sector: "Tecnología" },
                    { id: "2", elemento: "Teléfono", unidad: "Unidades", sector: "Comunicación" },
                    { id: "3", elemento: "Impresora", unidad: "Unidades", sector: "Oficina" }
                ]
            }
            if (tipo === 'unidad') {
                return [
                    { id: "1", nombre: "Unidades" },
                    { id: "2", nombre: "Cajas" },
                    { id: "3", nombre: "Paquetes" }
                ]
            }
            if (tipo === 'categoria') {
                return [
                    { id: "1", nombre: "Tecnología" },
                    { id: "2", nombre: "Oficina" },
                    { id: "3", nombre: "Logística" }
                ]
            }
            if (tipo === 'sector') {
                return [
                    { id: "1", nombre: "Administración" },
                    { id: "2", nombre: "Operaciones" },
                    { id: "3", nombre: "Comunicación" }
                ]
            }
            if (tipo === 'tipo_gestion') {
                return [
                    { id: "TG001", nombre: "Gestión Administrativa" },
                    { id: "TG002", nombre: "Gestión Operativa" },
                    { id: "TG003", nombre: "Gestión de Comunicación" }
                ]
            }
            return []
        }

        // Si no hay error, retornar todos los datos
        return data || []
    } catch (error) {
        console.error("Error en getCatalogoOpciones:", error)
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