import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

// GET /api/personas/sin-foto
// Excel con NOMBRE COMPLETO y CEDULA de las personas que hoy NO tienen
// foto_perfil_url (nunca se les subió foto, o la actualización masiva de
// Fotos Masivas no encontró coincidencia/fue ambigua para ellas).
export async function GET(request: NextRequest) {
    try {
        const adminClient = createAdminClient()

        const { data: usuarios, error } = await (adminClient as any)
            .from('usuarios')
            .select('nombres, apellidos, numero_documento, foto_perfil_url')
            .or('foto_perfil_url.is.null,foto_perfil_url.eq.')
            .order('nombres', { ascending: true })
            .order('apellidos', { ascending: true })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        const rows = (usuarios ?? []).map((u: any) => ({
            'NOMBRE COMPLETO': `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim(),
            'CEDULA': u.numero_documento ?? '',
        }))

        const ws = XLSX.utils.json_to_sheet(rows, { header: ['NOMBRE COMPLETO', 'CEDULA'] })
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Sin foto')

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
        const filename = `Personas_sin_foto_${new Date().toISOString().split('T')[0]}.xlsx`

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })
    } catch (error: any) {
        console.error('Error exportando personas sin foto:', error)
        return NextResponse.json({ error: error?.message || 'Error interno exportando' }, { status: 500 })
    }
}
