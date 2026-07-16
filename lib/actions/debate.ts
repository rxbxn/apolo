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
    marca: string
    modelo: string
    color: string
    tipo_vehiculo: string
    propietario: string
    telefono: string
    fecha_registro: string
    coordinador?: { usuario: { nombres: string; apellidos: string } }
}

export type PublicidadVehiculo = {
    id: string
    coordinador_id: string
    placa: string
    tipo_publicidad: string
    fecha_instalacion: string
    fecha_retiro?: string
    estado: string
    foto_url?: string
    coordinador?: { usuario: { nombres: string; apellidos: string } }
}

// --- Helpers ---

export async function getCoordinadoresForSelect() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
        .from('coordinadores')
        .select('id, usuario:usuarios!coordinadores_usuario_id_fkey(nombres, apellidos)')
        .order('id') // Or order by name if possible, but nested ordering is tricky

    if (error) throw new Error(error.message)
    return data
}

export async function getMilitantesByCoordinador(coordinadorId: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    // militantes.coordinador_id sí existe en el schema real — el filtro
    // estaba comentado, así que esta función devolvía SIEMPRE todos los
    // militantes del sistema sin importar qué coordinador se eligiera,
    // rompiendo la cascada Coordinador → Militante en Planillas, Casa
    // Estratégica e Inconsistencias.
    const { data, error } = await supabase
        .from('militantes')
        .select('id, tipo, usuario:usuarios!militantes_usuario_id_fkey(nombres, apellidos)')
        .eq('coordinador_id', coordinadorId)

    if (error) throw new Error(error.message)
    return data
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
