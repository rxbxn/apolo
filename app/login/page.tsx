import { LoginForm } from "@/components/auth/login-form"
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata = {
  title: "Iniciar Sesión - APOLO CRM",
  description: "Accede a tu cuenta APOLO",
}

export default function LoginPage() {
  // Server-side: comprobar cookies de Supabase y redirigir si ya está autenticado
  const allCookies = cookies().getAll()
  const hasSupabaseCookie = allCookies.some(c => c.name.startsWith('sb-') && c.name.includes('access_token'))

  if (hasSupabaseCookie) {
    // Redirige al dashboard en el servidor antes de renderizar la página de login
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src="/images/apolo-20logo.png" alt="APOLO Logo" className="h-16 w-auto" />
          </div>
          <p className="text-sm text-muted-foreground">Plataforma de Gestión </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
