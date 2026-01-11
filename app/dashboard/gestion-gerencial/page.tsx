import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { GestionHeader } from "@/components/management/gestion-header"
import { GestionTable } from "@/components/management/gestion-table"

export const metadata = {
    title: "Gestión Gerencial - APOLO",
    description: "Módulo de gestión y compromisos",
}

export default function GestionGerencialPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <GestionHeader />
                <GestionTable />
            </div>
        </DashboardLayout>
    )
}

