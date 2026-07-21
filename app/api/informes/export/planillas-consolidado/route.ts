import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { obtenerMapaMilitantes } from '@/lib/supabase/informes'
import { responderExcel } from '@/lib/informes/xlsx-response'

// GET /api/informes/export/planillas-consolidado — equivalente a
// excel_planillas_consolidado.php: suma cautivo/marketing/impacto de TODAS
// las planillas de cada militante en una sola fila.
export async function GET() {
    try {
        const adminClient = createAdminClient()
        const [mapaMilitantes, { data: planillas, error }] = await Promise.all([
            obtenerMapaMilitantes(adminClient as any),
            (adminClient as any).from('debate_planillas').select('militante_id, cautivo, marketing, impacto'),
        ])

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const totales = new Map<string, { cautivo: number; marketing: number; impacto: number }>()
            ; (planillas || []).forEach((p: any) => {
                if (!p.militante_id) return
                const actual = totales.get(p.militante_id) || { cautivo: 0, marketing: 0, impacto: 0 }
                actual.cautivo += Number(p.cautivo) || 0
                actual.marketing += Number(p.marketing) || 0
                actual.impacto += Number(p.impacto) || 0
                totales.set(p.militante_id, actual)
            })

        const rows = Array.from(totales.entries()).map(([militanteId, t], idx) => {
            const m = mapaMilitantes.get(militanteId)
            return {
                NRO: idx + 1,
                DIRIGENTE: m?.nombreDirigente || '',
                COORDINADOR: m?.nombreCoordinador || '',
                MILITANTE: m?.nombreMilitante || '',
                TIPO: '',
                CAUTIVO: t.cautivo,
                MARKETING: t.marketing,
                IMPACTO: t.impacto,
            }
        })

        return responderExcel(rows, 'PlanillasConsolidado', 'Planillas_Consolidado')
    } catch (error: any) {
        console.error('Error exportando planillas consolidado:', error)
        return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
    }
}
