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
        // formularios_gestion solo guarda militante_id (UUID) — la tabla de
        // listado necesita el nombre. Antes se hacía `.select("*")` sin
        // join, así que `gestion.militante_nombre` siempre venía undefined
        // y la columna "Nombre" mostraba "Sin asignar" incluso con un
        // militante asignado. Un primer intento usó el embed automático de
        // PostgREST (`militante:militantes(...)`), pero eso depende de que
        // exista un FK real `formularios_gestion.militante_id →
        // militantes.id` en el schema cache — en producción esa columna
        // venía sin FK (ver comentario en schema_apolo_v2.sql), así que el
        // embed fallaba en silencio y siempre caía al fallback sin nombre,
        // aun con militante_id genuinamente asignado.
        //
        // Por eso ahora se resuelve en dos pasos manuales, sin depender de
        // ningún FK: 1) traer los formularios, 2) traer los militantes
        // referenciados (con su usuario) filtrando por id, y cruzar en JS.
        const { data: dataTabla, error: errorTabla } = await supabase
            .from("formularios_gestion")
            .select("*")
            .order("creado_en", { ascending: false })

        if (errorTabla) {
            console.error("Error fetching gestiones:", errorTabla)
            return []
        }

        const militanteIds = [...new Set(
            (dataTabla || []).map((g: any) => g.militante_id).filter(Boolean)
        )]

        let nombrePorMilitanteId = new Map<string, string>()
        if (militanteIds.length > 0) {
            const { data: militantesData, error: militantesError } = await supabase
                .from("militantes")
                .select("id, usuarios!militantes_usuario_id_fkey(nombres, apellidos)")
                .in("id", militanteIds)

            if (militantesError) {
                console.error("Error resolviendo nombres de militantes para el listado de gestiones:", militantesError)
            } else {
                nombrePorMilitanteId = new Map(
                    (militantesData || []).map((m: any) => {
                        const u = m.usuarios
                        const nombre = u ? `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim() : ''
                        return [m.id, nombre || 'Sin nombre']
                    })
                )
            }
        }

        return (dataTabla || []).map((g: any) => ({
            ...g,
            militante_nombre: g.militante_id ? (nombrePorMilitanteId.get(g.militante_id) || null) : null,
        }))

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

// `solicitudes` NO es una columna de `formularios_gestion` — vive en su
// propia tabla `solicitudes_gestion` (FK formulario_id). Antes se mandaba
// tal cual dentro del insert/update de formularios_gestion y PostgREST
// rechazaba todo con "Could not find the 'solicitudes' column ... in the
// schema cache" (PGRST204). Hay que separarla y escribirla aparte.
function construirPayloadSolicitudes(formularioId: string, solicitudes: SolicitudGestion[]) {
    return solicitudes.map((s, i) => ({
        formulario_id: formularioId,
        elemento: s.elemento,
        unidad: s.unidad,
        categoria: s.categoria,
        sector: s.sector,
        cantidad: s.cantidad,
        orden: s.orden ?? i + 1,
    }))
}

export async function createGestion(formulario: FormularioGestion) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        const { solicitudes, ...formularioSinSolicitudes } = formulario

        const { data, error } = await supabase
            .from("formularios_gestion")
            .insert(formularioSinSolicitudes)
            .select()
            .single()

        if (error) {
            console.error("Error creating gestion:", error)
            throw error
        }

        if (solicitudes && solicitudes.length > 0) {
            const { error: solError } = await supabase
                .from("solicitudes_gestion")
                .insert(construirPayloadSolicitudes(data.id, solicitudes))

            if (solError) {
                console.error("Error creando solicitudes:", solError)
                throw solError
            }
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
        const { solicitudes, ...formularioSinSolicitudes } = formulario

        const { data, error } = await supabase
            .from("formularios_gestion")
            .update(formularioSinSolicitudes)
            .eq("id", id)
            .select()
            .single()

        if (error) {
            console.error("Error updating gestion:", error)
            throw error
        }

        if (solicitudes) {
            // La UI maneja la lista completa de solicitudes en memoria, así
            // que la forma simple y correcta de sincronizar es reemplazarlas
            // todas: borrar las existentes de este formulario e insertar las
            // actuales.
            const { error: delError } = await supabase
                .from("solicitudes_gestion")
                .delete()
                .eq("formulario_id", id)

            if (delError) {
                console.error("Error borrando solicitudes previas:", delError)
                throw delError
            }

            if (solicitudes.length > 0) {
                const { error: insError } = await supabase
                    .from("solicitudes_gestion")
                    .insert(construirPayloadSolicitudes(id, solicitudes))

                if (insError) {
                    console.error("Error insertando solicitudes:", insError)
                    throw insError
                }
            }
        }

        revalidatePath("/dashboard/gestion-gerencial")
        return data
    } catch (error) {
        console.error("Error in updateGestion:", error)
        throw error
    }
}

export async function deleteGestion(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        // solicitudes_gestion tiene `formulario_id ... ON DELETE CASCADE`
        // (ver schema_apolo_v2.sql), así que borrar el formulario ya se
        // lleva sus solicitudes con él.
        const { error } = await supabase
            .from("formularios_gestion")
            .delete()
            .eq("id", id)

        if (error) {
            console.error("Error eliminando gestion:", error)
            throw error
        }

        revalidatePath("/dashboard/gestion-gerencial")
    } catch (error) {
        console.error("Error in deleteGestion:", error)
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
        // El nombre viene de una tabla relacionada (usuarios) — Postgres no
        // puede ordenar por eso vía .order(), se ordena en el cliente.
        return (data || [])
            .map((militante: any) => ({
                id: militante.id,
                nombre: militante.usuarios ?
                    `${militante.usuarios.nombres} ${militante.usuarios.apellidos}` :
                    'Usuario desconocido',
                documento: militante.usuarios?.numero_documento || 'Sin documento',
                coordinador_id: militante.coordinador_id || null,
                dirigente_id: militante.dirigente_id || null,
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
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

        // Transformar los datos al formato que espera el componente. El
        // nombre viene de una tabla relacionada (usuarios) — Postgres no
        // puede ordenar por eso vía .order(), se ordena en el cliente.
        return (data || [])
            .map((coordinador: any) => ({
                id: coordinador.id,
                nombre: coordinador.usuarios ?
                    `${coordinador.usuarios.nombres} ${coordinador.usuarios.apellidos}` :
                    'Usuario desconocido',
                tipo: coordinador.tipo || 'coordinador'
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
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

        return (data || [])
            .map((dirigente: any) => ({
                id: dirigente.id,
                nombre: dirigente.usuarios ?
                    `${dirigente.usuarios.nombres} ${dirigente.usuarios.apellidos}` :
                    'Usuario desconocido',
                perfil_nombre: 'Dirigente',
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
    } catch (error) {
        console.error("Error en getDirigentes:", error)
        return []
    }
}

// Obtener opciones del catálogo.
//
// Unidad/Categoría/Sector se leen de sus propias tablas catálogo
// (gestion_unidades/gestion_categorias/gestion_sectores — ver
// cambios/CREAR_CATALOGOS_GESTION.sql), administrables desde
// Configuración → Gestión Gerencial. Antes se derivaban desde
// `catalogo_gestion`, una tabla pensada para otra cosa (una fila = un ítem
// completo elemento+unidad+categoria+sector combinados, no una lista
// independiente por campo) y que además no tiene columnas `nombre`/`codigo`
// — cada SelectItem terminaba con value=undefined, lo que disparaba el
// warning de "key" duplicada de React dentro del <select> oculto que usa
// Radix para espejar el valor en un <select> nativo.
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

    const tablaPorTipo: Record<string, string> = {
        elemento: "gestion_elementos",
        unidad: "gestion_unidades",
        categoria: "gestion_categorias",
        sector: "gestion_sectores",
    }
    const tabla = tablaPorTipo[tipo || ""]
    if (!tabla) return []

    try {
        const { data, error } = await supabase
            .from(tabla)
            .select("id, nombre")
            .order("nombre")

        if (error) {
            // Si la migración aún no se corrió, la tabla no existe todavía —
            // no romper el formulario, solo devolver lista vacía.
            if (!/does not exist|relation .* does not exist/i.test(String(error.message || error))) {
                console.error(`Error obteniendo catálogo (${tipo}):`, error)
            }
            return []
        }

        return (data || []).map((fila: any) => ({ id: fila.id, nombre: fila.nombre, codigo: fila.nombre }))
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