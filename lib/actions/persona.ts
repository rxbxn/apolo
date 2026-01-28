"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export interface Persona {
    id?: number
    celular?: string
    estado?: string
    fecha?: string
    cedula?: string
    persona?: string
    coordinador?: string
    dirigente?: string
    tipo?: string
    talla?: string
    lugar_nacimiento?: string
    direccion?: string
    telefono?: string
    ciudad?: string
    barrio?: string
    localidad?: string
    nacimiento?: string
    genero?: string
    email?: string
    referencia?: string
    tel_referencia?: string
    vivienda?: string
    facebook?: string
    instagram?: string
    twitter?: string
    whatsapp?: string
    estudios?: string
    ocupacion?: string
    comp_difusion?: number
    comp_marketing?: number
    comp_impacto?: number
    comp_cautivo?: number
    comp_proyecto?: string
    verificacion_sticker?: string
    fecha_verificacion_sticker?: string
    observacion_verificacion_sticker?: string
    nombre_verificador?: string
    beneficiario?: string
}

// Helper para limpiar strings de forma segura
const safeTrim = (val: any) => (val !== null && val !== undefined) ? String(val).trim() : ""
const safeLower = (val: any) => (val !== null && val !== undefined) ? String(val).trim().toLowerCase() : ""

export async function getPersonas() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
        .from("persona")
        .select("*")
        .order("id", { ascending: false })

    if (error) {
        console.error("Error fetching personas:", error)
        return []
    }

    return data as Persona[]
}

export async function syncCatalogs(personas: Persona[]) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    console.log(`Iniciando sincronización de catálogos para ${personas.length} registros`)

    // --- 1. Sincronizar Lugares (Ciudades, Localidades, Barrios) ---
    const uniqueCiudades = Array.from(new Set(personas.map(p => safeTrim(p.ciudad)).filter(Boolean)))
    const uniqueLocalidades = Array.from(
        new Map(personas
            .filter(p => safeTrim(p.localidad) && safeTrim(p.ciudad))
            .map(p => {
                const nombre = safeTrim(p.localidad)
                const ciudad = safeTrim(p.ciudad)
                return [`${nombre.toLowerCase()}-${ciudad.toLowerCase()}`, { nombre, ciudad }]
            })
        ).values()
    )
    const uniqueBarrios = Array.from(
        new Map(personas
            .filter(p => safeTrim(p.barrio) && safeTrim(p.localidad) && safeTrim(p.ciudad))
            .map(p => {
                const nombre = safeTrim(p.barrio)
                const localidad = safeTrim(p.localidad)
                const ciudad = safeTrim(p.ciudad)
                return [`${nombre.toLowerCase()}-${localidad.toLowerCase()}-${ciudad.toLowerCase()}`, { nombre, localidad, ciudad }]
            })
        ).values()
    )

    if (uniqueCiudades.length > 0) {
        await supabase.from("ciudades").upsert(uniqueCiudades.map(nombre => ({ nombre })), { onConflict: 'nombre' })
    }
    const { data: citiesData } = await supabase.from("ciudades").select("id, nombre")
    const cityMap = new Map(citiesData?.map(c => [safeLower(c.nombre), c.id]))

    if (uniqueLocalidades.length > 0) {
        const localitiesToUpsert = uniqueLocalidades.map(l => ({
            nombre: l.nombre,
            ciudad_id: cityMap.get(safeLower(l.ciudad))
        })).filter(l => l.ciudad_id)
        await supabase.from("localidades").upsert(localitiesToUpsert, { onConflict: 'nombre, ciudad_id' })
    }
    const { data: locsData } = await supabase.from("localidades").select("id, nombre, ciudad_id")
    const locMap = new Map(locsData?.map(l => [`${safeLower(l.nombre)}-${l.ciudad_id}`, l.id]))

    if (uniqueBarrios.length > 0) {
        const barriosToUpsert = uniqueBarrios.map(b => {
            const ciudadId = cityMap.get(safeLower(b.ciudad))
            const localidadId = locMap.get(`${safeLower(b.localidad)}-${ciudadId}`)
            return { nombre: b.nombre, localidad_id: localidadId, ciudad_id: ciudadId }
        }).filter(b => b.localidad_id)
        await supabase.from("barrios").upsert(barriosToUpsert, { onConflict: 'nombre, localidad_id' })
    }

    // --- 2. Sincronizar Tipos de Referencia (usando el campo 'tipo' de persona) ---
    const uniqueTiposRef = Array.from(new Set(personas.map(p => safeTrim(p.tipo)).filter(Boolean)))
    if (uniqueTiposRef.length > 0) {
        await supabase.from("tipos_referencia").upsert(uniqueTiposRef.map(nombre => ({ nombre })), { onConflict: 'nombre' })
    }

    // --- 3. Sincronizar Referencias (Nombres y Teléfonos) ---
    const uniqueRefs = Array.from(
        new Map(personas
            .filter(p => safeTrim(p.referencia))
            .map(p => {
                const nombre = safeTrim(p.referencia)
                const telefono = safeTrim(p.tel_referencia)
                return [safeLower(nombre), { nombre, telefono }]
            })
        ).values()
    )
    if (uniqueRefs.length > 0) {
        await supabase.from("referencia").upsert(uniqueRefs, { onConflict: 'nombre' })
    }

    // --- 4. Sincronizar Compromisos ---
    const uniqueCompromisos = Array.from(new Set(personas.map(p => safeTrim(p.comp_proyecto)).filter(Boolean)))
    if (uniqueCompromisos.length > 0) {
        await supabase.from("compromisos").upsert(uniqueCompromisos.map(nombre => ({ nombre })), { onConflict: 'nombre' })
    }
}

export async function importPersonas(personas: Persona[]) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        // Sanitizar los datos: convertir la cadena literal 'null' o cadenas vacías a null,
        // eliminar id no numérico, convertir números y fechas a los tipos adecuados.
        const isNullString = (v: any) => v === null || v === undefined || (typeof v === 'string' && v.trim().toLowerCase() === 'null') || (typeof v === 'string' && v.trim() === '')

        const sanitizePersona = (p: Persona): any => {
            const out: any = {}
            for (const key of Object.keys(p) as Array<keyof Persona>) {
                const val = (p as any)[key]

                if (isNullString(val)) {
                    out[key] = null
                    continue
                }

                // Numeric fields
                if (['comp_difusion', 'comp_marketing', 'comp_impacto', 'comp_cautivo'].includes(String(key))) {
                    if (typeof val === 'number') out[key] = val
                    else if (typeof val === 'string' && val.replace(/\D/g, '') !== '') out[key] = parseInt(val.replace(/\D/g, ''), 10)
                    else out[key] = null
                    continue
                }

                // ID handling: keep numeric ids, otherwise remove (let DB assign)
                if (key === 'id') {
                    if (typeof val === 'number') out.id = val
                    else if (typeof val === 'string' && val.replace(/\D/g, '') !== '') out.id = parseInt(val.replace(/\D/g, ''), 10)
                    else {
                        // leave undefined -> do not send id
                    }
                    continue
                }

                // Date fields: keep ISO strings, otherwise try to coerce or set null
                if (['fecha', 'nacimiento', 'fecha_verificacion_sticker'].includes(String(key))) {
                    if (typeof val === 'string') {
                        const s = val.trim()
                        // If looks like ISO or date, keep as-is; otherwise null
                        const parsed = Date.parse(s)
                        out[key] = isNaN(parsed) ? null : new Date(parsed).toISOString()
                    } else if (val instanceof Date) {
                        out[key] = val.toISOString()
                    } else {
                        out[key] = null
                    }
                    continue
                }

                // Default: strings -> trimmed string
                out[key] = (val !== null && val !== undefined) ? String(val).trim() : null
            }
            return out
        }

        const sanitized = personas.map(sanitizePersona)

        // Sincronizar catálogos primero con los datos sanitizados
        await syncCatalogs(sanitized)

        // Inserción masiva optimizada
        const { data, error } = await supabase
            .from("persona")
            .insert(sanitized)
            .select()

        if (error) {
            console.error("Error importing personas:", JSON.stringify(error, null, 2))
            throw new Error(`Error al importar los datos de personas: ${error.message}`)
        }

        revalidatePath("/dashboard/assign-data")
        return data
    } catch (err: any) {
        console.error("Error in importPersonas:", err)
        throw err
    }
}

export async function transferToUsuarios(personaIds: number[]) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
        console.log(`Iniciando transferencia a usuarios para IDs: ${personaIds.join(', ')}`)

        // 1. Obtener los datos de las personas seleccionadas
        const { data: personas, error: fetchError } = await supabase
            .from("persona")
            .select("*")
            .in("id", personaIds)

        if (fetchError || !personas) {
            console.error("Error fetching personas for transfer:", fetchError)
            throw new Error("Error al obtener datos para la transferencia")
        }

        // 2. Obtener mapeos de catálogos para IDs
        const [
            { data: cities },
            { data: localities },
            { data: barrios },
            { data: tiposReferencia },
            { data: referencias },
            { data: compromisos }
        ] = await Promise.all([
            supabase.from("ciudades").select("id, nombre"),
            supabase.from("localidades").select("id, nombre, ciudad_id"),
            supabase.from("barrios").select("id, nombre, localidad_id"),
            supabase.from("tipos_referencia").select("id, nombre"),
            supabase.from("referencia").select("id, nombre"),
            supabase.from("compromisos").select("id, nombre")
        ])

        const cityMap = new Map(cities?.map(c => [safeLower(c.nombre), c.id]))
        const locMap = new Map(localities?.map(l => [`${safeLower(l.nombre)}-${l.ciudad_id}`, l.id]))
        const barrioMap = new Map(barrios?.map(b => [`${safeLower(b.nombre)}-${b.localidad_id}`, b.id]))
        const tipoRefMap = new Map(tiposReferencia?.map(t => [safeLower(t.nombre), t.id]))
        const refMap = new Map(referencias?.map(r => [safeLower(r.nombre), r.id]))
        const compMap = new Map(compromisos?.map(c => [safeLower(c.nombre), c.id]))

        // 3. Mapear y preparar para upsert en usuarios
        const usuariosToUpsert = personas.map((p) => {
            const personaName = safeTrim(p.persona)
            const nameParts = personaName ? personaName.split(/\s+/) : ["", ""]
            let nombres = ""
            let apellidos = ""

            if (nameParts.length === 1) {
                nombres = nameParts[0]
            } else if (nameParts.length >= 2) {
                const mid = Math.ceil(nameParts.length / 2)
                nombres = nameParts.slice(0, mid).join(" ")
                apellidos = nameParts.slice(mid).join(" ")
            }

            const ciudadId = p.ciudad ? cityMap.get(safeLower(p.ciudad)) : null
            const localidadId = (p.localidad && ciudadId) ? locMap.get(`${safeLower(p.localidad)}-${ciudadId}`) : null
            const barrioId = (p.barrio && localidadId) ? barrioMap.get(`${safeLower(p.barrio)}-${localidadId}`) : null
            const referenciaId = p.referencia ? refMap.get(safeLower(p.referencia)) : null
            const tipoReferenciaId = p.tipo ? tipoRefMap.get(safeLower(p.tipo)) : null
            const compromisoId = p.comp_proyecto ? compMap.get(safeLower(p.comp_proyecto)) : null

            return {
                numero_documento: safeTrim(p.cedula),
                nombres: nombres,
                apellidos: apellidos,
                celular: safeTrim(p.celular),
                email: safeTrim(p.email),
                direccion: safeTrim(p.direccion),
                ciudad_id: ciudadId,
                ciudad_nombre: safeTrim(p.ciudad),
                localidad_id: localidadId,
                localidad_nombre: safeTrim(p.localidad),
                barrio_id: barrioId,
                barrio_nombre: safeTrim(p.barrio),
                referencia_id: referenciaId, // UUID string
                tipo_referencia_id: tipoReferenciaId, // UUID
                fecha_nacimiento: p.nacimiento,
                genero: safeTrim(p.genero),
                talla_camisa: safeTrim(p.talla),
                tipo_vivienda: safeTrim(p.vivienda),
                nivel_escolaridad: safeTrim(p.estudios),
                perfil_ocupacion: safeTrim(p.ocupacion),
                whatsapp: safeTrim(p.whatsapp),
                facebook: safeTrim(p.facebook),
                twitter: safeTrim(p.twitter),
                instagram: safeTrim(p.instagram),
                compromiso_privado: compromisoId ? String(compromisoId) : null,
                estado: safeTrim(p.estado) || 'activo',
                actualizado_en: new Date().toISOString()
            }
        }).filter(u => u.numero_documento)

        if (usuariosToUpsert.length === 0) return { success: true, count: 0 }

        // Upsert Usuarios
        const { error: upsertError } = await supabase
            .from("usuarios")
            .upsert(usuariosToUpsert, {
                onConflict: 'numero_documento',
                ignoreDuplicates: false
            })

        if (upsertError) {
            console.error("Error upserting usuarios:", upsertError)
            throw new Error(`Error al transferir datos a usuarios: ${upsertError.message}`)
        }

        revalidatePath("/dashboard/assign-data")
        return { success: true, count: usuariosToUpsert.length }
    } catch (err: any) {
        console.error("Error in transferToUsuarios:", err)
        throw err
    }
}
