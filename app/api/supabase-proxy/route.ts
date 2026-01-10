import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headers = new Headers()
    
    // Copiar headers importantes
    headers.set('Content-Type', 'application/json')
    headers.set('Authorization', request.headers.get('authorization') || '')
    headers.set('apikey', request.headers.get('apikey') || '')
    
    const response = await fetch('https://72-61-64-225.traefik.me/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers,
      body
    })

    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    }
  })
}