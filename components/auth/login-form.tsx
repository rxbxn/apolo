"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🔐 Iniciando login...')
    setIsLoading(true)
    setError("")

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      console.log('📊 Respuesta de Supabase:', { data, error: authError })

      if (authError) {
        console.error('❌ Error de autenticación:', authError)
        throw authError
      }

      if (data?.session) {
        console.log('✅ Login exitoso! Sesión:', data.session)
        console.log('🍪 Cookies antes de redirigir:', document.cookie)

        // Verificar si la cookie de supabase existe
        const hasSupabaseCookie = document.cookie.includes('sb-')
        console.log('🍪 Tiene cookie de Supabase:', hasSupabaseCookie)

        console.log('🔄 Redirigiendo a /dashboard...')

        // Dar más tiempo para que la cookie se asiente
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 500)
      } else {
        console.warn('⚠️ No se obtuvo sesión')
        setError('No se pudo iniciar sesión')
        setIsLoading(false)
      }
    } catch (err: any) {
      console.error('💥 Error en login:', err)
      setError(err.message || "Error al iniciar sesión")
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-primary">Bienvenido a APOLO (LOGIN V2)</CardTitle>
        <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Correo Electrónico
            </label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-10 border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Contraseña
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-10 border-border pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </Button>

          <div className="text-center">
            <Link href="#" className="text-sm text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
