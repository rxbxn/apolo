import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { CoordinadorHeader } from "@/components/coordinador/coordinador-header"
import { CoordinadoresTable } from "@/components/coordinador/coordinadores-table"

export const metadata = {
    title: "Módulo Coordinador - APOLO",
    description: "Gestiona coordinadores políticos con acceso al sistema",
}

export default function CoordinadorPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <CoordinadorHeader />
                <CoordinadoresTable />
            </div>
        </DashboardLayout>
    )
}
