'use client'

import { useEffect, useState } from 'react'

export function EnvironmentDebug() {
  const [envDebug, setEnvDebug] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const debugInfo = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...',
      keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
      nodeEnv: process.env.NODE_ENV,
      isClient: typeof window !== 'undefined',
      allPublicEnvs: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')),
      // Raw values for debugging
      rawUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      rawKeyStart: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    }
    
    console.log('🔍 Environment Debug:', debugInfo)
    setEnvDebug(debugInfo)

    // Solo mostrar en desarrollo o si hay problemas
    const showDebug = process.env.NODE_ENV === 'development' || 
                     !debugInfo.hasSupabaseUrl || 
                     !debugInfo.hasSupabaseKey
    setIsVisible(showDebug)
  }, [])

  // No mostrar si todo está bien y estamos en producción
  if (!envDebug || !isVisible) return null

  return (
    <div className="fixed bottom-2 right-2 bg-black/90 text-white p-2 rounded text-xs max-w-xs z-50 backdrop-blur">
      <div className="flex justify-between items-center mb-1">
        <h4 className="font-bold text-green-400">Env Debug</h4>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex gap-2">
          <span>URL:</span>
          <span className={envDebug.hasSupabaseUrl ? 'text-green-400' : 'text-red-400'}>
            {envDebug.hasSupabaseUrl ? '✅' : '❌'}
          </span>
        </div>
        <div className="flex gap-2">
          <span>Key:</span>
          <span className={envDebug.hasSupabaseKey ? 'text-green-400' : 'text-red-400'}>
            {envDebug.hasSupabaseKey ? '✅' : '❌'}
          </span>
        </div>
        {envDebug.nodeEnv && (
          <div className="text-gray-300">Env: {envDebug.nodeEnv}</div>
        )}
      </div>
    </div>
  )
}