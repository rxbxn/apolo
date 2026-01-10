import { NextResponse } from 'next/server'
import { getReferencias } from '@/lib/actions/configuracion'

export async function GET() {
  try {
    const data = await getReferencias()
    return NextResponse.json(data)
  } catch (e) {
    console.error('Error returning referencias:', e)
    return NextResponse.json([], { status: 500 })
  }
}
