import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { obtenerMapaMilitantes } from '@/lib/supabase/informes'
import { responderExcel } from '@/lib/informes/xlsx-response'

// GET /api/informes/export/checklist — equivalente a excel_checklist.php
// ("Lista de verificación del Coordinador"). Requiere haber corrido
// cambios/ampliar_esquema_modulo_informes.sql, que siembra en `actividades`
// las 10 etapas exactas que usa este checklist.
const ETAPAS = [
    'Confirmación Datos',
    'Confirmación',
    'Sticker Inicio',
    'Vehículo Amigo',
    'Casa Estratégica',
    'Publicidad Estratégica',
    'Testigo Electoral',
    'Jurado',
    'Entrega de Invitaciones',
    'Entrega Planillas',
]

export async function GET() {
    try {
        const adminClient = createAdminClient()
        const [mapaMilitantes, { data: actividades }, { data: cumplidos, error }] = await Promise.all([
            obtenerMapaMilitantes(adminClient as any),
            (adminClient as any).from('actividades').select('id, nombre').in('nombre', ETAPAS),
            (adminClient as any).from('militante_actividad').select('militante_id, actividad_id').eq('cumplido', true),
        ])

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const actividadIdPorNombre = new Map<string, string>((actividades || []).map((a: any) => [a.nombre, a.id]))
        const cumplidoSet = new Set((cumplidos || []).map((c: any) => `${c.militante_id}:${c.actividad_id}`))

        const rows = Array.from(mapaMilitantes.values()).map((m, idx) => {
            const fila: Record<string, any> = {
                ID: idx + 1,
                MILITANTE: m.nombreMilitante,
                COORDINADOR: m.nombreCoordinador,
                DIRIGENTE: m.nombreDirigente,
            }
            ETAPAS.forEach((etapa) => {
                const actividadId = actividadIdPorNombre.get(etapa)
                const key = actividadId ? `${m.militanteId}:${actividadId}` : ''
                fila[etapa.toUpperCase()] = key && cumplidoSet.has(key) ? 'Sí' : '-'
            })
            return fila
        })

        return responderExcel(rows, 'Checklist', 'Checklist_Coordinador')
    } catch (error: any) {
        console.error('Error exportando checklist:', error)
        return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
    }
}
