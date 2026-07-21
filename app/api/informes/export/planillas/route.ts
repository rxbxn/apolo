import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { obtenerMapaMilitantes } from '@/lib/supabase/informes'
import { responderExcel } from '@/lib/informes/xlsx-response'

// GET /api/informes/export/planillas — equivalente a excel_planillas.php
export async function GET() {
    try {
        const adminClient = createAdminClient()
        const [mapaMilitantes, { data: planillas, error }] = await Promise.all([
            obtenerMapaMilitantes(adminClient as any),
            (adminClient as any).from('debate_planillas').select('*').order('fecha_planilla', { ascending: false }),
        ])

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const rows = (planillas || []).map((p: any, idx: number) => {
            const m = p.militante_id ? mapaMilitantes.get(p.militante_id) : undefined
            const cautivo = Number(p.cautivo) || 0
            const marketing = Number(p.marketing) || 0
            const impacto = Number(p.impacto) || 0
            return {
                NRO: idx + 1,
                DIRIGENTE: m?.nombreDirigente || '',
                COORDINADOR: m?.nombreCoordinador || '',
                MILITANTE: m?.nombreMilitante || '',
                // debate_planillas no distingue tipo/estado por fila — se deja
                // vacío; si Zeus lo necesita exacto, agregar esas columnas a
                // la tabla en el próximo ajuste de esquema.
                TIPO: '',
                'No. RADICADO': p.radicado ?? '',
                CAUTIVO: cautivo,
                MARKETING: marketing,
                'TOTAL REPORTADO': cautivo + marketing,
                IMPACTO: impacto,
                FECHA: p.fecha_planilla || '',
                ESTADO: '',
            }
        })

        return responderExcel(rows, 'Planillas', 'Planillas')
    } catch (error: any) {
        console.error('Error exportando planillas:', error)
        return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
    }
}
