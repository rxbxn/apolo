import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DirigenteHeader } from "@/components/dirigente/dirigente-header"
import { DirigenteForm } from "@/components/dirigente/dirigente-form"

export const metadata = {
    title: "Nuevo Dirigente - APOLO",
    description: "Registrar un nuevo dirigente en el sistema",
}

export default function NuevoDirigentePage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Registro de Dirigente</h1>
                    <p className="text-muted-foreground">Complete la información para registrar un dirigente (seleccione de los coordinadores existentes con perfil Dirigente).</p>
                </div>
                <DirigenteForm />
            </div>
        </DashboardLayout>
    )
}
