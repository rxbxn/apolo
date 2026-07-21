import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// Helper compartido por todas las rutas de export de Informes — arma el
// buffer .xlsx y la respuesta de descarga, igual patrón que ya usaba
// /api/personas/exportar.
export function responderExcel(rows: Record<string, any>[], nombreHoja: string, prefijoArchivo: string) {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja)

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `${prefijoArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    })
}
