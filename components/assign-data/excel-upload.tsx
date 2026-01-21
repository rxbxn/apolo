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
    const [uploadErrors, setUploadErrors] = useState<Array<{ row: number, error: string, data?: any }>>([])
    const [filename, setFilename] = useState<string | null>(null)
    const [previewData, setPreviewData] = useState<any[] | null>(null)
    const [validationResults, setValidationResults] = useState<Array<{ row: number, errors: string[] }>>([])
    const [isConfirmed, setIsConfirmed] = useState(false)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const fileName = file.name
        setFilename(fileName)
        setIsUploading(true)
        setProgressValue(0)
        setUploadProgress("Leyendo archivo...")
        setUploadErrors([])

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
                    setUploadProgress("Validando datos...")

                    // Validaciones simples antes de la inserción
                    const validations: Array<{ row: number, errors: string[] }> = []
                    mappedData.forEach((r, idx) => {
                        const errs: string[] = []
                        // Requeridos básicos
                        if (!r.cedula || String(r.cedula).trim() === '') errs.push('cedula requerida')
                        if (!r.persona || String(r.persona).trim() === '') errs.push('persona (nombre) requerida')
                        // celular puede ser numérico (opcional)
                        if (r.celular && !/^[0-9+\-\s()]+$/.test(String(r.celular))) errs.push('celular con caracteres inválidos')
                        if (errs.length > 0) validations.push({ row: idx + 1, errors: errs })
                    })

                    setValidationResults(validations)

                    // Si no está confirmado, mostrar preview y esperar confirmación
                    setPreviewData(mappedData)
                    setUploadProgress(`Previsualización lista: ${mappedData.length} registros. Revise y confirme.`)
                    setIsUploading(false)
                    setIsConfirmed(false)
                    setProgressValue(0)
                    return

                    // Procesar en lotes para mostrar progreso
                    const batchSize = 100
                    const totalBatches = Math.ceil(mappedData.length / batchSize)
                    const errorsLocal: Array<{ row: number, error: string, data?: any }> = []

                    for (let i = 0; i < totalBatches; i++) {
                        const start = i * batchSize
                        const end = Math.min(start + batchSize, mappedData.length)
                        const batch = mappedData.slice(start, end)

                        setUploadProgress(`Insertando lote ${i + 1} de ${totalBatches}...`)
                        try {
                            // Intento insertar el lote completo
                            await importPersonas(batch)
                        } catch (batchErr: any) {
                            console.error(`Error inserting batch ${i + 1}:`, batchErr)
                            // Intentar insertar fila a fila para capturar qué filas fallan
                            for (let j = 0; j < batch.length; j++) {
                                const row = batch[j]
                                const globalIndex = start + j + 1 // 1-based
                                try {
                                    await importPersonas([row])
                                } catch (rowErr: any) {
                                    console.error(`Row ${globalIndex} failed:`, rowErr)
                                    errorsLocal.push({ row: globalIndex, error: rowErr?.message || String(rowErr), data: row })
                                }
                            }
                        }

                        const progress = 30 + Math.round(((i + 1) / totalBatches) * 70)
                        setProgressValue(progress)
                    }

                    toast.success(`Se han importado ${mappedData.length} registros correctamente`)
                    // Actualizar estado local de errores y emitir evento con resumen de la importación
                    setUploadErrors(errorsLocal)
                    const eventDetail = {
                        filename: fileName,
                        total: mappedData.length,
                        errors: errorsLocal
                    }
                    try {
                        window.dispatchEvent(new CustomEvent('persona:upload:complete', { detail: eventDetail }))
                    } catch (e) {
                        // ignore
                    }

                    fileInputRef.current!.value = ""
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

    // Función para iniciar la importación luego de confirmar (usa previewData)
    const startImport = async () => {
    if (!previewData) return
        setIsUploading(true)
        setProgressValue(5)
        setUploadProgress('Iniciando importación...')

        const mappedData = previewData
        const batchSize = 100
        const totalBatches = Math.ceil(mappedData.length / batchSize)
        const errorsLocal: Array<{ row: number, error: string, data?: any }> = []

        for (let i = 0; i < totalBatches; i++) {
            const start = i * batchSize
            const end = Math.min(start + batchSize, mappedData.length)
            const batch = mappedData.slice(start, end)

            setUploadProgress(`Insertando lote ${i + 1} de ${totalBatches}...`)
            try {
                await importPersonas(batch)
            } catch (batchErr: any) {
                console.error(`Error inserting batch ${i + 1}:`, batchErr)
                for (let j = 0; j < batch.length; j++) {
                    const row = batch[j]
                    const globalIndex = start + j + 1
                    try {
                        await importPersonas([row])
                    } catch (rowErr: any) {
                        console.error(`Row ${globalIndex} failed:`, rowErr)
                        errorsLocal.push({ row: globalIndex, error: rowErr?.message || String(rowErr), data: row })
                    }
                }
            }

            const progress = 10 + Math.round(((i + 1) / totalBatches) * 80)
            setProgressValue(progress)
        }

        setUploadErrors(errorsLocal)
    const eventDetail = { filename, total: mappedData.length, errors: errorsLocal }
        try { window.dispatchEvent(new CustomEvent('persona:upload:complete', { detail: eventDetail })) } catch(e){}
        setPreviewData(null)
        setValidationResults([])
        setIsConfirmed(false)
        setIsUploading(false)
        setUploadProgress(null)
        setProgressValue(0)
        router.refresh()
        if (errorsLocal.length > 0) {
            toast.error(`Import completed with ${errorsLocal.length} errors`)
        } else {
            toast.success(`Se han importado ${mappedData.length} registros correctamente`)
        }
    }

    const cancelPreview = () => {
        setPreviewData(null)
        setValidationResults([])
        setUploadErrors([])
        setIsConfirmed(false)
        setUploadProgress(null)
        setProgressValue(0)
        fileInputRef.current!.value = ''
    }

    const exportErrorsToCSV = (errors: Array<{ row: number, error: string, data?: any }>) => {
        if (!errors || errors.length === 0) return
        const headers = ['row','error','data']
        const lines = [headers.join(',')]
        for (const e of errors) {
            const dataJson = e.data ? JSON.stringify(e.data).replace(/\n/g,' ').replace(/\r/g,'') : ''
            lines.push(`${e.row},"${(e.error || '').replace(/"/g,'""')}","${dataJson.replace(/"/g,'""')}"`)
        }
        const csv = lines.join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename || 'errors'}.csv`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
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

            {previewData && (
                <div className="mt-3 p-3 border rounded bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Previsualización lista: {previewData.length} registros</p>
                            {validationResults.length > 0 ? (
                                <p className="text-xs text-yellow-700">Validaciones: {validationResults.length} filas con advertencias</p>
                            ) : (
                                <p className="text-xs text-green-700">Sin validaciones detectadas</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={startImport} disabled={isUploading} className="bg-blue-600 hover:bg-blue-700 text-white">Confirmar importación</Button>
                            <Button onClick={cancelPreview} disabled={isUploading} className="bg-gray-200 hover:bg-gray-300">Cancelar</Button>
                            <Button onClick={() => exportErrorsToCSV(uploadErrors)} disabled={!uploadErrors || uploadErrors.length===0} className="bg-amber-100 hover:bg-amber-200">Exportar errores</Button>
                        </div>
                    </div>

                    <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-sm border-collapse">
                            <thead>
                                <tr>
                                    {Object.keys(previewData[0] || {}).slice(0, 20).map((k) => (
                                        <th key={k} className="px-2 py-1 text-left font-medium">{k}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.slice(0, 5).map((row, idx) => (
                                    <tr key={idx} className="odd:bg-white even:bg-slate-50">
                                        {Object.keys(previewData[0] || {}).slice(0, 20).map((k) => (
                                            <td key={k} className="px-2 py-1 align-top">{String(row[k] ?? '')}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
