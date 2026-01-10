"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePermisos } from "@/lib/hooks/use-permisos"

export function MilitanteHeader() {
    const router = useRouter()
    const { permisos } = usePermisos("Módulo Militante")

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Módulo Militante</h1>
                <p className="text-muted-foreground mt-1">Gestiona los militantes políticos del sistema</p>
            </div>

            <div className="flex gap-2">
                {permisos?.crear && (
                    <Button
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => router.push("/dashboard/militante/nuevo")}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Militante
                    </Button>
                )}
            </div>
        </div>
    )
}

