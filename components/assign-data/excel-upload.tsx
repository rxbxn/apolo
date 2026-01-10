"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Loader2 } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { importPersonas, type Persona } from "@/lib/actions/persona"

export function ExcelUpload() {
    const router = useRouter()
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<string | null>(null)
    const [progressValue, setProgressValue] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        setProgressValue(0)
        setUploadProgress("Leyendo archivo...")

        try {
            const reader = new FileReader()
            reader.onload = async (event) => {
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer)
                    const workbook = XLSX.read(data, { type: "array" })
                    const sheetName = workbook.SheetNames[0]
                    const worksheet = workbook.Sheets[sheetName]

                    // Convertir a JSON con encabezados
                    const jsonData = XLSX.utils.sheet_to_json(worksheet)

                    if (jsonData.length === 0) {
                        toast.error("El archivo está vacío")
                        setIsUploading(false)
                        return
                    }

                    setUploadProgress(`Procesando ${jsonData.length} registros...`)
                    setProgressValue(10)

                    // Función para normalizar encabezados (quitar acentos, puntos, espacios -> guiones bajos)
                    const normalizeHeader = (header: string) => {
                        return header
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
                            .replace(/\./g, "") // Quitar puntos
                            .trim()
                            .replace(/\s+/g, "_") // Espacios a guiones bajos
                    }

                    // Función para convertir fechas de Excel a ISO string
                    const excelDateToJSDate = (serial: any) => {
                        if (!serial || serial === '0000-00-00' || serial === '00/00/0000') return null

                        // Si ya es un string que parece fecha
                        if (typeof serial === 'string') {
                            // Intentar parsear formato DD/MM/YYYY o DD/MM/YYYY HH:mm
                            const parts = serial.split(/[\/\s:]/)
                            if (parts.length >= 3) {
                                const day = parseInt(parts[0], 10)
                                const month = parseInt(parts[1], 10) - 1
                                const year = parseInt(parts[2], 10)
                                const hour = parts[3] ? parseInt(parts[3], 10) : 0
                                const minute = parts[4] ? parseInt(parts[4], 10) : 0

                                const date = new Date(year, month, day, hour, minute)
                                if (!isNaN(date.getTime())) return date.toISOString()
                            }

                            const parsed = Date.parse(serial)
                            return isNaN(parsed) ? null : new Date(parsed).toISOString()
                        }

                        if (typeof serial !== 'number') return null

                        try {
                            // Excel dates are number of days since 1900-01-01
                            const date = new Date(Math.round((serial - 25569) * 86400 * 1000))
                            return isNaN(date.getTime()) ? null : date.toISOString()
                        } catch (e) {
                            return null
                        }
                    }

                    // Mapear columnas y limpiar datos
                    const mappedData: Persona[] = jsonData.map((row: any) => {
                        const newRow: any = {}
                        Object.keys(row).forEach(key => {
                            let finalKey = normalizeHeader(key)

                            // Mapeos específicos adicionales si los nombres varían mucho
                            if (finalKey === 'documento') finalKey = 'cedula'
                            if (finalKey === 'nombre') finalKey = 'persona'
                            if (finalKey === 'tel_referencia' || finalKey === 'telefono_referencia') finalKey = 'tel_referencia'
                            if (finalKey === 'coordinadores') finalKey = 'coordinador'
                            if (finalKey === 'dirigentes') finalKey = 'dirigente'
                            if (finalKey === 'tipo_militante') finalKey = 'tipo'
                            if (finalKey === 'comp_proyecto') finalKey = 'comp_proyecto'

                            let value = row[key]

                            // Convertir campos numéricos (excepto comp_proyecto que ahora es string)
                            if (['comp_difusion', 'comp_marketing', 'comp_impacto', 'comp_cautivo'].includes(finalKey)) {
                                value = value !== undefined && value !== null ? parseInt(value.toString(), 10) : 0
                                if (isNaN(value)) value = 0
                            }

                            // Convertir campos de fecha
                            if (['fecha', 'nacimiento', 'fecha_verificacion_sticker'].includes(finalKey)) {
                                value = excelDateToJSDate(value)
                            }

                            // Limpiar strings
                            if (typeof value === 'string') {
                                value = value.trim()
                            } else if (value !== null && value !== undefined) {
                                value = String(value).trim()
                            }

                            newRow[finalKey] = value
                        })

                        // Eliminar ID si viene del Excel
                        delete newRow.id

                        return newRow
                    })

                    setProgressValue(30)
                    setUploadProgress("Sincronizando catálogos e insertando datos...")

                    // Procesar en lotes para mostrar progreso
                    const batchSize = 100
                    const totalBatches = Math.ceil(mappedData.length / batchSize)

                    for (let i = 0; i < totalBatches; i++) {
                        const start = i * batchSize
                        const end = Math.min(start + batchSize, mappedData.length)
                        const batch = mappedData.slice(start, end)

                        setUploadProgress(`Insertando lote ${i + 1} de ${totalBatches}...`)
                        await importPersonas(batch)

                        const progress = 30 + Math.round(((i + 1) / totalBatches) * 70)
                        setProgressValue(progress)
                    }

                    toast.success(`Se han importado ${mappedData.length} registros correctamente`)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                    router.refresh()
                } catch (err) {
                    console.error("Error al procesar el Excel:", err)
                    toast.error("Error al procesar el archivo Excel")
                } finally {
                    setIsUploading(false)
                    setUploadProgress(null)
                    setProgressValue(0)
                }
            }
            reader.readAsArrayBuffer(file)
        } catch (err) {
            console.error("Error al leer el archivo:", err)
            toast.error("Error al leer el archivo")
            setIsUploading(false)
            setUploadProgress(null)
            setProgressValue(0)
        }
    }

    return (
        <div className="flex flex-col gap-3 w-full max-w-md">
            <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isUploading}
            />
            <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-green-600 hover:bg-green-700 text-white gap-2 w-full"
            >
                {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                )}
                {isUploading ? "Subiendo..." : "Subir Excel"}
            </Button>

            {isUploading && (
                <div className="space-y-2">
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-green-500 h-full transition-all duration-300 ease-out"
                            style={{ width: `${progressValue}%` }}
                        />
                    </div>
                    {uploadProgress && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {uploadProgress} ({progressValue}%)
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
