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
import { Trash2, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ResumenReset {
    resumen: Record<string, { eliminados: number | null; error: string | null; protegidos?: number }>
    protegidos: number
    ok: boolean
}

const NOMBRES_TABLA: Record<string, string> = {
    usuario_perfil: "Asignaciones de rol",
    credenciales: "Credenciales",
    militantes: "Militantes",
    dirigentes: "Dirigentes",
    coordinadores: "Coordinadores",
    usuarios: "Personas (usuarios)",
    referencia: "Referencias",
}

export function ResetDatosPersonas() {
    const router = useRouter()
    const [procesando, setProcesando] = useState(false)
    const [resultado, setResultado] = useState<ResumenReset | null>(null)

    async function ejecutarReset() {
        setProcesando(true)
        setResultado(null)
        try {
            const res = await fetch("/api/admin/reset-personas", { method: "POST" })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error limpiando la base de datos")
            setResultado(data)
            if (data.ok) {
                toast.success("Base de datos de Personas limpiada. Ya puedes reimportar el Excel desde cero.")
            } else {
                toast.warning("Limpieza terminada con algunos errores — revisa el detalle.")
            }
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Error limpiando la base de datos")
        } finally {
            setProcesando(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm space-y-2">
                <p className="font-medium text-destructive">Esta acción borra TODO lo siguiente, sin posibilidad de deshacer:</p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    <li>Todas las Personas (usuarios) y sus militancias</li>
                    <li>Todos los Coordinadores y Dirigentes</li>
                    <li>Todas las Referencias</li>
                    <li>Las asignaciones de roles y credenciales asociadas</li>
                </ul>
                <p className="text-muted-foreground">
                    Úsala solo cuando vayas a volver a subir todo desde cero con el Excel de Importar de Personas.
                    Ese import ya se encarga de repartir coordinador, dirigente y referencia a sus propias tablas.
                </p>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 dark:bg-emerald-950 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                    El usuario con perfil <strong>Super Admin</strong> (el tuyo, si ya lo tienes asignado) queda protegido
                    automáticamente — ni su cuenta ni su asignación de rol se borran, así no te quedas fuera de la app
                    después de limpiar.
                </span>
            </div>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={procesando}>
                        {procesando ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Limpiar toda la base de datos de Personas
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vas a eliminar permanentemente todas las Personas, Militantes, Coordinadores,
                            Dirigentes y Referencias del sistema (excepto el usuario Super Admin, que queda protegido).
                            Esta acción no se puede deshacer.
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

            {resultado && (
                <div className="space-y-2">
                    <div className={`flex items-center gap-2 text-sm ${resultado.ok ? "text-emerald-600" : "text-amber-600"}`}>
                        {resultado.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        {resultado.ok ? "Limpieza completa" : "Limpieza terminada con errores"}
                    </div>
                    {resultado.protegidos > 0 && (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {resultado.protegidos} usuario(s) Super Admin protegido(s), no se tocaron
                        </div>
                    )}
                    <div className="rounded-md border p-3 text-xs space-y-1">
                        {Object.entries(resultado.resumen).map(([tabla, r]) => (
                            <div key={tabla} className="flex items-center justify-between">
                                <span>
                                    {NOMBRES_TABLA[tabla] || tabla}
                                    {r.protegidos ? <span className="text-emerald-600"> (protege {r.protegidos})</span> : null}
                                </span>
                                {r.error ? (
                                    <span className="text-destructive">Error: {r.error}</span>
                                ) : (
                                    <span className="text-muted-foreground">{r.eliminados} eliminados</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
