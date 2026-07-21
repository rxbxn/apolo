import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { obtenerMapaMilitantes } from '@/lib/supabase/informes'
import { responderExcel } from '@/lib/informes/xlsx-response'

// GET /api/informes/export/vehiculo-amigo — equivalente a excel_veh_amigo.php
// Requiere haber corrido cambios/ampliar_esquema_modulo_informes.sql
// (agrega militante_id, marca, modelo, conductor, etc. a debate_vehiculo_amigo).
export async function GET() {
    try {
        const adminClient = createAdminClient()
        const [mapaMilitantes, { data: vehiculos, error }] = await Promise.all([
            obtenerMapaMilitantes(adminClient as any),
            (adminClient as any).from('debate_vehiculo_amigo').select('*').order('creado_en', { ascending: false }),
        ])

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const rows = (vehiculos || []).map((v: any, idx: number) => {
            const m = v.militante_id ? mapaMilitantes.get(v.militante_id) : undefined
            return {
                NRO: idx + 1,
                DIRIGENTE: m?.nombreDirigente || '',
                COORDINADOR: m?.nombreCoordinador || '',
                MILITANTE: m?.nombreMilitante || v.propietario || '',
                PLACA: v.placa || '',
                PROPIEDAD: v.propiedad || '',
                MARCA: v.marca || '',
                MODELO: v.modelo || '',
                CONDUCTOR: v.conductor || '',
                CELULAR: v.celular_conductor || '',
                ENTREGO_DOC: v.entrego_documento ? 'Sí' : 'No',
                RECONOCIMIENTO: v.reconocimiento || '',
                CAPACIDAD: v.capacidad || '',
                TIPO: v.tipo_vehiculo || '',
            }
        })

        return responderExcel(rows, 'VehiculoAmigo', 'VehiculoAmigo')
    } catch (error: any) {
        console.error('Error exportando vehículo amigo:', error)
        return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
    }
}
