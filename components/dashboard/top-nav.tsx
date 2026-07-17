"use client"

import { Button } from "@/components/ui/button"
import { Bell, User, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function TopNav() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      await supabase.auth.signOut()
      toast.success("Sesión cerrada correctamente")
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      toast.error("Error al cerrar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <nav className="h-16 border-b border-border bg-card flex items-center justify-between px-3 sm:px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground">Panel de Control</h2>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted">
          <Bell className="w-5 h-5" />
        </Button>

        <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted">
          <User className="w-5 h-5" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          className="text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
          disabled={isLoading}
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </nav>
  )
}
