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
    const [modifiedData, setModifiedData] = useState<any[] | null>(null)
    const [editableRows, setEditableRows] = useState<Record<number, boolean>>({})
    const [skippedRows, setSkippedRows] = useState<Record<number, boolean>>({})
    const [currentPage, setCurrentPage] = useState(0)
    const PAGE_SIZE = 20

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

                    // Mapeo exacto de los encabezados esperados (columnas.txt) hacia los nombres en DB (snake_case)
                    const desiredColumns = [
                        'id','cedula','estado','fecha','persona','coordinador','dirigente','telefono','tipo','talla','lugar_nacimiento','direccion','tel_fijo','ciudad','barrio','localidad','nacimiento','genero','email','referencia','tel_referencia','vivienda','facebook','instagram','twitter','whatsapp','estudios','ocupacion','comp_difusion','comp_marketing','comp_impacto','comp_cautivo','comp_proyecto','verificacion_sticker','fecha_verificacion_sticker','observacion_verificacion_sticker','nombre_verificador','beneficiario','poblacion','ubicacion','hijos'
                    ]

                    const headerMapRaw: Record<string,string> = {
                        'id':'id',
                        'cedula':'cedula',
                        'estado':'estado',
                        'fecha':'fecha',
                        'nombre completo':'persona',
                        'nombre':'persona',
                        'coordinador':'coordinador',
                        'dirigente':'dirigente',
                        'telefono':'telefono',
                        'telefono ':'telefono',
                        'teléfono':'telefono',
                        'tel fijo':'tel_fijo',
                        'tel_fijo':'tel_fijo',
                        'tel_fijo ':'tel_fijo',
                        'tel fijo ':'tel_fijo',
                        'tipo':'tipo',
                        'talla':'talla',
                        'lugar nacimiento':'lugar_nacimiento',
                        'lugar_nacimiento':'lugar_nacimiento',
                        'dirección':'direccion',
                        'direccion':'direccion',
                        'ciudad':'ciudad',
                        'barrio':'barrio',
                        'localidad':'localidad',
                        'nacimiento':'nacimiento',
                        'genero':'genero',
                        'email':'email',
                        'referencia':'referencia',
                        'tel referencia':'tel_referencia',
                        'tel_referencia':'tel_referencia',
                        'vivienda':'vivienda',
                        'facebook':'facebook',
                        'instagram':'instagram',
                        'twitter':'twitter',
                        'whatsapp':'whatsapp',
                        'estudios':'estudios',
                        'ocupacion':'ocupacion',
                        'comp. difusión':'comp_difusion',
                        'comp difusion':'comp_difusion',
                        'comp_difusion':'comp_difusion',
                        'comp. marketing':'comp_marketing',
                        'comp marketing':'comp_marketing',
                        'comp_marketing':'comp_marketing',
                        'comp. impacto':'comp_impacto',
                        'comp impacto':'comp_impacto',
                        'comp_impacto':'comp_impacto',
                        'comp. cautivo':'comp_cautivo',
                        'comp cautivo':'comp_cautivo',
                        'comp_cautivo':'comp_cautivo',
                        'comp. proyecto':'comp_proyecto',
                        'comp proyecto':'comp_proyecto',
                        'comp_proyecto':'comp_proyecto',
                        'verificación sticker':'verificacion_sticker',
                        'verificacion sticker':'verificacion_sticker',
                        'fecha verificación sticker':'fecha_verificacion_sticker',
                        'fecha_verificacion_sticker':'fecha_verificacion_sticker',
                        'observación verificación sticker':'observacion_verificacion_sticker',
                        'observacion verificacion sticker':'observacion_verificacion_sticker',
                        'nombre verificador':'nombre_verificador',
                        'beneficiario':'beneficiario',
                        'poblacion':'poblacion',
                        'ubicacion':'ubicacion',
                        'hijos':'hijos'
                    }

                    const normalizeHeader = (header: string) => {
                        if (!header) return ''
                        const s = header
                            .toString()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/\./g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .toLowerCase()
                        return headerMapRaw[s] || s.replace(/\s+/g, '_')
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

                    // Mapear columnas y limpiar datos; además construir objeto con todas las columnas en el orden deseado
                    const mappedData: Persona[] = jsonData.map((row: any) => {
                        const tempRow: Record<string, any> = {}
                        Object.keys(row).forEach(key => {
                            const finalKey = normalizeHeader(key)
                            let value = row[key]

                            // Convertir campos numéricos (excepto comp_proyecto que ahora es string)
                            if (['comp_difusion', 'comp_marketing', 'comp_impacto', 'comp_cautivo'].includes(finalKey)) {
                                value = value !== undefined && value !== null ? parseInt(value.toString(), 10) : null
                                if (isNaN(value)) value = null
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

                            // Normalizar valores vacíos a null
                            if (value === '' || value === undefined) value = null

                            tempRow[finalKey] = value
                        })

                        // Construir fila ordenada con todas las columnas deseadas en el orden especificado
                        const orderedRow: any = {}
                        for (const col of desiredColumns) {
                            orderedRow[col] = tempRow.hasOwnProperty(col) ? tempRow[col] : null
                        }

                        // Añadir cualquier columna adicional que viniera en el Excel (al final)
                        Object.keys(tempRow).forEach(k => {
                            if (!desiredColumns.includes(k)) orderedRow[k] = tempRow[k]
                        })

                        return orderedRow
                    })

                    // Aplicar heurística de corrimiento circular y normalizar id sobre las filas ya mapeadas
                    mappedData.forEach((newRow: any) => {
                        const looksLikeName = (v: any) => {
                            if (v === null || v === undefined) return false
                            const s = String(v).trim()
                            if (s.toLowerCase() === 'null') return false
                            return /^[A-Za-zÁÉÍÓÚÑáéíóúñ'’\-\s]+$/.test(s) && s.split(/\s+/).length >= 2
                        }
                        const looksLikeId = (v: any) => {
                            if (v === null || v === undefined) return false
                            const raw = String(v).trim()
                            if (raw.toLowerCase() === 'null') return false
                            const s = raw.replace(/\D/g, '')
                            return /^\d{7,12}$/.test(s)
                        }

                        const shiftBlock = ['celular', 'cedula', 'persona', 'coordinador', 'dirigente']
                        const hasAll = shiftBlock.every(k => Object.prototype.hasOwnProperty.call(newRow, k))
                        if (hasAll) {
                            const cedulaVal = newRow['cedula']
                            const dirigenteVal = newRow['dirigente']
                            const celularVal = newRow['celular']
                            if (looksLikeName(cedulaVal) && (looksLikeId(dirigenteVal) || looksLikeId(celularVal))) {
                                const vals = shiftBlock.map(k => newRow[k])
                                const rotated = [vals[vals.length - 1], ...vals.slice(0, vals.length - 1)]
                                shiftBlock.forEach((k, i) => { newRow[k] = rotated[i] })
                            }
                        }

                        if (newRow.id != null) {
                            const idStr = String(newRow.id).replace(/\D/g, '')
                            if (idStr === '') {
                                delete newRow.id
                            } else {
                                const idNum = parseInt(idStr, 10)
                                if (!isNaN(idNum)) newRow.id = idNum
                                else delete newRow.id
                            }
                        }
                    })

                    // Ordenar por id numérico ascendente; los registros sin id van al final
                    mappedData.sort((a: any, b: any) => {
                        const aId = a && typeof a.id === 'number' ? a.id : Number.POSITIVE_INFINITY
                        const bId = b && typeof b.id === 'number' ? b.id : Number.POSITIVE_INFINITY
                        return aId - bId
                    })

                    setProgressValue(30)
                    setUploadProgress("Validando datos...")

                    // Helper to treat the literal string 'null' as empty and normalize values
                    const normalizeField = (v: any) => {
                        if (v === null || v === undefined) return ''
                        const s = String(v).trim()
                        if (s.toLowerCase() === 'null') return ''
                        return s
                    }

                    // Validaciones simples antes de la inserción
                    // - cedula: requerido y solo dígitos
                    // - celular: opcional, pero si viene solo dígitos (sin letras ni símbolos)
                    // - persona / coordinador / dirigente: no permitir números en el nombre
                    const validations: Array<{ row: number, errors: string[] }> = []
                    mappedData.forEach((r, idx) => {
                        const errs: string[] = []
                        const cedulaVal = normalizeField(r.cedula)
                        const celularVal = normalizeField(r.celular)
                        const personaVal = normalizeField(r.persona)
                        const coordinadorVal = normalizeField(r.coordinador)
                        const dirigenteVal = normalizeField(r.dirigente)

                        // Requeridos básicos
                        if (!cedulaVal) errs.push('cedula requerida')
                        if (!personaVal) errs.push('persona (nombre) requerida')

                        // cedula: solo dígitos
                        if (cedulaVal && !/^\d+$/.test(cedulaVal)) errs.push('cedula debe contener solo dígitos')

                        // celular: opcional, pero si presente solo dígitos
                        if (celularVal && !/^\d+$/.test(celularVal)) errs.push('celular debe contener solo dígitos')

                        // nombres: no deben contener dígitos
                        const nameHasLetter = (s: string) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(s)
                        const nameHasDigit = (s: string) => /\d/.test(s)

                        if (personaVal) {
                            if (nameHasDigit(personaVal)) errs.push('persona (nombre) no debe contener números')
                            else if (!nameHasLetter(personaVal)) errs.push('persona (nombre) inválido')
                        }

                        if (coordinadorVal) {
                            if (nameHasDigit(coordinadorVal)) errs.push('coordinador no debe contener números')
                            else if (!nameHasLetter(coordinadorVal)) errs.push('coordinador inválido')
                        }

                        if (dirigenteVal) {
                            if (nameHasDigit(dirigenteVal)) errs.push('dirigente no debe contener números')
                            else if (!nameHasLetter(dirigenteVal)) errs.push('dirigente inválido')
                        }

                        if (errs.length > 0) validations.push({ row: idx + 1, errors: errs })
                    })

                    setValidationResults(validations)

                    // Si no está confirmado, mostrar preview y esperar confirmación
                    setPreviewData(mappedData)
                    // crear copia editable
                    setModifiedData(mappedData.map((r: any) => ({ ...r })))
                    setEditableRows({})
                    setSkippedRows({})
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

        // Use modified data if available
        const source = modifiedData || previewData
        if (!source) {
            setIsUploading(false)
            setUploadProgress(null)
            return
        }

        // Build list of unskipped source indices
        const unskippedIndices = source.map((_, i) => i).filter(i => !skippedRows[i])
        const finalData = unskippedIndices.map(i => source[i])

        // Re-validate before import and keep mapping to source indices
        type Validation = { sourceIndex: number, displayRow: number, errors: string[] }
        const localValidations: Validation[] = []
        const nameHasLetter = (s: string) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(s)
        const nameHasDigit = (s: string) => /\d/.test(s)
        finalData.forEach((r: any, idx: number) => {
            const errs: string[] = []
            const cedulaVal = r.cedula ? String(r.cedula).trim() : ''
            const personaVal = r.persona ? String(r.persona).trim() : ''
            const celularVal = r.celular ? String(r.celular).trim() : ''

            if (!cedulaVal) errs.push('cedula requerida')
            if (!personaVal) errs.push('persona (nombre) requerida')
            if (cedulaVal && !/^\d+$/.test(cedulaVal)) errs.push('cedula debe contener solo dígitos')
            if (celularVal && !/^\d+$/.test(celularVal)) errs.push('celular debe contener solo dígitos')
            if (personaVal) {
                if (nameHasDigit(personaVal)) errs.push('persona (nombre) no debe contener números')
                else if (!nameHasLetter(personaVal)) errs.push('persona (nombre) inválido')
            }

            if (errs.length > 0) {
                const sourceIndex = unskippedIndices[idx]
                localValidations.push({ sourceIndex, displayRow: sourceIndex + 1, errors: errs })
            }
        })

        if (localValidations.length > 0) {
            // Map to the shape used by UI (row, errors) for display
            setValidationResults(localValidations.map(v => ({ row: v.displayRow, errors: v.errors })))
            setUploadProgress(null)
            // Ask user whether to auto-skip these rows
            const confirmed = window.confirm(`Hay ${localValidations.length} filas con errores. Deseas omitir automáticamente esas filas y continuar con la importación? Aceptar = omitir y continuar, Cancelar = revisar.`)
            if (!confirmed) {
                setIsUploading(false)
                toast.error(`Importación cancelada: corrige o omite ${localValidations.length} filas.`)
                return
            }

            // Mark source indices as skipped and recompute finalData
            const newSkipped = { ...(skippedRows || {}) }
            for (const v of localValidations) {
                newSkipped[v.sourceIndex] = true
            }
            setSkippedRows(newSkipped)

            const newUnskipped = source.map((_, i) => i).filter(i => !newSkipped[i])
            const newFinalData = newUnskipped.map(i => source[i])
            // replace finalData with newFinalData
            // continue with newFinalData
            // eslint-disable-next-line prefer-const
            var mappedData = newFinalData
        } else {
            var mappedData = finalData
        }

        // Debugging info: log what will be sent
        try {
            console.log('Import: totalRows=', (source || []).length, 'skippedIndices=', Object.keys(skippedRows || {}).filter(k => skippedRows[Number(k)]).map(k => Number(k)), 'finalCount=', finalData.length)
            console.log('Import sample rows:', finalData.slice(0, 5))
        } catch (e) {
            // ignore
        }
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

    const exportValidationErrorsToCSV = (validations: Array<{ row: number, errors: string[] }>) => {
        if (!validations || validations.length === 0) return
        const headers = ['row','errors','data']
        const lines = [headers.join(',')]
        const source = modifiedData || previewData || []
        for (const v of validations) {
            const rowIndex = Math.max(0, v.row - 1)
            const rowData = source[rowIndex] ? JSON.stringify(source[rowIndex]).replace(/\n/g,' ').replace(/\r/g,'') : ''
            lines.push(`${v.row},"${(v.errors || []).join('; ').replace(/"/g,'""')}","${rowData.replace(/"/g,'""') }"`)
        }
        const csv = lines.join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename || 'validation_errors'}.csv`
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
                            <Button onClick={() => exportValidationErrorsToCSV(validationResults)} disabled={!validationResults || validationResults.length===0} className="bg-red-100 hover:bg-red-200">Exportar filas con validaciones</Button>
                        </div>
                    </div>

                    <div className="mt-3">
                        {/* Banner: resumen rápido */}
                        {(() => {
                            const source = modifiedData || previewData || []
                            const total = source.length
                            const skipped = Object.keys(skippedRows || {}).filter(k => skippedRows[Number(k)]).length
                            const toInsert = Math.max(0, total - skipped)
                            return (
                                <div className="mb-2 p-2 rounded bg-white/60 border text-sm">
                                    <strong>Resumen:</strong> {total} registros leídos • {skipped} omitidos • {toInsert} a insertar
                                </div>
                            )
                        })()}
                        <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border-collapse">
                            <thead>
                                <tr>
                                    <th className="px-2 py-1 text-left font-medium">#</th>
                                    <th className="px-2 py-1 text-left font-medium">Omitir</th>
                                    <th className="px-2 py-1 text-left font-medium">Cedula</th>
                                    <th className="px-2 py-1 text-left font-medium">Persona</th>
                                    <th className="px-2 py-1 text-left font-medium">Celular</th>
                                    {Object.keys(previewData[0] || {}).filter(k => !['cedula','persona','celular'].includes(k)).slice(0, 15).map((k) => (
                                        <th key={k} className="px-2 py-1 text-left font-medium">{k}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const source = modifiedData || previewData || []
                                    const pageStart = currentPage * PAGE_SIZE
                                    const pageData = source.slice(pageStart, pageStart + PAGE_SIZE)
                                    return pageData.map((row, idx) => {
                                        const absoluteIndex = pageStart + idx
                                        const globalIndex = absoluteIndex + 1
                                        const isSkipped = !!(skippedRows && skippedRows[absoluteIndex])
                                    return (
                                        <tr key={idx} className={`odd:bg-white even:bg-slate-50 ${isSkipped ? 'opacity-50' : ''}`}>
                                            <td className="px-2 py-1 align-top">{globalIndex}</td>
                                            <td className="px-2 py-1 align-top">
                                                <input type="checkbox" checked={isSkipped} onChange={(e) => {
                                                    setSkippedRows(prev => ({ ...prev, [absoluteIndex]: e.target.checked }))
                                                }} />
                                            </td>
                                            <td className="px-2 py-1 align-top">
                                                <input className="border px-1 py-0.5 w-40" value={String((modifiedData || previewData)[absoluteIndex]?.cedula ?? '')} onChange={(e) => {
                                                    const v = e.target.value
                                                    setModifiedData(prev => {
                                                        if (!prev) return prev
                                                        const copy = [...prev]
                                                        copy[absoluteIndex] = { ...copy[absoluteIndex], cedula: v }
                                                        return copy
                                                    })
                                                }} />
                                            </td>
                                            <td className="px-2 py-1 align-top">
                                                <input className="border px-1 py-0.5 w-56" value={String((modifiedData || previewData)[absoluteIndex]?.persona ?? '')} onChange={(e) => {
                                                    const v = e.target.value
                                                    setModifiedData(prev => {
                                                        if (!prev) return prev
                                                        const copy = [...prev]
                                                        copy[absoluteIndex] = { ...copy[absoluteIndex], persona: v }
                                                        return copy
                                                    })
                                                }} />
                                            </td>
                                            <td className="px-2 py-1 align-top">
                                                <input className="border px-1 py-0.5 w-40" value={String((modifiedData || previewData)[absoluteIndex]?.celular ?? '')} onChange={(e) => {
                                                    const v = e.target.value
                                                    setModifiedData(prev => {
                                                        if (!prev) return prev
                                                        const copy = [...prev]
                                                        copy[absoluteIndex] = { ...copy[absoluteIndex], celular: v }
                                                        return copy
                                                    })
                                                }} />
                                            </td>
                                            {Object.keys(previewData[0] || {}).filter(k => !['cedula','persona','celular'].includes(k)).slice(0, 15).map((k) => (
                                                <td key={k} className="px-2 py-1 align-top">{String((modifiedData || previewData)[absoluteIndex]?.[k] ?? '')}</td>
                                            ))}
                                        </tr>
                                    )
                                    })
                                })()}
                            </tbody>
                        </table>
                        </div>

                        {/* Pagination controls */}
                        {(() => {
                            const source = modifiedData || previewData || []
                            const totalPages = Math.max(1, Math.ceil(source.length / PAGE_SIZE))
                            return (
                                <div className="mt-2 flex items-center justify-between">
                                    <div className="text-sm">Página {currentPage + 1} / {totalPages}</div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => setCurrentPage(0)} disabled={currentPage === 0}>Primera</Button>
                                        <Button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>Anterior</Button>
                                        <Button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}>Siguiente</Button>
                                        <Button onClick={() => setCurrentPage(totalPages - 1)} disabled={currentPage >= totalPages - 1}>Última</Button>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            )}
        </div>
    )
}
