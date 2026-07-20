import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { EXCEL_HEADERS } from '@/lib/personas/import-utils'

// GET /api/personas/exportar
// Exporta la data AUTORIZADA actual (refleja ediciones/desactivaciones, no la
// foto original del import) con la misma estructura de columnas del Excel
// fuente, para que el archivo se pueda volver a subir por "Importar".
export async function GET(request: NextRequest) {
    try {
        const adminClient = createAdminClient()

        const [{ data: usuarios, error: uErr }, { data: militantes }, { data: coordinadores }, { data: referencias }] = await Promise.all([
            (adminClient as any).from('usuarios').select('*').order('nombres', { ascending: true }).order('apellidos', { ascending: true }),
            (adminClient as any).from('militantes').select('*'),
            (adminClient as any)
                .from('coordinadores')
                .select('id, usuario_id, usuarios!coordinadores_usuario_id_fkey(nombres, apellidos)'),
            (adminClient as any).from('referencia').select('id, nombre, telefono'),
        ])

        if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

        const militanteByUsuario = new Map<string, any>()
        ;(militantes ?? []).forEach((m: any) => militanteByUsuario.set(m.usuario_id, m))

        const nombreByCoordId = new Map<string, string>()
        ;(coordinadores ?? []).forEach((c: any) => {
            const u = c.usuarios
            if (u) nombreByCoordId.set(c.id, `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim().toUpperCase())
        })

        // referencia_id es un UUID real (tabla `referencia`) — antes de este
        // fix, si `referido_por` (texto libre viejo) venía vacío, el export
        // caía a mostrar el UUID crudo de referencia_id en la columna
        // REFERENCIA. Ahora se resuelve contra el nombre real.
        const referenciaById = new Map<string, { nombre: string; telefono: string | null }>()
        ;(referencias ?? []).forEach((r: any) => {
            referenciaById.set(r.id, { nombre: r.nombre ?? '', telefono: r.telefono ?? null })
        })

        const rows = (usuarios ?? []).map((u: any, idx: number) => {
            const m = militanteByUsuario.get(u.id) ?? {}
            const coordNombre = m.coordinador_id ? (nombreByCoordId.get(m.coordinador_id) ?? '') : ''
            const dirigenteNombre = m.dirigente_id ? (nombreByCoordId.get(m.dirigente_id) ?? '') : ''
            const referenciaRow = u.referencia_id ? referenciaById.get(u.referencia_id) : null

            return {
                'ID': idx + 1,
                'CEDULA': u.numero_documento ?? '',
                'ESTADO': u.estado ? u.estado.charAt(0).toUpperCase() + u.estado.slice(1) : '',
                'OBSERVACIONES': u.observaciones ?? '',
                'FECHA': u.fecha_registro ?? (u.creado_en ? String(u.creado_en).slice(0, 10) : ''),
                'NOMBRE COMPLETO': `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim(),
                'COORDINADOR': coordNombre,
                'DIRIGENTE': dirigenteNombre,
                // Fijo en 80001 (código de "Militante" del catálogo tipos_militante):
                // este campo no distingue roles en la práctica (eso vive en las
                // tablas coordinadores/dirigentes) y algunos registros viejos
                // tienen basura ahí (un ID en vez del texto esperado) por un bug
                // de datos anterior — no vale la pena mostrarla.
                'TIPO': '80001',
                'TALLA': u.talla_camisa ?? '',
                'LUGAR NACIMIENTO': u.lugar_nacimiento ?? '',
                'DIRECCIÓN': u.direccion ?? '',
                'TELEFONO FIJO': u.telefono_fijo ?? '',
                'CIUDAD': u.ciudad_nombre ?? '',
                'BARRIO': u.barrio_nombre ?? '',
                'LOCALIDAD': u.localidad_nombre ?? '',
                'NACIMIENTO': u.fecha_nacimiento ?? '',
                'GENERO': u.genero ?? '',
                'EMAIL': u.email ?? '',
                'REFERENCIA': u.referido_por || referenciaRow?.nombre || '',
                'TEL REFERENCIA': u.telefono_referencia || referenciaRow?.telefono || '',
                'VIVIENDA': u.tipo_vivienda ?? '',
                'FACEBOOK': u.facebook ?? '',
                'INSTAGRAM': u.instagram ?? '',
                'TWITTER': u.twitter ?? '',
                'WHATSAPP': u.whatsapp ?? '',
                'ESTUDIOS': u.nivel_escolaridad ?? '',
                'OCUPACION': u.perfil_ocupacion ?? '',
                'COMP. DIFUSIÓN': m.compromiso_difusion ?? '',
                'COMP. MARKETING': u.compromiso_marketing ?? m.compromiso_marketing ?? 0,
                'COMP. IMPACTO': u.compromiso_impacto ?? m.compromiso_impacto ?? 0,
                'COMP. CAUTIVO': u.compromiso_cautivo ?? m.compromiso_cautivo ?? 0,
                'COMP. PROYECTO': u.comp_proyecto ?? m.compromiso_proyecto ?? '',
                'VERIFICACIÓN STICKER': u.verificacion_sticker ?? '',
                'FECHA VERIFICACIÓN STICKER': u.fecha_verificacion_sticker ?? '',
                'OBSERVACIÓN VERIFICACIÓN STICKER': u.observacion_verificacion_sticker ?? '',
                'NOMBRE VERIFICADOR': u.nombre_verificador ?? '',
                'BENEFICIARIO': u.beneficiario ?? '',
                'POBLACION': u.poblacion ?? '',
                'UBICACION': u.ubicacion ?? '',
                'HIJOS': u.numero_hijos ?? 0,
                'IDEOLOGÍA': u.ideologia_politica ?? '',
            }
        })

        const ws = XLSX.utils.json_to_sheet(rows, { header: EXCEL_HEADERS as unknown as string[] })

        // La columna OBSERVACIONES se mantiene en el archivo (el import la
        // lee de vuelta al reimportar — quitarla del todo borraría esas
        // observaciones en cada reimport) pero se oculta visualmente, a
        // pedido del usuario.
        const idxObservaciones = (EXCEL_HEADERS as unknown as string[]).indexOf('OBSERVACIONES')
        if (idxObservaciones !== -1) {
            ws['!cols'] = ws['!cols'] || []
            for (let i = 0; i <= idxObservaciones; i++) {
                if (!ws['!cols'][i]) ws['!cols'][i] = {}
            }
            ws['!cols'][idxObservaciones] = { ...ws['!cols'][idxObservaciones], hidden: true }
        }

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Personas')

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
        const filename = `Personas_${new Date().toISOString().split('T')[0]}.xlsx`

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })
    } catch (error: any) {
        console.error('Error exportando personas:', error)
        return NextResponse.json({ error: error?.message || 'Error interno exportando' }, { status: 500 })
    }
}
