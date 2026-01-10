import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AssignmentForm } from "@/components/assign-data/assignment-form"

export const metadata = {
  title: "Nueva Asignación - APOLO",
  description: "Asignar datos a coordinador",
}

export default function NewAssignmentPage() {
  return (
    <DashboardLayout>
      <AssignmentForm />
    </DashboardLayout>
  )
}
