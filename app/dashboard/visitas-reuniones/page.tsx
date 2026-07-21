import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { VisitasHeader } from "@/components/visitas/visitas-header"
import { VisitasTable } from "@/components/visitas/visitas-table"

export const metadata = {
    title: "Visitas y Reuniones - APOLO",
    description: "Registro de visitas a militantes con geolocalización",
}

export default function VisitasReunionesPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <VisitasHeader />
                <VisitasTable />
            </div>
        </DashboardLayout>
    )
}
