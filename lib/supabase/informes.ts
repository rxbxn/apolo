import { SupabaseClient } from '@supabase/supabase-js'

export interface CumplimientoCoordinador {
    coordinadorId: string
    nombre: string
    total: number
    faltante: number
    cumplidos: number
    cumplimiento: number // 0-100
}

export interface Actividad {
    id: string
    nombre: string
    estado: string
}

// Mismo cálculo que cumplimiento.service.ts en la APK (militante_actividad
// cruzado contra militantes.coordinador_id) — se porta aquí para que la web
// muestre el mismo "Informe de actividades" / "Gráficas" que ya existe en
// la app móvil, con datos consistentes entre ambas.
export async function obtenerActividades(supabase: SupabaseClient): Promise<Actividad[]> {
    const { data, error } = await supabase
        .from('actividades')
        .select('id, nombre, estado')
        .order('nombre', { ascending: true })

    if (error) {
        console.error('Error obteniendo actividades:', error)
        return []
    }
    return data || []
}

export async function obtenerCumplimientoPorCoordinador(
    supabase: SupabaseClient,
    actividadId: string
): Promise<CumplimientoCoordinador[]> {
    if (!actividadId) return []

    const [{ data: coordinadores, error: errorCoord }, { data: militantes, error: errorMil }, { data: cumplidos, error: errorCumplidos }] =
        await Promise.all([
            supabase.from('v_coordinadores_completo').select('coordinador_id, nombres, apellidos'),
            supabase.from('militantes').select('id, coordinador_id').not('coordinador_id', 'is', null),
            supabase
                .from('militante_actividad')
                .select('militante_id')
                .eq('actividad_id', actividadId)
                .eq('cumplido', true),
        ])

    if (errorCoord || errorMil || errorCumplidos) {
        console.error('Error obteniendo cumplimiento:', errorCoord || errorMil || errorCumplidos)
        return []
    }

    const militanteIdsCumplidos = new Set((cumplidos || []).map((c: any) => c.militante_id))

    const totalesPorCoordinador = new Map<string, number>()
    const cumplidosPorCoordinador = new Map<string, number>()

        ; (militantes || []).forEach((m: any) => {
            if (!m.coordinador_id) return
            totalesPorCoordinador.set(m.coordinador_id, (totalesPorCoordinador.get(m.coordinador_id) || 0) + 1)
            if (militanteIdsCumplidos.has(m.id)) {
                cumplidosPorCoordinador.set(m.coordinador_id, (cumplidosPorCoordinador.get(m.coordinador_id) || 0) + 1)
            }
        })

    return (coordinadores || [])
        .map((c: any) => {
            const total = totalesPorCoordinador.get(c.coordinador_id) || 0
            const cumplidosCount = cumplidosPorCoordinador.get(c.coordinador_id) || 0
            const nombre = `${c.nombres || ''} ${c.apellidos || ''}`.trim() || 'Sin nombre'
            return {
                coordinadorId: c.coordinador_id,
                nombre,
                total,
                cumplidos: cumplidosCount,
                faltante: total - cumplidosCount,
                cumplimiento: total > 0 ? (cumplidosCount / total) * 100 : 0,
            }
        })
        .filter((c) => c.total > 0)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export interface MilitanteInfo {
    militanteId: string
    usuarioId: string
    nombreMilitante: string
    coordinadorId: string | null
    nombreCoordinador: string
    dirigenteId: string | null
    nombreDirigente: string
}

// Helper compartido por todos los exports de Informes: arma
// militante_id -> {nombre del militante, coordinador, dirigente} en 3
// queries (militantes, usuarios, coordinadores+usuarios), igual al patrón
// ya usado en /api/personas/exportar. Evita repetir esta lógica de join en
// cada ruta de export.
export async function obtenerMapaMilitantes(supabase: SupabaseClient): Promise<Map<string, MilitanteInfo>> {
    const [{ data: militantes }, { data: usuarios }, { data: coordinadores }] = await Promise.all([
        supabase.from('militantes').select('id, usuario_id, coordinador_id, dirigente_id'),
        supabase.from('usuarios').select('id, nombres, apellidos'),
        supabase.from('coordinadores').select('id, usuario_id'),
    ])

    const nombreUsuario = new Map<string, string>()
        ; (usuarios || []).forEach((u: any) => nombreUsuario.set(u.id, `${u.nombres || ''} ${u.apellidos || ''}`.trim()))

    const nombreCoordinador = new Map<string, string>()
        ; (coordinadores || []).forEach((c: any) => nombreCoordinador.set(c.id, nombreUsuario.get(c.usuario_id) || ''))

    const mapa = new Map<string, MilitanteInfo>()
        ; (militantes || []).forEach((m: any) => {
            mapa.set(m.id, {
                militanteId: m.id,
                usuarioId: m.usuario_id,
                nombreMilitante: nombreUsuario.get(m.usuario_id) || '',
                coordinadorId: m.coordinador_id,
                nombreCoordinador: m.coordinador_id ? nombreCoordinador.get(m.coordinador_id) || '' : '',
                dirigenteId: m.dirigente_id,
                nombreDirigente: m.dirigente_id ? nombreCoordinador.get(m.dirigente_id) || '' : '',
            })
        })

    return mapa
}

// Chips "Antiguos / Nuevos / Activos / Suspendidos / Inactivos" de
// reportes.php — cuenta usuarios por estado.
export async function obtenerConteoPorEstado(supabase: SupabaseClient) {
    const { data, error } = await supabase.from('usuarios').select('estado')
    if (error) {
        console.error('Error obteniendo conteo por estado:', error)
        return { nuevos: 0, activos: 0, suspendidos: 0, inactivos: 0, antiguos: 0 }
    }
    const counts = { nuevos: 0, activos: 0, suspendidos: 0, inactivos: 0, antiguos: 0 }
        ; (data || []).forEach((u: any) => {
            const e = (u.estado || '').toLowerCase()
            if (e === 'nuevo') counts.nuevos++
            else if (e === 'activo') counts.activos++
            else if (e === 'suspendido') counts.suspendidos++
            else if (e === 'inactivo') counts.inactivos++
            else if (e === 'antiguo') counts.antiguos++
        })
    return counts
}
