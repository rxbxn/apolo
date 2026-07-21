import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { obtenerMapaMilitantes } from '@/lib/supabase/informes'
import { responderExcel } from '@/lib/informes/xlsx-response'

// GET /api/informes/export/visitas — equivalente a excel_visitas.php de Zeus
export async function GET() {
    try {
        const adminClient = createAdminClient()
        const [mapaMilitantes, { data: visitas, error }] = await Promise.all([
            obtenerMapaMilitantes(adminClient as any),
            (adminClient as any).from('agenda_visita').select('*').order('created_at', { ascending: false }),
        ])

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Coordenadas: agenda_visita no guarda lat/lng por registro (se
        // actualiza usuarios.latitud/longitud del militante) — se completa
        // aparte solo si hace falta.
        const usuarioIds = Array.from(mapaMilitantes.values()).map((m) => m.usuarioId)
        const { data: usuariosCoords } = await (adminClient as any)
            .from('usuarios')
            .select('id, latitud, longitud')
            .in('id', usuarioIds)
        const coordsPorUsuario = new Map<string, { latitud: number | null; longitud: number | null }>()
            ; (usuariosCoords || []).forEach((u: any) => coordsPorUsuario.set(u.id, { latitud: u.latitud, longitud: u.longitud }))

        const rows = (visitas || []).map((v: any, idx: number) => {
            const m = mapaMilitantes.get(v.id_militante)
            const coords = m ? coordsPorUsuario.get(m.usuarioId) : null
            const fechaHora = v.created_at ? new Date(v.created_at) : null
            return {
                NRO: idx + 1,
                DIRIGENTE: m?.nombreDirigente || '',
                COORDINADOR: m?.nombreCoordinador || '',
                MILITANTE: m?.nombreMilitante || '',
                FECHA: fechaHora ? fechaHora.toISOString().split('T')[0] : '',
                HORA: fechaHora ? fechaHora.toTimeString().split(' ')[0] : '',
                MOTIVO: v.tipo_reunion || '',
                COORDENADAS: coords?.latitud && coords?.longitud ? `${coords.latitud}, ${coords.longitud}` : '',
                OBSERVACIONES: v.observaciones || '',
            }
        })

        return responderExcel(rows, 'Visitas', 'Visitas')
    } catch (error: any) {
        console.error('Error exportando visitas:', error)
        return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
    }
}
