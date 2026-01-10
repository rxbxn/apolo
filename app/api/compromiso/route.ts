import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getcompromiso } from '@/lib/actions/configuracion'

export async function GET() {
  try {
    const data = await getcompromiso()
    return NextResponse.json(data)
  } catch (e) {
    console.error('Error returning compromisos:', e)
    return NextResponse.json([], { status: 500 })
  }
}
