import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { obtenerMapaMilitantes } from '@/lib/supabase/informes'
import { responderExcel } from '@/lib/informes/xlsx-response'

// GET /api/informes/export/marketing-vehiculos — equivalente a excel_Veh_market.php
// Requiere haber corrido cambios/ampliar_esquema_modulo_informes.sql
// (agrega militante_id, modelo, fecha_gestion a debate_publicidad_vehiculo).
export async function GET() {
    try {
        const adminClient = createAdminClient()
        const [mapaMilitantes, { data: publicidad, error }] = await Promise.all([
            obtenerMapaMilitantes(adminClient as any),
            (adminClient as any).from('debate_publicidad_vehiculo').select('*').order('creado_en', { ascending: false }),
        ])

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const rows = (publicidad || []).map((p: any, idx: number) => {
            const m = p.militante_id ? mapaMilitantes.get(p.militante_id) : undefined
            return {
                NRO: idx + 1,
                DIRIGENTE: m?.nombreDirigente || '',
                COORDINADOR: m?.nombreCoordinador || '',
                MILITANTE: m?.nombreMilitante || '',
                MODELO: p.modelo || '',
                'ELEMENTO PUBLICITARIO': p.tipo_publicidad || '',
                FECHA_GESTION: p.fecha_gestion || (p.creado_en ? String(p.creado_en).slice(0, 10) : ''),
                FECHA_INSTALACION: p.fecha_instalacion || '',
            }
        })

        return responderExcel(rows, 'MarketingVehiculos', 'MarketingVehiculos')
    } catch (error: any) {
        console.error('Error exportando marketing de vehículos:', error)
        return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
    }
}
