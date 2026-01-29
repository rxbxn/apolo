import React from 'react'

export function DashboardHeader({ children }: { children?: React.ReactNode }) {
  // Si se pasan children, renderizarlos (permite que módulos inyecten su propio header)
  if (children) {
    return <div className="flex items-center justify-between">{children}</div>
  }

  // Comportamiento por defecto cuando no hay children
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Bienvenido a APOLO</h1>
      <p className="text-sm sm:text-base text-muted-foreground">
        Gestiona tu campaña electoral con herramientas profesionales
      </p>
    </div>
  )
}
