"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Activity, Users, BarChart3, Calendar, Settings, FileText, Building2, Menu, X, UserCheck, UserPlus, Shield, Images, MapPin, ClipboardList } from "lucide-react"
import { useEffect, useState } from "react"
import { useModulosAccesibles } from "@/lib/hooks/use-modulos-accesibles"

const MENU_ITEMS = [
  { label: "Actividades", href: "/dashboard/activities", icon: Activity },
  { label: "Módulo Personas", href: "/dashboard/personas", icon: Users },
  { label: "Fotos Masivas", href: "/dashboard/fotos-masivas", icon: Images },
  { label: "Módulo Coordinador", href: "/dashboard/coordinador", icon: UserCheck },
  { label: "Módulo Militante", href: "/dashboard/militante", icon: UserPlus },
  { label: "Visitas y Reuniones", href: "/dashboard/visitas-reuniones", icon: MapPin },
  { label: "Informes", href: "/dashboard/informes", icon: ClipboardList },
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
  // Antes arrancaba en `true` (abierto) y, en móvil, dashboard-layout.tsx
  // apila el sidebar en flujo normal (flex-col) arriba del contenido en vez
  // de superponerlo — el usuario tenía que scrollear todo el menú para
  // llegar a la página. Ahora arranca cerrado en móvil y se muestra como
  // panel fijo superpuesto (con fondo oscuro) al abrirlo con el botón ☰;
  // en lg+ sigue siendo parte normal del layout, siempre visible.
  const [isOpen, setIsOpen] = useState(false)
  const { tieneAcceso } = useModulosAccesibles()

  // Cerrar el drawer automáticamente al navegar a otra página.
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Filtra el menú según los módulos que el rol del usuario tiene
  // habilitados en Gestión de Roles > Permisos por rol. Mientras nadie haya
  // configurado el rol (o sea Super Admin), no se oculta nada.
  const menuVisible = MENU_ITEMS.filter((item) => tieneAcceso(item.href))

  return (
    <>
      <div className="flex lg:hidden items-center p-4 bg-sidebar border-b border-sidebar-border">
        <button onClick={() => setIsOpen(true)} className="text-sidebar-foreground" aria-label="Abrir menú">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "bg-sidebar border-r border-sidebar-border flex flex-col w-64 shrink-0 transition-transform duration-300",
          // Móvil: panel fijo que se desliza desde la izquierda, sin
          // empujar el contenido de la página. lg+: parte normal del
          // layout en fila, siempre visible.
          "fixed inset-y-0 left-0 z-50 lg:static lg:z-auto lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <img src="/images/apolo-logo-white.png" alt="APOLO Logo" className="h-12 sm:h-30 w-auto" />
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-sidebar-foreground lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuVisible.map((item) => {
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
                <span>{item.label}</span>
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
