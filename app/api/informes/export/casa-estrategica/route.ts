import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { obtenerMapaMilitantes } from '@/lib/supabase/informes'
import { responderExcel } from '@/lib/informes/xlsx-response'

// GET /api/informes/export/casa-estrategica — equivalente a excel_casa.php
export async function GET() {
    try {
        const adminClient = createAdminClient()
        const [mapaMilitantes, { data: casas, error }, { data: ciudades }, { data: barrios }] = await Promise.all([
            obtenerMapaMilitantes(adminClient as any),
            (adminClient as any).from('debate_casa_estrategica').select('*').order('creado_en', { ascending: false }),
            (adminClient as any).from('ciudades').select('id, nombre'),
            (adminClient as any).from('barrios').select('id, nombre'),
        ])

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const nombreCiudad = new Map<string, string>((ciudades || []).map((c: any) => [c.id, c.nombre]))
        const nombreBarrio = new Map<string, string>((barrios || []).map((b: any) => [b.id, b.nombre]))

        const rows = (casas || []).map((c: any, idx: number) => {
            const m = c.militante_id ? mapaMilitantes.get(c.militante_id) : undefined
            return {
                NRO: idx + 1,
                DIRIGENTE: m?.nombreDirigente || '',
                COORDINADOR: m?.nombreCoordinador || '',
                MILITANTE: m?.nombreMilitante || '',
                DIRECCION: c.direccion || '',
                CIUDAD: c.ciudad_id ? nombreCiudad.get(c.ciudad_id) || '' : '',
                BARRIO: c.barrio_id ? nombreBarrio.get(c.barrio_id) || '' : '',
                MEDIDAS: c.medidas || '',
                'ELEMENTO PUBLICITARIO': c.tipo_publicidad || '',
                // La tabla no tiene fecha_gestion separada de fecha_instalacion —
                // se usa creado_en como aproximación de "cuándo se gestionó".
                FECHA_GESTION: c.creado_en ? String(c.creado_en).slice(0, 10) : '',
                FECHA_INSTALACION: c.fecha_instalacion || '',
            }
        })

        return responderExcel(rows, 'CasasEstrategicas', 'CasasEstrategicas')
    } catch (error: any) {
        console.error('Error exportando casa estratégica:', error)
        return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
    }
}
