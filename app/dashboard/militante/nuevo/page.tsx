import { MilitanteForm } from "@/components/militante/militante-form"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

export const metadata = {
    title: "Nuevo Militante - APOLO",
    description: "Registrar un nuevo militante en el sistema",
}

export default function NuevoMilitantePage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Registro de Militante</h1>
                    <p className="text-muted-foreground">
                        Complete la información para registrar un nuevo militante político.
                    </p>
                </div>
                <MilitanteForm />
            </div>
        </DashboardLayout>
    )
}

