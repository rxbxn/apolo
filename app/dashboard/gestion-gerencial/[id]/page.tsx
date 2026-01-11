import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { GestionFormNew } from "@/components/management/gestion-form-new"
import { getGestionById } from "@/lib/actions/gestion"
import { notFound } from "next/navigation"

export const metadata = {
    title: "Editar Formato de Gestión - APOLO",
    description: "Editar un formato de gestión existente",
}

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditarGestionPage({ params }: PageProps) {
    const resolvedParams = await params
    console.log("📋 Parámetros recibidos:", resolvedParams)
    console.log("📋 ID del parámetro:", resolvedParams.id)

    const gestion = await getGestionById(resolvedParams.id)
    console.log("📋 Gestion obtenida:", gestion)

    if (!gestion) {
        console.error("❌ No se encontró la gestión con ID:", resolvedParams.id)
        notFound()
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Editar Formato</h1>
                    <p className="text-muted-foreground">
                        Modifica la información del formato de gestión #{gestion.numero_formulario}.
                    </p>
                </div>
                <GestionFormNew initialData={gestion} isEditing={true} />
            </div>
        </DashboardLayout>
    )
}
