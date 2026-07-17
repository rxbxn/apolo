"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RolesManager } from "@/components/roles/roles-manager"
import { PermisosModuloManager } from "@/components/roles/permisos-modulo-manager"
import { Loader2 } from "lucide-react"

interface Perfil {
    id: string
    nombre: string
    descripcion: string | null
    nivel_jerarquico: number | null
}

export function RolesManagerTabs() {
    const [perfiles, setPerfiles] = useState<Perfil[]>([])
    const [loadingPerfiles, setLoadingPerfiles] = useState(true)

    useEffect(() => {
        async function cargarPerfiles() {
            try {
                const res = await fetch("/api/roles/permisos")
                if (!res.ok) throw new Error("Error cargando roles")
                const data = await res.json()
                setPerfiles(data.perfiles || [])
            } catch (err) {
                console.error("Error cargando roles para el tab de permisos:", err)
            } finally {
                setLoadingPerfiles(false)
            }
        }
        cargarPerfiles()
    }, [])

    return (
        <Tabs defaultValue="usuarios" className="w-full">
            <TabsList>
                <TabsTrigger value="usuarios">Asignar roles a usuarios</TabsTrigger>
                <TabsTrigger value="permisos">Permisos por rol</TabsTrigger>
            </TabsList>
            <TabsContent value="usuarios">
                <RolesManager />
            </TabsContent>
            <TabsContent value="permisos">
                {loadingPerfiles ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <PermisosModuloManager perfiles={perfiles} />
                )}
            </TabsContent>
        </Tabs>
    )
}
