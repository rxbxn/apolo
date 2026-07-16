'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

// --- Tipos ---
export type Ciudad = {
    id: string
    nombre: string
    codigo?: string
    activo: boolean
    orden?: number
}

export type Barrio = {
    id: string
    nombre: string
    ciudad_id: string
    codigo?: string
    activo: boolean
    orden?: number
    ciudad?: { nombre: string }
}

// --- Nuevos tipos: Grupo Etnico, Referencia y compromiso ---
export type GrupoEtnico = {
    id: number
    nombre: string | null
    created_at?: string
}

export type Referencia = {
    id: string
    nombre: string | null
    telefono: string | null
    ciudad: string | null | { nombre?: string; id?: string }
    created_at?: string
}

export type Compromiso = {
    id: number
    nombre: string | null
    created_at?: string
}

export type CatalogoElemento = {
    id: string
    elemento: string | null
    unidad: string | null
    categoria: string | null
    sector: string | null
    creado_en?: string
}

// --- Helpers ---
function isTableNotFoundError(error: any) {
    if (!error) return false
    const msg = String(error.message || error)
    return /does not exist|relation .* does not exist|table .* does not exist|SQLSTATE 42P01/i.test(msg)
}

function isRelationshipError(error: any) {
    if (!error) return false
    const msg = String(error.message || error)
    return /relationship between '[^']+' and '[^']+'/i.test(msg) || /Could not find a relationship between '[^']+' and '[^']+'/i.test(msg)
}

async function enrichTableError(tableName: string, error: any) {
    if (isTableNotFoundError(error)) {
        try {
            const docPath = path.join(process.cwd(), 'docs', 'db', `${tableName}.md`)
            if (existsSync(docPath)) {
                const content = readFileSync(docPath, 'utf8')
                return new Error(`${error.message}\n\nInformación local (docs/db/${tableName}.md):\n\n${content}`)
            }
        } catch (e) {
            // ignore read errors
        }
        return new Error(`${error.message}\n\nNo se encontró documentación local para '${tableName}'. Puedes usar MCP para investigar: mcp_supabase-apol_get_tables y mcp_supabase-apol_get_columns.`)
    }

    // Manejar errores de relación (foreign key / join ausente)
    if (isRelationshipError(error)) {
        const msg = String(error.message || error)
        const match = msg.match(/relationship between '([^']+)' and '([^']+)'/i)
        const tableA = match ? match[1] : null
        const tableB = match ? match[2] : null

        let info = ''
        try {
            if (tableA) {
                const docPathA = path.join(process.cwd(), 'docs', 'db', `${tableA}.md`)
                if (existsSync(docPathA)) info += `\n--- ${tableA} ---\n${readFileSync(docPathA, 'utf8')}`
            }
            if (tableB) {
                const docPathB = path.join(process.cwd(), 'docs', 'db', `${tableB}.md`)
                if (existsSync(docPathB)) info += `\n--- ${tableB} ---\n${readFileSync(docPathB, 'utf8')}`
            }
        } catch (e) {
            // ignore
        }

        const suggestion = `Verifica que exista una relación (FK) entre '${tableA || 'tablaA'}' y '${tableB || 'tablaB'}'. Puedes usar MCP: mcp_supabase-apol_get_columns(tableName: '${tableA}') y mcp_supabase-apol_get_columns(tableName: '${tableB}')` 
        return new Error(`${error.message}\n\n${suggestion}\n${info}`)
    }

    return new Error(error.message || String(error))
}

// --- Ciudades ---
export async function getCiudades() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
        .from('ciudades')
        .select('*')
        .order('nombre')

    if (error) throw await enrichTableError('ciudades', error)
    return data
}

export async function createCiudad(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = {
        nombre: formData.get('nombre'),
        codigo: formData.get('codigo'),
        activo: formData.get('activo') === 'true',
    }

    const { error } = await supabase.from('ciudades').insert([data])
    if (error) throw await enrichTableError('ciudades', error)
    revalidatePath('/dashboard/configuracion')
}

export async function updateCiudad(id: string, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = {
        nombre: formData.get('nombre'),
        codigo: formData.get('codigo'),
        activo: formData.get('activo') === 'true',
    }

    const { error } = await supabase.from('ciudades').update(data).eq('id', id)
    if (error) throw await enrichTableError('ciudades', error)
    revalidatePath('/dashboard/configuracion')
}

export async function deleteCiudad(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.from('ciudades').delete().eq('id', id)
    if (error) throw await enrichTableError('ciudades', error)
    revalidatePath('/dashboard/configuracion')
}

// --- Barrios ---
export async function getBarrios(ciudadId?: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    let query = supabase
        .from('barrios')
        .select('*, ciudad:ciudades(nombre)')
        .order('nombre')

    if (ciudadId) {
        query = query.eq('ciudad_id', ciudadId)
    }

    const { data, error } = await query

    if (error) throw await enrichTableError('barrios', error)
    return data
}

export async function createBarrio(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = {
        nombre: formData.get('nombre'),
        ciudad_id: formData.get('ciudad_id'),
        codigo: formData.get('codigo'),
        activo: formData.get('activo') === 'true',
    }

    const { error } = await supabase.from('barrios').insert([data])
    if (error) throw await enrichTableError('barrios', error)
    revalidatePath('/dashboard/configuracion')
}

export async function updateBarrio(id: string, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = {
        nombre: formData.get('nombre'),
        ciudad_id: formData.get('ciudad_id'),
        codigo: formData.get('codigo'),
        activo: formData.get('activo') === 'true',
    }

    const { error } = await supabase.from('barrios').update(data).eq('id', id)
    if (error) throw await enrichTableError('barrios', error)
    revalidatePath('/dashboard/configuracion')
}

export async function deleteBarrio(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.from('barrios').delete().eq('id', id)
    if (error) throw await enrichTableError('barrios', error)
    revalidatePath('/dashboard/configuracion')
}

// --- Grupo Etnico ---
export async function getGrupoEtnicos() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
        .from('grupo_etnico')
        .select('*')
        .order('nombre')

    if (error) throw await enrichTableError('grupo_etnico', error)
    return data
}

export async function createGrupoEtnico(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = {
        nombre: formData.get('nombre'),
    }

    const { error } = await supabase.from('grupo_etnico').insert([data])
    if (error) throw await enrichTableError('grupo_etnico', error)
    revalidatePath('/dashboard/configuracion')
}

export async function updateGrupoEtnico(id: string | number, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = {
        nombre: formData.get('nombre'),
    }

    const { error } = await supabase.from('grupo_etnico').update(data).eq('id', id)
    if (error) throw await enrichTableError('grupo_etnico', error)
    revalidatePath('/dashboard/configuracion')
}

export async function deleteGrupoEtnico(id: string | number) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.from('grupo_etnico').delete().eq('id', id)
    if (error) throw await enrichTableError('grupo_etnico', error)
    revalidatePath('/dashboard/configuracion')
}

// --- Referencias ---
export async function getReferencias() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Intentamos la consulta con join primero
    const { data, error } = await supabase
        .from('referencia')
        .select('*, ciudad:ciudades(nombre)')
        .order('nombre')

    if (!error) return data

    // Si la causa es la ausencia de relación, hacemos un fallback: consultamos referencias sin join
    if (isRelationshipError(error)) {
        // Obtener referencias básicas
        const { data: refs, error: refsError } = await supabase
            .from('referencia')
            .select('*')
            .order('nombre')

        if (refsError) throw await enrichTableError('referencia', refsError)

        try {
            // Recolectar IDs de ciudad para buscar nombres
            const ciudadIds = Array.from(new Set(refs.filter((r: any) => r.ciudad).map((r: any) => r.ciudad)))
            if (ciudadIds.length === 0) return refs

            const { data: ciudadesData, error: ciudadesError } = await supabase
                .from('ciudades')
                .select('id, nombre')
                .in('id', ciudadIds)

            if (ciudadesError) {
                // No podemos obtener ciudades, devolvemos referencias sin mapear
                return refs
            }

            const ciudadesMap: Record<string, any> = {}
            ;(ciudadesData || []).forEach((c: any) => {
                ciudadesMap[c.id] = c
            })

            // Mapear para que la forma sea similar a la consulta original (ciudad: { nombre })
            const augmented = (refs || []).map((r: any) => ({
                ...r,
                ciudad: r.ciudad ? (ciudadesMap[r.ciudad] ? { nombre: ciudadesMap[r.ciudad].nombre, id: ciudadesMap[r.ciudad].id } : { id: r.ciudad }) : null,
            }))

            return augmented
        } catch (e) {
            // Si algo falla, retornamos los refs sin mapear
            return refs
        }
    }

    // Si no es un error de relación, enriquecemos y lanzamos
    throw await enrichTableError('referencia', error)
}

export async function createReferencia(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    // Normalize ciudad: treat empty string or sentinel '__none__' as null
    const rawCiudad = formData.get('ciudad')
    const ciudadVal = rawCiudad === null ? null : String(rawCiudad)
    const ciudad = ciudadVal === '' || ciudadVal === '__none__' ? null : ciudadVal

    const data = {
        nombre: formData.get('nombre'),
        telefono: formData.get('telefono'),
        ciudad: ciudad,
    }

    const { error } = await supabase.from('referencia').insert([data])
    if (error) throw await enrichTableError('referencia', error)
    revalidatePath('/dashboard/configuracion')
}

export async function updateReferencia(id: string, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    // Normalize ciudad: treat empty string or sentinel '__none__' as null
    const rawCiudad = formData.get('ciudad')
    const ciudadVal = rawCiudad === null ? null : String(rawCiudad)
    const ciudad = ciudadVal === '' || ciudadVal === '__none__' ? null : ciudadVal

    const data = {
        nombre: formData.get('nombre'),
        telefono: formData.get('telefono'),
        ciudad: ciudad,
    }

    const { error } = await supabase.from('referencia').update(data).eq('id', id)
    if (error) throw await enrichTableError('referencia', error)
    revalidatePath('/dashboard/configuracion')
}

export async function deleteReferencia(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.from('referencia').delete().eq('id', id)
    if (error) throw await enrichTableError('referencia', error)
    revalidatePath('/dashboard/configuracion')
}

// --- compromiso ---
export async function getcompromiso() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
        .from('compromiso')
        .select('*')
        .order('nombre')

    if (error) throw await enrichTableError('compromiso', error)
    return data
}

export async function createCompromiso(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = {
        nombre: formData.get('nombre'),
    }

    const { error } = await supabase.from('compromiso').insert([data])
    if (error) throw await enrichTableError('compromiso', error)
    revalidatePath('/dashboard/configuracion')
}

export async function updateCompromiso(id: string | number, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = {
        nombre: formData.get('nombre'),
    }

    const { error } = await supabase.from('compromiso').update(data).eq('id', id)
    if (error) throw await enrichTableError('compromiso', error)
    revalidatePath('/dashboard/configuracion')
}

export async function deleteCompromiso(id: string | number) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.from('compromiso').delete().eq('id', id)
    if (error) throw await enrichTableError('compromiso', error)
    revalidatePath('/dashboard/configuracion')
}

// --- Catalogo Gestión ---
export async function getCatalogoGestion() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
        .from('catalogo_gestion')
        .select('*')
        .order('elemento')

    if (error) throw await enrichTableError('catalogo_gestion', error)
    return data as CatalogoElemento[]
}

export async function createCatalogoElemento(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = {
        elemento: formData.get('elemento'),
        unidad: formData.get('unidad'),
        categoria: formData.get('categoria'),
        sector: formData.get('sector'),
    }

    const { error } = await supabase.from('catalogo_gestion').insert([data])
    if (error) throw await enrichTableError('catalogo_gestion', error)
    revalidatePath('/dashboard/configuracion')
}

export async function updateCatalogoElemento(id: string, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const data = {
        elemento: formData.get('elemento'),
        unidad: formData.get('unidad'),
        categoria: formData.get('categoria'),
        sector: formData.get('sector'),
    }

    const { error } = await supabase.from('catalogo_gestion').update(data).eq('id', id)
    if (error) throw await enrichTableError('catalogo_gestion', error)
    revalidatePath('/dashboard/configuracion')
}

export async function deleteCatalogoElemento(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.from('catalogo_gestion').delete().eq('id', id)
    if (error) throw await enrichTableError('catalogo_gestion', error)
    revalidatePath('/dashboard/configuracion')
}

// --- Catálogos simples de Gestión Gerencial (Elemento/Unidad/Categoría/Sector) ---
// Cada uno es su propia tabla de una sola columna (nombre) — reemplazan la
// derivación "distinct" que antes se hacía desde `catalogo_gestion` (pensada
// para otra cosa: filas con elemento+unidad+categoria+sector combinados) y
// la tabla `elementos`, que no tenía ningún panel de administración. Ver
// cambios/CREAR_CATALOGOS_GESTION.sql para la migración.
export type CatalogoSimple = {
    id: string
    nombre: string
    creado_en?: string
}

async function getCatalogoSimple(tabla: string): Promise<CatalogoSimple[]> {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase.from(tabla).select('*').order('nombre')
    if (error) {
        if (isTableNotFoundError(error)) return []
        throw await enrichTableError(tabla, error)
    }
    return (data as CatalogoSimple[]) || []
}

async function createCatalogoSimple(tabla: string, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const nombre = String(formData.get('nombre') || '').trim()
    if (!nombre) throw new Error('El nombre es obligatorio')
    const { error } = await supabase.from(tabla).insert([{ nombre }])
    if (error) throw await enrichTableError(tabla, error)
    revalidatePath('/dashboard/configuracion')
}

async function updateCatalogoSimple(tabla: string, id: string, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const nombre = String(formData.get('nombre') || '').trim()
    if (!nombre) throw new Error('El nombre es obligatorio')
    const { error } = await supabase.from(tabla).update({ nombre }).eq('id', id)
    if (error) throw await enrichTableError(tabla, error)
    revalidatePath('/dashboard/configuracion')
}

async function deleteCatalogoSimple(tabla: string, id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.from(tabla).delete().eq('id', id)
    if (error) throw await enrichTableError(tabla, error)
    revalidatePath('/dashboard/configuracion')
}

export async function getGestionElementos() { return getCatalogoSimple('gestion_elementos') }
export async function createGestionElemento(formData: FormData) { return createCatalogoSimple('gestion_elementos', formData) }
export async function updateGestionElemento(id: string, formData: FormData) { return updateCatalogoSimple('gestion_elementos', id, formData) }
export async function deleteGestionElemento(id: string) { return deleteCatalogoSimple('gestion_elementos', id) }

export async function getGestionUnidades() { return getCatalogoSimple('gestion_unidades') }
export async function createGestionUnidad(formData: FormData) { return createCatalogoSimple('gestion_unidades', formData) }
export async function updateGestionUnidad(id: string, formData: FormData) { return updateCatalogoSimple('gestion_unidades', id, formData) }
export async function deleteGestionUnidad(id: string) { return deleteCatalogoSimple('gestion_unidades', id) }

export async function getGestionCategorias() { return getCatalogoSimple('gestion_categorias') }
export async function createGestionCategoria(formData: FormData) { return createCatalogoSimple('gestion_categorias', formData) }
export async function updateGestionCategoria(id: string, formData: FormData) { return updateCatalogoSimple('gestion_categorias', id, formData) }
export async function deleteGestionCategoria(id: string) { return deleteCatalogoSimple('gestion_categorias', id) }

export async function getGestionSectores() { return getCatalogoSimple('gestion_sectores') }
export async function createGestionSector(formData: FormData) { return createCatalogoSimple('gestion_sectores', formData) }
export async function updateGestionSector(id: string, formData: FormData) { return updateCatalogoSimple('gestion_sectores', id, formData) }
export async function deleteGestionSector(id: string) { return deleteCatalogoSimple('gestion_sectores', id) }
