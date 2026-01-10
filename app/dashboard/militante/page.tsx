import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { MilitanteHeader } from "@/components/militante/militante-header"
import { MilitantesTable } from "@/components/militante/militantes-table"

export const metadata = {
    title: "Módulo Militante - APOLO",
    description: "Gestiona militantes políticos del sistema",
}

export default function MilitantePage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <MilitanteHeader />
                <MilitantesTable />
            </div>
        </DashboardLayout>
    )
}

