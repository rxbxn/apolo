import { PersonaForm } from "@/components/personas/persona-form"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

export const metadata = {
    title: "Nueva Persona - APOLO",
    description: "Registrar una nueva persona en el sistema",
}

export default function NuevaPersonaPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Registro de Personas</h1>
                    <p className="text-muted-foreground">
                        Complete la información para registrar una nueva persona en la base de datos.
                    </p>
                </div>
                <PersonaForm />
            </div>
        </DashboardLayout>
    )
}
