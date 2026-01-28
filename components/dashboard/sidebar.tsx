import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Activity, Users, BarChart3, Calendar, Settings, FileText, Building2, Menu, UserCheck, UserPlus, Shield } from "lucide-react"
import { useState } from "react"

const MENU_ITEMS = [
  { label: "Actividades", href: "/dashboard/activities", icon: Activity },
  { label: "Módulo Personas", href: "/dashboard/personas", icon: Users },
  { label: "Módulo Coordinador", href: "/dashboard/coordinador", icon: UserCheck },
  { label: "Módulo Militante", href: "/dashboard/militante", icon: UserPlus },
  { label: "Módulo Dirigente", href: "/dashboard/dirigente", icon: UserCheck },
  { label: "Gestión Gerencial", href: "/dashboard/gestion-gerencial", icon: BarChart3 },
  { label: "Alistamiento Debate", href: "/dashboard/debate", icon: FileText },
  { label: "Asignar Datos", href: "/dashboard/assign-data", icon: Building2 },
  { label: "Agenda", href: "/dashboard/agenda", icon: Calendar },
  { label: "Gestión de Roles", href: "/dashboard/roles", icon: Shield },
  { label: "Configuración", href: "/dashboard/configuracion", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)

  return (
    <>
      <div className="hidden max-lg:flex items-center p-4 bg-sidebar border-b border-sidebar-border">
        <button onClick={() => setIsOpen(!isOpen)} className="text-sidebar-foreground">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <aside
        className={cn(
          "bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
          "lg:w-64 w-64 lg:flex",
          isOpen ? "flex" : "hidden lg:flex",
        )}
      >
        <div className="p-4 sm:p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <img src="/images/apolo-logo-white.png" alt="APOLO Logo" className="h-12 sm:h-30 w-auto" />

          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/20",
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          {/* El enlace de configuración se ha movido al menú principal */}
        </div>
      </aside>
    </>
  )
}
