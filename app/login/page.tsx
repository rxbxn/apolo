import { LoginForm } from "@/components/auth/login-form"

export const metadata = {
  title: "Iniciar Sesión - APOLO CRM",
  description: "Accede a tu cuenta APOLO",
}

export default function LoginPage() {
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
