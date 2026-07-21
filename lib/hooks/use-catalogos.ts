'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type Ciudad = Database['public']['Tables']['ciudades']['Row']
type Localidad = Database['public']['Tables']['localidades']['Row']
type Barrio = Database['public']['Tables']['barrios']['Row']
type Zona = Database['public']['Tables']['zonas']['Row']
type TipoReferencia = Database['public']['Tables']['tipos_referencia']['Row']
type NivelEscolaridad = Database['public']['Tables']['niveles_escolaridad']['Row']
type TipoVivienda = Database['public']['Tables']['tipos_vivienda']['Row']

// Los catálogos (ciudades, localidades, barrios, zonas, etc.) vienen de
// importaciones/migraciones históricas y a veces terminan con filas
// duplicadas — mismo nombre, distinto id. Eso hace que un select muestre
// "10 DE MARZO" o "BARRANQUILLA" repetido muchas veces. Se deduplica por
// nombre (sin distinguir mayúsculas/espacios) ANTES de guardarlo en el
// estado, quedándose con la primera fila — así ningún select del formulario
// vuelve a mostrar la misma opción más de una vez, sin importar qué tan
// sucio venga el catálogo real.
// `clavePadre` opcional: para localidades/barrios el nombre SÍ puede
// repetirse legítimamente entre ciudades distintas (ej. una localidad
// "NORTE" en dos municipios) — ahí se deduplica por nombre+padre, no por
// nombre solo, para no fusionar por error opciones de ciudades diferentes.
function dedupePorNombre<T extends { nombre?: string | null }>(
    filas: T[],
    clavePadre?: (fila: T) => string | null | undefined,
): T[] {
    const vistos = new Set<string>()
    const resultado: T[] = []
    for (const fila of filas) {
        const nombre = (fila.nombre ?? '').trim().toUpperCase()
        const padre = clavePadre ? (clavePadre(fila) ?? '') : ''
        const clave = `${padre}::${nombre}`
        if (nombre && vistos.has(clave)) continue
        if (nombre) vistos.add(clave)
        resultado.push(fila)
    }
    return resultado
}

export function useCatalogos() {
    const [ciudades, setCiudades] = useState<Ciudad[]>([])
    const [localidades, setLocalidades] = useState<Localidad[]>([])
    const [barrios, setBarrios] = useState<Barrio[]>([])
    const [zonas, setZonas] = useState<Zona[]>([])
    const [tiposReferencia, setTiposReferencia] = useState<TipoReferencia[]>([])
    const [nivelesEscolaridad, setNivelesEscolaridad] = useState<NivelEscolaridad[]>([])
    const [tiposVivienda, setTiposVivienda] = useState<TipoVivienda[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        cargarCatalogos()
    }, [])

    async function cargarCatalogos() {
        try {
            setLoading(true)

            const [
                ciudadesRes,
                localidadesRes,
                barriosRes,
                zonasRes,
                tiposRefRes,
                nivelesEscRes,
                tiposVivRes,
            ] = await Promise.all([
                supabase.from('ciudades').select('*').eq('activo', true).order('nombre'),
                supabase.from('localidades').select('*').eq('activo', true).order('nombre'),
                supabase.from('barrios').select('*').eq('activo', true).order('nombre'),
                supabase.from('zonas').select('*').eq('activo', true).order('nombre'),
                supabase.from('tipos_referencia').select('*').eq('activo', true).order('nombre'),
                supabase.from('niveles_escolaridad').select('*').eq('activo', true).order('nombre'),
                supabase.from('tipos_vivienda').select('*').eq('activo', true).order('nombre'),
            ])

            if (ciudadesRes.data) setCiudades(dedupePorNombre(ciudadesRes.data))
            if (localidadesRes.data) setLocalidades(dedupePorNombre(localidadesRes.data, (l: any) => l.ciudad_id))
            if (barriosRes.data) setBarrios(dedupePorNombre(barriosRes.data, (b: any) => b.localidad_id))
            if (zonasRes.data) setZonas(dedupePorNombre(zonasRes.data))
            if (tiposRefRes.data) setTiposReferencia(dedupePorNombre(tiposRefRes.data))
            if (nivelesEscRes.data) setNivelesEscolaridad(dedupePorNombre(nivelesEscRes.data))
            if (tiposVivRes.data) setTiposVivienda(dedupePorNombre(tiposVivRes.data))
        } catch (error) {
            console.error('Error cargando catálogos:', error)
        } finally {
            setLoading(false)
        }
    }

    // Filtrar localidades por ciudad
    function getLocalidadesPorCiudad(ciudadId: string) {
        return localidades.filter((l) => l.ciudad_id === ciudadId)
    }

    // Filtrar barrios por localidad
    function getBarriosPorLocalidad(localidadId: string) {
        return barrios.filter((b) => b.localidad_id === localidadId)
    }

    // Stub para puestos de votación (pendiente de crear tabla)
    const [puestosVotacion, setPuestosVotacion] = useState<any[]>([])

    function fetchPuestosVotacion(ciudadId: string) {
        // TODO: Implementar cuando exista la tabla
        console.log('Fetching puestos votación for', ciudadId)
        setPuestosVotacion([])
    }

    return {
        ciudades,
        localidades,
        barrios,
        zonas,
        tiposReferencia,
        nivelesEscolaridad,
        tiposVivienda,
        puestosVotacion, // Added to fix crash
        loading,
        getLocalidadesPorCiudad,
        getBarriosPorLocalidad,
        fetchLocalidades: (id: string) => getLocalidadesPorCiudad(id), // Helper for consistency
        fetchBarrios: (id: string) => getBarriosPorLocalidad(id), // Helper for consistency
        fetchPuestosVotacion, // Added to fix crash
        recargar: cargarCatalogos,
    }
}
