import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PersonasHeader } from "@/components/personas/personas-header"
import { PersonasTable } from "@/components/personas/personas-table"

export const metadata = {
  title: "Módulo Personas - APOLO",
  description: "Gestiona fichas técnicas de personas",
}

export default function PersonasPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PersonasHeader />
        <PersonasTable />
      </div>
    </DashboardLayout>
  )
}
