"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Limpia debate_planillas por completo. Existe porque un reset anterior de
// Personas dejó filas de planillas con coordinador_id/militante_id
// apuntando a registros que ya no existen — al exportar Informes > Planillas
// esos IDs huérfanos no cruzan con nada y las columnas MILITANTE/
// COORDINADOR/DIRIGENTE salen vacías. El flujo correcto es: limpiar aquí y
// volver a subir el Excel con "Subir Excel" (planillas-upload.tsx), que sí
// resuelve los nombres contra los coordinadores/militantes actuales.
export function PlanillasReset() {
    const router = useRouter()
    const [procesando, setProcesando] = useState(false)
    const [resultado, setResultado] = useState<{ ok: boolean; eliminados?: number; error?: string } | null>(null)

    async function ejecutarReset() {
        setProcesando(true)
        setResultado(null)
        try {
            const res = await fetch("/api/admin/reset-planillas", { method: "POST" })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error limpiando la tabla de planillas")
            setResultado(data)
            toast.success(`Tabla de Planillas limpiada (${data.eliminados} registros eliminados). Ya puedes subir el Excel corregido.`)
            router.refresh()
        } catch (err: any) {
            setResultado({ ok: false, error: err.message })
            toast.error(err.message || "Error limpiando la tabla de planillas")
        } finally {
            setProcesando(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={procesando}>
                    {procesando ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Limpiar Planillas
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Borrar todas las planillas?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Se eliminarán TODOS los registros de la tabla de Planillas, sin posibilidad de deshacer.
                        Úsalo solo si vas a volver a subir el Excel de planillas desde cero (botón "Subir Excel"),
                        para que Militante, Dirigente y Coordinador queden correctamente mapeados en los Informes.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={ejecutarReset}
                    >
                        Sí, borrar todo
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
