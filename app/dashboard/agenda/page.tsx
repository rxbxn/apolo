import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AgendaHeader } from "@/components/agenda/agenda-header"
import { AgendaCalendar } from "@/components/agenda/agenda-calendar"

export const metadata = {
  title: "Agenda - APOLO",
  description: "Gestiona tu calendario de actividades",
}

export default function AgendaPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AgendaHeader />
        <AgendaCalendar />
      </div>
    </DashboardLayout>
  )
}
