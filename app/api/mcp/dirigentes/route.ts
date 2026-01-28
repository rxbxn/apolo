import { NextResponse } from 'next/server'
import { getDirigentes } from '@/lib/actions/gestion'

export async function GET() {
    try {
        const data = await getDirigentes()
        return NextResponse.json({ data })
    } catch (err: any) {
        console.error('Error in MCP dirigentes GET:', err)
        return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
    }
}
