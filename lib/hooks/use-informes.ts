'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
    Actividad,
    CumplimientoCoordinador,
    obtenerActividades,
    obtenerCumplimientoPorCoordinador,
    obtenerConteoPorEstado,
} from '@/lib/supabase/informes'

export function useActividades() {
    const [actividades, setActividades] = useState<Actividad[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        obtenerActividades(supabase).then((data) => {
            setActividades(data)
            setLoading(false)
        })
    }, [])

    return { actividades, loading }
}

export function useCumplimientoPorCoordinador(actividadId: string) {
    const [data, setData] = useState<CumplimientoCoordinador[]>([])
    const [loading, setLoading] = useState(true)

    const cargar = useCallback(async () => {
        if (!actividadId) {
            setData([])
            setLoading(false)
            return
        }
        setLoading(true)
        const resultado = await obtenerCumplimientoPorCoordinador(supabase, actividadId)
        setData(resultado)
        setLoading(false)
    }, [actividadId])

    useEffect(() => {
        cargar()
    }, [cargar])

    return { data, loading, recargar: cargar }
}

export function useConteoPorEstado() {
    const [conteo, setConteo] = useState({ nuevos: 0, activos: 0, suspendidos: 0, inactivos: 0, antiguos: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        obtenerConteoPorEstado(supabase).then((data) => {
            setConteo(data)
            setLoading(false)
        })
    }, [])

    return { conteo, loading }
}
