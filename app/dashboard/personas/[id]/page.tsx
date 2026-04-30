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

    // Mapear creado_en → fecha_registro para que el formulario lo muestre correctamente
    if ((persona as any).creado_en) {
        (persona as any).fecha_registro = (persona as any).creado_en?.slice?.(0, 10) ?? (persona as any).creado_en
    }

    // Cargar TODOS los compromisos desde militantes (ahí es donde viven)
    const { data: militante } = await supabase
        .from("militantes")
        .select("compromiso_difusion, compromiso_proyecto, compromiso_marketing, compromiso_cautivo, compromiso_impacto")
        .eq("usuario_id", id)
        .single()

    if (militante) {
        (persona as any).compromiso_difusion   = militante.compromiso_difusion   ?? 0
        ;(persona as any).compromiso_proyecto   = militante.compromiso_proyecto   ?? ""
        ;(persona as any).compromiso_marketing  = militante.compromiso_marketing  ?? 0
        ;(persona as any).compromiso_cautivo    = militante.compromiso_cautivo    ?? 0
        ;(persona as any).compromiso_impacto    = militante.compromiso_impacto    ?? 0
    }

    // Inicializar tiene_hijos si numero_hijos > 0
    if ((persona as any).numero_hijos > 0) {
        (persona as any).tiene_hijos = true
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
