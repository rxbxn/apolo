"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Merge, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ResumenFusion {
    totalPlaceholders: number
    fusionados: number
    sinMatch: number
    fusiones: { nombre: string; accion: string; coordinador_id: string }[]
    errores: string[]
    ok: boolean
}

const ETIQUETA_ACCION: Record<string, string> = {
    repuntado_a_usuario_real: "usó su registro real existente",
    fusionado_con_coordinador_existente: "fusionado con su coordinador real",
}

export function FusionarPendientes() {
    const router = useRouter()
    const [procesando, setProcesando] = useState(false)
    const [resultado, setResultado] = useState<ResumenFusion | null>(null)

    async function ejecutar() {
        setProcesando(true)
        setResultado(null)
        try {
            const res = await fetch("/api/admin/fusionar-pendientes", { method: "POST" })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error fusionando coordinadores pendientes")
            setResultado(data)
            if (data.fusionados > 0) {
                toast.success(`${data.fusionados} coordinador(es)/dirigente(s) fusionados con su persona real`)
            } else {
                toast.info("No había duplicados para fusionar")
            }
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Error fusionando coordinadores pendientes")
        } finally {
            setProcesando(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border p-4 text-sm space-y-2">
                <p className="font-medium">¿Para qué sirve esto?</p>
                <p className="text-muted-foreground">
                    Cuando el import de Personas encuentra un COORDINADOR o DIRIGENTE que no existe todavía, le crea
                    un registro temporal (documento tipo "PENDIENTE-xxxxxxxx") — pero esa misma persona a veces ya
                    tiene su propia fila real (con cédula) en otra parte del Excel. Este botón busca esos casos y
                    fusiona el registro temporal con la persona real, sin romper nada de lo que ya estaba vinculado
                    a ese coordinador (militantes, dirigentes).
                </p>
                <p className="text-muted-foreground">
                    Es seguro correrlo varias veces — si no hay nada para fusionar, no hace nada.
                </p>
            </div>

            <Button onClick={ejecutar} disabled={procesando} variant="outline">
                {procesando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Merge className="mr-2 h-4 w-4" />
                )}
                Buscar y fusionar coordinadores duplicados
            </Button>

            {resultado && (
                <div className="space-y-2">
                    <div className={`flex items-center gap-2 text-sm ${resultado.ok ? "text-emerald-600" : "text-amber-600"}`}>
                        {resultado.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        {resultado.fusionados} fusionados de {resultado.totalPlaceholders} pendientes revisados
                        {resultado.sinMatch > 0 ? ` — ${resultado.sinMatch} sin coincidencia (siguen pendientes, normal)` : ""}
                    </div>

                    {resultado.fusiones.length > 0 && (
                        <div className="rounded-md border p-3 text-xs space-y-1 max-h-52 overflow-y-auto">
                            {resultado.fusiones.map((f, i) => (
                                <div key={i} className="flex items-center justify-between gap-2">
                                    <span>{f.nombre}</span>
                                    <span className="text-muted-foreground">{ETIQUETA_ACCION[f.accion] || f.accion}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {resultado.errores.length > 0 && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-1">
                            <div className="font-medium text-destructive">{resultado.errores.length} errores</div>
                            {resultado.errores.map((e, i) => (
                                <div key={i} className="text-destructive">{e}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
