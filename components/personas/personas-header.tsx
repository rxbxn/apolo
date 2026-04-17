"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Download, Upload, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePermisos } from "@/lib/hooks/use-permisos"
import { toast } from "sonner"
import * as XLSX from 'xlsx'
import { supabase } from "@/lib/supabase/client"

export function PersonasHeader() {
  const router = useRouter()
  const { permisos } = usePermisos("Módulo Personas")
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      toast.info('Generando archivo de exportación...')

      // 1. Obtener datos de usuarios
      const { data: users, error: usersError } = await supabase
        .from('usuarios')
        .select('*')
      
      if (usersError) throw usersError

      // 2. Obtener datos de militantes
      const { data: miltants, error: militantsError } = await supabase
        .from('militantes')
        .select('*')
      
      if (militantsError) {
        console.warn('Error fetching militants for export, proceeding with users only:', militantsError)
      }

      // Crear un mapa de militantes por usuario_id para un join eficiente
      const militantMap = new Map()
      if (miltants) {
        miltants.forEach(m => {
          militantMap.set(m.usuario_id, m)
        })
      }

      if (!users || users.length === 0) {
        toast.error('No hay datos para exportar')
        return
      }

      // 3. Mapear datos para el Excel
      const exportData = users.map(u => {
        const m = militantMap.get(u.id) || {}
        return {
          'Documento': u.numero_documento,
          'Tipo Doc': u.tipo_documento,
          'Nombres': u.nombres,
          'Apellidos': u.apellidos,
          'Celular': u.celular,
          'Email': u.email,
          'Ciudad': u.ciudad_nombre,
          'Localidad': u.localidad_nombre,
          'Barrio': u.barrio_nombre,
          'Dirección': u.direccion,
          'Estado': u.estado,
          'Observaciones': u.observaciones,
          'Tipo Militante': m.tipo || 'No militante',
          'Compromiso Marketing': u.compromiso_marketing || m.compromiso_marketing || '',
          'Compromiso Cautivo': u.compromiso_cautivo || m.compromiso_cautivo || '',
          'Compromiso Impacto': u.compromiso_impacto || m.compromiso_impacto || '',
          'Compromiso Difusión': m.compromiso_difusion || '',
          'Compromiso Proyecto': m.compromiso_proyecto || '',
          'Fecha Registro': u.fecha_registro || u.creado_en,
          'Verificación Sticker': u.verificacion_sticker || '',
          'Verificador': u.nombre_verificador || ''
        }
      })

      // 4. Crear libro de Excel
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Personas")

      // 5. Descargar
      XLSX.writeFile(wb, `Exportacion_Personas_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Archivo exportado exitosamente')

    } catch (error: any) {
      console.error('Error detallado exportando datos:', error)
      const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error))
      toast.error('Error al exportar datos: ' + (errorMsg === '{}' ? 'Error de conexión o permisos' : errorMsg))
    } finally {
      setIsExporting(false)
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
