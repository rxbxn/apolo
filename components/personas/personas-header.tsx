"use client"

import { Button } from "@/components/ui/button"
import { Plus, Download, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePermisos } from "@/lib/hooks/use-permisos"

export function PersonasHeader() {
  const router = useRouter()
  const { permisos } = usePermisos("Módulo Personas")

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Módulo Personas</h1>
        <p className="text-muted-foreground mt-1">Gestiona fichas técnicas de personas</p>
      </div>

      <div className="flex gap-2">
        {permisos?.exportar && (
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        )}

        {permisos?.importar && (
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
        )}

        {permisos?.crear && (
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => router.push("/dashboard/personas/nuevo")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Persona
          </Button>
        )}
      </div>
    </div>
  )
}
