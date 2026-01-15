"use client"

import { Button } from "@/components/ui/button"
import { Plus, Download, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { usePermisos } from "@/lib/hooks/use-permisos"

export function DirigenteHeader() {
    const router = useRouter()
    const { permisos } = usePermisos("Módulo Dirigente")

    // Allow forcing the create button in local/dev for quicker testing.
    // Use NEXT_PUBLIC_FORCE_SHOW_CREATE=1 or run on localhost to see the button even if permisos.crear is false.
    const forceShowCreate = (() => {
        try {
            if (typeof window !== 'undefined') {
                const host = window.location.hostname
                if (host === 'localhost' || host === '127.0.0.1') return true
            }
        } catch (e) {
            /* ignore */
        }

        return process.env.NEXT_PUBLIC_FORCE_SHOW_CREATE === '1'
    })()

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Módulo Dirigente</h1>
                <p className="text-muted-foreground mt-1">Gestiona dirigentes (coordinadores con perfil dirigente)</p>
            </div>

            <div className="flex gap-2">
                {permisos?.exportar && (
                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                    </Button>
                )}

                {permisos?.importar && (
                    <Button variant="outline" size="sm">
                        <Upload className="w-4 h-4 mr-2" />
                        Importar
                    </Button>
                )}

                {(permisos?.crear || forceShowCreate) && (
                    <Button
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => router.push("/dashboard/dirigente/nuevo")}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Dirigente
                    </Button>
                )}
            </div>
        </div>
    )
}
