import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/admin/reset-planillas
// Vacía debate_planillas para volver a subirlas desde cero con "Subir Excel
// Planillas" (planillas-upload.tsx), que sí resuelve coordinador_id y
// militante_id contra los registros REALES actuales (por nombre, vía
// /api/mcp/coordinadores y /api/mcp/militantes) y descarta las filas que no
// encuentra match, en vez de insertar con IDs sueltos.
//
// Por qué hace falta: un reset anterior de Personas (ver
// /api/admin/reset-personas) no tocaba las tablas de Debate a propósito
// (decisión explícita, porque no tienen FK real en producción) — pero eso
// dejó filas de debate_planillas con coordinador_id/militante_id apuntando
// a coordinadores/militantes que ya no existen. Al exportar (Informes >
// Planillas), esos IDs huérfanos no cruzan con nada y las columnas
// MILITANTE/COORDINADOR/DIRIGENTE salen vacías.
export async function POST() {
    try {
        const adminClient = createAdminClient() as any
        const { error, count } = await adminClient
            .from('debate_planillas')
            .delete({ count: 'exact' })
            .not('id', 'is', null)

        if (error) {
            return NextResponse.json({ error: error.message, ok: false }, { status: 500 })
        }

        return NextResponse.json({ ok: true, eliminados: count ?? 0 })
    } catch (error: any) {
        console.error('Error en reset-planillas:', error)
        return NextResponse.json({ error: error?.message || 'Error interno', ok: false }, { status: 500 })
    }
}
