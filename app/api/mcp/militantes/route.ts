import { NextResponse } from 'next/server'
import { getMilitantesByCoordinador } from '@/lib/actions/debate'

export async function GET(request: Request) {
    try {
        const url = new URL(request.url)
        const coord = url.searchParams.get('coordinador') || ''
        const data = await getMilitantesByCoordinador(coord)
        return NextResponse.json({ data })
    } catch (err: any) {
        console.error('Error in MCP militantes GET:', err)
        return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
    }
}
