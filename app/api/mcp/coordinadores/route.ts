import { NextResponse } from 'next/server'
import { getCoordinadoresForSelect } from '@/lib/actions/debate'

export async function GET() {
    try {
        const data = await getCoordinadoresForSelect()
        return NextResponse.json({ data })
    } catch (err: any) {
        console.error('Error in MCP coordinadores GET:', err)
        return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
    }
}
