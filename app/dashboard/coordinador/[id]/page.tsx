"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CoordinadorForm } from "@/components/coordinador/coordinador-form"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useCoordinadores } from "@/lib/hooks/use-coordinadores"
import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function EditarCoordinadorPage() {
    const params = useParams()
    const id = params.id as string
    const { obtenerPorId, loading } = useCoordinadores()
    const [coordinador, setCoordinador] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function cargarCoordinador() {
            // Esperar a que el id esté definido (evita falsos positivos durante hidratación)
            if (!id) return

            // Validar ID localmente para evitar llamadas innecesarias
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            if (!uuidRegex.test(id)) {
                setError(`ID inválido: ${id}`)
                return
            }

            try {
                setError(null)
                const data = await obtenerPorId(id)
                setCoordinador(data)
            } catch (err) {
                console.error('Error cargando coordinador:', err)
                setError(err instanceof Error ? err.message : 'Error al cargar coordinador')
            }
        }
        cargarCoordinador()
    }, [id])

    if (loading && !coordinador && !error) {
        return (
            <DashboardLayout>
                <Card>
                    <CardContent className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </CardContent>
                </Card>
            </DashboardLayout>
        )
    }

    if (error) {
        return (
            <DashboardLayout>
                <Card>
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold text-destructive">No se pudo cargar el coordinador</h2>
                        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                        <div className="mt-4 flex justify-end">
                            <button className="btn btn-ghost" onClick={() => window.location.href = '/dashboard/coordinador'}>Volver</button>
                        </div>
                    </CardContent>
                </Card>
            </DashboardLayout>
        )
    }

    // Si no hay coordinador (por ejemplo la API devolvió null), mostrar un mensaje claro
    if (!coordinador) {
        return (
            <DashboardLayout>
                <Card>
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold">Coordinador no encontrado</h2>
                        <p className="mt-2 text-sm text-muted-foreground">No se encontró el coordinador solicitado.</p>
                        <div className="mt-4 flex justify-end">
                            <button className="btn btn-ghost" onClick={() => window.location.href = '/dashboard/coordinador'}>Volver</button>
                        </div>
                    </CardContent>
                </Card>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Editar Coordinador</h1>
                    <p className="text-muted-foreground">
                        Actualice la información del coordinador {coordinador?.nombres ?? ''} {coordinador?.apellidos ?? ''}.
                    </p>
                </div>
                <CoordinadorForm initialData={coordinador} isEditing={true} />
            </div>
        </DashboardLayout>
    )
}
