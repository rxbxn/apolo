import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PersonaForm } from "@/components/personas/persona-form"

export const metadata = {
  title: "Nueva Persona - APOLO",
  description: "Crear un nuevo registro de persona",
}

export default function NewPersonaPage() {
  return (
    <DashboardLayout>
      <PersonaForm />
    </DashboardLayout>
  )
}
