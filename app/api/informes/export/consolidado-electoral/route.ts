import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { obtenerMapaMilitantes } from '@/lib/supabase/informes'
import { responderExcel } from '@/lib/informes/xlsx-response'

// GET /api/informes/export/consolidado-electoral — equivalente a
// excel_consolidado_electoral.php, el más complejo de los 9.
//
// IMPORTANTE — reconstrucción de mejor esfuerzo: Zeus no expone la fórmula
// exacta de TOTAL DIFUSION / TOTAL LIMPIO / CUMPLIMIENTO / LIMPIO ELECTOR,
// solo el resultado final en el Excel. Las fórmulas de abajo son una
// interpretación razonable a partir de los nombres de columna y el orden en
// que aparecen, PERO no están validadas contra los números reales de Zeus.
// Antes de usar este reporte para decisiones reales, compara una fila
// contra excel_consolidado_electoral.php y ajusta la fórmula si no calza.
export async function GET() {
    try {
        const adminClient = createAdminClient()
        const [
            mapaMilitantes,
            { data: usuarios, error: uErr },
            { data: militantes },
            { data: planillas },
            { data: inconsistencias },
        ] = await Promise.all([
            obtenerMapaMilitantes(adminClient as any),
            (adminClient as any).from('usuarios').select('id, nombres, apellidos, numero_documento, estado').order('nombres'),
            (adminClient as any)
                .from('militantes')
                .select('id, usuario_id, tipo, estado, compromiso_difusion, compromiso_marketing, compromiso_impacto, compromiso_cautivo, cruces_externos, alistado, estado_electoral'),
            (adminClient as any).from('debate_planillas').select('militante_id, cautivo, marketing, impacto'),
            (adminClient as any).from('debate_inconsistencias').select('militante_id, radical, exclusion, fuera_barranquilla'),
        ])

        if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

        const militantePorUsuario = new Map<string, any>((militantes || []).map((m: any) => [m.usuario_id, m]))
        const militanteIdPorUsuario = new Map<string, string>((militantes || []).map((m: any) => [m.usuario_id, m.id]))

        const reportadoPorMilitante = new Map<string, { cautivo: number; marketing: number; impacto: number }>()
            ; (planillas || []).forEach((p: any) => {
                if (!p.militante_id) return
                const actual = reportadoPorMilitante.get(p.militante_id) || { cautivo: 0, marketing: 0, impacto: 0 }
                actual.cautivo += Number(p.cautivo) || 0
                actual.marketing += Number(p.marketing) || 0
                actual.impacto += Number(p.impacto) || 0
                reportadoPorMilitante.set(p.militante_id, actual)
            })

        const inconsistenciasPorMilitante = new Map<string, { documentos: number; exclusiones: number; fueraBquilla: number }>()
            ; (inconsistencias || []).forEach((i: any) => {
                if (!i.militante_id) return
                const actual = inconsistenciasPorMilitante.get(i.militante_id) || { documentos: 0, exclusiones: 0, fueraBquilla: 0 }
                actual.documentos += Number(i.radical) || 0
                actual.exclusiones += Number(i.exclusion) || 0
                actual.fueraBquilla += Number(i.fuera_barranquilla) || 0
                inconsistenciasPorMilitante.set(i.militante_id, actual)
            })

        const rows = (usuarios || []).map((u: any, idx: number) => {
            const militante = militantePorUsuario.get(u.id)
            const militanteId = militanteIdPorUsuario.get(u.id)
            const info = militanteId ? mapaMilitantes.get(militanteId) : undefined
            const reportado = militanteId ? reportadoPorMilitante.get(militanteId) : undefined
            const inc = militanteId ? inconsistenciasPorMilitante.get(militanteId) : undefined

            const reportadoCautivo = reportado?.cautivo || 0
            const reportadoMarketing = reportado?.marketing || 0
            const reportadoImpacto = reportado?.impacto || 0
            const totalDifusion = reportadoCautivo + reportadoMarketing + reportadoImpacto

            const noDocumentos = inc?.documentos || 0
            const exclusiones = inc?.exclusiones || 0
            const fueraBquilla = inc?.fueraBquilla || 0
            const totalInconsistencias = exclusiones + fueraBquilla
            const crucesExternos = militante?.cruces_externos || 0

            const totalLimpio = Math.max(0, totalDifusion - totalInconsistencias - crucesExternos)
            const cumplimiento = totalDifusion > 0 ? (totalLimpio / totalDifusion) * 100 : 0

            return {
                ID: idx + 1,
                'CÉDULA': u.numero_documento || '',
                PERSONA: `${u.nombres || ''} ${u.apellidos || ''}`.trim(),
                COORDINADOR: info?.nombreCoordinador || '',
                DIRIGENTE: info?.nombreDirigente || '',
                TIPO: militante?.tipo || '',
                ESTADO: u.estado || '',
                'COMP. DIFUSIÓN': militante?.compromiso_difusion || '',
                'COMP. MARKETINNG': militante?.compromiso_marketing || '',
                'COMP. IMPACTO': militante?.compromiso_impacto || '',
                'COMP. CAUTIVO': militante?.compromiso_cautivo || '',
                'REPORTADO CAUTIVO': reportadoCautivo,
                'REPORTADO MARKETINNG': reportadoMarketing,
                'REPORTADO IMPACTO': reportadoImpacto,
                'TOTAL DIFUSION': totalDifusion,
                'No DOCUMENTOS': noDocumentos,
                EXCLUSIONES: exclusiones,
                'FUERA B/QUILLA': fueraBquilla,
                'TOTAL INCONSISTENCIAS': totalInconsistencias,
                'CRUCES EXTERNOS': crucesExternos,
                'TOTAL LIMPIO': totalLimpio,
                'LIMPIO ELECTOR': totalLimpio > 0 ? 'Sí' : 'No',
                'CUMPLIMIEMTO': `${cumplimiento.toFixed(1)}%`,
                'ESTADO ELECTORAL': militante?.estado_electoral || '',
                'ESTADO MILITANTE': militante?.estado || '',
                ALISTADO: militante?.alistado ? 'Sí' : 'No',
                COMPROMISO: '',
            }
        })

        return responderExcel(rows, 'ConsolidadoElectoral', 'Consolidado_Electoral')
    } catch (error: any) {
        console.error('Error exportando consolidado electoral:', error)
        return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
    }
}
