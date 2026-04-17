import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { PersonaForm } from "@/components/personas/persona-form"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditarPersonaPage({ params }: PageProps) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { id } = await params

    const { data: persona, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", id)
        .single()

    if (error || !persona) {
        notFound()
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Editar Persona</h1>
                    <p className="text-muted-foreground">
                        Actualice la información de la persona.
                    </p>
                </div>
                <PersonaForm initialData={persona} isEditing={true} />
            </div>
        </DashboardLayout>
    )
}
