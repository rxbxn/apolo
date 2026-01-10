import { NextResponse } from 'next/server'

export async function GET() {
  console.log('🔍 Debug endpoint called')
  
  try {
    const debugInfo = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      port: process.env.PORT,
      nodeEnv: process.env.NODE_ENV,
      host: '0.0.0.0',
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      versions: process.versions,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      env_vars: {
        PORT: process.env.PORT,
        NODE_ENV: process.env.NODE_ENV,
        NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED,
        HOSTNAME: process.env.HOSTNAME || 'not-set'
      }
    }

    console.log('🔍 Debug info:', JSON.stringify(debugInfo, null, 2))
    
    return NextResponse.json(debugInfo, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('❌ Debug endpoint error:', error)
    
    const errorInfo = {
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }
    
    return NextResponse.json(errorInfo, { status: 500 })
  }
}

export async function POST() {
  return GET()
}