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
                supabase.from('ciudades').select('*').eq('activo', true).order('orden'),
                supabase.from('localidades').select('*').eq('activo', true).order('orden'),
                supabase.from('barrios').select('*').eq('activo', true).order('orden'),
                supabase.from('zonas').select('*').eq('activo', true).order('nombre'),
                supabase.from('tipos_referencia').select('*').eq('activo', true).order('orden'),
                supabase.from('niveles_escolaridad').select('*').eq('activo', true).order('orden'),
                supabase.from('tipos_vivienda').select('*').eq('activo', true).order('orden'),
            ])

            if (ciudadesRes.data) setCiudades(ciudadesRes.data)
            if (localidadesRes.data) setLocalidades(localidadesRes.data)
            if (barriosRes.data) setBarrios(barriosRes.data)
            if (zonasRes.data) setZonas(zonasRes.data)
            if (tiposRefRes.data) setTiposReferencia(tiposRefRes.data)
            if (nivelesEscRes.data) setNivelesEscolaridad(nivelesEscRes.data)
            if (tiposVivRes.data) setTiposVivienda(tiposVivRes.data)
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
