import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ModulesGrid } from "@/components/dashboard/modules-grid"

export const metadata = {
  title: "Dashboard - APOLO",
  description: "Panel principal de gestión de campañas",
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <DashboardHeader />
        <ModulesGrid />
      </div>
    </DashboardLayout>
  )
}
