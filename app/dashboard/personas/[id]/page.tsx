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

    // Obtener datos de la persona
    const { data: persona, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", id)
        .single()

    if (error || !persona) {
        notFound()
    }

    // Buscar datos de militante si existen
    const { data: militante } = await supabase
        .from("militantes")
        .select(`
            *,
            tipo:tipos_militante(id, codigo, descripcion),
            coordinador:coordinadores(id, nombres, apellidos)
        `)
        .eq("usuario_id", id)
        .single()

    // Combinar datos de persona con datos de militante si existen
    const initialData = {
        ...persona,
        // Agregar datos de militante si existen
        ...(militante && {
            militante_id: militante.id,
            tipo_militante: militante.tipo,
            coordinador_militante: militante.coordinador,
            compromiso_marketing: militante.compromiso_marketing ?? persona.compromiso_marketing,
            compromiso_cautivo: militante.compromiso_cautivo ?? persona.compromiso_cautivo,
            compromiso_impacto: militante.compromiso_impacto ?? persona.compromiso_impacto,
            formulario: militante.formulario,
            perfil_id: militante.perfil_id,
            es_militante: true
        })
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
                <PersonaForm initialData={initialData} isEditing={true} />
            </div>
        </DashboardLayout>
    )
}
