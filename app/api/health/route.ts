import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Verificar estado básico de la aplicación
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || '3001',
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
      }
    }

    // Headers para evitar cache en health checks
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }

    return NextResponse.json(healthCheck, { status: 200, headers })
  } catch (error) {
    const errorResponse = {
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
  port: process.env.PORT || '3001'
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// También permitir otros métodos HTTP por si acaso
export async function POST() {
  return GET()
}

export async function PUT() {
  return GET()
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}