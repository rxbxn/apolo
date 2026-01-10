import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AssignDataHeader } from "@/components/assign-data/assign-data-header"
import { PersonaTable } from "@/components/assign-data/persona-table"

export const metadata = {
  title: "Asignar Datos - APOLO",
  description: "Gestión de tabla persona y sincronización con usuarios",
}

export default function AssignDataPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AssignDataHeader />
        <PersonaTable />
      </div>
    </DashboardLayout>
  )
}
