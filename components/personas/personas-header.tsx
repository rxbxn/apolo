"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Download, Upload, Loader2, ImageOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePermisos } from "@/lib/hooks/use-permisos"
import { toast } from "sonner"
import { ImportarPersonasDialog } from "./importar-personas-dialog"

export function PersonasHeader() {
  const router = useRouter()
  const { permisos } = usePermisos("Módulo Personas")
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingSinFoto, setIsExportingSinFoto] = useState(false)

  // La exportación ahora vive en el servidor (/api/personas/exportar) y usa
  // la MISMA estructura de columnas que espera "Importar" — el archivo es
  // 100% redondeable (exportas, editas, vuelves a subir).
  const handleExport = async () => {
    try {
      setIsExporting(true)
      toast.info('Generando archivo de exportación...')

      const res = await fetch('/api/personas/exportar')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error generando la exportación')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Personas_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      toast.success('Archivo exportado exitosamente')
    } catch (error: any) {
      console.error('Error exportando datos:', error)
      toast.error('Error al exportar datos: ' + (error.message || 'Error desconocido'))
    } finally {
      setIsExporting(false)
    }
  }

  // Excel con nombre completo + cédula de quienes hoy no tienen foto de
  // perfil (útil para saber a quién le falta después de una carga masiva).
  const handleExportSinFoto = async () => {
    try {
      setIsExportingSinFoto(true)
      toast.info('Generando lista de personas sin foto...')

      const res = await fetch('/api/personas/sin-foto')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error generando la lista')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Personas_sin_foto_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      toast.success('Lista generada exitosamente')
    } catch (error: any) {
      console.error('Error exportando personas sin foto:', error)
      toast.error('Error al generar la lista: ' + (error.message || 'Error desconocido'))
    } finally {
      setIsExportingSinFoto(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Módulo Personas</h1>
        <p className="text-muted-foreground mt-1">Gestiona fichas técnicas de personas</p>
      </div>

      <div className="flex gap-2">
        {permisos?.exportar && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar
          </Button>
        )}

        {permisos?.exportar && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSinFoto}
            disabled={isExportingSinFoto}
          >
            {isExportingSinFoto ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ImageOff className="w-4 h-4 mr-2" />
            )}
            Sin foto
          </Button>
        )}

        {permisos?.importar && (
          <ImportarPersonasDialog
            trigger={
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
            }
          />
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
