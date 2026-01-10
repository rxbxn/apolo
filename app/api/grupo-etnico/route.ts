import { NextResponse } from 'next/server'
import { getGrupoEtnicos } from '@/lib/actions/configuracion'

export async function GET() {
  try {
    const data = await getGrupoEtnicos()
    return NextResponse.json(data)
  } catch (e) {
    console.error('Error returning grupo_etnico:', e)
    return NextResponse.json([], { status: 500 })
  }
}
