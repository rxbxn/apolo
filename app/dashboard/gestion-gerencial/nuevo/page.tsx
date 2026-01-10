import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { GestionForm } from "@/components/management/gestion-form"

export const metadata = {
    title: "Nuevo Formato de Gestión - APOLO",
    description: "Crear un nuevo formato de gestión y compromisos",
}

export default function NuevoGestionPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nuevo Formato</h1>
                    <p className="text-muted-foreground">
                        Diligencia la información para crear un nuevo formato de gestión.
                    </p>
                </div>
                <GestionForm />
            </div>
        </DashboardLayout>
    )
}
