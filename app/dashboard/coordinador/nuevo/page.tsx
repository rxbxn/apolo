import { CoordinadorForm } from "@/components/coordinador/coordinador-form"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

export const metadata = {
    title: "Nuevo Coordinador - APOLO",
    description: "Registrar un nuevo coordinador en el sistema",
}

export default function NuevoCoordinadorPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Registro de Coordinador</h1>
                    <p className="text-muted-foreground">
                        Complete la información para registrar un nuevo coordinador político con acceso al sistema.
                    </p>
                </div>
                <CoordinadorForm />
            </div>
        </DashboardLayout>
    )
}
