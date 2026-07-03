"use client"

import { useRef, useState } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const TAMANO_LOTE = 100

interface ResumenImportacion {
    creados: number
    actualizados: number
    errores: { fila: number; cedula: string; error: string }[]
    avisos: string[]
}

export function ImportarPersonasDialog({ trigger }: { trigger: React.ReactNode }) {
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)
    const [open, setOpen] = useState(false)
    const [procesando, setProcesando] = useState(false)
    const [progreso, setProgreso] = useState(0)
    const [loteActual, setLoteActual] = useState(0)
    const [totalLotes, setTotalLotes] = useState(0)
    const [resumen, setResumen] = useState<ResumenImportacion | null>(null)

    function handleTriggerClick() {
        setOpen(true)
        setResumen(null)
        setProgreso(0)
    }

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setProcesando(true)
        setResumen(null)
        try {
            const buffer = await file.arrayBuffer()
            const wb = XLSX.read(buffer, { type: "array" })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const filasCrudas: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" })

            // El Excel original trae cabeceras con espacios sobrantes (p.ej. "CEDULA ",
            // "COORDINADOR ", "DIRIGENTE "). Normalizamos las claves (trim) para que
            // tanto el archivo original como cualquier reexportación calcen igual.
            const filas: Record<string, any>[] = filasCrudas.map((fila) => {
                const limpia: Record<string, any> = {}
                for (const key of Object.keys(fila)) {
                    limpia[key.trim()] = fila[key]
                }
                return limpia
            })

            if (filas.length === 0) {
                toast.error("El archivo no tiene filas para importar")
                setProcesando(false)
                return
            }

            const lotes: Record<string, any>[][] = []
            for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
                lotes.push(filas.slice(i, i + TAMANO_LOTE))
            }
            setTotalLotes(lotes.length)

            const acumulado: ResumenImportacion = { creados: 0, actualizados: 0, errores: [], avisos: [] }

            // IMPORTANTE: si un lote falla (timeout, error de red, etc.) NO se
            // aborta toda la importación — se registra el fallo de ese lote y
            // se sigue con los siguientes, para no perder el resto de las
            // personas por un problema puntual en 100 de ellas.
            for (let i = 0; i < lotes.length; i++) {
                setLoteActual(i + 1)
                try {
                    const res = await fetch("/api/personas/importar-lote", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ rows: lotes[i] }),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || `Error procesando el lote ${i + 1}`)

                    acumulado.creados += data.creados
                    acumulado.actualizados += data.actualizados
                    acumulado.errores.push(...(data.errores ?? []))
                    acumulado.avisos.push(...(data.avisos ?? []))
                } catch (loteError: any) {
                    const desde = i * TAMANO_LOTE + 1
                    const hasta = desde + lotes[i].length - 1
                    acumulado.errores.push({
                        fila: desde,
                        cedula: '',
                        error: `Lote completo (filas ${desde}-${hasta}) falló: ${loteError.message || loteError}. Puedes volver a importar el mismo archivo — las filas ya guardadas se actualizan, no se duplican.`,
                    })
                }

                setProgreso(Math.round(((i + 1) / lotes.length) * 100))
                setResumen({ ...acumulado })
            }

            if (acumulado.errores.some((e) => e.error.startsWith('Lote completo'))) {
                toast.warning(`Importación terminada con lotes fallidos: ${acumulado.creados} creados, ${acumulado.actualizados} actualizados. Revisa los errores y vuelve a importar el archivo para reintentar lo que faltó.`)
            } else {
                toast.success(`Importación completa: ${acumulado.creados} creados, ${acumulado.actualizados} actualizados`)
            }
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Error importando el archivo")
        } finally {
            setProcesando(false)
            if (inputRef.current) inputRef.current.value = ""
        }
    }

    return (
        <>
            <div onClick={handleTriggerClick}>{trigger}</div>
            <Dialog open={open} onOpenChange={(v) => !procesando && setOpen(v)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Importar personas desde Excel</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Usa el mismo archivo que genera "Exportar". Se identifica cada persona por su
                            <strong> cédula</strong>: si ya existe se actualiza, si no existe se crea. Nunca se duplica.
                        </p>

                        <input
                            ref={inputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleFile}
                            disabled={procesando}
                        />

                        {!procesando && !resumen && (
                            <Button onClick={() => inputRef.current?.click()} className="w-full">
                                <Upload className="mr-2 h-4 w-4" />
                                Seleccionar archivo Excel
                            </Button>
                        )}

                        {procesando && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Procesando lote {loteActual} de {totalLotes}...
                                    </span>
                                    <span>{progreso}%</span>
                                </div>
                                <Progress value={progreso} />
                            </div>
                        )}

                        {resumen && !procesando && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-emerald-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                    {resumen.creados} creados · {resumen.actualizados} actualizados
                                </div>

                                {resumen.avisos.length > 0 && (
                                    <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950 p-3 text-xs space-y-1 max-h-40 overflow-y-auto">
                                        <div className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            {resumen.avisos.length} avisos
                                        </div>
                                        {resumen.avisos.slice(0, 30).map((a, i) => (
                                            <div key={i} className="text-amber-700 dark:text-amber-300">{a}</div>
                                        ))}
                                    </div>
                                )}

                                {resumen.errores.length > 0 && (
                                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-1 max-h-40 overflow-y-auto">
                                        <div className="font-medium text-destructive">{resumen.errores.length} errores</div>
                                        {resumen.errores.slice(0, 30).map((e, i) => (
                                            <div key={i} className="text-destructive">
                                                Fila {e.fila} (cédula {e.cedula || "—"}): {e.error}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <Button variant="outline" className="w-full" onClick={() => { setResumen(null); setOpen(false) }}>
                                    Cerrar
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
