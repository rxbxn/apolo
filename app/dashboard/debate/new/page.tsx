import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { EventForm } from "@/components/debate/event-form"

export const metadata = {
  title: "Nuevo Evento - APOLO",
  description: "Crear un nuevo evento",
}

export default function NewEventPage() {
  return (
    <DashboardLayout>
      <EventForm />
    </DashboardLayout>
  )
}
