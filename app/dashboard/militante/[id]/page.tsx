"use client"

import { MilitanteForm } from "@/components/militante/militante-form"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useMilitantes } from "@/lib/hooks/use-militantes"
import { usePersonas } from "@/lib/hooks/use-personas"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useParams } from "next/navigation"

export default function EditarMilitantePage() {
    const params = useParams()
    const id = params?.id as string | undefined
    const { obtenerPorId, loading } = useMilitantes()
    const { obtenerPorId: obtenerUsuario } = usePersonas()
    const [militante, setMilitante] = useState<any>(null)

    useEffect(() => {
        async function cargarMilitante() {
            try {
                if (!id) return
                let data: any = null
                try {
                    data = await obtenerPorId(id)
                } catch (inner) {
                    console.warn('obtenerPorId falló, intentando fallback API /api/militante/summary/:id', inner)
                    try {
                        const res = await fetch(`/api/militante/summary/${id}`)
                        if (res.ok) data = await res.json()
                        else data = null
                    } catch (fetchErr) {
                        console.error('Fallback fetch a /api/militante/summary falló:', fetchErr)
                        data = null
                    }
                }
                // Mapear los datos de la vista al formato esperado por el formulario
                // Prepare base payload
                const base = data ? {
                    id: data.militante_id || data.id,
                    usuario_id: data.usuario_id,
                    tipo: data.tipo,
                    coordinador_id: data.coordinador_id,
                    compromiso_marketing: data.compromiso_marketing,
                    compromiso_cautivo: data.compromiso_cautivo,
                    compromiso_impacto: data.compromiso_impacto,
                    formulario: data.formulario,
                    perfil_id: data.perfil_id,
                } : null

                // If usuario exists, fetch usuario to preload compromiso fields from usuarios table
                if (data && data.usuario_id) {
                    try {
                        const usuario = await obtenerUsuario(data.usuario_id)
                        if (usuario && base) {
                            const u: any = usuario
                            // Only overwrite if usuario has values (prefer usuario values as requested)
                            base.compromiso_marketing = u.compromiso_marketing ?? base.compromiso_marketing
                            base.compromiso_cautivo = u.compromiso_cautivo ?? base.compromiso_cautivo
                            base.compromiso_impacto = u.compromiso_impacto ?? base.compromiso_impacto
                        }
                    } catch (e) {
                        console.warn('No se pudo cargar usuario para precargar compromisos:', e)
                    }
                }

                setMilitante(base)
            } catch (error) {
                console.error("Error cargando militante:", error)
            }
        }
                if (id) {
            cargarMilitante()
        }
    // Only depend on `id` here. `obtenerPorId` and `obtenerUsuario` are stable hooks but
    // their identities may change during Fast Refresh which can change the dependency
    // array length between renders and trigger the "changed size" error in development.
    // We intentionally only redeclare the effect when `id` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    if (loading || !militante) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Editar Militante</h1>
                    <p className="text-muted-foreground">
                        Modifique la información del militante.
                    </p>
                </div>
                <MilitanteForm initialData={militante} isEditing={true} />
            </div>
        </DashboardLayout>
    )
}

