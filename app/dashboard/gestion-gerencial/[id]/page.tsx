import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { GestionForm } from "@/components/management/gestion-form"
import { getGestionById } from "@/lib/actions/gestion"
import { notFound } from "next/navigation"

export const metadata = {
    title: "Editar Formato de Gestión - APOLO",
    description: "Editar un formato de gestión existente",
}

interface PageProps {
    params: {
        id: string
    }
}

export default async function EditarGestionPage({ params }: PageProps) {
    const gestion = await getGestionById(params.id)

    if (!gestion) {
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
                <GestionForm initialData={gestion} isEditing={true} />
            </div>
        </DashboardLayout>
    )
}
