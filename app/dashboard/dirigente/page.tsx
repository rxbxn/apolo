import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DirigenteHeader } from "@/components/dirigente/dirigente-header"
import { DirigentesTable } from "@/components/dirigente/dirigentes-table"

export const metadata = {
  title: "Módulo Dirigente - APOLO",
  description: "Listado y gestión de dirigentes (coordinadores con perfil dirigente)",
}

// Force rebuild
export default function DirigentePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DirigenteHeader />
        <DirigentesTable />
      </div>
    </DashboardLayout>
  )
}
