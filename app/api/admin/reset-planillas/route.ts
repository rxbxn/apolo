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

        // Militantes con planillas ANTES de borrar — sus compromiso_cautivo/
        // marketing/impacto (sincronizados automáticamente desde las
        // planillas, ver sincronizarCompromisosPlanilla en lib/actions/debate.ts)
        // quedan en 0 tras el borrado masivo, para no dejarlos con un total
        // "fantasma" de planillas que ya no existen.
        const { data: planillasExistentes } = await adminClient
            .from('debate_planillas')
            .select('militante_id')

        const militantesAfectados = [...new Set((planillasExistentes || []).map((p: any) => p.militante_id).filter(Boolean))]

        const { error, count } = await adminClient
            .from('debate_planillas')
            .delete({ count: 'exact' })
            .not('id', 'is', null)

        if (error) {
            return NextResponse.json({ error: error.message, ok: false }, { status: 500 })
        }

        if (militantesAfectados.length > 0) {
            const { data: militantes } = await adminClient
                .from('militantes')
                .select('id, usuario_id')
                .in('id', militantesAfectados)

            const ceros = { compromiso_cautivo: 0, compromiso_marketing: 0, compromiso_impacto: 0 }
            await adminClient.from('militantes').update(ceros).in('id', militantesAfectados)

            const usuarioIds = [...new Set((militantes || []).map((m: any) => m.usuario_id).filter(Boolean))]
            if (usuarioIds.length > 0) {
                await adminClient.from('usuarios').update(ceros).in('id', usuarioIds)
            }
        }

        return NextResponse.json({ ok: true, eliminados: count ?? 0, compromisosReiniciados: militantesAfectados.length })
    } catch (error: any) {
        console.error('Error en reset-planillas:', error)
        return NextResponse.json({ error: error?.message || 'Error interno', ok: false }, { status: 500 })
    }
}
