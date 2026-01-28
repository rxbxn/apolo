import { NextResponse } from 'next/server'
import { createPlanillasBulk } from '@/lib/actions/debate'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const rows = Array.isArray(body) ? body : (body?.rows || [])
        const res = await createPlanillasBulk(rows)
        return NextResponse.json({ data: res })
    } catch (err: any) {
        console.error('Error in MCP planillas POST:', err)
        return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
    }
}
