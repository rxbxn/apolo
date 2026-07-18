'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

// --- Tipos ---
export type Planilla = {
    id: string
    coordinador_id: string
    militante_id: string
    radicado: number
    cautivo: number
    marketing: number
    impacto: number
    fecha_planilla: string
    coordinador?: { usuario: { nombres: string; apellidos: string } }
    militante?: { tipo: string; usuario?: { nombres: string; apellidos: string } }
}

export type Inconsistencia = {
    id: string
    coordinador_id: string
    militante_id?: string
    radical: number
    exclusion: number
    fuera_barranquilla: number
    fecha_inconsistencia: string
    fecha_resolucion?: string
    cantidad_resuelto?: number
    coordinador?: { usuario: { nombres: string; apellidos: string } }
    militante?: { tipo: string; usuario?: { nombres: string; apellidos: string } }
}

export type CasaEstrategica = {
    id: string
    coordinador_id: string
    militante_id?: string
    direccion: string
    ciudad_id: string
    barrio_id: string
    medidas?: string
    tipo_publicidad?: string
    fecha_instalacion: string
    fecha_desinstalacion?: string
    coordinador?: { usuario: { nombres: string; apellidos: string } }
    militante?: { tipo: string; usuario?: { nombres: string; apellidos: string } }
    ciudad?: { nombre: string }
    barrio?: { nombre: string }
}

export type VehiculoAmigo = {
    id: string
    coordinador_id: string
    placa: string
    marca?: string
    modelo?: string
    color?: string
    tipo_vehiculo?: string
    propietario: string
    telefono?: string
    fecha_registro: string
    observaciones?: string
    coordinador?: { usuario: { nombres: string; apellidos: string } }
}

// Alineado con lo que vehiculo-amigo-form.tsx realmente envía y con lo que
// createVehiculoAmigo/createPublicidadVehiculo insertan tal cual (sin
// allowlist de columnas) — el tipo anterior tenía placa/estado/foto_url,
// que no son campos que este formulario use, y le faltaban
// medidas/ciudad_id/barrio_id/fecha_desinstalacion, que sí usa.
export type PublicidadVehiculo = {
    id: string
    coordinador_id: string
    tipo_publicidad?: string
    medidas?: string
    ciudad_id: string
    barrio_id: string
    fecha_instalacion: string
    fecha_desinstalacion?: string
    coordinador?: { usuario: { nombres: string; apellidos: string } }
    ciudad?: { nombre: string }
    barrio?: { nombre: string }
}

// --- Helpers ---

export async function getCoordinadoresForSelect() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // No filtraba por estado (mostraba coordinadores inactivos/dados de
    // baja) y ordenaba por `id` en vez de por nombre. También marca cuáles
    // de estos coordinadores son "dirigente" (coordinadores/dirigentes son
    // el mismo tipo de registro en `coordinadores` — un coordinador es
    // "dirigente" si aparece como id_dirigente en la tabla `dirigentes`,
    // ver comentario en app/api/personas/importar-lote/route.ts), para que
    // los selects de este módulo puedan mostrarlo.
    const [{ data, error }, { data: rels, error: relsError }] = await Promise.all([
        supabase
            .from('coordinadores')
            .select('id, tipo, estado, usuario:usuarios!coordinadores_usuario_id_fkey(nombres, apellidos)')
            .eq('estado', 'activo'),
        supabase.from('dirigentes').select('id_dirigente'),
    ])

    if (error) throw new Error(error.message)
    if (relsError) console.error('Error obteniendo relaciones de dirigentes:', relsError)

    const dirigenteIds = new Set((rels || []).map((r: any) => r.id_dirigente))

    return (data || [])
        .map((c: any) => ({ ...c, esDirigente: dirigenteIds.has(c.id) }))
        .sort((a: any, b: any) => {
            const nombreA = `${a.usuario?.nombres ?? ''} ${a.usuario?.apellidos ?? ''}`.trim()
            const nombreB = `${b.usuario?.nombres ?? ''} ${b.usuario?.apellidos ?? ''}`.trim()
            return nombreA.localeCompare(nombreB)
        })
}

export async function getMilitantesByCoordinador(coordinadorId: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    // militantes.coordinador_id sí existe en el schema real — el filtro
    // estaba comentado, así que esta función devolvía SIEMPRE todos los
    // militantes del sistema sin importar qué coordinador se eligiera,
    // rompiendo la cascada Coordinador → Militante en Planillas, Casa
    // Estratégica e Inconsistencias.
    // Se agrega la dirección/ciudad/barrio del usuario (vienen del Excel de
    // Personas) para poder autocompletar esos campos en Casa Estratégica
    // cuando se selecciona el militante, en vez de dejarlos vacíos.
    const { data, error } = await supabase
        .from('militantes')
        .select('id, tipo, usuario:usuarios!militantes_usuario_id_fkey(nombres, apellidos, direccion, ciudad_id, barrio_id)')
        .eq('coordinador_id', coordinadorId)

    if (error) throw new Error(error.message)

    // El nombre viene de una tabla relacionada (usuarios), Postgres/PostgREST
    // no puede ordenar por eso vía .order() — se ordena en el cliente.
    return (data || []).sort((a: any, b: any) => {
        const nombreA = `${a.usuario?.nombres ?? ''} ${a.usuario?.apellidos ?? ''}`.trim()
        const nombreB = `${b.usuario?.nombres ?? ''} ${b.usuario?.apellidos ?? ''}`.trim()
        return nombreA.localeCompare(nombreB)
    })
}

// --- Planillas ---
export async function getPlanillas() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
        .from('debate_planillas')
        .select('*, coordinador:coordinadores(usuario:usuarios!coordinadores_usuario_id_fkey(nombres, apellidos)), militante:militantes(tipo, usuario:usuarios!militantes_usuario_id_fkey(nombres, apellidos))')
        .order('fecha_planilla', { ascending: false })

    if (error) throw new Error(error.message)
    return data
}

export async function createPlanilla(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = Object.fromEntries(formData)
    const { error } = await supabase.from('debate_planillas').insert([data])
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/planillas')
}

export async function createPlanillasBulk(rows: any[]) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    if (!Array.isArray(rows)) throw new Error('Rows must be an array')

    // Normalize rows: ensure correct types and remove any helper fields
    const payload = rows.map(r => ({
        coordinador_id: r.coordinador_id,
        militante_id: r.militante_id,
        radicado: r.radicado ?? 0,
        cautivo: r.cautivo ?? 0,
        marketing: r.marketing ?? 0,
        impacto: r.impacto ?? 0,
        fecha_planilla: r.fecha_planilla
    }))

    const { error } = await supabase.from('debate_planillas').insert(payload)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/planillas')
}

export async function updatePlanilla(id: string, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = Object.fromEntries(formData)
    const { error } = await supabase.from('debate_planillas').update(data).eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/planillas')
}

export async function deletePlanilla(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.from('debate_planillas').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/planillas')
}

// --- Inconsistencias ---
export async function getInconsistencias() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
        .from('debate_inconsistencias')
        .select('*, coordinador:coordinadores(usuario:usuarios!coordinadores_usuario_id_fkey(nombres, apellidos)), militante:militantes(tipo, usuario:usuarios!militantes_usuario_id_fkey(nombres, apellidos))')
        .order('fecha_inconsistencia', { ascending: false })

    if (error) throw new Error(error.message)
    return data
}

export async function createInconsistencia(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = Object.fromEntries(formData)
    const { error } = await supabase.from('debate_inconsistencias').insert([data])
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/inconsistencias')
}

export async function updateInconsistencia(id: string, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = Object.fromEntries(formData)
    const { error } = await supabase.from('debate_inconsistencias').update(data).eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/inconsistencias')
}

export async function deleteInconsistencia(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.from('debate_inconsistencias').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/inconsistencias')
}

// --- Casa Estratégica ---
export async function getCasasEstrategicas() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
        .from('debate_casa_estrategica')
        .select('*, coordinador:coordinadores(usuario:usuarios!coordinadores_usuario_id_fkey(nombres, apellidos)), militante:militantes(tipo, usuario:usuarios!militantes_usuario_id_fkey(nombres, apellidos)), ciudad:ciudades(nombre), barrio:barrios(nombre)')
        .order('fecha_instalacion', { ascending: false })

    if (error) throw new Error(error.message)
    return data
}

export async function createCasaEstrategica(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = Object.fromEntries(formData)
    const { error } = await supabase.from('debate_casa_estrategica').insert([data])
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/casa-estrategica')
}

export async function updateCasaEstrategica(id: string, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = Object.fromEntries(formData)
    const { error } = await supabase.from('debate_casa_estrategica').update(data).eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/casa-estrategica')
}

export async function deleteCasaEstrategica(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.from('debate_casa_estrategica').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/casa-estrategica')
}

// --- Vehículo Amigo ---
export async function getVehiculosAmigos() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
        .from('debate_vehiculo_amigo')
        .select('*, coordinador:coordinadores(usuario:usuarios!coordinadores_usuario_id_fkey(nombres, apellidos))')
        .order('fecha_registro', { ascending: false })

    if (error) throw new Error(error.message)
    return data
}

export async function createVehiculoAmigo(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = Object.fromEntries(formData)
    const { error } = await supabase.from('debate_vehiculo_amigo').insert([data])
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/vehiculo-amigo')
}

export async function updateVehiculoAmigo(id: string, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = Object.fromEntries(formData)
    const { error } = await supabase.from('debate_vehiculo_amigo').update(data).eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/vehiculo-amigo')
}

export async function deleteVehiculoAmigo(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.from('debate_vehiculo_amigo').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/vehiculo-amigo')
}

// --- Publicidad Vehículo ---
export async function getPublicidadVehiculos() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
        .from('debate_publicidad_vehiculo')
        .select('*, coordinador:coordinadores(usuario:usuarios!coordinadores_usuario_id_fkey(nombres, apellidos)), ciudad:ciudades(nombre), barrio:barrios(nombre)')
        .order('fecha_instalacion', { ascending: false })

    if (error) throw new Error(error.message)
    return data
}

export async function createPublicidadVehiculo(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = Object.fromEntries(formData)
    const { error } = await supabase.from('debate_publicidad_vehiculo').insert([data])
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/publicidad-vehiculo')
}

export async function updatePublicidadVehiculo(id: string, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = Object.fromEntries(formData)
    const { error } = await supabase.from('debate_publicidad_vehiculo').update(data).eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/publicidad-vehiculo')
}

export async function deletePublicidadVehiculo(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.from('debate_publicidad_vehiculo').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/debate/publicidad-vehiculo')
}
