import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ActivityForm } from "@/components/activities/activity-form"

export const metadata = {
  title: "Nueva Actividad - APOLO",
  description: "Crear una nueva actividad",
}

export default function NewActivityPage() {
  return (
    <DashboardLayout>
      <ActivityForm />
    </DashboardLayout>
  )
}
